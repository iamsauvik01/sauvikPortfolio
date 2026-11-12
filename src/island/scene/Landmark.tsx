import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { islandStore, selectSub, visit } from '../store'
import { SITES, padHeight } from '../terrain'
import { damp } from '../../lib/math'
import type { LocationId } from '../../types/content'
import { DYN, ROOT } from './batch'

/** Animated state of a landmark, read inside children's useFrame. */
export interface LandmarkState {
  /** 0..1 — eases in while the camera visits this place. */
  act: number
  /** 0..1 — eases in while hovered from afar. */
  hover: number
  id: LocationId
}

const Ctx = createContext<React.RefObject<LandmarkState> | null>(null)
export const useLandmark = () => useContext(Ctx)!

function setCursor(on: boolean) {
  document.documentElement.classList.toggle('island-hover', on)
}

/** A place on the island: positions itself on its pad and handles visiting. */
export function Landmark({ id, children }: { id: LocationId; children: ReactNode }) {
  const s = SITES[id]
  const state = useRef<LandmarkState>({ act: 0, hover: 0, id })
  const lift = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { focus, hover } = islandStore.get()
    const st = state.current
    st.act = damp(st.act, focus === id ? 1 : 0, 2.4, dt)
    st.hover = damp(st.hover, hover === id && focus !== id ? 1 : 0, 8, dt)
    const g = lift.current
    if (g) {
      // only touch the transform while it is actually changing — an idle landmark then costs no
      // matrix work at all for its (large) subtree
      const k = st.hover < 0.001 ? 0 : st.hover
      if (g.matrixAutoUpdate) g.matrixAutoUpdate = false
      if (Math.abs(g.position.y - k * 0.25) > 1e-5) {
        g.position.y = k * 0.25
        g.scale.setScalar(1 + k * 0.035)
        g.updateMatrix()
      }
    }
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (islandStore.get().focus === id) return
    e.stopPropagation()
    islandStore.set({ hover: id })
    setCursor(true)
  }
  const onOut = () => {
    if (islandStore.get().hover === id) islandStore.set({ hover: null })
    setCursor(false)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return
    if (islandStore.get().focus === id) return
    e.stopPropagation()
    setCursor(false)
    visit(id)
  }

  return (
    <Ctx.Provider value={state}>
      <group position={[s.x, padHeight(id), s.z]} rotation-y={s.yaw} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <group ref={lift} userData={ROOT}>{children}</group>
        <HoverRing id={id} r={s.r} />
      </group>
    </Ctx.Provider>
  )
}

/** Soft glowing ring on the ground while a place is hovered from afar. */
function HoverRing({ r }: { id: LocationId; r: number }) {
  const st = useLandmark()
  const ref = useRef<THREE.Mesh>(null)
  const m = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    [],
  )
  useFrame((s) => {
    const k = st.current.hover
    m.opacity = k * (0.35 + Math.sin(s.clock.elapsedTime * 4) * 0.1)
    if (ref.current) ref.current.visible = k > 0.01
  })
  return (
    <mesh ref={ref} userData={DYN} rotation-x={-Math.PI / 2} position-y={0.06} material={m} raycast={() => null}>
      <ringGeometry args={[r * 0.95, r * 1.05, 48]} />
    </mesh>
  )
}

/**
 * An object inside a place you can poke once you're there
 * (a machine, a tower, a project, a treasure).
 */
export function Hot({ loc, id, children }: { loc: LocationId; id: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const k = useRef({ h: 0, sel: 0 })
  const key = `${loc}:${id}`

  useFrame((st, delta) => {
    const dt = Math.min(delta, 0.05)
    const { focus, hover, sub } = islandStore.get()
    const active = focus === loc
    k.current.h = damp(k.current.h, active && hover === key ? 1 : 0, 10, dt)
    k.current.sel = damp(k.current.sel, active && sub === id ? 1 : 0, 5, dt)
    const g = ref.current
    if (g) {
      const h = k.current.h < 0.001 ? 0 : k.current.h
      const sel = k.current.sel < 0.001 ? 0 : k.current.sel
      const bob = sel * Math.sin(st.clock.elapsedTime * 2.2) * 0.04
      const y = h * 0.08 + bob
      const sc = 1 + h * 0.07 + sel * 0.04
      if (g.matrixAutoUpdate) g.matrixAutoUpdate = false
      if (Math.abs(g.position.y - y) > 1e-5 || Math.abs(g.scale.x - sc) > 1e-5) {
        g.position.y = y
        g.scale.setScalar(sc)
        g.updateMatrix()
      }
    }
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (islandStore.get().focus !== loc) return
    e.stopPropagation()
    islandStore.set({ hover: key })
    setCursor(true)
  }
  const onOut = () => {
    if (islandStore.get().hover === key) islandStore.set({ hover: null })
    setCursor(false)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (islandStore.get().focus !== loc || e.delta > 6) return
    e.stopPropagation()
    selectSub(id)
  }

  return (
    <group onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      <group ref={ref} userData={ROOT}>{children}</group>
    </group>
  )
}

