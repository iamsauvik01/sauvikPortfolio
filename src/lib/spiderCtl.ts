import type { Object3D } from 'three'

export type SpiderAction = 'poke' | 'enter' | 'hello'
export type SpiderMode = 'ground' | 'hang'

/**
 * Imperative control surface for the 3D spider. UI code writes here,
 * the spider reads it every frame. No React state involved.
 */
export const spiderCtl = {
  /** DOM element id the spider/stage fits itself into. */
  anchorId: 'landing-anchor',
  mode: 'ground' as SpiderMode,
  /** Incremented to teleport the stage/spider pose instead of gliding. */
  snapId: 0,
  /** 0..1 — excitement (e.g. hovering the CTA). */
  excite: 0,
  /** Continuous farewell waving (contact section). */
  waving: false,
  /** Screen-space look override in client px (e.g. the CTA button). */
  look: null as null | { x: number; y: number },
  /** Queue of one-shot actions. */
  queue: [] as SpiderAction[],
  /** Written by the spider: its on-screen hit circle in client px. */
  screen: { x: -9999, y: -9999, r: 0 },
  /** Extra swing impulse for the hanging thread (the island camera writes this while it travels). */
  sway: 0,
  /** Whether the island stage (mound, beetles) is shown. */
  showIsland: true,
}

/** Move the spider to a new DOM anchor. */
export function setSpiderAnchor(id: string, mode: SpiderMode, opts: { snap?: boolean; island?: boolean } = {}) {
  spiderCtl.anchorId = id
  spiderCtl.mode = mode
  spiderCtl.showIsland = opts.island ?? mode === 'ground'
  if (opts.snap) spiderCtl.snapId++
}

export function triggerSpider(a: SpiderAction) {
  if (spiderCtl.queue.length < 3) spiderCtl.queue.push(a)
}

/** Shared scene references used by the camera rig for the eye-dive transition. */
export const sceneRefs = {
  eye: null as Object3D | null,
  /** World-space positions of moths, so the spider can glance at them. */
  moths: [] as { x: number; y: number; z: number }[],
}

/** Transition state animated by GSAP, read inside the render loop. */
export const camState = {
  /** 0 = resting camera, 1 = inside the spider's eye. */
  dive: 0,
  /** Background pulse when the world reacts. */
  pulse: 0,
  /** Creatures scatter strength. */
  scatter: 0,
  /** World fade-in 0..1. */
  reveal: 0,
}
