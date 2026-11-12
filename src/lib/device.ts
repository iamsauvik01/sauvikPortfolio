export type Tier = 'low' | 'mid' | 'high'

export interface DeviceProfile {
  /** Small viewport or touch-first device. */
  mobile: boolean
  /** Primary input is coarse (touch). */
  coarse: boolean
  reducedMotion: boolean
  webgl: boolean
  tier: Tier
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export function detectDevice(): DeviceProfile {
  const mq = (q: string) => window.matchMedia(q).matches
  const coarse = mq('(pointer: coarse)') && !mq('(any-pointer: fine)')
  const narrow = mq('(max-width: 820px)')
  const mobile = narrow || (coarse && Math.min(window.screen.width, window.screen.height) < 900)
  const reducedMotion = mq('(prefers-reduced-motion: reduce)')
  const cores = navigator.hardwareConcurrency || 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  let tier: Tier = 'high'
  if (mobile || cores <= 4 || memory <= 4) tier = 'mid'
  if ((mobile && (cores <= 4 || memory <= 3)) || cores <= 2) tier = 'low'
  return { mobile, coarse, reducedMotion, webgl: hasWebGL(), tier }
}

/** Snapshot computed once at boot. */
export const device: DeviceProfile =
  typeof window !== 'undefined'
    ? detectDevice()
    : { mobile: false, coarse: false, reducedMotion: false, webgl: true, tier: 'high' }
