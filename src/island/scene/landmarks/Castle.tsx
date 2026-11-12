import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SUBS } from '../../layout'
import { world } from '../../store'
import { mat, ownMat } from '../kit'
import { Blob, Flag, Glow } from '../bits'
import { Hot, Landmark, useLandmark } from '../Landmark'
import { ROOT } from '../batch'

const none = () => null
const S = SUBS.castle!

const STONE = '#d6cad0'
const STONE_2 = '#b9aab8'
const STONE_3 = '#9d8da0'

/** Crenellations around a rectangle or circle top. */
function Crenels({ w, d, y, round = 0 }: { w: number; d: number; y: number; round?: number }) {
  const items = useMemo(() => {
    const out: [number, number, number][] = []
    if (round > 0) {
      const n = Math.round(round * 9)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        out.push([Math.cos(a) * round, Math.sin(a) * round, -a])
      }
    } else {
      const step = 0.42
      for (let x = -w / 2 + 0.15; x <= w / 2 - 0.1; x += step) out.push([x, d / 2, 0], [x, -d / 2, 0])
      for (let z = -d / 2 + 0.15 + step; z <= d / 2 - 0.15; z += step) out.push([w / 2, z, Math.PI / 2], [-w / 2, z, Math.PI / 2])
    }
    return out
  }, [w, d, round])
  return (
    <group position-y={y}>
      {items.map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.13, z]} rotation-y={r} material={mat(STONE)} castShadow raycast={none}>
          <boxGeometry args={[0.22, 0.26, 0.2]} />
        </mesh>
      ))}
    </group>
  )
}

/** Rocky plinth the castle parts stand on (higher = later in the story). */
function Plinth({ r, h, seed = 1 }: { r: number; h: number; seed?: number }) {
  return (
    <group>
      <mesh position-y={h / 2} material={mat(STONE_3, { flat: true })} castShadow receiveShadow raycast={none}>
        <cylinderGeometry args={[r, r * 1.18, h, 9 + seed]} />
      </mesh>
      <mesh position-y={h + 0.04} material={mat('#86b85a')} receiveShadow raycast={none}>
        <cylinderGeometry args={[r * 0.98, r, 0.1, 9 + seed]} />
      </mesh>
    </group>
  )
}

