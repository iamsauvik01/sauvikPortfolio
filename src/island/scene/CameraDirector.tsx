import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { islandStore, world } from '../store'
import { appStore } from '../../lib/appStore'
import { pointer } from '../../lib/pointer'
import { clamp, damp } from '../../lib/math'
import { arrivalShot, locationShot, overviewShot, subShot, type Shot } from '../layout'

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function wrap(a: number) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

/** Room the story panel takes, so the camera can frame things beside it. */
export function panelInset(w: number, h: number) {
  if (w >= 900) return { x: Math.min(520, w * 0.4) + 28, y: 0 }
  return { x: 0, y: Math.round(h * 0.56) }
}

function shotFor(aspect: number): Shot {
  const { focus, sub } = islandStore.get()
  if (!focus) return overviewShot(aspect)
  if (sub) return subShot(focus, sub, aspect)
  return locationShot(focus, aspect)
}

/**
 * Flies the camera between shots along an arc, lets visitors drag to look
 * around, and shifts the frame so the subject sits beside the story panel.
 */
export function CameraDirector({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)

  const S = useRef({
    cur: { target: new THREE.Vector3(), az: 0, el: 0.6, dist: 60 } as Shot,
    from: null as Shot | null,
    to: overviewShot(1.6) as Shot,
    t: 1,
    dur: 2,
    hop: 0,
    arrival: false,
    user: { az: 0, el: 0, zoom: 1 },
    inset: { x: 0, y: 0 },
    drag: null as null | { x: number; y: number; id: number },
    pinch: new Map<number, { x: number; y: number }>(),
    pinchD: 0,
    lastKey: '',
  })

  // start a flight towards a new shot
  const fly = (to: Shot, opts: { dur?: number; arrival?: boolean } = {}) => {
    const s = S.current
    const c = s.cur
    // fold the user's orbit into the start so nothing jumps
    s.from = { target: c.target.clone(), az: c.az + s.user.az, el: c.el + s.user.el, dist: c.dist * s.user.zoom }
    s.user = { az: 0, el: 0, zoom: 1 }
    s.to = to
    s.t = 0
    s.arrival = !!opts.arrival
    const travel = s.from.target.distanceTo(to.target)
    s.dur = opts.dur ?? clamp(1.3 + travel * 0.035, 1.3, 2.6)
    s.hop = opts.arrival ? 0 : clamp(travel * 0.45, 0, 14)
    if (reducedMotion) s.dur = Math.min(s.dur, 0.9)
  }

  // react to navigation + the arrival from Bit's world
  useEffect(() => {
    const aspect = () => size.width / size.height
    const check = () => {
      const { focus, sub } = islandStore.get()
      const key = `${focus}|${sub}`
      const s = S.current
      if (key === s.lastKey) return
      s.lastKey = key
      fly(shotFor(aspect()))
    }
    const un1 = islandStore.subscribe(check)
    let prevPhase = appStore.get().phase
    const un2 = appStore.subscribe(() => {
      const ph = appStore.get().phase
      if (ph === prevPhase) return
      prevPhase = ph
      if (ph === 'portfolio' && islandStore.get().intro) {
        const s = S.current
        const a = arrivalShot()
        s.cur = { ...a, target: a.target.clone() }
        s.lastKey = 'null|null'
        world.arriving = true
        fly(overviewShot(aspect()), { dur: reducedMotion ? 0.8 : 4.6, arrival: true })
      }
    })
    return () => {
      un1()
      un2()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, reducedMotion])

  // re-frame on resize
  useEffect(() => {
    const s = S.current
    if (s.t >= 1) {
      const to = shotFor(size.width / size.height)
      s.to = to
      s.cur = { ...to, target: to.target.clone() }
    }
  }, [size.width, size.height])

  // drag to orbit, wheel / pinch to zoom
  useEffect(() => {
    const el = gl.domElement
    const s = S.current
    const limits = () => (islandStore.get().focus ? { az: 0.9, elMin: -0.18, elMax: 0.42 } : { az: 99, elMin: -0.3, elMax: 0.5 })
    const down = (e: PointerEvent) => {
      s.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (s.pinch.size === 2) {
        const [a, b] = [...s.pinch.values()]
        s.pinchD = Math.hypot(a.x - b.x, a.y - b.y)
        s.drag = null
        return
      }
      s.drag = { x: e.clientX, y: e.clientY, id: e.pointerId }
    }
    const move = (e: PointerEvent) => {
      if (s.pinch.has(e.pointerId)) s.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (s.pinch.size === 2) {
        const [a, b] = [...s.pinch.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (s.pinchD > 0) s.user.zoom = clamp(s.user.zoom * (s.pinchD / d), 0.55, 1.6)
        s.pinchD = d
        return
      }
      if (!s.drag || s.drag.id !== e.pointerId) return
      const dx = e.clientX - s.drag.x
      const dy = e.clientY - s.drag.y
      s.drag.x = e.clientX
      s.drag.y = e.clientY
      if (s.t < 1 && s.arrival) return
      const L = limits()
      s.user.az = clamp(s.user.az - dx * 0.0055, -L.az, L.az)
      s.user.el = clamp(s.user.el + dy * 0.0035, L.elMin, L.elMax)
    }
    const up = (e: PointerEvent) => {
      s.pinch.delete(e.pointerId)
      if (s.pinch.size < 2) s.pinchD = 0
      if (s.drag?.id === e.pointerId) s.drag = null
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      s.user.zoom = clamp(s.user.zoom * Math.exp(e.deltaY * 0.0011), 0.55, 1.6)
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    el.style.touchAction = 'none'
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  const _pos = new THREE.Vector3()
  const _tgt = new THREE.Vector3()

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const s = S.current
    const c = s.cur

    // flight
    if (s.t < 1 && s.from) {
      s.t = Math.min(1, s.t + dt / s.dur)
      const e = s.arrival ? easeOut(s.t) * 0.35 + ease(s.t) * 0.65 : ease(s.t)
      c.target.lerpVectors(s.from.target, s.to.target, e)
      c.az = s.from.az + wrap(s.to.az - s.from.az) * e
      c.el = THREE.MathUtils.lerp(s.from.el, s.to.el, e)
      c.dist = THREE.MathUtils.lerp(s.from.dist, s.to.dist, e) + Math.sin(Math.PI * e) * s.hop
      world.travel = Math.sin(Math.PI * s.t) * (s.arrival ? 0.3 : 1)
      if (s.t >= 1) {
        world.arriving = false
        world.travel = 0
      }
    } else {
      // settle exactly on the shot (resizes / re-framing)
      c.target.lerp(s.to.target, 1 - Math.exp(-4 * dt))
      c.az = c.az + wrap(s.to.az - c.az) * (1 - Math.exp(-4 * dt))
      c.el = damp(c.el, s.to.el, 4, dt)
      c.dist = damp(c.dist, s.to.dist, 4, dt)
    }

    // living camera: slow drift + pointer parallax
    const t = state.clock.elapsedTime
    const live = reducedMotion ? 0 : 1
    const overview = !islandStore.get().focus
    const drift = live * (overview ? Math.sin(t * 0.06) * 0.07 : Math.sin(t * 0.18) * 0.012)
    const par = live && !pointer.touch ? pointer.x * (overview ? 0.035 : 0.02) : 0
    const parY = live && !pointer.touch ? pointer.y * 0.015 : 0

    const az = c.az + s.user.az + drift + par
    const el = clamp(c.el + s.user.el + parY, 0.08, 1.4)
    const dist = c.dist * s.user.zoom
    _tgt.copy(c.target)
    _pos.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(dist).add(_tgt)
    // never dip under the waves
    _pos.y = Math.max(_pos.y, 1.2)
    camera.position.copy(_pos)
    camera.lookAt(_tgt)

    // make room for the story panel
    const panel = islandStore.get().focus !== null && !islandStore.get().logbook
    const want = panel ? panelInset(size.width, size.height) : { x: 0, y: 0 }
    s.inset.x = damp(s.inset.x, want.x / 2, 3.2, dt)
    s.inset.y = damp(s.inset.y, want.y / 2, 3.2, dt)
    if (Math.abs(s.inset.x) > 0.5 || Math.abs(s.inset.y) > 0.5) {
      camera.setViewOffset(size.width, size.height, Math.round(s.inset.x), Math.round(s.inset.y), size.width, size.height)
    } else if (camera.view?.enabled) {
      camera.clearViewOffset()
    }
  })

  return null
}
