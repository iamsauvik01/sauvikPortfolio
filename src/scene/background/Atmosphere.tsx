import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from '../../lib/math'
import { camState } from '../../lib/spiderCtl'
import { rawColor } from '../util'

/**
 * Two layers of GPU-animated points:
 *  • bokeh — large, soft out-of-focus lights far behind the stage
 *  • pollen — tiny drifting motes floating through the scene
 * All motion happens in the vertex shader: zero per-frame CPU work.
 */
const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uDrift;
  uniform float uRise;
  uniform float uScatter;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    float t = uTime;
    p.x += sin(t * 0.21 * (0.6 + aSeed) + aSeed * 12.0) * uDrift;
    p.y += cos(t * 0.17 * (0.6 + aSeed) + aSeed * 7.0) * uDrift * 0.7;
    p.y += mod(t * uRise * (0.4 + aSeed) + aSeed * 20.0, 14.0) - 7.0;
    p.xy *= 1.0 + uScatter * (0.6 + aSeed);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (12.0 / -mv.z);
    vColor = aColor;
    vTwinkle = 0.65 + 0.35 * sin(t * (1.0 + aSeed * 2.0) + aSeed * 30.0);
  }
`
const FRAG = /* glsl */ `
  uniform float uSoft;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(1.0, uSoft, d);
    float rim = smoothstep(1.0, 0.86, d) * smoothstep(0.6, 0.9, d) * 0.35;
    float a = (core + rim) * uOpacity * vTwinkle;
    gl_FragColor = vec4(vColor * a, a);
  }
`

interface LayerProps {
  count: number
  seed: number
  spread: [number, number, number]
  center: [number, number, number]
  size: [number, number]
  colors: string[]
  soft: number
  opacity: number
  drift: number
  rise: number
  scatter?: boolean
}

function PointsLayer({ count, seed, spread, center, size, colors, soft, opacity, drift, rise, scatter }: LayerProps) {
  const dpr = useThree((s) => s.viewport.dpr)
  const geometry = useMemo(() => {
    const r = rng(seed)
    const pos = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const seeds = new Float32Array(count)
    const cols = new Float32Array(count * 3)
    const palette = colors.map((c) => rawColor(c))
    for (let i = 0; i < count; i++) {
      pos[i * 3] = center[0] + (r() - 0.5) * spread[0]
      pos[i * 3 + 1] = center[1] + (r() - 0.5) * spread[1]
      pos[i * 3 + 2] = center[2] + (r() - 0.5) * spread[2]
      sizes[i] = size[0] + r() * (size[1] - size[0])
      seeds[i] = r()
      const c = palette[Math.floor(r() * palette.length)]
      cols.set([c.r, c.g, c.b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(cols, 3))
    return g
    // layout is static per layer instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, seed])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSoft: { value: soft },
          uOpacity: { value: opacity },
          uDrift: { value: drift },
          uRise: { value: rise },
          uScatter: { value: 0 },
        },
      }),
    [soft, opacity, drift, rise],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    const u = material.uniforms
    u.uTime.value += Math.min(delta, 0.05)
    u.uPixelRatio.value = dpr
    u.uOpacity.value = opacity * camState.reveal
    if (scatter) u.uScatter.value = camState.scatter * 0.5
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

export function Atmosphere({ quality }: { quality: 'low' | 'mid' | 'high' }) {
  const k = quality === 'high' ? 1 : quality === 'mid' ? 0.6 : 0.35
  return (
    <>
      <PointsLayer
        count={Math.round(22 * Math.max(0.6, k))}
        seed={3}
        spread={[34, 18, 8]}
        center={[0, 0, -14]}
        size={[90, 260]}
        colors={['#f0b98a', '#8fd1c1', '#b9a3f0', '#e88f78', '#f3d48e']}
        soft={0.15}
        opacity={0.17}
        drift={1.2}
        rise={0}
      />
      <PointsLayer
        count={Math.round(220 * k)}
        seed={9}
        spread={[22, 14, 10]}
        center={[0, 0, -1]}
        size={[2.5, 7]}
        colors={['#ffe2b8', '#ffd0a8', '#e8f0ff', '#cfeee4']}
        soft={0.0}
        opacity={0.55}
        drift={0.5}
        rise={0.12}
        scatter
      />
    </>
  )
}
