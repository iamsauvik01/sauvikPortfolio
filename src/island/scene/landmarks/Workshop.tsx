import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SUBS } from '../../layout'
import { canvasTexture, gableGeometry, gearGeometry, mat, ownMat, SIGN_FONT } from '../kit'
import { Blob, Glow, Lantern, Sign, Smoke } from '../bits'
import { Hot, Landmark, useLandmark } from '../Landmark'
import { DYN, ROOT } from '../batch'

const none = () => null
const S = SUBS.workshop!

/* ── the barn ──────────────────────────────────────────────────── */
function Barn() {
  const st = useLandmark()
  const gear = useRef<THREE.Mesh>(null)
  const gear2 = useRef<THREE.Mesh>(null)
  const doorL = useRef<THREE.Mesh>(null)
  const doorR = useRef<THREE.Mesh>(null)
  const inside = useMemo(() => ownMat('#ffcf88', { emissive: '#ff9a3c', ei: 0.4 }), [])
  const gearGeo = useMemo(() => gearGeometry(0.75, 12, 0.18), [])
  const gearGeo2 = useMemo(() => gearGeometry(0.42, 8, 0.16), [])
  const roof = useMemo(() => gableGeometry(4.9, 1.55, 3.5), [])
  useFrame((_, dt) => {
    const a = st.current.act
    const speed = 0.25 + a * 1.4
    if (gear.current) gear.current.rotation.z += dt * speed
    if (gear2.current) gear2.current.rotation.z -= dt * speed * 1.75
    if (doorL.current) doorL.current.position.x = -0.55 - a * 0.85
    if (doorR.current) doorR.current.position.x = 0.55 + a * 0.85
    inside.emissiveIntensity = 0.35 + a * 1.3
  })
  return (
    <group position={[0, 0, -1.9]}>
      <Blob r={3.4} opacity={0.25} />
      <mesh position-y={0.1} material={mat('#9c8b86', { flat: true })} receiveShadow raycast={none}>
        <boxGeometry args={[4.6, 0.2, 3.4]} />
      </mesh>
      <mesh position-y={1.3} material={mat('#c8674a')} castShadow receiveShadow>
        <boxGeometry args={[4.2, 2.4, 3.0]} />
      </mesh>
      {/* plank lines */}
      {[-1.6, -0.8, 0.8, 1.6].map((x) => (
        <mesh key={x} position={[x, 1.3, 1.51]} material={mat('#a9533b')} raycast={none}>
          <boxGeometry args={[0.06, 2.4, 0.02]} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]} material={mat('#f3e2c4')} raycast={none}>
        <boxGeometry args={[4.3, 0.14, 3.1]} />
      </mesh>
      <mesh geometry={roof} position-y={2.55} material={mat('#4d4672', { flat: true })} castShadow />
      <mesh position={[0, 2.6, 1.76]} material={mat('#f3e2c4')} raycast={none}>
        <boxGeometry args={[4.9, 0.1, 0.06]} />
      </mesh>
      {/* the big door */}
      <mesh position={[0, 1.05, 1.505]} material={inside} raycast={none}>
        <planeGeometry args={[2.0, 1.8]} />
      </mesh>
      <mesh position={[0, 2.0, 1.54]} material={mat('#6e4630')} raycast={none}>
        <boxGeometry args={[2.5, 0.1, 0.08]} />
      </mesh>
      <mesh ref={doorL} userData={DYN} position={[-0.55, 1.05, 1.58]} material={mat('#e9d6b4')} castShadow raycast={none}>
        <boxGeometry args={[1.08, 1.82, 0.07]} />
      </mesh>
      <mesh ref={doorR} userData={DYN} position={[0.55, 1.05, 1.58]} material={mat('#e9d6b4')} castShadow raycast={none}>
        <boxGeometry args={[1.08, 1.82, 0.07]} />
      </mesh>
      <Glow position={[0, 1.05, 1.9]} color="#ffa64d" size={2.6} opacity={0.12} nightBoost={2} act={3} />
      {/* gears on the gable */}
      <mesh ref={gear} userData={DYN} geometry={gearGeo} position={[-0.45, 3.3, 1.72]} material={mat('#e3b04b', { metal: 0.6, rough: 0.35 })} castShadow raycast={none} />
      <mesh ref={gear2} userData={DYN} geometry={gearGeo2} position={[0.62, 3.05, 1.7]} material={mat('#9fd0c4', { metal: 0.5, rough: 0.4 })} raycast={none} />
      {/* side windows */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.11, 1.5, 0.2]} rotation-y={(s * Math.PI) / 2} material={mat('#ffe4a8', { emissive: '#ffb84d', ei: 0.6 })} raycast={none}>
          <planeGeometry args={[1.4, 0.6]} />
        </mesh>
      ))}
      {/* chimney */}
      <mesh position={[1.4, 3.6, -0.6]} material={mat('#5d5470')} castShadow raycast={none}>
        <cylinderGeometry args={[0.22, 0.26, 1.4, 10]} />
      </mesh>
      <Smoke position={[1.4, 4.35, -0.6]} count={6} size={0.32} rise={2.4} speed={0.3} strength={0.3} color="#f2ece6" />
      <Sign text="WORKSHOP" position={[0, 2.08, 1.56]} w={1.7} h={0.3} post={0} bg="#2b2343" fg="#f2c46d" />
    </group>
  )
}

