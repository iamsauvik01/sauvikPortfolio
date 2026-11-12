import * as THREE from 'three'
import type { LocationId } from '../types/content'
import { content } from '../data/portfolio'
import { SITES, padHeight } from './terrain'
import { SUBS, toWorld } from './layout'
import { islandStore } from './store'

/**
 * World-anchored labels (map pins + object tags) live in ONE plain DOM layer.
 * The 3D scene projects every anchor to the screen each frame and writes the
 * transform straight onto the element — no per-label React roots.
 */
export interface Anchor {
  key: string
  pos: THREE.Vector3
  el: HTMLElement | null
  /** Last transform written (skip identical DOM writes). */
  last: string
  /** When this label was last on screen (keeps tracking while it fades out). */
  seen: number
}

const PIN_Y: Record<LocationId, number> = { hut: 4.9, workshop: 5.2, castle: 7.8, lab: 5.4, cove: 3.6, lighthouse: 8.6 }

/** Height of each object's tag above its anchor. */
const TAG_Y: Record<string, number> = {
  engine: 1.9,
  forge: 1.9,
  studio: 1.95,
  vault: 2.05,
  relay: 3.3,
  bench: 1.65,
  gate: 3.0,
  tower: 6.6,
  keep: 8.3,
  mspsdc: 2.05,
  cibf: 2.05,
  edtech: 2.05,
  hotel: 2.05,
  trophy: 0.85,
  medal: 0.85,
  crown: 0.85,
}

export const anchors = new Map<string, Anchor>()

function ensure(key: string, pos: THREE.Vector3) {
  if (!anchors.has(key)) anchors.set(key, { key, pos, el: null, last: '', seen: 0 })
}

for (const id of Object.keys(SITES) as LocationId[]) {
  ensure(id, new THREE.Vector3(SITES[id].x, padHeight(id) + PIN_Y[id], SITES[id].z))
  const subs = SUBS[id]
  if (subs) for (const [sub, p] of Object.entries(subs)) ensure(`${id}:${sub}`, toWorld(id, [p[0], p[1] + (TAG_Y[sub] ?? 1.6), p[2]]))
}

export function bindAnchor(key: string, el: HTMLElement | null) {
  const a = anchors.get(key)
  if (a) a.el = el
}

/** Human labels for the objects inside each place. */
export function subLabels(loc: LocationId): { id: string; label: string }[] {
  const isl = content.island
  switch (loc) {
    case 'workshop':
      return isl.workshop.stations.map((s) => ({ id: s.id, label: s.name.replace('The ', '') }))
    case 'castle':
      return isl.castle.chapters.map((c) => ({ id: c.id, label: `${c.building.replace('The ', '')} · ${c.when}` }))
    case 'lab':
      return isl.lab.projects.map((p) => ({ id: p.id, label: p.code }))
    case 'cove':
      return isl.cove.treasures.map((t) => ({ id: t.id, label: t.title }))
    default:
      return []
  }
}

const _v = new THREE.Vector3()

/** Called every frame by the scene: place each bound label on screen. */
export function projectAnchors(camera: THREE.Camera, w: number, h: number) {
  const { focus, intro } = islandStore.get()
  const now = performance.now()
  for (const a of anchors.values()) {
    const el = a.el
    if (!el) continue
    // pins show on the overview; tags only for the place being visited.
    // Hidden labels stop being tracked (after they've had time to fade out).
    const sep = a.key.indexOf(':')
    const on = sep < 0 ? focus === null && !intro : focus === a.key.slice(0, sep)
    if (on) a.seen = now
    else if (now - a.seen > 700) continue
    _v.copy(a.pos).project(camera)
    const behind = _v.z > 1 || _v.z < -1
    const tf = behind ? 'hidden' : `translate3d(${((_v.x * 0.5 + 0.5) * w) | 0}px, ${((-_v.y * 0.5 + 0.5) * h) | 0}px, 0) translate(-50%, -100%)`
    // skip identical writes (a still camera costs no style work at all)
    if (tf === a.last) continue
    a.last = tf
    if (behind) el.style.visibility = 'hidden'
    else {
      el.style.transform = tf
      el.style.visibility = ''
    }
  }
}
