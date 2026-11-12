import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../store'
import { SEA_RES, SEA_SPAN } from './groundData'
import { damp } from '../../lib/math'
import { mat, puffGeometry, rand, timeUniform } from './kit'
import { ROOT } from './batch'

/** Fog range follows the camera so far-away (phone) framings don't drown in haze. */
const fogRange = { near: 70, far: 260 }

/** Sun direction shared by the sky, the water glints and the key light. */
export const SUN = new THREE.Vector3(-0.62, 0.42, 0.38).normalize()

// authored in sRGB — custom shaders write straight to the canvas
const FOG_DAY = new THREE.Color('#e9b7a9')
const FOG_DAY_RAW = new THREE.Color().setStyle('#e9b7a9', THREE.LinearSRGBColorSpace)
const FOG_NIGHT_RAW = new THREE.Color().setStyle('#2a2647', THREE.LinearSRGBColorSpace)
const FOG_NIGHT = new THREE.Color('#2a2647')

/* ── sky dome ──────────────────────────────────────────────────── */
export function SkyDome() {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uNight: { value: 0 }, uSun: { value: SUN }, uTime: timeUniform },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * p;
            gl_Position.z = gl_Position.w; // always at the far plane
          }`,
        fragmentShader: /* glsl */ `
          uniform float uNight; uniform vec3 uSun; uniform float uTime;
          varying vec3 vDir;
          float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
          void main() {
            vec3 d = normalize(vDir);
            float y = d.y;
            vec3 zen = mix(vec3(0.36, 0.40, 0.72), vec3(0.06, 0.07, 0.19), uNight);
            vec3 mid = mix(vec3(0.74, 0.62, 0.86), vec3(0.16, 0.13, 0.32), uNight);
            vec3 hor = mix(vec3(1.00, 0.80, 0.66), vec3(0.40, 0.26, 0.42), uNight);
            vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, y));
            col = mix(col, zen, smoothstep(0.18, 0.8, y));
            // warm band towards the sun
            float s = max(dot(d, uSun), 0.0);
            col += vec3(1.0, 0.62, 0.42) * pow(s, 6.0) * 0.32 * (1.0 - uNight);
            col += vec3(1.0, 0.86, 0.62) * pow(s, 90.0) * 0.9 * (1.0 - uNight);
            col = mix(col, vec3(1.0, 0.96, 0.85), smoothstep(0.9965, 0.9985, s) * (1.0 - uNight));
            // below the horizon fades into the haze
            col = mix(col, mix(vec3(0.93, 0.72, 0.66), vec3(0.17, 0.16, 0.29), uNight), smoothstep(0.02, -0.1, y));
            // stars come out for the lighthouse
            if (uNight > 0.01 && y > 0.05) {
              vec2 g = vec2(atan(d.z, d.x) * 60.0, y * 110.0);
              vec2 id = floor(g);
              float r = h21(id);
              vec2 f = fract(g) - 0.5 - (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5) * 0.6;
              float star = smoothstep(0.09, 0.0, length(f)) * step(0.93, r);
              star *= 0.6 + 0.4 * sin(uTime * (1.0 + r * 3.0) + r * 40.0);
              col += star * uNight * smoothstep(0.05, 0.35, y) * vec3(1.0, 0.95, 0.88);
            }
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  )
  useFrame(() => {
    m.uniforms.uNight.value = world.night
  })
  return (
    <mesh material={m} renderOrder={-10} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[400, 32, 16]} />
    </mesh>
  )
}

/* ── ocean ─────────────────────────────────────────────────────── */
function heightTexture(sea: Uint16Array) {
  const t = new THREE.DataTexture(sea, SEA_RES, SEA_RES, THREE.RedFormat, THREE.HalfFloatType)
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearFilter
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  t.needsUpdate = true
  return t
}

