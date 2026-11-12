/**
 * Everything about the island's ground that is pure number-crunching:
 * terrain mesh + colours, the seabed height map the ocean shader reads, and where every
 * tree / palm / rock / bush / tuft / flower stands.
 *
 * It runs in a Web Worker (see groundWorker.ts) so the landing page never stutters while the
 * island is being prepared; `loadGround` falls back to the main thread if workers fail.
 */
import * as THREE from 'three'
import { SITES, beachiness, coastE, fbm, heightAt, pathDistance } from '../terrain'
import { SUBS, locationShot, subShot, type Shot } from '../layout'
import { rng } from '../../lib/math'
import type { LocationId } from '../../types/content'

export type Tier = 'low' | 'mid' | 'high'

export interface InstanceSet {
  matrices: Float32Array
  colors: Float32Array | null
  count: number
}

export interface GroundData {
  terrain: { position: Float32Array; normal: Float32Array; color: Float32Array; uv: Float32Array; index: Uint32Array }
  sea: Uint16Array
  veg: Record<'trunk' | 'canopy' | 'pine' | 'pineTrunk' | 'palmTrunk' | 'palmCrown' | 'rock' | 'bush' | 'grass' | 'flower', InstanceSet>
}

export const SEA_SPAN = 64
export const SEA_RES = 192

const col = (h: string) => new THREE.Color(h)
const SAND = col('#f2d39c')
const SAND_WET = col('#d6ad78')
const SEABED = col('#b08a63')
const GRASS_A = col('#8cc05c')
const GRASS_B = col('#5d9e4d')
const GRASS_WARM = col('#b5cc63')
const GRASS_DEEP = col('#3f7f47')
const PATH = col('#ddb07a')
const PATH_EDGE = col('#b9925f')
const ROCK = col('#a39395')
const ROCK_DARK = col('#7c6c78')
const ss = THREE.MathUtils.smoothstep

/* ── terrain ───────────────────────────────────────────────────── */
function buildTerrain(tier: Tier): GroundData['terrain'] {
  const seg = tier === 'high' ? 190 : tier === 'mid' ? 150 : 110
  const g = new THREE.PlaneGeometry(64, 64, seg, seg)
  g.rotateX(-Math.PI / 2)
  const p = g.attributes.position as THREE.BufferAttribute
  const pd = new Float32Array(p.count)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const z = p.getZ(i)
    let h = heightAt(x, z)
    const d = h > -0.6 ? pathDistance(x, z) : 99
    pd[i] = d
    if (d < 1.0 && h > 0.2) h -= 0.06 * (1 - d)
    p.setY(i, h)
  }
  g.computeVertexNormals()
  const n = g.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(p.count * 3)
  const c = new THREE.Color()
  const rock = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const slope = 1 - n.getY(i)
    const th = Math.atan2(z, x)
    const e = coastE(x, z)
    const nz = fbm(x * 0.21 + 9, z * 0.21, 3)
    if (y < -0.05) {
      c.copy(SAND_WET).lerp(SEABED, Math.min(1, -y / 3))
    } else {
      c.copy(GRASS_A).lerp(GRASS_B, ss(nz, -0.2, 0.4))
      c.lerp(GRASS_WARM, ss(fbm(x * 0.13, z * 0.13 + 4, 2), 0.15, 0.55) * 0.6)
      c.lerp(GRASS_DEEP, ss(y, 3.5, 7) * 0.45)
      const sandy = Math.max(ss(0.62, 0.32, y) * (0.35 + 0.65 * beachiness(th)), ss(0.15, 0.02, y))
      c.lerp(SAND, Math.min(1, sandy * 1.4) * ss(e, 0.7, 0.86))
      if (y < 0.12) c.lerp(SAND_WET, ss(0.12, 0.0, y))
      c.lerp(rock.copy(ROCK).lerp(ROCK_DARK, ss(nz, -0.3, 0.3)), ss(slope, 0.2, 0.42))
      const d = pd[i]
      if (d < 1.25 && y > 0.15) {
        c.lerp(PATH_EDGE, ss(d, 1.25, 0.95) * 0.7)
        c.lerp(PATH, ss(d, 0.95, 0.65))
      }
    }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  return {
    position: p.array as Float32Array,
    normal: n.array as Float32Array,
    color: colors,
    uv: g.attributes.uv.array as Float32Array,
    index: Uint32Array.from(g.index!.array),
  }
}

