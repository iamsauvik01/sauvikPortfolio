/**
 * The island's geography — a pure height function plus the places that sit on it.
 * Everything that has to touch the ground (buildings, trees, the water's shoreline
 * shading) samples `heightAt`, so the world stays consistent.
 *
 * Self-contained on purpose (no imports) so it can be previewed from Node.
 */

export type SiteId = 'hut' | 'workshop' | 'castle' | 'lab' | 'cove' | 'lighthouse'

export interface Site {
  x: number
  z: number
  /** Flattened pad radius. */
  r: number
  /** Yaw the landmark faces (radians, 0 = +z / towards the default camera). */
  yaw: number
}

/** Where every landmark lives (world units, island ≈ 44 across). */
export const SITES: Record<SiteId, Site> = {
  hut: { x: 2.5, z: 12.6, r: 3.4, yaw: 0.12 },
  workshop: { x: -11.5, z: 4.8, r: 4.6, yaw: 0.95 },
  castle: { x: -4.6, z: -8.6, r: 5.2, yaw: 0.28 },
  lab: { x: 8.6, z: -6.4, r: 4.8, yaw: -0.42 },
  cove: { x: 14.6, z: 3.2, r: 3.6, yaw: -1.25 },
  lighthouse: { x: 14.6, z: 16.4, r: 2.6, yaw: -0.6 },
}

/** Tour route (closed loop) the dirt paths follow. */
const ROUTE: [number, number][] = [
  [2.5, 12.6],
  [-3.5, 11.2],
  [-8.2, 8.6],
  [-11.5, 4.8],
  [-11.6, -1.2],
  [-8.6, -5.6],
  [-4.6, -8.6],
  [0.6, -10.4],
  [5.2, -8.8],
  [8.6, -6.4],
  [12.6, -2.6],
  [14.6, 3.2],
  [15.0, 8.6],
  [14.6, 16.4],
  [10.2, 15.2],
  [6.4, 13.6],
  [2.5, 12.6],
]

/* ── noise ─────────────────────────────────────────────────── */
function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return s - Math.floor(s)
}
function vnoise(x: number, z: number) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  const a = hash(ix, iz)
  const b = hash(ix + 1, iz)
  const c = hash(ix, iz + 1)
  const d = hash(ix + 1, iz + 1)
  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1
}
export function fbm(x: number, z: number, oct = 4) {
  let v = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < oct; i++) {
    v += amp * vnoise(x * f, z * f)
    f *= 2.03
    amp *= 0.5
  }
  return v
}

const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const gauss = (d: number, s: number) => Math.exp(-(d * d) / (2 * s * s))
const angDiff = (a: number, b: number) => {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

const TH_LIGHT = Math.atan2(SITES.lighthouse.z, SITES.lighthouse.x)
const TH_COVE = Math.atan2(SITES.cove.z, SITES.cove.x)

/** Shoreline radius for a direction. */
export function shoreRadius(th: number) {
  let r = 20.4 + 1.7 * Math.sin(2 * th + 0.7) + 1.1 * Math.sin(3 * th - 1.1) + 0.55 * Math.sin(5 * th + 2.0) + 0.3 * Math.sin(9 * th + 0.4)
  r += 7.4 * gauss(angDiff(th, TH_LIGHT), 0.115)
  r -= 4.4 * gauss(angDiff(th, TH_COVE), 0.17)
  return r
}

/** 0..1 — how sandy the coast is in a direction. */
export function beachiness(th: number) {
  return Math.min(
    1,
    gauss(angDiff(th, 1.5), 0.5) + gauss(angDiff(th, TH_COVE), 0.22) + 0.55 * gauss(angDiff(th, 2.55), 0.32),
  )
}
/** 0..1 — how rocky / cliff-like the coast is. */
export function cliffiness(th: number) {
  return Math.min(1, sstep(0.15, -0.55, Math.sin(th)) * 0.9 + gauss(angDiff(th, TH_LIGHT), 0.09))
}

function rawHeight(x: number, z: number) {
  const d = Math.hypot(x, z)
  const th = Math.atan2(z, x)
  const R = shoreRadius(th) + fbm(x * 0.18 + 3, z * 0.18) * 1.1
  const e = d / R
  const beach = beachiness(th)
  // cliffs only shape the coast, never the interior
  const cliff = cliffiness(th) * sstep(0.5, 0.86, d / shoreRadius(th))
  let h: number
  if (e <= 1) {
    const bw = 0.03 + 0.15 * beach * (1 - cliff)
    const inland = 1.55 + fbm(x * 0.09, z * 0.09) * 1.0 + cliff * 1.5
    const sandTop = 0.42 + cliff * 1.2
    if (e > 1 - bw) h = sandTop * ((1 - e) / bw) ** (1 + cliff * 1.6)
    else h = sandTop + (inland - sandTop) * sstep(1 - bw, 1 - bw - 0.13 + cliff * 0.08, e)
    // cliffs fall steeply straight into the sea
    if (cliff > 0.05 && e > 1 - bw - 0.05) {
      const t = sstep(1, 0.955, e)
      h = h * (1 - cliff) + (inland * t) * cliff
    }
  } else {
    const o = (e - 1) * R
    h = -Math.min(7, o * 0.42 + o * o * 0.03) - cliff * 0.8 * sstep(0, 2, o)
  }
  // castle hill + a gentle rise for the lab
  h += 4.0 * gauss(Math.hypot(x - SITES.castle.x, z - SITES.castle.z + 0.6), 5.6) * sstep(1.05, 0.7, e)
  h += 0.9 * gauss(Math.hypot(x - SITES.lab.x, z - SITES.lab.z), 5.5) * sstep(1.05, 0.75, e)
  // small detail
  if (e < 1) h += fbm(x * 0.55, z * 0.55, 2) * 0.12 * sstep(1, 0.85, e)
  return h
}

/* ── pads + paths ──────────────────────────────────────────── */
const PADS = (Object.keys(SITES) as SiteId[]).map((id) => {
  const s = SITES[id]
  return { ...s, h: rawHeight(s.x, s.z) }
})

function catmull(pts: [number, number][], per: number) {
  const out: [number, number][] = []
  const n = pts.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(n - 1, i + 2)]
    for (let k = 0; k < per; k++) {
      const t = k / per
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[n - 1])
  return out
}
export const PATH = catmull(ROUTE, 10)

/** Distance from a point to the dirt path. */
export function pathDistance(x: number, z: number) {
  let best = 1e9
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i]
    const [bx, bz] = PATH[i + 1]
    const vx = bx - ax
    const vz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)))
    const dx = x - (ax + vx * t)
    const dz = z - (az + vz * t)
    const d = dx * dx + dz * dz
    if (d < best) best = d
  }
  return Math.sqrt(best)
}

/** Ground height at (x, z). Sea level is y = 0. */
export function heightAt(x: number, z: number) {
  let h = rawHeight(x, z)
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z)
    if (d < p.r + 2.6) h = h + (p.h - h) * sstep(p.r + 2.6, p.r, d)
  }
  return h
}

/** 0 = inland, 1 = shoreline, >1 = sea (for colouring / placement). */
export function coastE(x: number, z: number) {
  return Math.hypot(x, z) / shoreRadius(Math.atan2(z, x))
}

export function padHeight(id: SiteId) {
  return PADS.find((p) => p.x === SITES[id].x && p.z === SITES[id].z)!.h
}