/* ── station: the Java Engine (a coffee pot, obviously) ────────── */
function Engine() {
  const st = useLandmark()
  const pistons = useRef<(THREE.Mesh | null)[]>([])
  const needle = useRef<THREE.Mesh>(null)
  const pot = useMemo(() => {
    const pts = [
      [0, 0],
      [0.42, 0],
      [0.5, 0.12],
      [0.52, 0.55],
      [0.44, 0.9],
      [0.3, 1.05],
      [0.32, 1.12],
      [0, 1.12],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 20)
  }, [])
  const label = useMemo(
    () =>
      canvasTexture(256, 128, (g, w, h) => {
        g.fillStyle = '#2b2343'
        g.beginPath()
        g.roundRect(4, 4, w - 8, h - 8, 26)
        g.fill()
        g.fillStyle = '#f2c46d'
        g.font = `800 68px ${SIGN_FONT}`
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText('JAVA', w / 2, h / 2 + 4)
      }),
    [],
  )
  useFrame((s) => {
    const a = st.current.act
    const t = s.clock.elapsedTime * (2 + a * 6)
    pistons.current.forEach((p, i) => {
      if (p) p.position.y = 0.45 + Math.sin(t + i * Math.PI) * 0.12 * (0.3 + a)
    })
    if (needle.current) needle.current.rotation.z = -0.8 + a * 1.4 + Math.sin(s.clock.elapsedTime * 7) * 0.05 * a
  })
  return (
    <group>
      <Blob r={1} />
      <mesh position-y={0.08} material={mat('#3d3552', { metal: 0.4, rough: 0.5 })} castShadow receiveShadow raycast={none}>
        <boxGeometry args={[1.3, 0.16, 1.0]} />
      </mesh>
      <mesh geometry={pot} position-y={0.16} material={mat('#cf7a43', { metal: 0.55, rough: 0.32 })} castShadow />
      <mesh position-y={1.33} material={mat('#e3b04b', { metal: 0.6, rough: 0.3 })} raycast={none}>
        <sphereGeometry args={[0.1, 10, 8]} />
      </mesh>
      {/* spout */}
      <mesh position={[0.52, 0.85, 0]} rotation-z={-0.85} material={mat('#cf7a43', { metal: 0.55, rough: 0.32 })} castShadow raycast={none}>
        <cylinderGeometry args={[0.06, 0.11, 0.6, 8]} />
      </mesh>
      {/* handle */}
      <mesh position={[-0.5, 0.65, 0]} rotation-z={Math.PI / 2} material={mat('#3d3552')} raycast={none}>
        <torusGeometry args={[0.25, 0.05, 6, 14, Math.PI]} />
      </mesh>
      {/* label + gauge */}
      <mesh position={[0, 0.55, 0.53]} raycast={none}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshStandardMaterial map={label} roughness={0.6} />
      </mesh>
      <group position={[0, 0.95, 0.42]} rotation-x={-0.35}>
        <mesh rotation-x={Math.PI / 2} material={mat('#fff6e6')} raycast={none}>
          <cylinderGeometry args={[0.13, 0.13, 0.04, 16]} />
        </mesh>
        <mesh ref={needle} userData={DYN} position-z={0.03} material={mat('#e2584a')} raycast={none}>
          <boxGeometry args={[0.02, 0.2, 0.01]} />
        </mesh>
      </group>
      {/* pistons */}
      {[-0.5, 0.5].map((z, i) => (
        <mesh key={z} ref={(el) => void (pistons.current[i] = el)} userData={DYN} position={[0.45, 0.45, z * 0.75]} material={mat('#b8c1d6', { metal: 0.7, rough: 0.3 })} castShadow raycast={none}>
          <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
        </mesh>
      ))}
      <Smoke position={[0.82, 1.1, 0]} count={6} size={0.2} rise={1.5} speed={0.55} strength={0.25} />
    </group>
  )
}

