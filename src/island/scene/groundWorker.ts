/// <reference lib="webworker" />
import { buildGround, transferables, type Tier } from './groundData'

// Builds the island's ground off the main thread so the landing page stays smooth.
self.onmessage = (e: MessageEvent<{ tier: Tier }>) => {
  const data = buildGround(e.data.tier)
  ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(data, transferables(data))
}
