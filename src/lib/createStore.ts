import { useSyncExternalStore } from 'react'

/** Minimal external store with selector subscriptions (no extra dependency). */
export function createStore<T extends object>(initial: T) {
  let state = initial
  const listeners = new Set<() => void>()

  const get = () => state
  const set = (partial: Partial<T> | ((s: T) => Partial<T>)) => {
    const next = typeof partial === 'function' ? partial(state) : partial
    let changed = false
    for (const k in next) {
      if (!Object.is(next[k], state[k])) {
        changed = true
        break
      }
    }
    if (!changed) return
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }
  function use<S>(selector: (s: T) => S): S {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state),
    )
  }
  return { get, set, subscribe, use }
}