/* ── station: the Framework Forge ──────────────────────────────── */
function Forge() {
  const st = useLandmark()
  const hammer = useRef<THREE.Group>(null)
  const fire = useMemo(() => ownMat('#ffb15c', { emissive: '#ff6a1f', ei: 1 }), [])
  const sparks = useRef<THREE.Sprite>(null)
  useFrame((s) => {
    const a = st.current.act
    const t = s.clock.elapsedTime
    const cyc = (t * (0.6 + a * 0.9)) % 1
    const hit = cyc < 0.82 ? cyc / 0.82 : 1 - (cyc - 0.82) / 0.18
    if (hammer.current) hammer.current.rotation.z = -1.2 + hit * hit * 1.25
    fire.emissiveIntensity = 1 + Math.sin(t * 9) * 0.25 + a * 0.8
    if (sparks.current) {
      const sp = cyc > 0.82 && cyc < 0.95 ? 1 : 0
      sparks.current.scale.setScalar(0.4 + sp * (0.9 + a))
      ;(sparks.current.material as THREE.SpriteMaterial).opacity = sp * (0.5 + a * 0.5)
    }
  })
  return (
    <group>
      <Blob r={1.1} />
      {/* furnace */}
      <group position={[-0.35, 0, -0.25]}>
        <mesh position-y={0.55} material={mat('#8a6a6a', { flat: true })} castShadow>
          <boxGeometry args={[0.9, 1.1, 0.8]} />
        </mesh>
        <mesh position={[0, 0.5, 0.41]} material={fire} raycast={none}>
          <planeGeometry args={[0.46, 0.36]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} material={mat('#5d5470')} castShadow raycast={none}>
          <cylinderGeometry args={[0.16, 0.2, 0.5, 8]} />
        </mesh>
        <Glow position={[0, 0.5, 0.6]} color="#ff8a3c" size={1.4} opacity={0.4} act={1} />
      </group>
      {/* anvil */}
      <group position={[0.42, 0, 0.32]}>
        <mesh position-y={0.2} material={mat('#5d5470')} castShadow raycast={none}>
          <boxGeometry args={[0.22, 0.4, 0.22]} />
        </mesh>
        <mesh position-y={0.47} material={mat('#3d3552', { metal: 0.6, rough: 0.35 })} castShadow raycast={none}>
          <boxGeometry args={[0.6, 0.16, 0.26]} />
        </mesh>
        <mesh position={[0.36, 0.5, 0]} rotation-z={-Math.PI / 2} material={mat('#3d3552', { metal: 0.6, rough: 0.35 })} raycast={none}>
          <coneGeometry args={[0.08, 0.22, 6]} />
        </mesh>
        <sprite ref={sparks} position={[0, 0.65, 0]} raycast={none}>
          <spriteMaterial color="#ffd27a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        {/* the hammer pivots from behind */}
        <group ref={hammer} userData={ROOT} position={[-0.42, 0.62, 0]}>
          <mesh position={[0.3, 0, 0]} rotation-z={Math.PI / 2} material={mat('#8a5a3c')} raycast={none}>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 5]} />
          </mesh>
          <mesh position={[0.58, 0, 0]} material={mat('#b8c1d6', { metal: 0.7, rough: 0.3 })} castShadow raycast={none}>
            <boxGeometry args={[0.12, 0.2, 0.14]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/* ── station: the Paint Shop (front-end) ───────────────────────── */
function Studio() {
  const canvasTex = useMemo(
    () =>
      canvasTexture(320, 400, (g, w, h) => {
        g.fillStyle = '#fffaf0'
        g.fillRect(0, 0, w, h)
        // a tiny interface, painted
        g.fillStyle = '#4a6fd1'
        g.fillRect(0, 0, w, 54)
        g.fillStyle = '#fff'
        for (let i = 0; i < 3; i++) g.fillRect(w - 40 - i * 50, 22, 32, 10)
        g.fillStyle = '#241c36'
        g.font = `800 38px ${SIGN_FONT}`
        g.fillText('Hello!', 24, 120)
        g.fillStyle = '#c9c0d6'
        for (let i = 0; i < 3; i++) g.fillRect(24, 145 + i * 20, w - 48 - i * 40, 10)
        const cols = ['#e2694f', '#2aa596', '#e0a43a']
        cols.forEach((c, i) => {
          g.fillStyle = c
          g.beginPath()
          g.roundRect(24 + i * 94, 230, 80, 100, 14)
          g.fill()
        })
        g.fillStyle = '#241c36'
        g.beginPath()
        g.roundRect(24, 350, 130, 32, 16)
        g.fill()
      }),
    [],
  )
  return (
    <group>
      <Blob r={0.9} />
      {/* easel */}
      <group rotation-y={-0.15}>
        {[-0.32, 0.32].map((x) => (
          <mesh key={x} position={[x, 0.8, 0]} rotation-z={x > 0 ? -0.1 : 0.1} material={mat('#a86b45')} castShadow raycast={none}>
            <boxGeometry args={[0.05, 1.6, 0.05]} />
          </mesh>
        ))}
        <mesh position={[0, 0.75, -0.35]} rotation-x={-0.4} material={mat('#a86b45')} raycast={none}>
          <boxGeometry args={[0.05, 1.5, 0.05]} />
        </mesh>
        <mesh position={[0, 0.62, 0.05]} material={mat('#a86b45')} raycast={none}>
          <boxGeometry args={[0.8, 0.05, 0.12]} />
        </mesh>
        <mesh position={[0, 1.08, 0.06]} rotation-x={-0.08} castShadow>
          <boxGeometry args={[0.74, 0.92, 0.04]} />
          <meshStandardMaterial color="#fffaf0" />
        </mesh>
        <mesh position={[0, 1.08, 0.085]} rotation-x={-0.08} raycast={none}>
          <planeGeometry args={[0.7, 0.88]} />
          <meshStandardMaterial map={canvasTex} roughness={0.9} />
        </mesh>
      </group>
      {/* palette + paint pots */}
      <mesh position={[0.6, 0.06, 0.35]} material={mat('#e9c896')} raycast={none}>
        <cylinderGeometry args={[0.26, 0.26, 0.03, 16]} />
      </mesh>
      {['#e2694f', '#4a6fd1', '#2aa596', '#e0a43a'].map((c, i) => (
        <mesh key={c} position={[0.6 + Math.cos(i * 1.4) * 0.15, 0.09, 0.35 + Math.sin(i * 1.4) * 0.15]} material={mat(c)} raycast={none}>
          <sphereGeometry args={[0.05, 8, 6]} />
        </mesh>
      ))}
      {['#e2694f', '#4a6fd1', '#e0a43a'].map((c, i) => (
        <group key={c} position={[-0.55 + i * 0.22, 0, 0.42 - i * 0.05]}>
          <mesh position-y={0.11} material={mat('#e8e2da', { metal: 0.3, rough: 0.4 })} castShadow raycast={none}>
            <cylinderGeometry args={[0.09, 0.09, 0.22, 10]} />
          </mesh>
          <mesh position-y={0.225} material={mat(c)} raycast={none}>
            <cylinderGeometry args={[0.085, 0.085, 0.01, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ── station: the Data Vault (a database, stacked) ─────────────── */
function Vault() {
  const st = useLandmark()
  const bands = useMemo(() => [0, 1, 2].map(() => ownMat('#9ff0e0', { emissive: '#2fd1b8', ei: 0.3 })), [])
  useFrame((s) => {
    const a = st.current.act
    const t = s.clock.elapsedTime
    bands.forEach((m, i) => {
      const p = Math.max(0, Math.sin(t * (1.4 + a * 2.2) - i * 1.1))
      m.emissiveIntensity = 0.25 + p * (0.4 + a * 1.6)
    })
  })
  return (
    <group>
      <Blob r={0.9} />
      {[0, 1, 2].map((i) => (
        <group key={i} position-y={0.24 + i * 0.44}>
          <mesh material={mat('#3f6fb0', { rough: 0.45, metal: 0.25 })} castShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.36, 24]} />
          </mesh>
          <mesh position-y={0.19} material={mat('#5e8fd0', { rough: 0.4 })} raycast={none}>
            <cylinderGeometry args={[0.55, 0.55, 0.02, 24]} />
          </mesh>
          <mesh position-y={-0.2} material={bands[i]} raycast={none}>
            <cylinderGeometry args={[0.57, 0.57, 0.05, 24]} />
          </mesh>
          {/* status lights */}
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[Math.sin(-0.35 + k * 0.35) * 0.555, 0, Math.cos(-0.35 + k * 0.35) * 0.555]} material={bands[(i + k) % 3]} raycast={none}>
              <sphereGeometry args={[0.04, 6, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position-y={1.54} material={mat('#5e8fd0')} raycast={none}>
        <sphereGeometry args={[0.55, 24, 8, 0, Math.PI * 2, 0, Math.PI / 6]} />
      </mesh>
    </group>
  )
}

/* ── station: the API Relay (mast + pneumatic tubes) ───────────── */
function Relay() {
  const st = useLandmark()
  const dish = useRef<THREE.Group>(null)
  const blink = useMemo(() => ownMat('#ff8a7a', { emissive: '#ff3b2f', ei: 1 }), [])
  const packets = useRef<(THREE.Mesh | null)[]>([])
  // tubes run from the mast to the vault and back into the barn
  const curves = useMemo(() => {
    const toLocal = (p: number[]) => new THREE.Vector3(p[0] - S.relay[0], 0, p[2] - S.relay[2])
    const v = toLocal(S.vault)
    const b = new THREE.Vector3(1.2 - S.relay[0], 0, -0.6 - S.relay[2])
    return [
      new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(v.x * 0.5, 0.9, v.z * 0.5 + 0.2), new THREE.Vector3(v.x + 0.5, 0.75, v.z)]),
      new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(b.x * 0.5, 1.3, b.z * 0.5), new THREE.Vector3(b.x, 1.4, b.z)]),
    ]
  }, [])
  const tubes = useMemo(() => curves.map((c) => new THREE.TubeGeometry(c, 30, 0.05, 6, false)), [curves])
  const packetMat = useMemo(() => ownMat('#fff3c4', { emissive: '#ffd36b', ei: 2 }), [])
  useFrame((s, dt) => {
    const a = st.current.act
    const t = s.clock.elapsedTime
    if (dish.current) dish.current.rotation.y += dt * (0.3 + a * 0.9)
    blink.emissiveIntensity = Math.sin(t * 4) > 0.6 ? 3 : 0.3
    packets.current.forEach((p, i) => {
      if (!p) return
      const c = curves[i % 2]
      const u = (t * (0.25 + a * 0.45) + i * 0.37) % 1
      c.getPointAt(i >= 2 ? 1 - u : u, p.position)
      p.visible = a > 0.05 || i < 2
    })
  })
  return (
    <group>
      <Blob r={0.8} />
      {/* lattice mast */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.17, 1.25, Math.sin(a) * 0.17]} rotation={[Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]} material={mat('#d9d2e6', { metal: 0.5, rough: 0.4 })} castShadow raycast={none}>
            <cylinderGeometry args={[0.025, 0.035, 2.5, 4]} />
          </mesh>
        )
      })}
      {[0.5, 1.1, 1.7].map((y) => (
        <mesh key={y} position-y={y} rotation-x={Math.PI / 2} material={mat('#d9d2e6', { metal: 0.5, rough: 0.4 })} raycast={none}>
          <torusGeometry args={[0.24 - y * 0.06, 0.02, 4, 4]} />
        </mesh>
      ))}
      <mesh position-y={0.2} material={mat('#5d5470')} castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.4, 8]} />
      </mesh>
      <group ref={dish} userData={ROOT} position-y={2.55}>
        <mesh rotation-x={-0.9} position-z={0.12} material={mat('#f3ede4', { rough: 0.5, side: THREE.DoubleSide })} castShadow raycast={none}>
          <sphereGeometry args={[0.42, 18, 8, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
        </mesh>
        <mesh rotation-x={-0.9} position={[0, 0.12, 0.3]} material={mat('#5d5470')} raycast={none}>
          <cylinderGeometry args={[0.015, 0.015, 0.35, 4]} />
        </mesh>
      </group>
      <mesh position-y={2.82} material={blink} raycast={none}>
        <sphereGeometry args={[0.055, 8, 6]} />
      </mesh>
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g} material={mat('#bfe6ec', { rough: 0.25, metal: 0.1, opacity: 0.75 })} raycast={none} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => void (packets.current[i] = el)} userData={DYN} material={packetMat} raycast={none}>
          <capsuleGeometry args={[0.045, 0.08, 3, 6]} />
        </mesh>
      ))}
    </group>
  )
}