function Windows({ positions, color = '#ffd27a' }: { positions: [number, number, number, number][]; color?: string }) {
  const st = useLandmark()
  const m = useMemo(() => ownMat('#ffe9b8', { emissive: color, ei: 0.3 }), [color])
  useFrame(() => {
    m.emissiveIntensity = 0.25 + st.current.act * 1.2 + world.night * 1.3
  })
  return (
    <>
      {positions.map(([x, y, z, ry], i) => (
        <group key={i} position={[x, y, z]} rotation-y={ry}>
          <mesh material={m} raycast={none}>
            <planeGeometry args={[0.2, 0.34]} />
          </mesh>
          <mesh position={[0, 0.17, 0]} material={m} raycast={none}>
            <circleGeometry args={[0.1, 10, 0, Math.PI]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/* ── Chapter 0: the gatehouse (university) ─────────────────────── */
function Gatehouse() {
  return (
    <group>
      <Blob r={1.6} />
      {[-0.85, 0.85].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position-y={0.95} material={mat(STONE)} castShadow receiveShadow>
            <cylinderGeometry args={[0.46, 0.5, 1.9, 12]} />
          </mesh>
          <mesh position-y={2.2} material={mat('#4a6fd1', { flat: true })} castShadow raycast={none}>
            <coneGeometry args={[0.58, 0.8, 12]} />
          </mesh>
        </group>
      ))}
      {/* arch */}
      <mesh position={[0, 1.42, 0]} material={mat(STONE_2)} castShadow>
        <boxGeometry args={[1.3, 0.55, 0.6]} />
      </mesh>
      <mesh position={[0, 1.15, 0.31]} rotation-z={Math.PI} material={mat('#3a2f4d')} raycast={none}>
        <circleGeometry args={[0.42, 16, 0, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.58, 0.31]} material={mat('#3a2f4d')} raycast={none}>
        <planeGeometry args={[0.84, 1.15]} />
      </mesh>
      {/* portcullis bars, raised */}
      {[-0.28, -0.1, 0.1, 0.28].map((x) => (
        <mesh key={x} position={[x, 1.25, 0.33]} material={mat('#5d5470', { metal: 0.5 })} raycast={none}>
          <boxGeometry args={[0.035, 0.42, 0.03]} />
        </mesh>
      ))}
      <Crenels w={1.3} d={0.6} y={1.7} />
      <Flag position={[0.85, 2.55, 0]} color="#4a6fd1" w={0.55} h={0.34} pole={0.9} act />
      {/* torches */}
      {[-0.5, 0.5].map((x) => (
        <group key={x} position={[x, 1.15, 0.36]}>
          <mesh material={mat('#5a4636')} raycast={none}>
            <cylinderGeometry args={[0.025, 0.02, 0.2, 5]} />
          </mesh>
          <Glow position={[0, 0.14, 0]} color="#ffb04d" size={0.7} opacity={0.6} nightBoost={1.4} act={0.6} />
        </group>
      ))}
      <mesh position={[0, 0.03, 0.9]} rotation-x={-Math.PI / 2} material={mat('#c9b59a')} receiveShadow raycast={none}>
        <planeGeometry args={[0.9, 1.4]} />
      </mesh>
    </group>
  )
}

/* ── Chapter 1: the tower (Scriptscode) ────────────────────────── */
function Tower() {
  return (
    <group>
      <Plinth r={1.25} h={1.1} seed={2} />
      <group position-y={1.15}>
        <Blob r={1.1} y={0.02} />
        <mesh position-y={1.5} material={mat(STONE)} castShadow receiveShadow>
          <cylinderGeometry args={[0.72, 0.8, 3.0, 16]} />
        </mesh>
        <mesh position-y={3.04} material={mat(STONE_2)} castShadow raycast={none}>
          <cylinderGeometry args={[0.86, 0.78, 0.12, 16]} />
        </mesh>
        <mesh position-y={3.75} material={mat('#e2694f', { flat: true })} castShadow>
          <coneGeometry args={[0.95, 1.4, 16]} />
        </mesh>
        <Windows
          positions={[
            [0, 1.1, 0.79, 0],
            [0, 2.2, 0.77, 0],
            [0.6, 1.7, 0.5, 0.9],
          ]}
        />
        <mesh position={[0, 0.45, 0.8]} material={mat('#6e4630')} raycast={none}>
          <boxGeometry args={[0.42, 0.8, 0.06]} />
        </mesh>
        <Flag position={[0, 4.4, 0]} color="#e2694f" w={0.7} h={0.42} pole={1.0} act />
      </group>
    </group>
  )
}

/* ── Chapter 2: the keep (NIC) ─────────────────────────────────── */
function Keep() {
  const st = useLandmark()
  const star = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!star.current) return
    const a = st.current.act
    star.current.visible = a > 0.02
    star.current.position.y = 5.75 + Math.sin(s.clock.elapsedTime * 2) * 0.12
    star.current.rotation.y = s.clock.elapsedTime * 1.2
    star.current.scale.setScalar(a)
  })
  return (
    <group>
      <Plinth r={1.9} h={2.2} seed={3} />
      <group position-y={2.25}>
        <Blob r={1.7} y={0.02} />
        <mesh position-y={1.8} material={mat(STONE)} castShadow receiveShadow>
          <boxGeometry args={[2.0, 3.6, 2.0]} />
        </mesh>
        <mesh position-y={3.62} material={mat(STONE_2)} castShadow raycast={none}>
          <boxGeometry args={[2.2, 0.12, 2.2]} />
        </mesh>
        <Crenels w={2.1} d={2.1} y={3.66} />
        {/* corner turret */}
        <group position={[0.85, 0, 0.85]}>
          <mesh position-y={2.3} material={mat(STONE)} castShadow raycast={none}>
            <cylinderGeometry args={[0.42, 0.46, 4.6, 12]} />
          </mesh>
          <mesh position-y={5.05} material={mat('#8a6fe0', { flat: true })} castShadow>
            <coneGeometry args={[0.6, 1.1, 12]} />
          </mesh>
        </group>
        <Windows
          positions={[
            [-0.45, 1.3, 1.01, 0],
            [0.25, 1.3, 1.01, 0],
            [-0.45, 2.6, 1.01, 0],
            [0.25, 2.6, 1.01, 0],
            [-1.01, 2.0, 0.2, -Math.PI / 2],
          ]}
        />
        <mesh position={[-0.1, 0.5, 1.02]} material={mat('#6e4630')} raycast={none}>
          <boxGeometry args={[0.55, 1.0, 0.05]} />
        </mesh>
        <Flag position={[-0.4, 3.8, -0.4]} color="#e7b53f" w={1.15} h={0.7} pole={1.7} act />
        {/* "you are here" star — today's chapter */}
        <group ref={star} userData={ROOT} position={[-0.4, 5.75, -0.4]} visible={false}>
          <mesh material={mat('#ffe08a', { emissive: '#ffc93d', ei: 1.2, metal: 0.3 })} raycast={none}>
            <octahedronGeometry args={[0.22, 0]} />
          </mesh>
          <Glow color="#ffd36b" size={1.4} opacity={0.5} />
        </group>
      </group>
    </group>
  )
}

/** Stone steps that climb between the chapters. */
function Steps({ from, to, n }: { from: [number, number, number]; to: [number, number, number]; n: number }) {
  const steps = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const yaw = Math.atan2(b.x - a.x, b.z - a.z)
    return Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n
      const p = a.clone().lerp(b, t)
      return { p, yaw, h: a.y + (b.y - a.y) * ((i + 1) / n) }
    })
  }, [from, to, n])
  return (
    <>
      {steps.map((s, i) => (
        <mesh key={i} position={[s.p.x, s.h / 2, s.p.z]} rotation-y={s.yaw} material={mat(i % 2 ? STONE_2 : STONE)} castShadow receiveShadow raycast={none}>
          <boxGeometry args={[0.8, Math.max(0.08, s.h), 0.36]} />
        </mesh>
      ))}
    </>
  )
}

