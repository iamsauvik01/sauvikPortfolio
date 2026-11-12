import * as THREE from 'three'
import { SPIDER } from './palette'
import { rng } from '../../lib/math'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

/**
 * Abdomen pattern in equirectangular UV space (u = around, v = top→bottom).
 * Canvas top = north pole of the sphere.
 */
export function makeAbdomenTexture() {
  const W = 1024
  const H = 512
  const { c, ctx } = canvas(W, H)
  const r = rng(7)
  ctx.fillStyle = SPIDER.body
  ctx.fillRect(0, 0, W, H)

  // velvet speckle
  for (let i = 0; i < 2600; i++) {
    const x = r() * W
    const y = r() * H
    ctx.fillStyle = r() > 0.5 ? 'rgba(160,140,230,0.10)' : 'rgba(10,6,24,0.16)'
    ctx.beginPath()
    ctx.arc(x, y, 1 + r() * 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // soft lighter crown
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.28)
  g.addColorStop(0, 'rgba(120,100,190,0.55)')
  g.addColorStop(1, 'rgba(120,100,190,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H * 0.28)

  // wavy peach band
  ctx.save()
  ctx.fillStyle = SPIDER.band
  ctx.shadowColor = SPIDER.band
  ctx.shadowBlur = 10
  ctx.beginPath()
  const yA = H * 0.33
  const thick = H * 0.045
  ctx.moveTo(0, yA)
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, yA + Math.sin((x / W) * Math.PI * 12) * 9)
  for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, yA + thick + Math.sin((x / W) * Math.PI * 12 + 0.6) * 7)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // cream dots above the band
  for (let i = 0; i < 14; i++) {
    const x = (i + 0.5) * (W / 14)
    ctx.fillStyle = SPIDER.cream
    ctx.beginPath()
    ctx.ellipse(x, H * 0.2, 13, 10, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // chevrons below the band
  ctx.strokeStyle = 'rgba(242,165,130,0.85)'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  for (let i = 0; i < 10; i++) {
    const x = (i + 0.5) * (W / 10)
    ctx.beginPath()
    ctx.moveTo(x - 22, H * 0.47)
    ctx.lineTo(x, H * 0.5)
    ctx.lineTo(x + 22, H * 0.47)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

/** Radial falloff used for soft blob shadows. */
export function makeShadowTexture() {
  const { c, ctx } = canvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.85)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.45)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  return tex
}