/* ── station: the Blueprint Bench ──────────────────────────────── */
function Bench() {
  const st = useLandmark()
  const screen = useMemo(() => ownMat('#ffffff', { emissive: '#ffffff', ei: 0.5 }), [])
  const code = useMemo(
    () =>
      canvasTexture(256, 160, (g, w, h) => {
        g.fillStyle = '#1d1830'
        g.fillRect(0, 0, w, h)
        const cols = ['#f2c46d', '#9fd0c4', '#c3a8f0', '#ee8a5f', '#fbf4e8']
        for (let i = 0; i < 9; i++) {
          g.fillStyle = cols[(i * 3) % cols.length]
          const ind = [0, 1, 1, 2, 2, 1, 2, 1, 0][i] * 16
          g.fillRect(14 + ind, 14 + i * 15, 40 + ((i * 53) % 120), 7)
        }
      }),
    [],
  )
  const blueprint = useMemo(
    () =>
      canvasTexture(256, 180, (g, w, h) => {
        g.fillStyle = '#2f5fa8'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(255,255,255,0.18)'
        g.lineWidth = 1
        for (let x = 0; x < w; x += 16) {
          g.beginPath()
          g.moveTo(x, 0)
          g.lineTo(x, h)
          g.stroke()
        }
        for (let y = 0; y < h; y += 16) {
          g.beginPath()
          g.moveTo(0, y)
          g.lineTo(w, y)
          g.stroke()
        }
        g.strokeStyle = '#ffffff'
        g.lineWidth = 3
        // boxes and arrows: a little architecture diagram
        ;[
          [24, 24],
          [150, 24],
          [24, 110],
          [150, 110],
        ].forEach(([x, y]) => g.strokeRect(x, y, 82, 46))
        g.beginPath()
        g.moveTo(106, 47)
        g.lineTo(150, 47)
        g.moveTo(65, 70)
        g.lineTo(65, 110)
        g.moveTo(191, 70)
        g.lineTo(191, 110)
        g.stroke()
      }),
    [],
  )
  useFrame((s) => {
    screen.emissiveIntensity = 0.45 + st.current.act * 0.5 + Math.sin(s.clock.elapsedTime * 13) * 0.03
  })
  return (
    <group rotation-y={-0.5}>
      <Blob r={0.95} />
      <mesh position-y={0.62} material={mat('#a86b45')} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.07, 0.75]} />
      </mesh>
      {[
        [-0.62, -0.3],
        [0.62, -0.3],
        [-0.62, 0.3],
        [0.62, 0.3],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.3, z]} material={mat('#7a4c33')} raycast={none}>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
        </mesh>
      ))}
      <mesh position={[-0.25, 0.661, 0.08]} rotation={[-Math.PI / 2, 0, 0.12]} raycast={none}>
        <planeGeometry args={[0.72, 0.5]} />
        <meshStandardMaterial map={blueprint} roughness={0.9} />
      </mesh>
      {/* monitor */}
      <group position={[0.35, 0.66, -0.12]}>
        <mesh position-y={0.04} material={mat('#3d3552')} raycast={none}>
          <boxGeometry args={[0.2, 0.06, 0.14]} />
        </mesh>
        <mesh position-y={0.2} material={mat('#3d3552')} raycast={none}>
          <boxGeometry args={[0.05, 0.28, 0.05]} />
        </mesh>
        <mesh position-y={0.46} material={mat('#3d3552')} castShadow raycast={none}>
          <boxGeometry args={[0.64, 0.42, 0.05]} />
        </mesh>
        <mesh position={[0, 0.46, 0.027]} raycast={none}>
          <planeGeometry args={[0.58, 0.36]} />
          <meshStandardMaterial map={code} emissiveMap={code} emissive="#ffffff" emissiveIntensity={0.7} roughness={0.4} />
        </mesh>
      </group>
      {/* desk lamp */}
      <group position={[-0.55, 0.66, -0.22]}>
        <mesh position-y={0.2} rotation-z={0.3} material={mat('#e2584a')} raycast={none}>
          <cylinderGeometry args={[0.015, 0.015, 0.42, 5]} />
        </mesh>
        <mesh position={[0.12, 0.4, 0]} rotation-z={-0.9} material={mat('#e2584a')} raycast={none}>
          <coneGeometry args={[0.09, 0.14, 10, 1, true]} />
        </mesh>
        <Glow position={[0.17, 0.33, 0]} color="#ffe2a8" size={0.6} opacity={0.4} nightBoost={1.5} />
      </group>
    </group>
  )
}