/* ── seabed height map for the ocean shader ────────────────────── */
function buildSea() {
  const data = new Uint16Array(SEA_RES * SEA_RES)
  for (let j = 0; j < SEA_RES; j++)
    for (let i = 0; i < SEA_RES; i++) {
      const x = ((i + 0.5) / SEA_RES - 0.5) * SEA_SPAN
      const z = ((j + 0.5) / SEA_RES - 0.5) * SEA_SPAN
      data[j * SEA_RES + i] = THREE.DataUtils.toHalfFloat(Math.max(-8, Math.min(4, heightAt(x, z))))
    }
  return data
}

/* ── vegetation placement ──────────────────────────────────────── */
interface Spot {
  x: number
  y: number
  z: number
  s: number
  r: number
}

const clearOfSites = (x: number, z: number, pad: number) => Object.values(SITES).every((s) => Math.hypot(x - s.x, z - s.z) > s.r + pad)

/**
 * Keep every camera sight line clear: no tree may stand between a shot's
 * camera and what it's looking at (places and the objects inside them).
 */
function sightLines() {
  const out: [number, number, number, number][] = []
  const add = (sh: Shot) => {
    const d = sh.dist * Math.cos(sh.el)
    out.push([sh.target.x, sh.target.z, sh.target.x + Math.sin(sh.az) * d, sh.target.z + Math.cos(sh.az) * d])
  }
  for (const id of Object.keys(SITES) as LocationId[]) {
    for (const aspect of [1.6, 0.6]) {
      add(locationShot(id, aspect))
      for (const sub of Object.keys(SUBS[id] ?? {})) add(subShot(id, sub, aspect))
    }
  }
  return out
}

function scatter(seed: number, n: number, accept: (x: number, z: number, h: number) => boolean, minGap: number, tries = 40) {
  const r = rng(seed)
  const out: Spot[] = []
  const max = n * tries
  for (let k = 0; k < max && out.length < n; k++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 29
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    const h = heightAt(x, z)
    if (!accept(x, z, h)) continue
    if (out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < minGap * minGap)) continue
    out.push({ x, y: h, z, s: 0.75 + r() * 0.6, r: r() * Math.PI * 2 })
  }
  return out
}

const slopeAt = (x: number, z: number) => {
  const e = 0.4
  const dx = heightAt(x + e, z) - heightAt(x - e, z)
  const dz = heightAt(x, z + e) - heightAt(x, z - e)
  return Math.hypot(dx, dz) / (2 * e)
}

const q = new THREE.Quaternion()
const eu = new THREE.Euler()
const v = new THREE.Vector3()
const sv = new THREE.Vector3()
const mtx = new THREE.Matrix4()

