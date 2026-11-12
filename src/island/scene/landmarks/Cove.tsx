import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { content } from '../../../data/portfolio'
import { SUBS } from '../../layout'
import { islandStore } from '../../store'
import { damp } from '../../../lib/math'
import { mat, ownMat, rand } from '../kit'
import { Blob, Glow } from '../bits'
import { Hot, Landmark, useLandmark } from '../Landmark'
import { Fireflies } from '../Life'
import { DYN, ROOT } from '../batch'

const none = () => null
const S = SUBS.cove!
const GOLD = { metal: 0.7, rough: 0.3 }

/* ── the chest ─────────────────────────────────────────────────── */
function Chest() {
  const st = useLandmark()
  const lid = useRef<THREE.Group>(null)
  const beam = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffd76b', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    [],
  )
  const inner = useMemo(() => ownMat('#ffe08a', { emissive: '#ffb21f', ei: 0 }), [])
  useFrame((s) => {
    const a = st.current.act
    // the lid creaks open with a little overshoot
    if (lid.current) lid.current.rotation.x = -a * 1.95 - Math.sin(a * Math.PI) * 0.15
    beam.opacity = a * (0.12 + Math.sin(s.clock.elapsedTime * 2) * 0.03)
    inner.emissiveIntensity = 0.2 + a * 2.2
  })
  return (
    <group>
      <Blob r={1.1} opacity={0.35} />
      {/* X marks the spot */}
      {[0.75, -0.75].map((r) => (
        <mesh key={r} position-y={0.02} rotation={[-Math.PI / 2, 0, r]} material={mat('#c4553e')} raycast={none}>
          <planeGeometry args={[2.2, 0.22]} />
        </mesh>
      ))}
      <mesh position-y={0.32} material={mat('#9b603d')} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.6, 0.72]} />
      </mesh>
      <mesh position-y={0.6} material={inner} raycast={none}>
        <boxGeometry args={[1.05, 0.04, 0.62]} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.32, 0]} material={mat('#e7b53f', GOLD)} raycast={none}>
          <boxGeometry args={[0.1, 0.62, 0.74]} />
        </mesh>
      ))}
      <mesh position={[0, 0.48, 0.37]} material={mat('#e7b53f', GOLD)} raycast={none}>
        <boxGeometry args={[0.2, 0.22, 0.04]} />
      </mesh>
      {/* the lid hinges at the back */}
      <group ref={lid} userData={ROOT} position={[0, 0.62, -0.36]}>
        <mesh position={[0, 0, 0.36]} rotation-z={Math.PI / 2} material={mat('#a86b45')} castShadow raycast={none}>
          <cylinderGeometry args={[0.36, 0.36, 1.15, 16, 1, false, 0, Math.PI]} />
        </mesh>
        {[-0.42, 0.42].map((x) => (
          <mesh key={x} position={[x, 0, 0.36]} rotation-z={Math.PI / 2} material={mat('#e7b53f', GOLD)} raycast={none}>
            <cylinderGeometry args={[0.37, 0.37, 0.1, 16, 1, false, 0, Math.PI]} />
          </mesh>
        ))}
      </group>
      {/* light pouring out */}
      <mesh position-y={2.1} material={beam} raycast={none}>
        <cylinderGeometry args={[1.25, 0.5, 3, 20, 1, true]} />
      </mesh>
      <Glow position={[0, 0.9, 0]} color="#ffcf5a" size={2.6} opacity={0.15} act={2.5} nightBoost={0.5} />
    </group>
  )
}

function Coins() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const n = 34
  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    const r = rand(77)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2
      const d = 0.75 + r() * 0.9
      q.setFromEuler(new THREE.Euler(r() * 0.6 - 0.3 + (i % 4 === 0 ? 1.2 : 0), r() * 3, r() * 0.4))
      m.compose(new THREE.Vector3(Math.cos(a) * d, 0.04 + (i % 5 === 0 ? 0.08 : 0), Math.sin(a) * d * 0.8 + 0.25), q, new THREE.Vector3(1, 1, 1))
      im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow raycast={none}>
      <cylinderGeometry args={[0.09, 0.09, 0.025, 12]} />
      <meshStandardMaterial color="#ffd25e" metalness={0.45} roughness={0.35} emissive="#7a4d00" emissiveIntensity={0.25} />
    </instancedMesh>
  )
}

