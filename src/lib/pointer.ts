/**
 * Global, non-reactive pointer state. Read inside animation loops
 * (useFrame / gsap.ticker) — never triggers React renders.
 */
export const pointer = {
  /** Normalised device coords (-1..1, y up). */
  x: 0,
  y: 0,
  /** Client pixels. */
  px: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  py: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  /** performance.now() of the last movement. */
  lastMove: -1e9,
  /** True once the user has moved a pointer at all. */
  engaged: false,
  /** Whether the most recent input was touch. */
  touch: false,
  /** True while a pointer is pressed / a finger is on the screen. */
  down: false,
}

let attached = 0

function update(clientX: number, clientY: number) {
  pointer.px = clientX
  pointer.py = clientY
  pointer.x = (clientX / window.innerWidth) * 2 - 1
  pointer.y = -(clientY / window.innerHeight) * 2 + 1
  pointer.lastMove = performance.now()
  pointer.engaged = true
}

const onMove = (e: PointerEvent) => {
  pointer.touch = e.pointerType === 'touch'
  update(e.clientX, e.clientY)
}
const onDown = (e: PointerEvent) => {
  pointer.touch = e.pointerType === 'touch'
  pointer.down = true
  update(e.clientX, e.clientY)
}
const onUp = () => {
  pointer.down = false
}

/** Attach listeners once; returns a disposer. Safe to call multiple times. */
export function initPointer() {
  if (attached++ === 0) {
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
  }
  return () => {
    if (--attached === 0) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }
}

/** Seconds since the pointer last moved. */
export function pointerIdle() {
  return (performance.now() - pointer.lastMove) / 1000
}