function instances(spots: Spot[], place: (s: Spot) => [number, number, number, number, number, number?], palette?: string[], pick?: (i: number) => number): InstanceSet {
  const matrices = new Float32Array(spots.length * 16)
  const colors = palette ? new Float32Array(spots.length * 3) : null
  const c = new THREE.Color()
  spots.forEach((s, i) => {
    const [x, y, z, sc, ry, rx = 0] = place(s)
    eu.set(rx, ry, 0)
    q.setFromEuler(eu)
    mtx.compose(v.set(x, y, z), q, sv.set(sc, sc, sc))
    mtx.toArray(matrices, i * 16)
    if (colors && palette) {
      c.set(palette[pick ? pick(i) : i % palette.length])
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
  })
  return { matrices, colors, count: spots.length }
}

function buildVegetation(tier: Tier): GroundData['veg'] {
  const k = tier === 'high' ? 1 : tier === 'mid' ? 0.7 : 0.45
  const lines = sightLines()
  const clearOfViews = (x: number, z: number) =>
    lines.every(([ax, az, bx, bz]) => {
      const vx = bx - ax
      const vz = bz - az
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)))
      // the corridor widens slightly towards the camera
      return Math.hypot(x - (ax + vx * t), z - (az + vz * t)) > 2.2 + t * 1.6
    })
  const inland = (x: number, z: number, h: number) =>
    h > 0.75 && coastE(x, z) < 0.86 && pathDistance(x, z) > 1.5 && clearOfSites(x, z, 1.2) && clearOfViews(x, z) && slopeAt(x, z) < 0.55
  const trees = scatter(101, Math.round(58 * k), (x, z, h) => inland(x, z, h) && h < 4.4 && pathDistance(x, z) > 2.2, 2.6)
  const pines = scatter(202, Math.round(30 * k), (x, z, h) => inland(x, z, h) && (h > 3.2 || z < -6), 1.8)
  const palms = scatter(
    303,
    Math.round(22 * k),
    (x, z, h) => h > 0.12 && h < 0.9 && coastE(x, z) > 0.8 && coastE(x, z) < 0.97 && pathDistance(x, z) > 1.2 && clearOfSites(x, z, 0.6) && clearOfViews(x, z) && beachiness(Math.atan2(z, x)) > 0.25,
    2.2,
  )
  const rocks = scatter(404, Math.round(60 * k), (x, z, h) => h > -0.5 && coastE(x, z) > 0.78 && coastE(x, z) < 1.04 && clearOfSites(x, z, 0.4) && pathDistance(x, z) > 1, 1.1)
  const bushes = scatter(505, Math.round(80 * k), (x, z, h) => h > 0.6 && coastE(x, z) < 0.9 && pathDistance(x, z) > 1.1 && clearOfSites(x, z, 0.3) && clearOfViews(x, z), 0.9)
  const grass = scatter(606, Math.round(900 * k), (x, z, h) => h > 0.55 && coastE(x, z) < 0.92 && pathDistance(x, z) > 0.9 && clearOfSites(x, z, -0.6) && slopeAt(x, z) < 0.6, 0.35, 8)
  const flowers = scatter(707, Math.round(320 * k), (x, z, h) => h > 0.6 && coastE(x, z) < 0.9 && pathDistance(x, z) > 0.95 && clearOfSites(x, z, -0.4), 0.45, 8)

  const tree = (s: Spot) => [s.x, s.y - 0.05, s.z, s.s * 0.92, s.r] as [number, number, number, number, number]
  const pine = (s: Spot) => [s.x, s.y - 0.05, s.z, s.s * 0.95, s.r] as [number, number, number, number, number]
  // palms lean towards the sea
  const palm = (s: Spot) => [s.x, s.y - 0.05, s.z, s.s * 1.1, -Math.atan2(s.z, s.x)] as [number, number, number, number, number]
  const canopyPal = ['#7dbb57', '#5fa64f', '#9cc95a', '#4f9150', '#e2a24f', '#d77f5c', '#86b85a']
  return {
    trunk: instances(trees, tree),
    canopy: instances(trees, tree, canopyPal, (i) => (i * 7 + (i >> 2)) % canopyPal.length),
    pine: instances(pines, pine, ['#3f7d55', '#4b8b5a', '#356f50']),
    pineTrunk: instances(pines, pine),
    palmTrunk: instances(palms, palm),
    palmCrown: instances(palms, palm),
    rock: instances(rocks, (s) => [s.x, s.y - 0.1, s.z, s.s * 1.3, s.r, s.r * 0.3], ['#b3a2a0', '#9a8a92', '#c2b0a4', '#8e8090']),
    bush: instances(bushes, (s) => [s.x, s.y - 0.06, s.z, s.s, s.r], ['#4f9a4d', '#6aae55', '#3f8a4e', '#7fb860']),
    grass: instances(grass, (s) => [s.x, s.y - 0.04, s.z, s.s, s.r], ['#6fae4f', '#8cc35a', '#5a9a48', '#a3c95c']),
    flower: instances(flowers, (s) => [s.x, s.y - 0.04, s.z, s.s, s.r], ['#ffd1dc', '#ffe07a', '#ffffff', '#c9b5ff', '#ff9d7a']),
  }
}

export function buildGround(tier: Tier): GroundData {
  return { terrain: buildTerrain(tier), sea: buildSea(), veg: buildVegetation(tier) }
}

/** Every typed array in the payload, so it can be transferred (not copied) out of the worker. */
export function transferables(d: GroundData): ArrayBuffer[] {
  const t = d.terrain
  const out: ArrayBuffer[] = [t.position.buffer, t.normal.buffer, t.color.buffer, t.uv.buffer, t.index.buffer, d.sea.buffer] as ArrayBuffer[]
  for (const s of Object.values(d.veg)) {
    out.push(s.matrices.buffer as ArrayBuffer)
    if (s.colors) out.push(s.colors.buffer as ArrayBuffer)
  }
  return out
}