/** A low curtain wall between two points. */
function Wall({ a, b, y = 0, h = 0.9 }: { a: [number, number]; b: [number, number]; y?: number; h?: number }) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len = Math.hypot(dx, dz)
  return (
    <group position={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]} rotation-y={Math.atan2(dx, dz)}>
      <mesh position-y={h / 2} material={mat(STONE_2)} castShadow receiveShadow raycast={none}>
        <boxGeometry args={[0.32, h, len]} />
      </mesh>
      <Crenels w={0.32} d={len} y={h} />
    </group>
  )
}

export function Castle() {
  const p = (k: keyof typeof S) => [S[k][0], 0, S[k][2]] as [number, number, number]
  return (
    <Landmark id="castle">
      <Wall a={[-0.1, 3.0]} b={[-1.9, 1.0]} h={0.8} />
      <Wall a={[1.9, 3.0]} b={[3.0, -0.6]} h={0.8} />
      <Wall a={[-2.0, -1.0]} b={[0.2, -2.9]} y={0.6} h={0.9} />
      <Steps from={[0.2, 0, 2.2]} to={[-1.7, 1.1, 0.75]} n={6} />
      <Steps from={[-1.6, 1.1, -0.8]} to={[0.1, 2.2, -1.45]} n={6} />
      <group position={p('gate')} rotation-y={-0.1}>
        <Hot loc="castle" id="gate">
          <Gatehouse />
        </Hot>
      </group>
      <group position={p('tower')}>
        <Hot loc="castle" id="tower">
          <Tower />
        </Hot>
      </group>
      <group position={p('keep')}>
        <Hot loc="castle" id="keep">
          <Keep />
        </Hot>
      </group>
    </Landmark>
  )
}
