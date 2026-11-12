import { createStore } from './createStore'

/**
 * loading   → assets / scene warming up
 * landing   → the living world + DISCOVER SAUVIK
 * entering  → cinematic dive into the portfolio
 * portfolio → the explorable island
 * leaving   → returning to the landing world
 */
export type Phase = 'loading' | 'landing' | 'entering' | 'portfolio' | 'leaving'

interface AppState {
  phase: Phase
  sceneReady: boolean
  ctaHover: boolean
  /** Legacy marker kept for the landing transitions. */
  activeSection: string
  /** True when the 3D world could not start — use the 2D fallback. */
  fallback: boolean
}

export const appStore = createStore<AppState>({
  phase: 'loading',
  sceneReady: false,
  ctaHover: false,
  activeSection: 'intro',
  fallback: false,
})
