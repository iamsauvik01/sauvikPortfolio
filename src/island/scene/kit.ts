import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* ── materials (shared + cached so draw state stays small) ─────── */
const mats = new Map<string, THREE.MeshStandardMaterial>()

export interface MatOpts {
  rough?: number
  metal?: number
  emissive?: string
  ei?: number
  flat?: boolean
  opacity?: number
  side?: THREE.Side
}

export function mat(color: string, o: MatOpts = {}) {
  const key = `${color}|${o.rough ?? 0.8}|${o.metal ?? 0}|${o.emissive ?? ''}|${o.ei ?? 0}|${o.flat ?? false}|${o.opacity ?? 1}|${o.side ?? 0}`
  let m = mats.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 0.8,
      metalness: o.metal ?? 0,
      emissive: new THREE.Color(o.emissive ?? '#000000'),
      emissiveIntensity: o.ei ?? 0,
      flatShading: o.flat ?? false,
      transparent: (o.opacity ?? 1) < 1,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
    })
    // shared, never-animated look: safe to fold into vertex colours when batching
    m.userData.paint = true
    mats.set(key, m)
  }
  return m
}

/** A material that is NOT shared — for things that animate their own colour / glow. */
export function ownMat(color: string, o: MatOpts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: o.rough ?? 0.7,
    metalness: o.metal ?? 0,
    emissive: new THREE.Color(o.emissive ?? '#000000'),
    emissiveIntensity: o.ei ?? 0,
    flatShading: o.flat ?? false,
    transparent: (o.opacity ?? 1) < 1,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
  })
}

/* ── soft radial glow texture for additive sprites ─────────────── */
let glowTex: THREE.Texture | null = null
export function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grd.addColorStop(0.6, 'rgba(255,255,255,0.12)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}

/* ── canvas-drawn signage ───────────────────────────────────────── */
export const SIGN_FONT = '"Bricolage Grotesque Variable", "Figtree Variable", system-ui, sans-serif'

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function signTexture(text: string, opts: { bg: string; fg: string; w?: number; h?: number; size?: number; weight?: number; border?: string }) {
  const w = opts.w ?? 512
  const h = opts.h ?? 160
  return canvasTexture(w, h, (g) => {
    g.fillStyle = opts.bg
    g.fillRect(0, 0, w, h)
    if (opts.border) {
      g.strokeStyle = opts.border
      g.lineWidth = h * 0.06
      g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12)
    }
    g.fillStyle = opts.fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `${opts.weight ?? 800} ${opts.size ?? h * 0.5}px ${SIGN_FONT}`
    g.fillText(text, w / 2, h / 2 + h * 0.03)
  })
}

/* ── geometry helpers ───────────────────────────────────────────── */
export function merge(geos: THREE.BufferGeometry[]) {
  const clean = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g
    for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k)
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2))
    return n
  })
  return mergeGeometries(clean, false)!
}

export function placed(g: THREE.BufferGeometry, x: number, y: number, z: number, s: number | [number, number, number] = 1, ry = 0, rx = 0, rz = 0) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s),
  )
  return g.clone().applyMatrix4(m)
}

/** A gear outline, extruded. */
export function gearGeometry(r: number, teeth: number, depth: number, hole = 0.3) {
  const s = new THREE.Shape()
  const ri = r * 0.8
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2
    const a1 = a0 + (Math.PI * 2) / teeth
    const pts: [number, number][] = [
      [ri, a0],
      [r, a0 + (a1 - a0) * 0.2],
      [r, a0 + (a1 - a0) * 0.5],
      [ri, a0 + (a1 - a0) * 0.7],
    ]
    pts.forEach(([rr, a], k) => {
      const x = Math.cos(a) * rr
      const y = Math.sin(a) * rr
      if (i === 0 && k === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    })
  }
  s.closePath()
  const holePath = new THREE.Path()
  holePath.absarc(0, 0, r * hole, 0, Math.PI * 2, true)
  s.holes.push(holePath)
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.15, bevelSize: depth * 0.12, bevelSegments: 1, curveSegments: 4 })
  g.translate(0, 0, -depth / 2)
  return g
}

/** Gable roof prism (triangle cross-section along z). */
export function gableGeometry(w: number, h: number, d: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.lineTo(w / 2, 0)
  s.lineTo(0, h)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false })
  g.translate(0, 0, -d / 2)
  return g
}

/** Lumpy "puff" made of spheres — clouds, bushes, tree canopies. */
export function puffGeometry(seed: number, lobes = 5, detail = 2) {
  const r = rand(seed)
  const parts: THREE.BufferGeometry[] = []
  const base = new THREE.IcosahedronGeometry(1, detail)
  parts.push(base.clone())
  for (let i = 0; i < lobes; i++) {
    const a = r() * Math.PI * 2
    const rr = 0.55 + r() * 0.35
    const s = 0.45 + r() * 0.35
    parts.push(placed(base, Math.cos(a) * rr, (r() - 0.35) * 0.5, Math.sin(a) * rr, s))
  }
  return merge(parts)
}

export function rand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Shared uniform for wind / water time so every shader sways in sync. */
export const timeUniform = { value: 0 }

/** Adds a gentle wind sway (scaled by local height) to a standard material. */
export function withSway(m: THREE.MeshStandardMaterial, amount = 0.05) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = timeUniform
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 seedP = instanceMatrix[3].xz;
        #else
          vec2 seedP = vec2(0.0);
        #endif
        float sway = max(position.y, 0.0) * ${amount.toFixed(3)};
        transformed.x += sin(uTime * 1.3 + seedP.x * 0.35 + seedP.y * 0.2) * sway;
        transformed.z += cos(uTime * 1.1 + seedP.y * 0.31) * sway * 0.6;`,
      )
  }
  m.customProgramCacheKey = () => `sway${amount}`
  return m
}
