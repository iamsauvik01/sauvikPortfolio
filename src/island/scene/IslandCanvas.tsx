import { Children, use, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import type { DeviceProfile } from '../../lib/device'
import { islandStore } from '../store'
import { appStore } from '../../lib/appStore'
import { projectAnchors } from '../pins'
import { SITES, padHeight } from '../terrain'
import { CameraDirector } from './CameraDirector'
import { bakeStatic } from './batch'
import { BlobField, GlowField } from './glows'
import { loadGround } from './groundSource'
import { Clock, Clouds, Lights, Ocean, SkyDome } from './Atmosphere'
import { Terrain, Vegetation } from './Ground'
import { Fireflies, Gulls, Sailboat } from './Life'
import { Hut, Pier } from './landmarks/Hut'
import { Workshop } from './landmarks/Workshop'
import { Castle } from './landmarks/Castle'
import { Lab } from './landmarks/Lab'
import { Cove } from './landmarks/Cove'
import { Lighthouse } from './landmarks/Lighthouse'

/** Once the visitor has tapped DISCOVER, preparation stops waiting for idle time. */
const hurry = () => {
  const p = appStore.get().phase
  return p !== 'landing' && p !== 'loading'
}
const idle = (fn: () => void) =>
  hurry() ? setTimeout(fn, 0) : 'requestIdleCallback' in window ? requestIdleCallback(() => fn(), { timeout: 150 }) : setTimeout(fn, 16)
const nextIdle = () => new Promise<void>((r) => idle(r))

/**
 * A soft studio environment so metals (gold, copper, brass) have something to reflect.
 * Built once, up front — so every shader is compiled against the final environment and
 * nothing recompiles when the island first appears.
 */
function buildEnvironment(gl: THREE.WebGLRenderer) {
  const env = new THREE.Scene()
  const panels: [string, number, [number, number, number], [number, number]][] = [
    ['#fff1e0', 2.2, [0, 12, 10], [30, 10]],
    ['#ffb59a', 1.6, [-14, 4, 4], [8, 10]],
    ['#9fd6ff', 1.1, [14, 5, -6], [8, 8]],
    ['#4f8a74', 0.5, [0, -6, 0], [30, 30]],
  ]
  for (const [c, k, p, sc] of panels) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false }),
    )
    m.position.set(...p)
    m.scale.set(sc[0], sc[1], 1)
    m.lookAt(0, 0, 0)
    env.add(m)
  }
  const pmrem = new THREE.PMREMGenerator(gl)
  // 64px is plenty for soft studio reflections (and much cheaper to filter than the 256 default)
  const rt = pmrem.fromScene(env, 0.04, 0.1, 100, { size: 64 })
  pmrem.dispose()
  env.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
  })
  return rt.texture
}

/**
 * Gets the island fully ready while the visitor is still on the landing page, in small
 * idle-time steps so Bit never stutters: environment → static batching → shader compile
 * (one chunk at a time, in parallel where the GPU driver allows) → one hidden frame that
 * uploads geometry/textures and bakes the shadows. The dive then opens onto a warm scene.
 */
function Warmup() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const started = useRef(false)
  useEffect(() => {
    // runs once for the life of the canvas (StrictMode's dev re-mount must not cancel it)
    if (started.current) return
    started.current = true
    const debug = import.meta.env.DEV || location.search.includes('debug')
    const step = async (label: string, fn: () => unknown) => {
      await nextIdle()
      const t = performance.now()
      await fn()
      if (debug) console.debug(`[warmup] ${label}: ${(performance.now() - t).toFixed(1)}ms`)
    }
    ;(async () => {
      await step('environment', () => (scene.environment = buildEnvironment(gl)))
      // only children that actually contain something to merge / compile get a step of their own
      const hasRoots = (o: THREE.Object3D) => {
        let has = false
        o.traverse((c) => (has ||= c.userData.batch === true))
        return has
      }
      for (const child of scene.children.filter(hasRoots)) await step(`bake ${child.type}`, () => bakeStatic(child))
      for (const child of scene.children.filter((c) => !(c as THREE.Light).isLight))
        await step(`compile ${child.type}`, () => gl.compileAsync(child, camera, scene).catch(() => {}))
      camera.position.set(0, 60, 80)
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()
      // one hidden frame uploads every buffer / texture. The shadow pass is left out on purpose:
      // its depth shaders compile synchronously, so they're done on the island's first frame,
      // while the iris still covers the whole screen.
      await step('first frame', () => {
        const bake = gl.shadowMap.needsUpdate
        gl.shadowMap.needsUpdate = false
        gl.render(scene, camera)
        gl.shadowMap.needsUpdate = bake
      })
    })().finally(() => islandStore.set({ ready: true }))
  }, [gl, scene, camera])
  return null
}

