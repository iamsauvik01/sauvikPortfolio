import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { content } from '../../../data/portfolio'
import { SUBS } from '../../layout'
import { islandStore, world } from '../../store'
import { damp } from '../../../lib/math'
import { gableGeometry, gearGeometry, mat, ownMat, signTexture } from '../kit'
import { Blob, Glow, Lantern, Smoke } from '../bits'
import { Hot, Landmark, useLandmark } from '../Landmark'
import { DYN, ROOT } from '../batch'

const none = () => null
const S = SUBS.lab!
const proj = (id: string) => content.island.lab.projects.find((p) => p.id === id)!

/* ── the lab building ──────────────────────────────────────────── */
function LabHouse() {
  const st = useLandmark()
  const rings = useRef<THREE.Group>(null)
  const core = useMemo(() => ownMat('#fff1d6', { emissive: '#ffc46b', ei: 1 }), [])
  useFrame((s, dt) => {
    const a = st.current.act
    const g = rings.current
    if (g) {
      g.children.forEach((c, i) => {
        c.rotation.x += dt * (0.4 + a * 1.2) * (i + 1) * 0.6
        c.rotation.y += dt * (0.3 + a) * (i % 2 ? -1 : 1)
      })
      g.position.y = 2.55 + Math.sin(s.clock.elapsedTime * 1.4) * 0.08
    }
    core.emissiveIntensity = 0.9 + a * 1.5 + Math.sin(s.clock.elapsedTime * 3) * 0.15
  })
  return (
    <group position={[0, 0, -1.9]}>
      <Blob r={2.5} />
      <mesh position-y={0.12} material={mat('#c9bfc8', { flat: true })} receiveShadow raycast={none}>
        <cylinderGeometry args={[2.1, 2.2, 0.24, 14]} />
      </mesh>
      <mesh position-y={0.95} material={mat('#f3f0ea')} castShadow receiveShadow>
        <cylinderGeometry args={[1.7, 1.75, 1.5, 28]} />
      </mesh>
      <mesh position-y={1.62} material={mat('#2aa596')} raycast={none}>
        <cylinderGeometry args={[1.74, 1.74, 0.16, 28]} />
      </mesh>
      {/* glass dome */}
      <mesh position-y={1.7} material={mat('#c9f5ee', { rough: 0.08, metal: 0.1, opacity: 0.38 })} raycast={none}>
        <sphereGeometry args={[1.62, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* dome ribs */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position-y={1.7} rotation-y={(i / 4) * Math.PI} material={mat('#2aa596')} raycast={none}>
          <torusGeometry args={[1.63, 0.025, 4, 28, Math.PI]} />
        </mesh>
      ))}
      {/* the idea inside: a little atom */}
      <group ref={rings} userData={DYN} position-y={2.55}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[i * 1.05, i * 0.6, 0]} material={mat(['#2aa596', '#ee8a5f', '#8a6fe0'][i], { emissive: ['#2aa596', '#ee8a5f', '#8a6fe0'][i], ei: 0.6 })} raycast={none}>
            <torusGeometry args={[0.5, 0.025, 6, 32]} />
          </mesh>
        ))}
        <mesh material={core} raycast={none}>
          <sphereGeometry args={[0.16, 14, 10]} />
        </mesh>
        <Glow color="#ffd28a" size={1.8} opacity={0.4} act={0.8} />
      </group>
      {/* door */}
      <mesh position={[0, 0.72, 1.72]} material={mat('#2aa596')} raycast={none}>
        <boxGeometry args={[0.8, 1.15, 0.08]} />
      </mesh>
      <mesh position={[0, 0.72, 1.77]} material={mat('#ffe9b8', { emissive: '#ffcf7a', ei: 0.7 })} raycast={none}>
        <planeGeometry args={[0.6, 0.95]} />
      </mesh>
      {/* lightning rod */}
      <mesh position-y={3.55} material={mat('#e7b53f', { metal: 0.7, rough: 0.3 })} raycast={none}>
        <cylinderGeometry args={[0.02, 0.03, 0.6, 5]} />
      </mesh>
      <mesh position-y={3.88} material={mat('#e7b53f', { metal: 0.7, rough: 0.3, emissive: '#ffcf5a', ei: 0.4 })} raycast={none}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
    </group>
  )
}

