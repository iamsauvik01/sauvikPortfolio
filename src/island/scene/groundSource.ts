import type { GroundData, Tier } from './groundData'

let pending: Promise<GroundData> | null = null

/**
 * Starts (once) building the island ground in a Web Worker. Call early — the result is cached.
 * Falls back to building on the main thread if a worker can't run.
 */
export function loadGround(tier: Tier): Promise<GroundData> {
  if (pending) return pending
  pending = new Promise<GroundData>((resolve) => {
    const fallback = () => import('./groundData').then((m) => resolve(m.buildGround(tier)))
    try {
      const w = new Worker(new URL('./groundWorker.ts', import.meta.url), { type: 'module' })
      w.onmessage = (e: MessageEvent<GroundData>) => {
        resolve(e.data)
        w.terminate()
      }
      w.onerror = () => {
        w.terminate()
        fallback()
      }
      w.postMessage({ tier })
    } catch {
      fallback()
    }
  })
  return pending
}
