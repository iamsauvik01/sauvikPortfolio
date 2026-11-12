import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { camState } from '../../lib/spiderCtl'

/**
 * Out-of-focus foreground foliage close to the lens — the macro-photography
 * depth cue that makes the world feel tiny. Blur is baked into the texture.
 */
function leafTexture(kind: 'leaf' | 'blades', color: string) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')!
  // draw shapes off-canvas and only keep their blurred shadow (portable blur)
  ctx.shadowColor = color
  ctx.shadowBlur = 38
  ctx.shadowOffsetX = S * 2
  ctx.fillStyle = '#000'
  ctx.translate(-S * 2, 0)
  if (kind === 'leaf') {
    ctx.beginPath()
    ctx.moveTo(40, 470)
    ctx.bezierCurveTo(60, 250, 230, 90, 470, 50)
    ctx.bezierCurveTo(420, 260, 260, 430, 40, 470)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(10, 500)
    ctx.bezierCurveTo(120, 360, 180, 300, 300, 230)
    ctx.lineTo(310, 245)
    ctx.bezierCurveTo(190, 320, 130, 380, 30, 510)
    ctx.fill()
  } else {
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 70
      ctx.beginPath()
      ctx.moveTo(x - 18, 520)
      ctx.quadraticCurveTo(x + 10 + i * 6, 260, x + 60 + i * 12, 40 + i * 30)
      ctx.quadraticCurveTo(x + 18 + i * 4, 270, x + 18, 520)
      ctx.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

interface Piece {
  tex: THREE.Texture
  mat: THREE.MeshBasicMaterial
  /** viewport-relative position (-1..1) */
  at: [number, number]
  z: number
  size: number
  flip: boolean
  rot: number
  opacity: number
}

export function Foreground() {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const pieces = useMemo<Piece[]>(() => {
    const make = (kind: 'leaf' | 'blades', color: string, at: [number, number], z: number, size: number, flip: boolean, rot: number, opacity: number) => {
      const tex = leafTexture(kind, color)
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity, toneMapped: false })
      return { tex, mat, at, z, size, flip, rot, opacity }
    }
    return [
      make('blades', '#0c1416', [0.92, -0.95], 6.6, 2.4, true, 0, 0.9),
      make('leaf', '#1a1430', [0.98, 0.95], 5.5, 2.2, true, Math.PI * 0.95, 0.75),
    ]
  }, [])
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  useEffect(
    () => () => {
      plane.dispose()
      pieces.forEach((p) => {
        p.tex.dispose()
        p.mat.dispose()
      })
    },
    [plane, pieces],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const aspect = state.size.width / state.size.height
    pieces.forEach((p, i) => {
      const m = refs.current[i]
      if (!m) return
      const depth = 12 - p.z
      const halfH = depth * Math.tan(THREE.MathUtils.degToRad(30) / 2)
      const halfW = halfH * aspect
      m.position.set(p.at[0] * halfW, p.at[1] * halfH, p.z)
      m.rotation.z = p.rot + Math.sin(t * 0.4 + i) * 0.03
      const s = p.size * halfH * 0.5 * (aspect < 1 ? 0.8 : 1)
      m.scale.set(p.flip ? -s : s, s, 1)
      p.mat.opacity = p.opacity * camState.reveal * (1 - camState.dive)
    })
  })

  return (
    <group>
      {pieces.map((p, i) => (
        <mesh key={i} ref={(el) => void (refs.current[i] = el)} geometry={plane} material={p.mat} renderOrder={10} />
      ))}
    </group>
  )
}
