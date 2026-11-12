import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../../store'
import { mat, ownMat, rand, signTexture } from '../kit'
import { Blob, Glow, Lantern } from '../bits'
import { Landmark, useLandmark } from '../Landmark'
import { DYN, ROOT } from '../batch'

const none = () => null
const H = 5.6

function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uAmt: { value: 0.2 }, uColor: { value: new THREE.Color().setStyle('#ffe7b0', THREE.LinearSRGBColorSpace) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAmt; uniform vec3 uColor;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float along = pow(vUv.y, 1.6);
        float soft = pow(abs(dot(vN, vV)), 1.4);
        float a = along * soft * uAmt;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  })
}

function Tower() {
  const st = useLandmark()
  const beams = useRef<THREE.Group>(null)
  const lamp = useMemo(() => ownMat('#fff6d8', { emissive: '#ffd36b', ei: 1 }), [])
  const light = useRef<THREE.PointLight>(null)
  const beamMat = useMemo(beamMaterial, [])
  const beamGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(1.5, 11, 24, 1, true)
    g.translate(0, -5.5, 0)
    g.rotateZ(Math.PI / 2)
    return g
  }, [])
  const stripes = useMemo(() => {
    const n = 6
    return Array.from({ length: n }, (_, i) => {
      const y0 = (i / n) * H
      const y1 = ((i + 1) / n) * H
      const r = (y: number) => 1.05 - (y / H) * 0.38
      return { y: (y0 + y1) / 2, h: y1 - y0, rt: r(y1), rb: r(y0), c: i % 2 ? '#e2584a' : '#f7efe2' }
    })
  }, [])

  useFrame((_, dt) => {
    const a = st.current.act
    const n = world.night
    if (beams.current) beams.current.rotation.y += dt * (0.35 + a * 0.25)
    beamMat.uniforms.uAmt.value = 0.08 + n * 1.1 + a * 0.15
    lamp.emissiveIntensity = 1 + n * 2.5 + a
    if (light.current) light.current.intensity = n * 30
  })

  return (
    <group position={[0, 0, -0.3]}>
      <Blob r={1.8} />
      {/* rocky footing */}
      <mesh position-y={0.15} material={mat('#b3a2a0', { flat: true })} castShadow receiveShadow raycast={none}>
        <cylinderGeometry args={[1.45, 1.65, 0.3, 9]} />
      </mesh>
      {stripes.map((s, i) => (
        <mesh key={i} position-y={0.3 + s.y} material={mat(s.c)} castShadow receiveShadow>
          <cylinderGeometry args={[s.rt, s.rb, s.h, 24]} />
        </mesh>
      ))}
      {/* door + windows */}
      <mesh position={[0, 0.85, 1.0]} rotation-x={-0.06} material={mat('#6e4630')} raycast={none}>
        <boxGeometry args={[0.46, 0.9, 0.1]} />
      </mesh>
      {[2.4, 3.9].map((y) => (
        <mesh key={y} position={[0, y, 1.06 - (y / H) * 0.38 + 0.02]} material={mat('#ffe9b8', { emissive: '#ffb84d', ei: 0.9 })} raycast={none}>
          <circleGeometry args={[0.12, 12]} />
        </mesh>
      ))}
      {/* gallery */}
      <group position-y={0.3 + H}>
        <mesh material={mat('#3d3552')} castShadow raycast={none}>
          <cylinderGeometry args={[0.95, 0.85, 0.14, 24]} />
        </mesh>
        <mesh position-y={0.3} material={mat('#3d3552')} raycast={none}>
          <torusGeometry args={[0.92, 0.025, 4, 32]} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.92, 0.16, Math.sin(a) * 0.92]} material={mat('#3d3552')} raycast={none}>
              <cylinderGeometry args={[0.015, 0.015, 0.3, 4]} />
            </mesh>
          )
        })}
        {/* lamp room */}
        <mesh position-y={0.5} material={lamp}>
          <cylinderGeometry args={[0.5, 0.5, 0.8, 16]} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos((i / 6) * Math.PI * 2) * 0.52, 0.5, Math.sin((i / 6) * Math.PI * 2) * 0.52]} material={mat('#3d3552')} raycast={none}>
            <boxGeometry args={[0.05, 0.82, 0.05]} />
          </mesh>
        ))}
        <mesh position-y={1.18} material={mat('#e2584a', { flat: true })} castShadow>
          <coneGeometry args={[0.66, 0.62, 16]} />
        </mesh>
        <mesh position-y={1.6} material={mat('#e7b53f', { metal: 0.7, rough: 0.3 })} raycast={none}>
          <sphereGeometry args={[0.09, 10, 8]} />
        </mesh>
        <group ref={beams} userData={ROOT} position-y={0.5}>
          <mesh geometry={beamGeo} material={beamMat} raycast={none} />
          <mesh geometry={beamGeo} material={beamMat} rotation-y={Math.PI} raycast={none} />
        </group>
        <Glow position={[0, 0.5, 0]} color="#ffe08a" size={3.4} opacity={0.35} nightBoost={2.2} act={0.6} />
        <pointLight ref={light} position-y={0.5} color="#ffd88a" intensity={0} distance={26} decay={1.6} />
      </group>
    </group>
  )
}