/** A plinth with a glowing ring in the project's colour; spins its miniature. */
function Pedestal({ id, accent, children }: { id: string; accent: string; children: ReactNode }) {
  const spin = useRef<THREE.Group>(null)
  const ring = useMemo(() => ownMat(accent, { emissive: accent, ei: 0.5 }), [accent])
  const k = useRef(0)
  useFrame((s, dt) => {
    const { focus, sub } = islandStore.get()
    const sel = focus === 'lab' && sub === id ? 1 : 0
    k.current = damp(k.current, sel, 4, Math.min(dt, 0.05))
    if (spin.current) spin.current.rotation.y += dt * (0.18 + k.current * 0.25)
    ring.emissiveIntensity = 0.4 + k.current * 1.8 + Math.sin(s.clock.elapsedTime * 3) * 0.1 * k.current + world.night * 0.6
  })
  return (
    <group>
      <Blob r={1.05} />
      <mesh position-y={0.25} material={mat('#efe6d8', { flat: true })} castShadow receiveShadow>
        <cylinderGeometry args={[0.82, 0.9, 0.5, 6]} />
      </mesh>
      <mesh position-y={0.51} material={ring} raycast={none}>
        <cylinderGeometry args={[0.84, 0.84, 0.05, 6]} />
      </mesh>
      <group ref={spin} userData={ROOT} position-y={0.54}>
        {children}
      </group>
      <Glow position={[0, 0.9, 0]} color={accent} size={2.2} opacity={0.12} act={1.6} nightBoost={1} />
    </group>
  )
}

/* ── MSPSDC — public-service infrastructure ────────────────────── */
function Civic() {
  const orbs = useRef<(THREE.Mesh | null)[]>([])
  const pediment = useMemo(() => gableGeometry(1.28, 0.32, 0.8), [])
  const orbMat = useMemo(() => ownMat('#c9fff2', { emissive: '#3fe0c4', ei: 1.6 }), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    orbs.current.forEach((o, i) => {
      if (!o) return
      const a = t * 0.9 + (i / 3) * Math.PI * 2
      o.position.set(Math.cos(a) * 0.95, 0.35 + Math.sin(a * 2) * 0.08, Math.sin(a) * 0.72)
    })
  })
  return (
    <group scale={0.62}>
      <mesh position-y={0.06} material={mat('#efe6d8')} castShadow raycast={none}>
        <boxGeometry args={[1.6, 0.12, 1.1]} />
      </mesh>
      <mesh position-y={0.17} material={mat('#e2d6c2')} raycast={none}>
        <boxGeometry args={[1.45, 0.1, 0.98]} />
      </mesh>
      <mesh position={[0, 0.55, -0.12]} material={mat('#fff8ec')} castShadow raycast={none}>
        <boxGeometry args={[1.25, 0.66, 0.62]} />
      </mesh>
      {[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.55, 0.3]} material={mat('#fff8ec')} castShadow raycast={none}>
          <cylinderGeometry args={[0.045, 0.05, 0.66, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 0.91, 0.06]} material={mat('#f3e6cc')} raycast={none}>
        <boxGeometry args={[1.32, 0.08, 0.9]} />
      </mesh>
      <mesh geometry={pediment} position={[0, 0.95, 0.06]} material={mat('#f3e6cc')} castShadow raycast={none} />
      <mesh position={[0, 1.18, -0.12]} material={mat('#e2bd63', { metal: 0.6, rough: 0.3 })} castShadow raycast={none}>
        <sphereGeometry args={[0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 1.47, -0.12]} material={mat('#e2bd63', { metal: 0.6, rough: 0.3 })} raycast={none}>
        <cylinderGeometry args={[0.01, 0.01, 0.2, 4]} />
      </mesh>
      {/* services travelling through the workflow */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.24} scale={[1, 0.76, 1]} material={mat('#3fa79a', { emissive: '#3fa79a', ei: 0.5 })} raycast={none}>
        <ringGeometry args={[0.92, 0.97, 40]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => void (orbs.current[i] = el)} userData={DYN} material={orbMat} raycast={none}>
          <sphereGeometry args={[0.07, 10, 8]} />
        </mesh>
      ))}
    </group>
  )
}