export function Ocean({ sea }: { sea: Uint16Array }) {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: false,
        uniforms: {
          uTime: timeUniform,
          uHeight: { value: heightTexture(sea) },
          uSpan: { value: SEA_SPAN },
          uNight: { value: 0 },
          uSun: { value: SUN },
          uFog: { value: FOG_DAY_RAW.clone() },
          uFogNear: { value: 70 },
          uFogFar: { value: 260 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vW;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform sampler2D uHeight; uniform float uSpan; uniform float uNight;
          uniform vec3 uSun; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
          varying vec3 vW;
          float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
            return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
          void main() {
            vec2 uv = vW.xz / uSpan + 0.5;
            float h = -8.0;
            if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) h = texture2D(uHeight, uv).r;
            float depth = max(0.0, -h);
            // fade the sampled seabed into open water well before the texture ends
            float edge = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
            depth = mix(depth, 8.0, smoothstep(0.36, 0.48, edge));
            float t = uTime;

            vec3 shallow = vec3(0.55, 0.92, 0.82);
            vec3 midc = vec3(0.20, 0.70, 0.74);
            vec3 deep = vec3(0.15, 0.50, 0.66);
            vec3 abyss = vec3(0.16, 0.38, 0.58);
            vec3 col = mix(shallow, midc, smoothstep(0.0, 1.3, depth));
            col = mix(col, deep, smoothstep(1.0, 4.2, depth));
            col = mix(col, abyss, smoothstep(5.0, 7.8, depth));

            // ripples (for glints + a hint of texture)
            vec2 q = vW.xz;
            float n1 = vn(q * 0.55 + vec2(t * 0.22, t * 0.13));
            float n2 = vn(q * 1.3 - vec2(t * 0.18, -t * 0.27));
            vec3 N = normalize(vec3((n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.25, 1.0, (n2 - 0.5) * 0.35 - (n1 - 0.5) * 0.2));
            vec3 V = normalize(cameraPosition - vW);
            float fres = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
            col = mix(col, mix(vec3(1.0, 0.82, 0.74), vec3(0.32, 0.27, 0.48), uNight), fres * 0.45);
            vec3 H = normalize(uSun + V);
            float spec = pow(max(dot(N, H), 0.0), 220.0);
            col += vec3(1.0, 0.9, 0.75) * spec * 1.6 * (1.0 - uNight);
            col += (n2 - 0.5) * 0.04;

            // foam: a white lip at the shore + rolling bands in the shallows
            float nz = vn(q * 0.8 + t * 0.1);
            float band = sin(depth * 7.5 - t * 1.5 + nz * 5.0);
            float zone = 1.0 - smoothstep(0.0, 0.75, depth);
            float foam = smoothstep(0.72, 0.95, band) * zone;
            float lip = 1.0 - smoothstep(0.02, 0.16 + nz * 0.08, depth);
            col = mix(col, vec3(1.0, 0.99, 0.95), clamp(max(foam * 0.75, lip), 0.0, 1.0));

            col *= mix(1.0, 0.42, uNight);
            float dist = length(cameraPosition - vW);
            col = mix(col, uFog, smoothstep(uFogNear, uFogFar, dist));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [sea],
  )
  useFrame(() => {
    m.uniforms.uNight.value = world.night
    m.uniforms.uFog.value.copy(FOG_DAY_RAW).lerp(FOG_NIGHT_RAW, world.night)
    m.uniforms.uFogNear.value = fogRange.near
    m.uniforms.uFogFar.value = fogRange.far
  })
  return (
    <mesh material={m} rotation-x={-Math.PI / 2} position-y={0} raycast={() => null} renderOrder={-1}>
      <circleGeometry args={[420, 64]} />
    </mesh>
  )
}

/* ── lights + time of day ──────────────────────────────────────── */
const C = (h: string) => new THREE.Color(h)
const SUN_DAY = C('#ffe2c2')
const SUN_NIGHT = C('#b9b8ff')
const HEMI_SKY_DAY = C('#f6dcff')
const HEMI_SKY_NIGHT = C('#7a76b8')
const HEMI_GROUND_DAY = C('#6f8d5f')
const HEMI_GROUND_NIGHT = C('#3a3350')

export function Lights({ shadows, tier }: { shadows: boolean; tier: 'low' | 'mid' | 'high' }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const night = useRef(0)

  useMemo(() => {
    scene.fog = new THREE.Fog(FOG_DAY.clone(), 70, 260)
  }, [scene])

  useFrame((_, dt) => {
    night.current = damp(night.current, world.night, 2.2, Math.min(dt, 0.05))
    const n = night.current
    if (sun.current) {
      sun.current.color.copy(SUN_DAY).lerp(SUN_NIGHT, n)
      sun.current.intensity = THREE.MathUtils.lerp(2.6, 0.95, n)
    }
    if (hemi.current) {
      hemi.current.color.copy(HEMI_SKY_DAY).lerp(HEMI_SKY_NIGHT, n)
      hemi.current.groundColor.copy(HEMI_GROUND_DAY).lerp(HEMI_GROUND_NIGHT, n)
      hemi.current.intensity = THREE.MathUtils.lerp(1.25, 0.95, n)
    }
    scene.environmentIntensity = THREE.MathUtils.lerp(0.45, 0.2, n)
    const f = scene.fog as THREE.Fog
    const d = camera.position.length()
    fogRange.near = Math.max(70, d * 1.1)
    fogRange.far = Math.max(260, d * 3.2)
    f.near = fogRange.near
    f.far = fogRange.far
    f.color.copy(FOG_DAY).lerp(FOG_NIGHT, n)
  })

  const size = tier === 'high' ? 2048 : 1024
  return (
    <>
      <hemisphereLight ref={hemi} args={['#f6dcff', '#6f8d5f', 1.25]} />
      <directionalLight
        ref={sun}
        position={[SUN.x * 60, SUN.y * 60, SUN.z * 60]}
        intensity={2.6}
        color="#ffe2c2"
        castShadow={shadows}
        shadow-mapSize={[size, size]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={10}
        shadow-camera-far={130}
      />
      {/* cool rim from the opposite side keeps shadows from going muddy */}
      <directionalLight position={[40, 18, -30]} intensity={0.55} color="#9fd6ff" />
    </>
  )
}

/* ── clouds ────────────────────────────────────────────────────── */
export function Clouds({ count }: { count: number }) {
  const ref = useRef<THREE.Group>(null)
  const items = useMemo(() => {
    const r = rand(7)
    const geos = [puffGeometry(11, 6), puffGeometry(23, 5), puffGeometry(37, 7)]
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * 0.4
      // always beyond the camera's orbit, so a cloud never drifts into the foreground
      const d = 92 + r() * 70
      return {
        geo: geos[i % 3],
        pos: [Math.cos(a) * d, 14 + r() * 14, Math.sin(a) * d] as [number, number, number],
        scale: [7 + r() * 6, 2.8 + r() * 2, 5 + r() * 4] as [number, number, number],
        rot: r() * Math.PI,
      }
    })
  }, [count])
  const m = useMemo(() => mat('#fff4ee', { rough: 1, emissive: '#ffd9cf', ei: 0.35 }), [])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.004
  })
  return (
    <group ref={ref} userData={ROOT}>
      {items.map((c, i) => (
        <mesh key={i} geometry={c.geo} material={m} position={c.pos} scale={c.scale} rotation-y={c.rot} raycast={() => null} />
      ))}
    </group>
  )
}

/** Drives the shared time uniform. */
export function Clock() {
  useFrame((s) => {
    timeUniform.value = s.clock.elapsedTime
  })
  return null
}