/**
 * Keeps the DOM pin layer glued to the world. Mounted after the camera director,
 * so it runs after the camera moves (default priority — a positive one would
 * take over R3F's render loop).
 */
function Projector() {
  useFrame((state) => {
    state.camera.updateMatrixWorld()
    projectAnchors(state.camera, state.size.width, state.size.height)
  })
  return null
}

/**
 * The sun never moves, so shadows are baked rather than re-rendered every frame:
 * once at start, then again after a place finishes animating open or closed.
 * (Halves the draw calls on desktop.)
 */
function ShadowBaker({ enabled }: { enabled: boolean }) {
  const gl = useThree((s) => s.gl)
  const pending = useRef(1)
  useEffect(() => {
    if (!enabled) return
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    const timers: ReturnType<typeof setTimeout>[] = []
    let last = ''
    const un = islandStore.subscribe(() => {
      const { focus, sub } = islandStore.get()
      const key = `${focus}|${sub}`
      if (key === last) return
      last = key
      // once, after doors / lids / flags have finished moving (one GPU shadow pass per visit)
      timers.push(setTimeout(() => (pending.current = 1), 1800))
    })
    return () => {
      un()
      timers.forEach(clearTimeout)
      gl.shadowMap.autoUpdate = true
    }
  }, [enabled, gl])
  useFrame(() => {
    if (enabled && pending.current > 0) {
      pending.current--
      gl.shadowMap.needsUpdate = true
    }
  })
  return null
}

/**
 * Mounts heavy children one per idle slice while the island is still hidden (so the landing
 * page never stalls on building 3D objects). After the visitor taps DISCOVER it keeps going without
 * waiting for idle time, still one object per task so the dive animation keeps its frames.
 */
function Stagger({ onDone, children }: { onDone: () => void; children: ReactNode }) {
  const items = Children.toArray(children)
  const [n, setN] = useState(1)
  const shown = n
  useEffect(() => {
    if (shown >= items.length) {
      onDone()
      return
    }
    let cancelled = false
    idle(() => !cancelled && setN((k) => k + 1))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, items.length])
  return <>{items.slice(0, shown)}</>
}

const at = (id: keyof typeof SITES, dy = 0): [number, number, number] => [SITES[id].x, padHeight(id) + dy, SITES[id].z]

export default function IslandCanvas({ profile, active }: { profile: DeviceProfile; active: boolean }) {
  const tier = profile.tier
  const shadows = tier === 'high'
  const cap = tier === 'high' ? 1.75 : tier === 'mid' ? 1.4 : 1.1
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, cap))
  // terrain, seabed and vegetation are built in a worker; suspend until they arrive
  const ground = use(loadGround(tier))
  const ready = islandStore.use((s) => s.ready)
  const [built, setBuilt] = useState(false)

  return (
    <Canvas
      dpr={dpr}
      // never render before the warm-up is done: a cold first frame compiles every shader at once
      frameloop={active && ready ? 'always' : 'never'}
      shadows={shadows ? 'percentage' : false}
      camera={{ fov: 34, position: [0, 60, 80], near: 0.5, far: 900 }}
      gl={{ antialias: tier !== 'low', powerPreference: 'high-performance', stencil: false }}
      onCreated={(state) => {
        const { gl } = state
        if (import.meta.env.DEV || location.search.includes('debug')) Object.assign(window, { __island: state })
        // reading shader logs forces the driver to finish compiling synchronously — dev only
        gl.debug.checkShaderErrors = import.meta.env.DEV
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(0.85, d - 0.3))}
        onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio || 1, d + 0.15, cap))}
        flipflops={3}
      />
      <Clock />
      <CameraDirector reducedMotion={profile.reducedMotion} />
      <Lights shadows={shadows} tier={tier} />
      <SkyDome />
      <Ocean sea={ground.sea} />
      <Terrain tier={tier} data={ground.terrain} />
      <Vegetation tier={tier} data={ground.veg} />
      <Stagger onDone={() => setBuilt(true)}>
        <Hut />
        <Pier />
        <Workshop />
        <Castle />
        <Lab />
        <Cove />
        <Lighthouse />
        <Clouds count={tier === 'low' ? 8 : 14} />
        {!profile.reducedMotion && <Gulls count={tier === 'low' ? 3 : 6} />}
        <Sailboat />
<Fireflies count={tier === 'low' ? 18 : 40} center={at('hut')} radius={6} />
        <Fireflies count={tier === 'low' ? 14 : 30} center={at('lighthouse')} radius={6} height={3} />
        <Fireflies count={tier === 'low' ? 12 : 26} center={at('castle', 1)} radius={7} height={4} color="#c9b5ff" />
      </Stagger>

      <BlobField />
      <GlowField />
      <ShadowBaker enabled={shadows} />
      <Projector />
      {built && <Warmup />}
    </Canvas>
  )
}
