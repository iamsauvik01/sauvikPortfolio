import * as THREE from 'three'
import type { LocationId } from '../types/content'
import { SITES, padHeight } from './terrain'

/** A camera framing: orbit `dist` units around `target`, from azimuth/elevation. */
export interface Shot {
  target: THREE.Vector3
  az: number
  el: number
  dist: number
}

type V3 = [number, number, number]

/** Object positions inside each landmark (landmark-local space, +z = front). */
export const SUBS: Partial<Record<LocationId, Record<string, V3>>> = {
  workshop: {
    engine: [-2.95, 0, 1.05],
    forge: [-1.95, 0, 2.6],
    studio: [-0.8, 0, 3.2],
    vault: [0.85, 0, 3.15],
    relay: [2.25, 0, 2.35],
    bench: [3.0, 0, 0.95],
  },
  castle: {
    gate: [0.9, 0, 3.0],
    tower: [-2.5, 1.1, 0.0],
    keep: [1.5, 2.2, -2.1],
  },
  lab: {
    mspsdc: [-3.0, 0, 0.55],
    cibf: [-1.25, 0, 2.35],
    edtech: [1.25, 0, 2.35],
    hotel: [3.0, 0, 0.55],
  },
  cove: {
    trophy: [-1.05, 1.75, 0.75],
    medal: [0, 2.15, 0.95],
    crown: [1.05, 1.75, 0.75],
  },
}

/** Camera framing per place: [height of look-at point, elevation, distance, azimuth offset]. */
const FRAMING: Record<LocationId, [number, number, number, number]> = {
  hut: [1.8, 0.42, 17, 0.12],
  workshop: [1.3, 0.46, 16.5, 0],
  castle: [3.0, 0.38, 21, -0.05],
  lab: [1.4, 0.44, 17, 0],
  cove: [1.3, 0.34, 13.5, 0],
  lighthouse: [3.0, 0.22, 21, 0.15],
}

/** Per-object framing tweaks: [lift, elevation, distance, azimuth offset]. */
const SUB_FRAMING: Record<string, [number, number, number, number]> = {
  gate: [1.2, 0.3, 10, 0.15],
  tower: [2.2, 0.32, 13.5, -0.35],
  keep: [2.6, 0.32, 16, 0.25],
  trophy: [-0.3, 0.3, 8.5, -0.15],
  medal: [-0.3, 0.3, 8.5, 0],
  crown: [-0.3, 0.3, 8.5, 0.15],
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const UP = new THREE.Vector3(0, 1, 0)

export function siteBase(id: LocationId) {
  const s = SITES[id]
  return new THREE.Vector3(s.x, padHeight(id), s.z)
}

/** Landmark-local → world position. */
export function toWorld(id: LocationId, local: V3) {
  const s = SITES[id]
  _q.setFromAxisAngle(UP, s.yaw)
  _m.compose(siteBase(id), _q, new THREE.Vector3(1, 1, 1))
  return new THREE.Vector3(...local).applyMatrix4(_m)
}

export function overviewShot(aspect: number): Shot {
  // fit the island horizontally on narrow screens (within reason)
  const fit = Math.min(2.6, Math.max(1, 1.45 / aspect))
  // portrait screens look down more steeply so the whole island fits
  const steep = aspect < 1 ? THREE.MathUtils.lerp(0.66, 1.0, Math.min(1, (1 - aspect) / 0.5)) : 0.66
  return { target: new THREE.Vector3(1.2, 0.5, 1.2), az: 0.0, el: steep, dist: 64 * fit * (aspect < 1 ? 0.92 : 1) }
}

export function arrivalShot(): Shot {
  return { target: new THREE.Vector3(0, 0, 0), az: -1.6, el: 1.32, dist: 150 }
}

export function locationShot(id: LocationId, aspect: number): Shot {
  const [lift, el, dist, azo] = FRAMING[id]
  const t = siteBase(id).add(new THREE.Vector3(0, lift, 0))
  // phones only show the top ~40% above the story sheet: pull back more for tall places
  const narrow = aspect < 0.8 ? (id === 'lighthouse' || id === 'castle' ? 1.7 : 1.3) : 1
  return { target: t, az: SITES[id].yaw + azo, el, dist: dist * narrow }
}

export function subShot(id: LocationId, sub: string, aspect: number): Shot {
  const local = SUBS[id]?.[sub]
  if (!local) return locationShot(id, aspect)
  const [lift, el, dist, azo] = SUB_FRAMING[sub] ?? [0.9, 0.46, id === 'lab' ? 7.8 : 9.2, 0]
  const t = toWorld(id, local).add(new THREE.Vector3(0, lift, 0))
  // look from the landmark's front, nudged so objects on the sides are seen face-on
  const side = Math.atan2(local[0], Math.max(0.5, local[2] + 2.5)) * 0.85
  const narrow = aspect < 0.8 ? 1.25 : 1
  return { target: t, az: SITES[id].yaw + side + azo, el, dist: dist * narrow }
}