/* ── the treasures (each one a real achievement) ───────────────── */
function Trophy({ color }: { color: string }) {
  const cup = useMemo(() => {
    const pts = [
      [0, 0],
      [0.06, 0],
      [0.06, 0.25],
      [0.12, 0.3],
      [0.3, 0.55],
      [0.34, 0.85],
      [0.32, 0.86],
      [0.0, 0.62],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 24)
  }, [])
  return (
    <group>
      <mesh position-y={-0.3} material={mat('#5d4a3a')} castShadow raycast={none}>
        <boxGeometry args={[0.36, 0.14, 0.36]} />
      </mesh>
      <mesh position-y={-0.23} geometry={cup} material={mat(color, GOLD)} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.33, 0.33, 0]} rotation-z={s * 0.2} material={mat(color, GOLD)} raycast={none}>
          <torusGeometry args={[0.13, 0.025, 6, 14, Math.PI * 1.3]} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0.25]} material={mat('#fff6d8', { emissive: '#ffe08a', ei: 0.6 })} raycast={none}>
        <circleGeometry args={[0.07, 5]} />
      </mesh>
    </group>
  )
}

function Medal({ color }: { color: string }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1, 0.32, -0.02]} rotation-z={s * -0.35} material={mat(color)} castShadow raycast={none}>
          <boxGeometry args={[0.13, 0.5, 0.02]} />
        </mesh>
      ))}
      <mesh rotation-x={Math.PI / 2} material={mat('#f0c24a', GOLD)} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 28]} />
      </mesh>
      <mesh position-z={0.035} material={mat(color, { metal: 0.4, rough: 0.35 })} raycast={none}>
        <circleGeometry args={[0.2, 5]} />
      </mesh>
    </group>
  )
}

function Crown({ color }: { color: string }) {
  return (
    <group>
      <mesh material={mat('#f0c24a', { ...GOLD, side: THREE.DoubleSide })} castShadow>
        <cylinderGeometry args={[0.3, 0.27, 0.22, 20, 1, true]} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * 0.29, 0.2, Math.sin(a) * 0.29]} material={mat('#f0c24a', GOLD)} raycast={none}>
              <coneGeometry args={[0.06, 0.2, 5]} />
            </mesh>
            <mesh position={[Math.cos(a) * 0.29, 0.32, Math.sin(a) * 0.29]} material={mat(color, { emissive: color, ei: 0.5, rough: 0.2 })} raycast={none}>
              <sphereGeometry args={[0.035, 8, 6]} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0, 0.29]} material={mat('#e2584a', { emissive: '#e2584a', ei: 0.4, rough: 0.2 })} raycast={none}>
        <octahedronGeometry args={[0.06, 0]} />
      </mesh>
    </group>
  )
}

const MODELS = { trophy: Trophy, medal: Medal, crown: Crown }

/** A treasure that rises out of the chest while you're at the cove. */
function Rising({ id, color }: { id: 'trophy' | 'medal' | 'crown'; color: string }) {
  const st = useLandmark()
  const outer = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const k = useRef(0)
  const base = S[id]
  const order = { trophy: 0, medal: 1, crown: 2 }[id]
  useFrame((s, dt) => {
    const a = st.current.act
    // stagger the rise so they pop out one after another
    const r = THREE.MathUtils.smoothstep(a, 0.25 + order * 0.15, 0.75 + order * 0.08)
    const g = outer.current
    if (g) {
      g.position.y = THREE.MathUtils.lerp(0.45 - base[1], 0, r) + Math.sin(s.clock.elapsedTime * 1.5 + order) * 0.06 * r
      g.position.x = THREE.MathUtils.lerp(-base[0] * 0.9, 0, r)
      g.position.z = THREE.MathUtils.lerp(0.4 - base[2], 0, r)
      g.scale.setScalar(0.25 + r * 0.75)
      g.visible = r > 0.01
    }
    const { focus, sub } = islandStore.get()
    k.current = damp(k.current, focus === 'cove' && sub === id ? 1 : 0, 4, Math.min(dt, 0.05))
    if (spin.current) spin.current.rotation.y += dt * (0.5 + k.current * 2.2)
  })
  const Model = MODELS[id]
  return (
    <group ref={outer} userData={DYN} visible={false}>
      <group ref={spin} userData={ROOT} scale={1.25}>
        <Model color={color} />
      </group>
      <Glow color={color} size={1.6} opacity={0.35} />
    </group>
  )
}

