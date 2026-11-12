import { useEffect, useId, useRef } from 'react'
import { gsap } from 'gsap'
import { pointer } from '../lib/pointer'
import { SPIDER } from '../scene/spider/palette'

interface Props {
  size?: number
  className?: string
  /** Pupils follow the global pointer. */
  track?: boolean
  /** Waving front leg. */
  wave?: boolean
  /** Happy squint. */
  happy?: boolean
  /** Draw a silk thread above. */
  thread?: boolean
  /** Explicit look offset (-1..1); overrides pointer tracking. */
  look?: { x: number; y: number } | null
  title?: string
}

const LEGS = [0, 1, 2, 3].map((i) => ({
  hip: [96 - i * 1, 118 + i * 6],
  knee: [58 - i * 8, 80 + i * 14],
  foot: [26 - i * 2, 150 + i * 10],
}))

function legPath(side: 1 | -1, l: (typeof LEGS)[number]) {
  const x = (v: number) => (side === 1 ? v : 240 - v)
  return `M${x(l.hip[0])} ${l.hip[1]} L${x(l.knee[0])} ${l.knee[1]} L${x(l.foot[0])} ${l.foot[1]}`
}

/**
 * Bit, drawn in SVG — mirrors the 3D character's proportions and palette.
 */
export function SvgSpider({ size = 160, className, track = true, wave, happy, thread, look, title }: Props) {
  const id = useId().replace(/:/g, '')
  const root = useRef<SVGSVGElement>(null)
  const eyes = useRef<(SVGGElement | null)[]>([])
  const lookRef = useRef(look)
  lookRef.current = look

  useEffect(() => {
    if (!track && !look) return
    const cur = { x: 0, y: 0 }
    const tick = () => {
      const el = root.current
      if (!el) return
      let tx = 0
      let ty = 0
      const lk = lookRef.current
      if (lk) {
        tx = lk.x
        ty = lk.y
      } else if (pointer.engaged) {
        const r = el.getBoundingClientRect()
        if (r.bottom < 0 || r.top > window.innerHeight) return
        const dx = pointer.px - (r.left + r.width / 2)
        const dy = pointer.py - (r.top + r.height * 0.55)
        const d = Math.hypot(dx, dy) || 1
        const k = Math.min(1, d / 260)
        tx = (dx / d) * k
        ty = (dy / d) * k
      }
      cur.x += (tx - cur.x) * 0.18
      cur.y += (ty - cur.y) * 0.18
      eyes.current.forEach((g) => g?.setAttribute('transform', `translate(${cur.x * 4.2} ${cur.y * 3.6})`))
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [track, look])

  return (
    <svg
      ref={root}
      viewBox="0 0 240 210"
      width={size}
      height={(size * 210) / 240}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={thread ? { overflow: 'visible' } : undefined}
    >
      <defs>
        <radialGradient id={`iris-${id}`} cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor={SPIDER.irisA} />
          <stop offset="75%" stopColor={SPIDER.irisB} />
          <stop offset="100%" stopColor={SPIDER.irisRing} />
        </radialGradient>
        <radialGradient id={`body-${id}`} cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor={SPIDER.bodyLight} />
          <stop offset="70%" stopColor={SPIDER.body} />
          <stop offset="100%" stopColor={SPIDER.bodyDeep} />
        </radialGradient>
      </defs>
      {thread && <line x1="120" y1="-400" x2="120" y2="70" stroke={SPIDER.silk} strokeOpacity="0.6" strokeWidth="1.2" />}
      {/* legs */}
      <g fill="none" stroke={SPIDER.body} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        {LEGS.map((l, i) => (
          <path key={`l${i}`} d={legPath(1, l)} />
        ))}
        {LEGS.map((l, i) =>
          wave && i === 0 ? null : <path key={`r${i}`} d={legPath(-1, l)} />,
        )}
      </g>
      <g fill={SPIDER.band}>
        {LEGS.map((l, i) => (
          <circle key={`kl${i}`} cx={l.knee[0]} cy={l.knee[1]} r="5.5" />
        ))}
        {LEGS.map((l, i) => (wave && i === 0 ? null : <circle key={`kr${i}`} cx={240 - l.knee[0]} cy={l.knee[1]} r="5.5" />))}
      </g>
      {wave && (
        <g className="svg-wave" style={{ transformOrigin: '146px 118px' }}>
          <path d="M146 118 L178 86 L196 46" fill="none" stroke={SPIDER.body} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="178" cy="86" r="5.5" fill={SPIDER.band} />
          <circle cx="196" cy="46" r="5" fill={SPIDER.cream} />
        </g>
      )}
      {/* abdomen */}
      <ellipse cx="120" cy="78" rx="54" ry="46" fill={`url(#body-${id})`} />
      <path d="M72 64 Q96 52 120 58 Q144 52 168 64" fill="none" stroke={SPIDER.band} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      {[90, 106, 120, 134, 150].map((x) => (
        <circle key={x} cx={x} cy={44 + Math.abs(x - 120) * 0.15} r="3.4" fill={SPIDER.cream} opacity="0.85" />
      ))}
      {/* head */}
      <circle cx="120" cy="122" r="46" fill={`url(#body-${id})`} />
      <path d="M118 78 Q114 62 126 56 Q136 54 138 64" fill="none" stroke={SPIDER.bodyLight} strokeWidth="5" strokeLinecap="round" />
      {/* eyes */}
      {[101, 139].map((cx, i) => (
        <g key={cx} className="svg-blink" style={{ transformOrigin: `${cx}px 118px`, animationDelay: `${i * 0.02}s` }}>
          <circle cx={cx} cy="118" r="16" fill={SPIDER.sclera} />
          <g ref={(el) => void (eyes.current[i] = el)}>
            <circle cx={cx} cy="119" r="10.5" fill={`url(#iris-${id})`} />
            <circle cx={cx} cy="119" r="5.4" fill={SPIDER.pupil} />
          </g>
          <circle cx={cx - 5} cy="112" r="3.2" fill="#fff" />
          <circle cx={cx + 4} cy="124" r="1.3" fill="#fff" />
          {happy && <path d={`M${cx - 17} 132 Q${cx} 118 ${cx + 17} 132 L${cx + 17} 140 L${cx - 17} 140 Z`} fill={SPIDER.bodyLight} />}
        </g>
      ))}
      <ellipse cx="80" cy="134" rx="8" ry="5" fill={SPIDER.blush} opacity="0.35" />
      <ellipse cx="160" cy="134" rx="8" ry="5" fill={SPIDER.blush} opacity="0.35" />
      <path d="M110 143 Q120 152 130 143" fill="none" stroke={SPIDER.mouth} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="112" cy="160" r="6" fill={SPIDER.mitt} />
      <circle cx="128" cy="160" r="6" fill={SPIDER.mitt} />
    </svg>
  )
}
