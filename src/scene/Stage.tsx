import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { spiderCtl } from '../lib/spiderCtl'
import { damp } from '../lib/math'
import { DESIGN } from './spider/buildSpider'

export const BASE_CAM_Z = 12
export const BASE_FOV = 30

/**
 * Fits its children (the spider + its little island) into a DOM element.
 * Layout is owned by HTML/CSS; the 3D world simply follows it — this keeps
 * the composition responsive at every breakpoint.
 */
export function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)
  const st = useRef({ init: false, anchor: '', since: 0, snapSeen: -1 })

  useFrame((state, delta) => {
    const g = ref.current
    if (!g) return
    const el = document.getElementById(spiderCtl.anchorId)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    const { width, height } = state.size
    const halfH = BASE_CAM_Z * Math.tan((BASE_FOV * Math.PI) / 360)
    const halfW = halfH * (width / height)
    const cx = (((r.left + r.width / 2) / width) * 2 - 1) * halfW
    const s = Math.min(((r.width / width) * 2 * halfW) / DESIGN.w, ((r.height / height) * 2 * halfH) / DESIGN.h)
    // the little world floats gently
    const bob = spiderCtl.mode === 'ground' ? Math.sin(state.clock.elapsedTime * 0.8) * 0.07 * s : 0
    const by = -((r.bottom / height) * 2 - 1) * halfH + bob
    const tilt = spiderCtl.mode === 'hang' ? 0 : 0.2

    const S = st.current
    if (S.anchor !== spiderCtl.anchorId) {
      S.anchor = spiderCtl.anchorId
      S.since = 0
    }
    S.since += delta
    const snap = !S.init || S.snapSeen !== spiderCtl.snapId
    S.snapSeen = spiderCtl.snapId
    if (snap) {
      S.init = true
      g.position.set(cx, by, 0)
      g.scale.setScalar(s)
      g.rotation.x = tilt
      return
    }
    // glide slowly right after switching anchors, then track tightly
    const lambda = S.since < 1.6 ? 3.2 : 14
    const dt = Math.min(delta, 1 / 20)
    g.position.x = damp(g.position.x, cx, lambda, dt)
    g.position.y = damp(g.position.y, by, lambda, dt)
    g.scale.setScalar(damp(g.scale.x, s, lambda, dt))
    g.rotation.x = damp(g.rotation.x, tilt, 3, dt)
  })

  return <group ref={ref}>{children}</group>
}