/** The mailbox — contact, literally. */
function Mailbox() {
  const st = useLandmark()
  const flag = useRef<THREE.Mesh>(null)
  const sign = useMemo(() => signTexture('SAY HI', { bg: '#fbf4e8', fg: '#e2584a', w: 256, h: 96 }), [])
  useFrame(() => {
    if (flag.current) flag.current.rotation.z = -Math.PI / 2 + st.current.act * (Math.PI / 2)
  })
  return (
    <group position={[1.75, 0, 1.15]} rotation-y={-0.5}>
      <mesh position-y={0.45} material={mat('#7a5238')} castShadow raycast={none}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
      </mesh>
      <mesh position-y={1.02} material={mat('#4a6fd1')} castShadow>
        <boxGeometry args={[0.34, 0.3, 0.56]} />
      </mesh>
      <mesh position={[0, 1.17, 0]} rotation-x={Math.PI / 2} material={mat('#4a6fd1')} raycast={none}>
        <cylinderGeometry args={[0.17, 0.17, 0.56, 12, 1, false, 0, Math.PI]} />
      </mesh>
      <mesh position={[0, 1.02, 0.285]} raycast={none}>
        <planeGeometry args={[0.3, 0.11]} />
        <meshStandardMaterial map={sign} />
      </mesh>
      <mesh ref={flag} userData={DYN} position={[0.19, 1.1, -0.1]} material={mat('#e2584a')} raycast={none}>
        <boxGeometry args={[0.02, 0.3, 0.1]} />
      </mesh>
    </group>
  )
}

function Rocks() {
  const rocks = useMemo(() => {
    const r = rand(91)
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + r() * 0.4
      const d = 1.8 + r() * 0.7
      return { p: [Math.cos(a) * d, 0, Math.sin(a) * d] as [number, number, number], s: 0.35 + r() * 0.4, r: r() * 3 }
    })
  }, [])
  return (
    <>
      {rocks.map((k, i) => (
        <mesh key={i} position={k.p} rotation={[k.r, k.r * 2, 0]} scale={[k.s * 1.2, k.s * 0.7, k.s]} material={mat(i % 2 ? '#9a8a92' : '#b3a2a0', { flat: true })} castShadow receiveShadow raycast={none}>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </>
  )
}

export function Lighthouse() {
  return (
    <Landmark id="lighthouse">
      <Tower />
      <Mailbox />
      <Rocks />
      <Lantern position={[-1.55, 0, 1.2]} />
      {/* a bench to watch the sea from */}
      <group position={[-1.2, 0, -1.5]} rotation-y={2.6}>
        <mesh position-y={0.32} material={mat('#a86b45')} castShadow raycast={none}>
          <boxGeometry args={[1.0, 0.07, 0.34]} />
        </mesh>
        {[-0.4, 0.4].map((x) => (
          <mesh key={x} position={[x, 0.15, 0]} material={mat('#7a4c33')} raycast={none}>
            <boxGeometry args={[0.07, 0.3, 0.3]} />
          </mesh>
        ))}
      </group>
    </Landmark>
  )
}