function Clutter() {
  return (
    <group>
      {[
        [2.6, -0.6, 0.3],
        [2.9, -1.0, 0.8],
        [-2.6, -0.3, -0.4],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.22, z]} rotation-y={r} material={mat(i % 2 ? '#b98258' : '#a8734d', { flat: true })} castShadow raycast={none}>
          <boxGeometry args={[0.44, 0.44, 0.44]} />
        </mesh>
      ))}
      {[
        [-2.95, -1.0],
        [2.3, -1.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]} material={mat('#7a5238')} castShadow raycast={none}>
          <cylinderGeometry args={[0.24, 0.24, 0.6, 10]} />
        </mesh>
      ))}
      <Lantern position={[-1.4, 0, 1.1]} />
      <Lantern position={[1.5, 0, 1.2]} />
    </group>
  )
}

export function Workshop() {
  const p = (k: keyof typeof S) => S[k] as [number, number, number]
  return (
    <Landmark id="workshop">
      <Barn />
      <Clutter />
      <group position={p('engine')} rotation-y={-0.45}>
        <Hot loc="workshop" id="engine">
          <Engine />
        </Hot>
      </group>
      <group position={p('forge')} rotation-y={0.1}>
        <Hot loc="workshop" id="forge">
          <Forge />
        </Hot>
      </group>
      <group position={p('studio')}>
        <Hot loc="workshop" id="studio">
          <Studio />
        </Hot>
      </group>
      <group position={p('vault')}>
        <Hot loc="workshop" id="vault">
          <Vault />
        </Hot>
      </group>
      <group position={p('relay')}>
        <Hot loc="workshop" id="relay">
          <Relay />
        </Hot>
      </group>
      <group position={p('bench')}>
        <Hot loc="workshop" id="bench">
          <Bench />
        </Hot>
      </group>
    </Landmark>
  )
}
