import { useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { appStore } from '../lib/appStore'
import { spiderCtl } from '../lib/spiderCtl'
import type { DeviceProfile } from '../lib/device'
import { CameraRig } from './CameraRig'
import { Stage } from './Stage'
import { Sky } from './background/Sky'
import { Atmosphere } from './background/Atmosphere'
import { DewWeb } from './environment/DewWeb'
import { Foreground } from './environment/Foreground'
import { Island } from './environment/Island'
import { Spider } from './spider/Spider'
import { Beetles } from './creatures/Beetles'
import { Moths } from './creatures/Moths'

/** Signals readiness after the first frames (shaders compiled) and manages shadow updates. */
function FrameBridge({ landing }: { landing: boolean }) {
  const frames = useRef(0)
  const gl = useThree((s) => s.gl)
  useFrame(() => {
    if (frames.current < 4) {
      frames.current++
      if (frames.current === 4) appStore.set({ sceneReady: true })
    }
    // Shadow map is only useful while the island is visible.
    gl.shadowMap.autoUpdate = landing || spiderCtl.showIsland
  })
  return null
}

function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <hemisphereLight args={['#cfc6ff', '#2a2034', 0.75]} />
      <directionalLight
        position={[4, 7, 7]}
        intensity={2.3}
        color="#ffe6cc"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <directionalLight position={[-6, 3, -6]} intensity={3} color="#ff9e7d" />
      <directionalLight position={[6, 2.5, -5]} intensity={2.4} color="#7fd6cf" />
      <pointLight position={[0, -1.5, 6]} intensity={8} distance={22} decay={2} color="#a08cff" />
    </>
  )
}

function SceneContents({ profile, landing }: { profile: DeviceProfile; landing: boolean }) {
  const q = profile.tier
  const shadows = q === 'high'
  return (
    <>
      <CameraRig reducedMotion={profile.reducedMotion} />
      <Lights shadows={shadows} />
      <Environment resolution={64} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 6]} scale={[10, 4, 1]} color="#fff1e0" />
        <Lightformer form="rect" intensity={1.4} position={[-6, 1, 3]} scale={[3, 6, 1]} color="#ffb59a" />
        <Lightformer form="ring" intensity={1.2} position={[5, 2, 4]} scale={2} color="#9fe8dd" />
        <Lightformer form="rect" intensity={0.6} position={[0, -4, 2]} scale={[8, 2, 1]} color="#6f5fb0" />
      </Environment>

      <group visible={landing}>
        <Sky octaves={q === 'high' ? 4 : 3} />
        <Atmosphere quality={q} />
        <DewWeb position={[-0.72, 0.58, -5]} scale={profile.mobile ? 0.8 : 1} />
        {landing && <Moths count={q === 'high' ? 7 : q === 'mid' ? 5 : 3} reducedMotion={profile.reducedMotion} />}
        {!profile.mobile && <Foreground />}
      </group>

      <Stage>
        <Island quality={q}>
          <Beetles count={q === 'high' ? 6 : q === 'mid' ? 4 : 3} reducedMotion={profile.reducedMotion} />
        </Island>
        <Spider quality={q} reducedMotion={profile.reducedMotion} shadows={shadows} />
      </Stage>
      <FrameBridge landing={landing} />
    </>
  )
}

export default function World({ profile }: { profile: DeviceProfile }) {
  const phase = appStore.use((s) => s.phase)
  const [dpr, setDpr] = useState<number>(() =>
    Math.min(window.devicePixelRatio || 1, profile.tier === 'high' ? 1.75 : profile.tier === 'mid' ? 1.5 : 1.15),
  )
  const landing = phase !== 'portfolio' && phase !== 'leaving'
  // On phones the portfolio itself is 2D — pause the 3D world entirely to save battery.
  const paused = profile.mobile && (phase === 'portfolio' || phase === 'leaving')

  return (
    <div
      className={`world ${landing ? 'world--landing' : 'world--overlay'}`}
      style={paused ? { display: 'none' } : undefined}
      aria-hidden="true"
    >
      <Canvas
        dpr={dpr}
        frameloop={paused ? 'never' : 'always'}
        shadows={profile.tier === 'high' ? 'percentage' : false}
        camera={{ fov: 30, position: [0, 0, 12], near: 0.02, far: 80 }}
        gl={{ antialias: profile.tier !== 'low', alpha: true, powerPreference: 'high-performance', stencil: false }}
        onCreated={(state) => {
          const { gl } = state
          if (import.meta.env.DEV || location.search.includes('debug')) Object.assign(window, { __world: state })
          gl.setClearColor(0x000000, 0)
          gl.toneMapping = THREE.NeutralToneMapping
          gl.toneMappingExposure = 1.05
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(1, d - 0.35))}
          onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio || 1, d + 0.2, profile.tier === 'high' ? 1.75 : 1.5))}
          flipflops={3}
        />
        <SceneContents profile={profile} landing={landing} />
      </Canvas>
    </div>
  )
}
