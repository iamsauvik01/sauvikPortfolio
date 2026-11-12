import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from '../../lib/math'
import { camState } from '../../lib/spiderCtl'
import { rawColor } from '../util'

/**
 * A dewy orb web strung in the background — Bit's home, and a quiet nod
 * to the other kind of web Sauvik builds. Lines + sparkling dew points.
 */
const DEW_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vSpark;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vSpark = pow(0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 1.6) + aSeed * 40.0), 6.0);
    gl_PointSize = aSize * uPixelRatio * (12.0 / -mv.z) * (1.0 + vSpark * 0.8);
  }
`
const DEW_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vSpark;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float core = smoothstep(0.5, 0.0, d);
    float cross = max(0.0, 1.0 - abs(c.x) * 18.0) * max(0.0, 1.0 - abs(c.y) * 2.2)
                + max(0.0, 1.0 - abs(c.y) * 18.0) * max(0.0, 1.0 - abs(c.x) * 2.2);
    float a = (core * 0.7 + cross * vSpark * 0.9) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

export function DewWeb({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const group = useRef<THREE.Group>(null)
  const { lines, dew, lineMat, dewMat } = useMemo(() => {
    const r = rng(19)
    const spokes = 15
    const rings = 20
    const angles: number[] = []
    for (let i = 0; i < spokes; i++) angles.push((i / spokes) * Math.PI * 2 + (r() - 0.5) * 0.18)
    const outer = angles.map(() => 3.6 + r() * 0.9)
    const verts: number[] = []
    angles.forEach((a, i) => verts.push(0, 0, 0, Math.cos(a) * outer[i], Math.sin(a) * outer[i], 0))
    const dewPos: number[] = []
    const dewSeed: number[] = []
    const dewSize: number[] = []
    for (let k = 1; k <= rings; k++) {
      const base = 0.35 + k * 0.16
      for (let i = 0; i < spokes; i++) {
        const j = (i + 1) % spokes
        const r1 = Math.min(base * (1 + Math.sin(i * 1.3 + k) * 0.03), outer[i] * 0.97)
        const r2 = Math.min(base * (1 + Math.sin(j * 1.3 + k) * 0.03), outer[j] * 0.97)
        const x1 = Math.cos(angles[i]) * r1
        const y1 = Math.sin(angles[i]) * r1
        const x2 = Math.cos(angles[j]) * r2
        const y2 = Math.sin(angles[j]) * r2
        // slight sag toward the centre
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        const sag = 0.94
        verts.push(x1, y1, 0, mx * sag, my * sag, 0, mx * sag, my * sag, 0, x2, y2, 0)
        if (r() < 0.16) {
          dewPos.push(mx * sag, my * sag, 0.01)
          dewSeed.push(r())
          dewSize.push(5 + r() * 9)
        }
      }
    }
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    const dg = new THREE.BufferGeometry()
    dg.setAttribute('position', new THREE.Float32BufferAttribute(dewPos, 3))
    dg.setAttribute('aSeed', new THREE.Float32BufferAttribute(dewSeed, 1))
    dg.setAttribute('aSize', new THREE.Float32BufferAttribute(dewSize, 1))
    const lineMat = new THREE.LineBasicMaterial({
      color: '#e9e2f5',
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      toneMapped: false,
    })
    const dewMat = new THREE.ShaderMaterial({
      vertexShader: DEW_VERT,
      fragmentShader: DEW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uOpacity: { value: 0.8 },
        uColor: { value: rawColor('#fff3e2') },
      },
    })
    return { lines: lg, dew: dg, lineMat, dewMat }
  }, [])

  useEffect(
    () => () => {
      lines.dispose()
      dew.dispose()
      lineMat.dispose()
      dewMat.dispose()
    },
    [lines, dew, lineMat, dewMat],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    dewMat.uniforms.uTime.value = t
    dewMat.uniforms.uPixelRatio.value = state.viewport.dpr
    dewMat.uniforms.uOpacity.value = 0.85 * camState.reveal
    lineMat.opacity = 0.16 * camState.reveal
    const g = group.current
    if (!g) return
    // anchor to the viewport so it frames the scene at any aspect ratio
    const cam = state.camera as THREE.PerspectiveCamera
    const depth = cam.position.z - position[2]
    const halfH = depth * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    const halfW = halfH * (state.size.width / state.size.height)
    g.position.set(position[0] * halfW, position[1] * halfH, position[2])
    g.rotation.z = Math.sin(t * 0.25) * 0.025
    g.rotation.x = Math.sin(t * 0.31) * 0.04
    const s = scale * Math.max(0.7, Math.min(1.2, halfW / halfH / 1.6))
    g.scale.setScalar(s)
  })

  return (
    <group ref={group}>
      <lineSegments geometry={lines} material={lineMat} />
      <points geometry={dew} material={dewMat} />
    </group>
  )
}
