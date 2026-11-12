import { useMemo } from 'react'
import { content } from '../../data/portfolio'
import { ORDER, islandStore, visit } from '../store'
import { PATH, SITES, shoreRadius } from '../terrain'
import type { LocationId } from '../../types/content'
import { PlaceIcon } from './icons'

const K = 15
const sx = (x: number) => 500 + x * K
const sy = (z: number) => 360 + z * K * 0.78

function outline(scale: number) {
  const pts: string[] = []
  for (let i = 0; i <= 160; i++) {
    const th = (i / 160) * Math.PI * 2
    const r = shoreRadius(th) * scale
    pts.push(`${sx(Math.cos(th) * r).toFixed(1)},${sy(Math.sin(th) * r).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

/**
 * The illustrated island — used when 3D isn't available.
 * Same places, same stories, just drawn instead of built.
 */
export function FlatIsland() {
  const visited = islandStore.use((s) => s.visited)
  const focus = islandStore.use((s) => s.focus)
  const shapes = useMemo(
    () => ({
      foam: outline(1.12),
      sand: outline(1.0),
      grass: outline(0.86),
      path: `M${PATH.map(([x, z]) => `${sx(x).toFixed(1)},${sy(z).toFixed(1)}`).join('L')}`,
    }),
    [],
  )
  return (
    <div className="flatmap" aria-label="Illustrated map of Sauvik Island">
      <svg viewBox="0 0 1000 720" role="group" aria-label="Places on the island">
        <defs>
          <radialGradient id="fm-grass" cx="45%" cy="40%" r="70%">
            <stop offset="0" stopColor="#9ccc65" />
            <stop offset="1" stopColor="#5e9e4e" />
          </radialGradient>
        </defs>
        <path d={shapes.foam} fill="#7fdccc" opacity="0.55" />
        <path d={shapes.sand} fill="#f2d39c" />
        <path d={shapes.grass} fill="url(#fm-grass)" />
        <ellipse cx={sx(SITES.castle.x)} cy={sy(SITES.castle.z)} rx={110} ry={70} fill="#4f8d4a" opacity="0.45" />
        <path d={shapes.path} fill="none" stroke="#ddb07a" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        <path d={shapes.path} fill="none" stroke="#c99a62" strokeWidth={2} strokeDasharray="2 14" strokeLinecap="round" />
        {ORDER.map((id: LocationId, i) => {
          const s = SITES[id]
          const loc = content.island[id]
          const x = sx(s.x)
          const y = sy(s.z)
          const on = focus === id
          return (
            <g
              key={id}
              className="flat-spot"
              role="button"
              tabIndex={0}
              aria-label={`${i + 1}. ${loc.name} — ${loc.purpose}`}
              onClick={() => visit(id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), visit(id))}
            >
              <circle className="flat-ring" cx={x} cy={y} r={46} fill="none" stroke="#fff" strokeWidth={3} opacity={on ? 1 : 0} style={{ transition: 'opacity .3s' }} />
              <circle cx={x} cy={y + 6} r={34} fill="#241c36" opacity="0.18" />
              <circle cx={x} cy={y} r={34} fill={loc.accent} stroke="#fbf4e8" strokeWidth={4} />
              <PlaceIcon id={id} size={30} x={x - 15} y={y - 15} color="#ffffff" />
              <g transform={`translate(${x}, ${y + 58})`}>
                <rect x={-loc.name.length * 5.4 - 14} y={-16} width={loc.name.length * 10.8 + 28} height={32} rx={16} fill="#fbf4e8" />
                <text textAnchor="middle" dy="5" fontFamily="var(--font-grotesk)" fontWeight={700} fontSize={16} fill="#241c36">
                  {visited.includes(id) ? '✓ ' : ''}
                  {loc.name}
                </text>
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
