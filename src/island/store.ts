import { createStore } from '../lib/createStore'
import type { LocationId } from '../types/content'

export const ORDER: LocationId[] = ['hut', 'workshop', 'castle', 'lab', 'cove', 'lighthouse']

interface IslandState {
  /** The place the camera is visiting (null = whole island). */
  focus: LocationId | null
  /** A selected object inside the focused place (station, chapter, project, treasure). */
  sub: string | null
  /** Hovered place or object id (`hut`, `workshop:engine`, …). */
  hover: string | null
  visited: LocationId[]
  /** The arrival card is showing. */
  intro: boolean
  logbook: boolean
  /** The 3D island could not start — use the illustrated map. */
  flat: boolean
  /** Island scene finished building its first frame. */
  ready: boolean
}

export const islandStore = createStore<IslandState>({
  focus: null,
  sub: null,
  hover: null,
  visited: [],
  intro: true,
  logbook: false,
  flat: false,
  ready: false,
})

/**
 * Per-frame values shared between UI and the render loop (never trigger renders).
 */
export const world = {
  /** 0 = golden hour, 1 = night (the lighthouse ending). */
  night: 0,
  /** How fast the camera is currently travelling (0..1) — Bit swings with it. */
  travel: 0,
  /** The camera is flying the arrival swoop. */
  arriving: false,
}

export function visit(id: LocationId, sub: string | null = null) {
  const s = islandStore.get()
  islandStore.set({
    focus: id,
    sub,
    intro: false,
    visited: s.visited.includes(id) ? s.visited : [...s.visited, id],
  })
}

export function selectSub(sub: string | null) {
  islandStore.set({ sub })
}

export function overview() {
  islandStore.set({ focus: null, sub: null })
}

export function step(dir: 1 | -1) {
  const { focus } = islandStore.get()
  const i = focus ? ORDER.indexOf(focus) : dir === 1 ? -1 : ORDER.length
  const n = ORDER[(i + dir + ORDER.length) % ORDER.length]
  visit(n)
}

export function nextOf(id: LocationId): LocationId | null {
  const i = ORDER.indexOf(id)
  return i < ORDER.length - 1 ? ORDER[i + 1] : null
}

export function resetIsland() {
  world.night = 0
  islandStore.set({ focus: null, sub: null, hover: null, intro: true, logbook: false })
}
