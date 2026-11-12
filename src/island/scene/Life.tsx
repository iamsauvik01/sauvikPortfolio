import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../store'
import { glowTexture, mat, rand, timeUniform } from './kit'
import { DYN, ROOT } from './batch'

/* ── seagulls: lazy circles over the island ────────────────────── */
function gullGeo() {
  const body = new THREE.ConeGeometry(0.09, 0.5, 5)
  body.rotateX(Math.PI / 2)
  return body
}
function wingGeo(side: 1 | -1) {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(0.35 * side, 0.12, 0.72 * side, -0.05)
  s.quadraticCurveTo(0.35 * side, -0.06, 0, -0.14)
  const g = new THREE.ShapeGeometry(s, 3)
  g.rotateX(-Math.PI / 2)
  return g
}

export function Gulls({ count }: { count: number }) {
  const birds = useMemo(() => {
    const r = rand(55)
    return Array.from({ length: count }, () => ({
      cx: (r() - 0.5) * 20,
      cz: (r() - 0.5) * 20,
      rad: 10 + r() * 16,
      y: 9 + r() * 7,
      speed: (0.1 + r() * 0.08) * (r() > 0.5 ? 1 : -1),
      ph: r() * Math.PI * 2,
      flap: 5 + r() * 3,
    }))
  }, [count])
  const geos = useMemo(() => ({ body: gullGeo(), l: wingGeo(1), r: wingGeo(-1) }), [])
  const m = mat('#fbf7f2', { rough: 0.7, side: THREE.DoubleSide })
  // three instanced draws (bodies, left wings, right wings) instead of three meshes per bird
  const body = useRef<THREE.InstancedMesh>(null)
  const left = useRef<THREE.InstancedMesh>(null)
  const right = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => ({ bird: new THREE.Object3D(), wing: new THREE.Object3D(), m: new THREE.Matrix4() }), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const { bird, wing, m: out } = tmp
    birds.forEach((b, i) => {
      const a = b.ph + t * b.speed
      bird.position.set(b.cx + Math.cos(a) * b.rad, b.y + Math.sin(t * 0.6 + b.ph) * 0.6, b.cz + Math.sin(a) * b.rad)
      bird.rotation.set(0, -a + (b.speed > 0 ? Math.PI : 0), Math.sign(b.speed) * 0.25)
      bird.scale.setScalar(1.3)
      bird.updateMatrix()
      body.current?.setMatrixAt(i, bird.matrix)
      const f = Math.sin(t * b.flap + b.ph) * (0.5 + 0.5 * Math.max(0, Math.sin(t * 0.4 + b.ph)))
      wing.rotation.set(0, 0, f * 0.5)
      wing.updateMatrix()
      left.current?.setMatrixAt(i, out.multiplyMatrices(bird.matrix, wing.matrix))
      wing.rotation.set(0, 0, -f * 0.5)
      wing.updateMatrix()
      right.current?.setMatrixAt(i, out.multiplyMatrices(bird.matrix, wing.matrix))
    })
    for (const r of [body, left, right]) if (r.current) r.current.instanceMatrix.needsUpdate = true
  })
  const none = () => null
  return (
    <group userData={DYN}>
      <instancedMesh ref={body} args={[geos.body, m, count]} frustumCulled={false} raycast={none} />
      <instancedMesh ref={left} args={[geos.l, m, count]} frustumCulled={false} raycast={none} />
      <instancedMesh ref={right} args={[geos.r, m, count]} frustumCulled={false} raycast={none} />
    </group>
  )
}