/* ── CIBF — boilers and factories ──────────────────────────────── */
function Factory() {
  const gear = useRef<THREE.Mesh>(null)
  const saw = useMemo(() => gableGeometry(0.42, 0.3, 0.9), [])
  const gearGeo = useMemo(() => gearGeometry(0.3, 9, 0.08), [])
  useFrame((_, dt) => {
    if (gear.current) gear.current.rotation.z += dt * 0.9
  })
  return (
    <group scale={0.62}>
      <mesh position={[-0.15, 0.32, 0]} material={mat('#c8674a')} castShadow raycast={none}>
        <boxGeometry args={[1.3, 0.64, 0.9]} />
      </mesh>
      {[-0.6, -0.18, 0.24].map((x) => (
        <mesh key={x} geometry={saw} position={[x, 0.64, 0]} rotation-y={Math.PI / 2} scale={[1, 1, 1]} material={mat('#4d4672', { flat: true })} castShadow raycast={none} />
      ))}
      {/* windows */}
      {[-0.55, -0.15, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.32, 0.455]} material={mat('#ffe2a8', { emissive: '#ffae4a', ei: 0.8 })} raycast={none}>
          <planeGeometry args={[0.24, 0.2]} />
        </mesh>
      ))}
      {/* chimneys */}
      {[
        [-0.55, 0.25],
        [-0.25, -0.25],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position-y={0.9} material={mat('#a5614d')} castShadow raycast={none}>
            <cylinderGeometry args={[0.08, 0.1, 0.9, 8]} />
          </mesh>
          <mesh position-y={1.33} material={mat('#e7b53f')} raycast={none}>
            <cylinderGeometry args={[0.09, 0.09, 0.05, 8]} />
          </mesh>
        </group>
      ))}
      <Smoke position={[-0.55, 1.4, 0.25]} count={4} size={0.12} rise={0.9} speed={0.4} color="#efe7e1" />
      <Smoke position={[-0.25, 1.4, -0.25]} count={4} size={0.1} rise={0.8} speed={0.5} color="#efe7e1" />
      {/* the boiler */}
      <group position={[0.75, 0.3, 0.05]}>
        <mesh rotation-x={Math.PI / 2} material={mat('#d97a43', { metal: 0.55, rough: 0.35 })} castShadow raycast={none}>
          <capsuleGeometry args={[0.24, 0.5, 6, 14]} />
        </mesh>
        {[-0.2, 0, 0.2].map((z) => (
          <mesh key={z} position-z={z} rotation-x={Math.PI / 2} material={mat('#8a4a2a', { metal: 0.5 })} raycast={none}>
            <torusGeometry args={[0.245, 0.02, 4, 18]} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0]} material={mat('#5d5470')} raycast={none}>
          <cylinderGeometry args={[0.04, 0.04, 0.2, 6]} />
        </mesh>
      </group>
      <mesh ref={gear} userData={DYN} geometry={gearGeo} position={[0.3, 0.42, 0.47]} material={mat('#f0b886', { metal: 0.5, rough: 0.35 })} raycast={none} />
    </group>
  )
}

/* ── EdTech — a learning world ─────────────────────────────────── */
function Learning() {
  const cap = useRef<THREE.Group>(null)
  const page = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (cap.current) {
      cap.current.position.y = 1.25 + Math.sin(t * 1.6) * 0.08
      cap.current.rotation.y = t * 0.7
    }
    if (page.current) page.current.rotation.z = Math.PI * (0.5 + 0.5 * Math.sin(t * 0.9))
  })
  return (
    <group scale={0.62}>
      {[
        ['#4a6fd1', 0.12, 0.2, 1.1],
        ['#e2694f', -0.18, 0.44, 1.0],
        ['#e0a43a', 0.08, 0.66, 0.92],
      ].map(([c, r, y, w], i) => (
        <group key={i} position-y={y as number} rotation-y={r as number}>
          <mesh material={mat(c as string)} castShadow raycast={none}>
            <boxGeometry args={[w as number, 0.22, 0.72]} />
          </mesh>
          <mesh position-x={0.02} material={mat('#fffaf0')} raycast={none}>
            <boxGeometry args={[(w as number) - 0.04, 0.17, 0.74]} />
          </mesh>
        </group>
      ))}
      {/* open book on top with a turning page */}
      <group position-y={0.82} rotation-y={0.1}>
        <mesh position-x={-0.25} rotation-z={0.12} material={mat('#fffaf0')} castShadow raycast={none}>
          <boxGeometry args={[0.5, 0.04, 0.6]} />
        </mesh>
        <mesh position-x={0.25} rotation-z={-0.12} material={mat('#fffaf0')} castShadow raycast={none}>
          <boxGeometry args={[0.5, 0.04, 0.6]} />
        </mesh>
        <group position-y={0.05}>
          <mesh ref={page} userData={DYN} material={mat('#fff3dc', { side: THREE.DoubleSide })} raycast={none}>
            <planeGeometry args={[0.46, 0.56]} />
          </mesh>
        </group>
      </group>
      {/* graduation cap */}
      <group ref={cap} userData={ROOT} position-y={1.25}>
        <mesh material={mat('#241c36')} castShadow raycast={none}>
          <boxGeometry args={[0.6, 0.04, 0.6]} />
        </mesh>
        <mesh position-y={-0.1} material={mat('#241c36')} raycast={none}>
          <cylinderGeometry args={[0.2, 0.22, 0.18, 12]} />
        </mesh>
        <mesh position={[0.24, -0.08, 0.24]} material={mat('#e0a43a')} raycast={none}>
          <cylinderGeometry args={[0.012, 0.012, 0.2, 4]} />
        </mesh>
        <mesh position={[0.24, -0.2, 0.24]} material={mat('#e0a43a')} raycast={none}>
          <sphereGeometry args={[0.04, 6, 6]} />
        </mesh>
      </group>
      {/* bright idea */}
      <group position={[0.62, 1.05, -0.2]}>
        <mesh material={mat('#fff6cf', { emissive: '#ffd85a', ei: 1.4 })} raycast={none}>
          <sphereGeometry args={[0.13, 12, 10]} />
        </mesh>
        <mesh position-y={-0.15} material={mat('#b8c1d6', { metal: 0.6 })} raycast={none}>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
        </mesh>
        <Glow color="#ffe08a" size={0.9} opacity={0.5} />
      </group>
    </group>
  )
}

