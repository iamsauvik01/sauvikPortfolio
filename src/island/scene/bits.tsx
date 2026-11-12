import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../store'
import { mat, signTexture, timeUniform } from './kit'
import { useLandmark } from './Landmark'
import { DYN } from './batch'
import { registerBlob, registerGlow } from './glows'

const none = () => null

/** A soft additive glow. Drawn by the shared GlowField (one draw call for all of them). */
export function Glow({ color = '#ffcf7a', size = 1, opacity = 0.8, position, nightBoost = 0.6, act = 0 }: {
  color?: string
  size?: number
  opacity?: number
  position?: [number, number, number]
  /** Extra brightness at night. */
  nightBoost?: number
  /** Extra brightness while the landmark is visited. */
  act?: number
}) {
  const st = useLandmark()
  const ref = useRef<THREE.Object3D>(null)
  useEffect(() => {
    if (!ref.current) return
    return registerGlow({ obj: ref.current, color: new THREE.Color(color), size, opacity, nightBoost, act, st: st ?? null })
  }, [color, size, opacity, nightBoost, act, st])
  return <object3D ref={ref} position={position} />
}

/** Rising puffs of smoke / steam — one instanced draw per plume, each puff fading on its own. */
export function Smoke({ position, count = 5, color = '#ffffff', size = 0.35, rise = 1.6, speed = 0.35, strength = 1 }: {
  position: [number, number, number]
  count?: number
  color?: string
  size?: number
  rise?: number
  speed?: number
  /** 0..1 — multiplied by the landmark's activation when `strength` < 1. */
  strength?: number
}) {
  const st = useLandmark()
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1)
    g.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage))
    return g
  }, [count])
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, depthWrite: false })
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
        .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vAlpha;')
    }
    m.customProgramCacheKey = () => 'island-smoke'
    return m
  }, [color])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((s) => {
    const im = ref.current
    if (!im) return
    const t = s.clock.elapsedTime
    const a = strength >= 1 ? 1 : strength + (1 - strength) * (st?.current.act ?? 0)
    const alpha = geo.attributes.aAlpha as THREE.InstancedBufferAttribute
    for (let i = 0; i < count; i++) {
      const p = (t * speed + i / count) % 1
      dummy.position.set(Math.sin(p * 5 + i) * 0.15 + p * 0.3, p * rise, Math.cos(p * 4 + i) * 0.1)
      dummy.scale.setScalar(size * (0.45 + p * 1.1))
      dummy.updateMatrix()
      im.setMatrixAt(i, dummy.matrix)
      alpha.setX(i, Math.sin(p * Math.PI) * 0.75 * a)
    }
    im.instanceMatrix.needsUpdate = true
    alpha.needsUpdate = true
  })
  return (
    <group position={position}>
      <instancedMesh ref={ref} args={[geo, mat, count]} userData={DYN} frustumCulled={false} raycast={none} />
    </group>
  )
}

/** A post lantern that warms up at night. */
export function Lantern({ position, height = 1.4, color = '#ffc56b' }: { position: [number, number, number]; height?: number; color?: string }) {
  const bulb = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff1c9', emissive: color, emissiveIntensity: 1.4 }), [color])
  useFrame(() => {
    bulb.emissiveIntensity = 1.2 + world.night * 2
  })
  return (
    <group position={position}>
      <mesh position-y={height / 2} material={mat('#5a4636')} castShadow raycast={none}>
        <cylinderGeometry args={[0.04, 0.05, height, 5]} />
      </mesh>
      <mesh position-y={height + 0.12} material={bulb} raycast={none}>
        <boxGeometry args={[0.2, 0.24, 0.2]} />
      </mesh>
      <mesh position-y={height + 0.3} material={mat('#3d3242')} raycast={none}>
        <coneGeometry args={[0.18, 0.14, 4]} />
      </mesh>
      <Glow position={[0, height + 0.12, 0]} color={color} size={1.1} opacity={0.35} nightBoost={1.6} />
    </group>
  )
}

/** A cloth flag that ripples in the wind (vertex shader). */
export function Flag({ position, color, w = 0.9, h = 0.55, pole = 1.6, act = false }: {
  position: [number, number, number]
  color: string
  w?: number
  h?: number
  pole?: number
  /** Raise the flag only while the landmark is visited. */
  act?: boolean
}) {
  const st = useLandmark()
  const cloth = useRef<THREE.Mesh>(null)
  const m = useMemo(() => {
    const mm = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 })
    mm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = timeUniform
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float k = (position.x + ${(w / 2).toFixed(3)}) / ${w.toFixed(3)};
          transformed.z += sin(uTime * 4.0 - k * 5.0) * 0.09 * k;
          transformed.y += sin(uTime * 3.0 - k * 4.0) * 0.03 * k;`,
        )
    }
    return mm
  }, [color, w])
  useFrame(() => {
    if (!cloth.current) return
    const a = act ? 0.25 + 0.75 * (st?.current.act ?? 0) : 1
    cloth.current.position.y = pole - h / 2 - (1 - a) * (pole - h - 0.1)
  })
  return (
    <group position={position}>
      <mesh position-y={pole / 2} material={mat('#e9dfcf', { rough: 0.5, metal: 0.2 })} raycast={none}>
        <cylinderGeometry args={[0.025, 0.03, pole, 5]} />
      </mesh>
      <mesh position-y={pole + 0.03} material={mat('#e7b53f', { metal: 0.6, rough: 0.35 })} raycast={none}>
        <sphereGeometry args={[0.05, 8, 6]} />
      </mesh>
      <mesh ref={cloth} userData={DYN} position={[w / 2 + 0.02, pole - h / 2, 0]} material={m} castShadow raycast={none}>
        <planeGeometry args={[w, h, 10, 3]} />
      </mesh>
    </group>
  )
}

/** A wooden signboard with painted text. */
export function Sign({ text, position, rotationY = 0, w = 1.3, h = 0.42, bg = '#f5e6c8', fg = '#3b2a22', post = 1.1 }: {
  text: string
  position: [number, number, number]
  rotationY?: number
  w?: number
  h?: number
  bg?: string
  fg?: string
  post?: number
}) {
  const tex = useMemo(() => signTexture(text, { bg, fg, w: 512, h: Math.round((512 * h) / w), border: '#8a5a3c' }), [text, bg, fg, w, h])
  return (
    <group position={position} rotation-y={rotationY}>
      {post > 0 && (
        <mesh position-y={post / 2} material={mat('#7a5238')} castShadow raycast={none}>
          <boxGeometry args={[0.08, post, 0.08]} />
        </mesh>
      )}
      <mesh position={[0, post + h / 2 - 0.05, 0.045]} castShadow raycast={none}>
        <boxGeometry args={[w, h, 0.06]} />
        <meshStandardMaterial color="#8a5a3c" roughness={0.9} />
      </mesh>
      <mesh position={[0, post + h / 2 - 0.05, 0.08]} raycast={none}>
        <planeGeometry args={[w * 0.96, h * 0.9]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
    </group>
  )
}

/** A soft fake contact shadow (cheap, no shadow map needed). */
export function Blob({ r = 1, opacity = 0.28, y = 0.02 }: { r?: number; opacity?: number; y?: number }) {
  // drawn by the shared BlobField (one instanced draw for every contact shadow)
  const ref = useRef<THREE.Object3D>(null)
  useEffect(() => {
    if (!ref.current) return
    return registerBlob({ obj: ref.current, r, opacity })
  }, [r, opacity])
  return <object3D ref={ref} position-y={y} />
}