/* ── scenery ───────────────────────────────────────────────────── */
function Wreck() {
  return (
    <group position={[-2.5, -0.15, -1.2]} rotation={[0.25, 0.9, -0.35]}>
      <mesh scale={[0.85, 0.42, 2.0]} material={mat('#8a5a3c')} castShadow raycast={none}>
        <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      {[-1.2, -0.4, 0.4, 1.2].map((z) => (
        <mesh key={z} position={[0, -0.02, z]} rotation-x={Math.PI / 2} scale={[1, 1, 0.5]} material={mat('#6e4630')} raycast={none}>
          <torusGeometry args={[0.78, 0.04, 4, 12, Math.PI]} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0.3]} rotation-z={0.5} material={mat('#6e4630')} castShadow raycast={none}>
        <cylinderGeometry args={[0.05, 0.06, 1.6, 6]} />
      </mesh>
      <mesh position={[0.3, 1.1, 0.3]} rotation={[0, 0.2, 0.5]} material={mat('#efe2c9', { side: THREE.DoubleSide })} raycast={none}>
        <planeGeometry args={[0.7, 0.6]} />
      </mesh>
    </group>
  )
}

function Crab() {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    const g = ref.current
    if (!g) return
    const t = s.clock.elapsedTime
    // scuttle, pause, scuttle back
    const p = Math.sin(t * 0.5)
    g.position.x = 1.9 + Math.sign(p) * Math.min(1, Math.abs(p) * 1.6) * 0.7
    g.position.y = 0.08 + Math.abs(Math.sin(t * 14)) * 0.02 * Math.abs(Math.cos(t * 0.5))
    g.rotation.z = Math.sin(t * 14) * 0.05
  })
  return (
    <group ref={ref} userData={ROOT} position={[1.9, 0.08, 1.5]} rotation-y={-0.3}>
      <mesh scale={[0.2, 0.09, 0.15]} material={mat('#e2584a', { rough: 0.5 })} castShadow raycast={none}>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.07, 0.12, 0.1]} material={mat('#e2584a')} raycast={none}>
            <cylinderGeometry args={[0.012, 0.012, 0.08, 4]} />
          </mesh>
          <mesh position={[s * 0.07, 0.17, 0.1]} material={mat('#241c36')} raycast={none}>
            <sphereGeometry args={[0.025, 6, 6]} />
          </mesh>
          <mesh position={[s * 0.24, 0.03, 0.12]} scale={[1, 0.7, 1]} material={mat('#e2584a')} raycast={none}>
            <sphereGeometry args={[0.065, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Starfish({ position, color }: { position: [number, number, number]; color: string }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2
      const r = i % 2 ? 0.07 : 0.18
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 })
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  return <mesh geometry={geo} position={position} material={mat(color, { rough: 0.6 })} raycast={none} />
}

export function Cove() {
  const t = content.island.cove.treasures
  return (
    <Landmark id="cove">
      <group position={[0, 0, 0.4]}>
        <Chest />
        <Coins />
      </group>
      {t.map((tr) => (
        <group key={tr.id} position={S[tr.id] as [number, number, number]}>
          <Hot loc="cove" id={tr.id}>
            <Rising id={tr.id} color={tr.color} />
          </Hot>
        </group>
      ))}
      <Wreck />
      <Crab />
      <Starfish position={[-0.9, 0.04, 2.2]} color="#ff9d7a" />
      <Starfish position={[1.3, 0.04, -1.4]} color="#ffd166" />
      {/* a half-buried bottle — someone left a message */}
      <mesh position={[-1.7, 0.1, 1.6]} rotation={[0.3, 0.8, 1.2]} material={mat('#8fd1c1', { rough: 0.15, opacity: 0.75 })} raycast={none}>
        <capsuleGeometry args={[0.08, 0.25, 4, 10]} />
      </mesh>
      <Fireflies count={24} center={[0, 0.6, 0.4]} radius={1.6} height={2.2} color="#ffd76b" always />
    </Landmark>
  )
}