/* ── Hotel booking — a tiny hotel ──────────────────────────────── */
function Hotel() {
  const wins = useMemo(() => {
    const out: { x: number; y: number; m: THREE.MeshStandardMaterial }[] = []
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push({ x: -0.3 + c * 0.3, y: 0.45 + r * 0.33, m: ownMat('#ffe9b8', { emissive: '#ffb84d', ei: 0.2 }) })
    return out
  }, [])
  const sign = useMemo(() => signTexture('HOTEL', { bg: '#241c36', fg: '#ffcf9f', w: 256, h: 80 }), [])
  useFrame((s) => {
    // rooms check in and out — a living availability board
    const t = Math.floor(s.clock.elapsedTime * 1.2)
    wins.forEach((w, i) => {
      const on = Math.sin(i * 12.9898 + t * 0.7 + i * i) > -0.1
      w.m.emissiveIntensity = on ? 1.3 : 0.05
    })
  })
  return (
    <group scale={0.62}>
      <mesh position-y={0.82} material={mat('#e0716a')} castShadow raycast={none}>
        <boxGeometry args={[1.05, 1.4, 0.8]} />
      </mesh>
      <mesh position-y={1.56} material={mat('#f3e2c4')} raycast={none}>
        <boxGeometry args={[1.15, 0.1, 0.9]} />
      </mesh>
      {wins.map((w, i) => (
        <mesh key={i} position={[w.x, w.y + 0.2, 0.405]} material={w.m} raycast={none}>
          <planeGeometry args={[0.18, 0.2]} />
        </mesh>
      ))}
      <mesh position={[0, 1.8, 0]} raycast={none}>
        <boxGeometry args={[0.72, 0.24, 0.05]} />
        <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.4} />
      </mesh>
      {/* awning + door */}
      <mesh position={[0, 0.42, 0.48]} rotation-z={Math.PI / 2} material={mat('#7fb08e')} castShadow raycast={none}>
        <cylinderGeometry args={[0.16, 0.16, 0.6, 12, 1, false, 0, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.2, 0.405]} material={mat('#ffe2a8', { emissive: '#ffb84d', ei: 0.6 })} raycast={none}>
        <planeGeometry args={[0.28, 0.36]} />
      </mesh>
      {/* pool + tiny palm */}
      <mesh position={[0.72, 0.03, 0.35]} rotation-x={-Math.PI / 2} material={mat('#6fd6e0', { emissive: '#3fb8c8', ei: 0.3, rough: 0.2 })} raycast={none}>
        <planeGeometry args={[0.45, 0.6]} />
      </mesh>
      <group position={[-0.72, 0, 0.3]}>
        <mesh position-y={0.4} rotation-z={0.15} material={mat('#b98a5c')} raycast={none}>
          <cylinderGeometry args={[0.03, 0.04, 0.8, 5]} />
        </mesh>
        <mesh position={[0.06, 0.82, 0]} scale={[1, 0.35, 1]} material={mat('#4f9e4f')} raycast={none}>
          <sphereGeometry args={[0.24, 8, 6]} />
        </mesh>
      </group>
    </group>
  )
}

const MINI: Record<string, () => React.JSX.Element> = { mspsdc: Civic, cibf: Factory, edtech: Learning, hotel: Hotel }

export function Lab() {
  return (
    <Landmark id="lab">
      <LabHouse />
      <Lantern position={[-1.9, 0, -0.1]} color="#9ff0e0" />
      <Lantern position={[1.9, 0, -0.1]} color="#9ff0e0" />
      {(['mspsdc', 'cibf', 'edtech', 'hotel'] as const).map((id) => {
        const p = proj(id)
        const Mini = MINI[id]
        return (
          <group key={id} position={S[id] as [number, number, number]}>
            <Hot loc="lab" id={id}>
              <Pedestal id={id} accent={p.accent}>
                <Mini />
              </Pedestal>
            </Hot>
          </group>
        )
      })}
    </Landmark>
  )
}