/* ── a little sailboat on a lazy loop ──────────────────────────── */
export function Sailboat() {
  const ref = useRef<THREE.Group>(null)
  const parts = useMemo(() => {
    const hullShape = new THREE.Shape()
    hullShape.moveTo(-0.9, 0)
    hullShape.quadraticCurveTo(-0.7, -0.35, 0, -0.38)
    hullShape.quadraticCurveTo(0.8, -0.35, 1.1, 0.05)
    hullShape.lineTo(-0.9, 0.05)
    const hull = new THREE.ExtrudeGeometry(hullShape, { depth: 0.6, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 })
    hull.translate(0, 0.25, -0.3)
    const sail = new THREE.BufferGeometry()
    sail.setAttribute('position', new THREE.Float32BufferAttribute([0.05, 0.4, 0, 0.05, 2.0, 0, 0.95, 0.45, 0], 3))
    sail.computeVertexNormals()
    const jib = new THREE.BufferGeometry()
    jib.setAttribute('position', new THREE.Float32BufferAttribute([-0.05, 0.45, 0, -0.05, 1.7, 0, -0.75, 0.45, 0], 3))
    jib.computeVertexNormals()
    return { hull, sail, jib }
  }, [])
  useFrame((s) => {
    const g = ref.current
    if (!g) return
    const t = s.clock.elapsedTime * 0.028 + 2.2
    const R = 33
    g.position.set(Math.cos(t) * R, Math.sin(s.clock.elapsedTime * 1.3) * 0.06, Math.sin(t) * R * 0.92)
    g.rotation.y = -t - Math.PI
    g.rotation.z = Math.sin(s.clock.elapsedTime * 1.1) * 0.06
    g.rotation.x = Math.sin(s.clock.elapsedTime * 0.9) * 0.04
  })
  return (
    <group ref={ref} userData={ROOT} scale={1.5}>
      <mesh geometry={parts.hull} material={mat('#e86f55', { rough: 0.6 })} raycast={() => null} castShadow />
      <mesh position={[0, 0.28, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[1.8, 0.55]} />
        <meshStandardMaterial color="#c9935f" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 1.2, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.03, 0.03, 1.9, 5]} />
        <meshStandardMaterial color="#6b4a33" />
      </mesh>
      <mesh geometry={parts.sail} material={mat('#fff6ea', { rough: 0.8, side: THREE.DoubleSide })} raycast={() => null} />
      <mesh geometry={parts.jib} material={mat('#ffd9a8', { rough: 0.8, side: THREE.DoubleSide })} raycast={() => null} />
    </group>
  )
}

/* ── fireflies / sparkles (GPU-animated points) ────────────────── */
export function Fireflies({ count, center, radius, height = 2, color = '#ffd27a', always = false }: {
  count: number
  center: [number, number, number]
  radius: number
  height?: number
  color?: string
  /** Show in daylight too (as sparkles). */
  always?: boolean
}) {
  const geo = useMemo(() => {
    const r = rand(center[0] * 13 + center[2] * 7 + count)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * radius
      pos.set([center[0] + Math.cos(a) * d, center[1] + 0.3 + r() * height, center[2] + Math.sin(a) * d], i * 3)
      seed[i] = r() * 100
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count, center, radius, height])
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: timeUniform,
          uTex: { value: glowTexture() },
          uColor: { value: new THREE.Color().setStyle(color, THREE.LinearSRGBColorSpace) },
          uAmt: { value: 0 },
          uPx: { value: Math.min(window.devicePixelRatio, 2) },
        },
        vertexShader: /* glsl */ `
          attribute float aSeed; uniform float uTime; uniform float uAmt; uniform float uPx;
          varying float vA;
          void main() {
            vec3 p = position;
            p.x += sin(uTime * 0.6 + aSeed) * 0.35;
            p.y += sin(uTime * 0.9 + aSeed * 1.7) * 0.25;
            p.z += cos(uTime * 0.5 + aSeed * 0.7) * 0.35;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            vA = uAmt * (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 3.0)));
            gl_PointSize = uPx * 34.0 / -mv.z * (0.6 + 0.4 * fract(aSeed));
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTex; uniform vec3 uColor; varying float vA;
          void main() {
            float a = texture2D(uTex, gl_PointCoord).r * vA;
            gl_FragColor = vec4(uColor * a, a);
          }`,
      }),
    [color],
  )
  const pts = useRef<THREE.Points>(null)
  useFrame(() => {
    const amt = always ? 0.55 + world.night * 0.45 : world.night
    m.uniforms.uAmt.value = amt
    if (pts.current) pts.current.visible = amt > 0.002
  })
  return <points ref={pts} geometry={geo} material={m} raycast={() => null} frustumCulled={false} />
}
