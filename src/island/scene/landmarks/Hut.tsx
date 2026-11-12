import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../../store'
import { heightAt } from '../../terrain'
import { canvasTexture, mat, ownMat, SIGN_FONT } from '../kit'
import { Blob, Glow, Lantern, Sign, Smoke } from '../bits'
import { Landmark, useLandmark } from '../Landmark'
import { ROOT } from '../batch'

const none = () => null

function HutBody() {
  const st = useLandmark()
  const door = useRef<THREE.Group>(null)
  const sign = useRef<THREE.Group>(null)
  const windowMat = useMemo(() => ownMat('#ffe7b0', { emissive: '#ffb84d', ei: 0.5 }), [])
  const inside = useMemo(() => ownMat('#ffd48a', { emissive: '#ffae4a', ei: 0.4 }), [])
  const mat_ = useMemo(
    () =>
      canvasTexture(256, 160, (g, w, h) => {
        g.fillStyle = '#c4553e'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#f2c46d'
        g.lineWidth = 10
        g.strokeRect(10, 10, w - 20, h - 20)
        g.fillStyle = '#fff2d8'
        g.font = `800 92px ${SIGN_FONT}`
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText('HI!', w / 2, h / 2 + 6)
      }),
    [],
  )

  useFrame((s) => {
    const a = st.current.act
    if (door.current) door.current.rotation.y = -a * 1.75
    windowMat.emissiveIntensity = 0.5 + a * 1.2 + world.night * 1.4
    inside.emissiveIntensity = 0.4 + a * 1.4 + world.night
    if (sign.current) sign.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.6) * 0.04 * (0.4 + a)
  })

  // timber posts around the wall
  const posts = useMemo(() => Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2 + Math.PI / 10), [])

  return (
    <group>
      <Blob r={2.6} opacity={0.3} />
      {/* stone base */}
      <mesh position-y={0.15} material={mat('#bcaaa3', { flat: true })} castShadow receiveShadow raycast={none}>
        <cylinderGeometry args={[1.95, 2.05, 0.3, 12]} />
      </mesh>
      {/* walls */}
      <mesh position-y={1.15} material={mat('#f4e1c1')} castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 1.6, 1.7, 24]} />
      </mesh>
      {posts.map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 1.58, 1.15, Math.cos(a) * 1.58]} rotation-y={a} material={mat('#8a5a3c')} castShadow raycast={none}>
          <boxGeometry args={[0.14, 1.72, 0.08]} />
        </mesh>
      ))}
      <mesh position-y={1.95} material={mat('#8a5a3c')} raycast={none}>
        <torusGeometry args={[1.6, 0.06, 6, 28]} />
      </mesh>
      {/* thatched roof in two layers */}
      <mesh position-y={2.95} material={mat('#d4873f', { flat: true })} castShadow>
        <coneGeometry args={[2.35, 1.9, 12, 2]} />
      </mesh>
      <mesh position-y={3.55} material={mat('#e5a456', { flat: true })} castShadow raycast={none}>
        <coneGeometry args={[1.55, 1.3, 12, 1]} />
      </mesh>
      <mesh position-y={4.25} material={mat('#c4553e')} raycast={none}>
        <sphereGeometry args={[0.16, 10, 8]} />
      </mesh>
      {/* chimney + smoke */}
      <mesh position={[0.85, 3.35, -0.55]} material={mat('#a5614d', { flat: true })} castShadow raycast={none}>
        <boxGeometry args={[0.34, 1.0, 0.34]} />
      </mesh>
      <Smoke position={[0.85, 3.95, -0.55]} count={6} size={0.28} rise={2.2} speed={0.22} strength={0.35} />

      {/* door (opens when you visit) */}
      <mesh position={[0, 0.95, 1.5]} material={mat('#6e4630')} raycast={none}>
        <boxGeometry args={[0.92, 1.36, 0.14]} />
      </mesh>
      <mesh position={[0, 0.92, 1.49]} material={inside} raycast={none}>
        <planeGeometry args={[0.72, 1.18]} />
      </mesh>
      <group ref={door} userData={ROOT} position={[-0.36, 0.92, 1.6]}>
        <mesh position-x={0.36} material={mat('#9b603d')} castShadow raycast={none}>
          <boxGeometry args={[0.72, 1.18, 0.07]} />
        </mesh>
        <mesh position={[0.6, 0, 0.05]} material={mat('#e7b53f', { metal: 0.7, rough: 0.3 })} raycast={none}>
          <sphereGeometry args={[0.045, 8, 6]} />
        </mesh>
        <mesh position={[0.36, 0.25, 0.04]} material={mat('#7d4a2f')} raycast={none}>
          <boxGeometry args={[0.6, 0.04, 0.02]} />
        </mesh>
        <mesh position={[0.36, -0.25, 0.04]} material={mat('#7d4a2f')} raycast={none}>
          <boxGeometry args={[0.6, 0.04, 0.02]} />
        </mesh>
      </group>
      <Glow position={[0, 0.95, 1.75]} color="#ffb860" size={2.2} opacity={0.18} nightBoost={2} act={2.5} />

      {/* round windows */}
      {[-0.9, 0.9].map((a) => (
        <group key={a} position={[Math.sin(a) * 1.57, 1.3, Math.cos(a) * 1.57]} rotation-y={a}>
          <mesh material={mat('#8a5a3c')} raycast={none}>
            <torusGeometry args={[0.27, 0.05, 6, 18]} />
          </mesh>
          <mesh position-z={0.01} material={windowMat} raycast={none}>
            <circleGeometry args={[0.25, 18]} />
          </mesh>
          <mesh position-z={0.02} material={mat('#8a5a3c')} raycast={none}>
            <boxGeometry args={[0.5, 0.035, 0.02]} />
          </mesh>
        </group>
      ))}

      {/* doormat */}
      <mesh position={[0, 0.31, 2.08]} rotation-x={-Math.PI / 2} raycast={none}>
        <planeGeometry args={[0.95, 0.6]} />
        <meshStandardMaterial map={mat_} roughness={1} />
      </mesh>

      {/* swinging welcome sign */}
      <group ref={sign} userData={ROOT} position={[2.1, 0, 1.55]}>
        <Sign text="WELCOME" position={[0, 0, 0]} rotationY={-0.35} w={1.35} h={0.42} post={1.15} bg="#fbe9c6" fg="#c4553e" />
      </group>
      <Lantern position={[-1.95, 0, 1.6]} />

      {/* flower pots + a bench */}
      {[
        [1.25, 1.95, '#ff8fab'],
        [-1.15, 2.05, '#ffd166'],
        [1.9, 0.2, '#c9b5ff'],
      ].map(([x, z, c], i) => (
        <group key={i} position={[x as number, 0.3, z as number]}>
          <mesh position-y={0.16} material={mat('#c56b4a')} castShadow raycast={none}>
            <cylinderGeometry args={[0.2, 0.15, 0.32, 10]} />
          </mesh>
          <mesh position-y={0.42} material={mat('#5c9d4e')} raycast={none}>
            <sphereGeometry args={[0.22, 10, 8]} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[Math.cos(k * 2.1) * 0.13, 0.55, Math.sin(k * 2.1) * 0.13]} material={mat(c as string, { emissive: c as string, ei: 0.15 })} raycast={none}>
              <sphereGeometry args={[0.07, 8, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      <group position={[-1.95, 0.3, -0.2]} rotation-y={1.35}>
        <mesh position-y={0.32} material={mat('#a86b45')} castShadow raycast={none}>
          <boxGeometry args={[1.1, 0.07, 0.36]} />
        </mesh>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, 0.15, 0]} material={mat('#7a4c33')} raycast={none}>
            <boxGeometry args={[0.07, 0.3, 0.3]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** The wooden pier where visitors "arrive". World space. */
export function Pier() {
  const planks = useMemo(() => {
    const out: { z: number; y: number }[] = []
    for (let z = 16.6; z < 27; z += 0.42) out.push({ z, y: Math.max(0.48, heightAt(2.6, z) + 0.12) })
    return out
  }, [])
  const posts = useMemo(() => {
    const out: [number, number][] = []
    for (let z = 18; z < 27; z += 1.8) out.push([1.95, z], [3.25, z])
    return out
  }, [])
  return (
    <group userData={ROOT}>
      {planks.map((p, i) => (
        <mesh key={i} position={[2.6, p.y, p.z]} rotation-y={(i % 3) * 0.015} material={mat(i % 2 ? '#b98258' : '#a8734d')} castShadow receiveShadow raycast={none}>
          <boxGeometry args={[1.6, 0.08, 0.36]} />
        </mesh>
      ))}
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, -0.4, z]} material={mat('#6e4a34')} raycast={none}>
          <cylinderGeometry args={[0.1, 0.12, 2.2, 6]} />
        </mesh>
      ))}
      {/* rowboat tied at the end */}
      <group position={[4.4, 0.05, 25.4]} rotation-y={0.2}>
        <mesh scale={[0.7, 0.32, 1.6]} material={mat('#5d8fc9')} castShadow raycast={none}>
          <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
        <mesh position-y={0.01} rotation-x={-Math.PI / 2} scale={[0.62, 1.5, 1]} material={mat('#c99a6b')} raycast={none}>
          <circleGeometry args={[1, 16]} />
        </mesh>
      </group>
      <Lantern position={[1.95, 0.52, 26.4]} height={1.1} />
    </group>
  )
}

export function Hut() {
  return (
    <Landmark id="hut">
      <HutBody />
    </Landmark>
  )
}
