import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pointer } from '../../lib/pointer'
import { camState } from '../../lib/spiderCtl'
import { damp } from '../../lib/math'

/**
 * Full-screen backdrop: a dusk seascape behind Bit's floating island.
 *
 *  • twilight sky — deep indigo overhead, lilac and rose, a peach band at the horizon,
 *    a low sun, slow sunset-lit clouds and a few stars coming out
 *  • the open sea — perspective ripples, a glittering sun path, horizon haze
 *  • far away on the horizon: Sauvik Island, its lighthouse blinking (where DISCOVER leads)
 *
 * Dark at the top and bottom so Bit and the light UI text keep their contrast.
 * One draw call, rendered behind everything; follows the pointer with gentle parallax.
 */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uPointer;
  uniform float uPulse;
  uniform float uReveal;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }

  // a soft-shouldered island silhouette rising from the horizon
  float isle(float x, float c, float w, float h) {
    float d = (x - c) / w;
    return h * max(0.0, 1.0 - d * d) * (0.85 + 0.15 * cos(d * 7.0));
  }

  // palette (authored in sRGB — written straight to the canvas)
  const vec3 ZENITH  = vec3(0.070, 0.078, 0.190);
  const vec3 VIOLET  = vec3(0.215, 0.180, 0.385);
  const vec3 ROSE    = vec3(0.580, 0.345, 0.455);
  const vec3 PEACH   = vec3(0.985, 0.690, 0.505);
  const vec3 SUN     = vec3(1.000, 0.930, 0.780);
  const vec3 SUNGLOW = vec3(1.000, 0.610, 0.380);
  const vec3 HAZE    = vec3(0.470, 0.370, 0.540);
  const vec3 SEA_FAR = vec3(0.520, 0.395, 0.520);
  const vec3 SEA_MID = vec3(0.110, 0.290, 0.400);
  const vec3 SEA_NEAR= vec3(0.045, 0.100, 0.190);

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 par = uPointer * vec2(0.018, 0.010);
    float t = uTime;

    // screen space: x in aspect units (0 = centre), y from the horizon (+ sky, − sea)
    float hz = 0.45 + par.y;
    float x = (vUv.x - 0.5) * aspect + par.x;
    float y = vUv.y - hz;
    float xn = vUv.x - 0.5 + par.x / aspect; // x as a fraction of the width
    vec2 sun = vec2(0.36 * aspect, 0.032);
    vec3 col;

    if (y >= 0.0) {
      /* ── sky ───────────────────────────────────────── */
      float ys = y / (1.0 - hz);
      col = mix(PEACH, ROSE, smoothstep(0.0, 0.09, ys));
      col = mix(col, VIOLET, smoothstep(0.07, 0.42, ys));
      col = mix(col, ZENITH, smoothstep(0.38, 0.98, ys));

      // the low sun and its glow
      float sd = length((vec2(x, y) - sun) * vec2(1.0, 1.3));
      col += SUNGLOW * exp(-sd * 4.2) * (0.42 + uPulse * 0.5);
      col += SUN * exp(-sd * 16.0) * 0.5;
      col = mix(col, SUN, smoothstep(0.048, 0.042, sd));

      // long, slow clouds catching the sunset from below
      float cn = fbm(vec2(x * 1.2 + t * 0.006, y * 8.5 + 3.0) + vec2(fbm(vec2(x * 2.0 - t * 0.004, y * 12.0)) * 0.6, 0.0));
      float cloud = smoothstep(0.5, 0.74, cn) * smoothstep(0.03, 0.12, ys) * smoothstep(0.62, 0.22, ys);
      vec3 lit = mix(vec3(0.40, 0.30, 0.52), vec3(1.0, 0.64, 0.50), clamp(exp(-sd * 2.2) * 1.4 + smoothstep(0.32, 0.04, ys) * 0.55, 0.0, 1.0));
      col = mix(col, lit, cloud * 0.72);
      // bright rims on the sun side of each cloud
      col += SUNGLOW * cloud * smoothstep(0.62, 0.8, cn) * exp(-sd * 3.0) * 0.35;

      // the first stars
      vec2 g = vec2(x, y) * 85.0;
      vec2 id = floor(g);
      float r = hash(id);
      float star = step(0.986, r) * smoothstep(0.09, 0.0, length(fract(g) - 0.5 - (vec2(hash(id + 3.7), hash(id + 9.1)) - 0.5) * 0.6));
      star *= (0.55 + 0.45 * sin(t * (1.2 + r * 3.0) + r * 60.0)) * smoothstep(0.42, 0.85, ys);
      col += vec3(1.0, 0.95, 0.88) * star * 0.85;

      // distant islands on the horizon (hazy, atmospheric)
      float home = isle(xn, -0.36, 0.085, 0.030) + isle(xn, -0.31, 0.04, 0.012);   // Sauvik Island
      float rocks = isle(xn, 0.39, 0.05, 0.012) + isle(xn, 0.45, 0.03, 0.008);
      float far = isle(xn, -0.13, 0.07, 0.008);
      vec3 hazeCol = mix(HAZE, PEACH, 0.28);
      col = mix(col, mix(hazeCol, PEACH, 0.35), step(y, far) * 0.75);
      col = mix(col, hazeCol * 0.92, step(y, rocks));
      col = mix(col, hazeCol * 0.82, step(y, home));
      // the lighthouse on Sauvik Island, blinking every few seconds
      float lx = (-0.335) * aspect + par.x;
      float tower = step(abs(x - lx), 0.0028) * step(y, 0.030 + 0.016);
      col = mix(col, hazeCol * 0.78, tower);
      vec2 lamp = vec2(lx, 0.030 + 0.018);
      float blink = pow(0.5 + 0.5 * sin(t * 1.6), 6.0);
      float ld = length(vec2(x, y) - lamp);
      col += vec3(1.0, 0.85, 0.55) * (smoothstep(0.004, 0.0, ld) * (0.6 + blink) + exp(-ld * 60.0) * 0.35 * (0.4 + blink));
      // a faint sweeping beam
      col += vec3(1.0, 0.85, 0.6) * blink * 0.12 * exp(-abs(y - lamp.y) * 260.0) * exp(-abs(x - lx) * 9.0);

      // horizon haze
      col = mix(col, PEACH, exp(-ys * 40.0) * 0.35);
    } else {
      /* ── sea ───────────────────────────────────────── */
      float d = -y;
      float d01 = d / hz;
      // ground-plane coordinates: ripples stay small close to us and squeeze towards the horizon
      vec2 W = vec2(x, 1.0) * (1.8 / (d + 0.004));
      float detail = smoothstep(0.0, 0.05, d); // fade ripple detail into the distance (no shimmer)

      col = mix(SEA_FAR, SEA_MID, smoothstep(0.0, 0.22, d01));
      col = mix(col, SEA_NEAR, smoothstep(0.18, 1.0, d01));

      // rolling swell + small chop, stretched sideways like real water seen at a low angle
      float w1 = noise(vec2(W.x * 0.32 + t * 0.10, W.y * 0.95 - t * 0.55));
      float w2 = noise(vec2(W.x * 0.9 - t * 0.08, W.y * 2.6 - t * 0.9));
      float wave = w1 * 0.6 + w2 * 0.4;
      col *= 0.84 + 0.3 * mix(0.5, wave, detail);
      // stylised wave crests catching the dusk light
      float crest = smoothstep(0.9, 0.99, sin(W.y * 0.7 - t * 1.1 + w1 * 5.0 + W.x * 0.05)) * detail * (1.0 - d01 * 0.5);
      col += mix(ROSE, PEACH, 0.5) * crest * 0.08;

      // the sun's glittering path, widening towards us
      float path = exp(-pow((x - sun.x) / (0.03 + d * 0.5), 2.0));
      float glint = smoothstep(0.55, 0.92, noise(vec2(W.x * 0.7, W.y * 3.4 - t * 2.0)) * 0.65 + w2 * 0.45);
      col += SUNGLOW * path * mix(0.35, 0.18 + glint * 1.25, detail) * (1.0 - smoothstep(0.0, 0.9, d01)) * (0.9 + uPulse * 0.4);
      // tiny scattered sparkles everywhere else
      vec2 sc = vec2(W.x * 1.6, W.y * 4.0 - t * 2.4);
      float sp = step(0.992, hash(floor(sc))) * smoothstep(0.45, 0.0, length(fract(sc) - 0.5)) * detail * (1.0 - d01);
      col += PEACH * sp * 0.35;

      // the lighthouse's reflection shimmering under Sauvik Island
      float lx = (-0.335) * aspect + par.x;
      float blink = pow(0.5 + 0.5 * sin(t * 1.6), 6.0);
      col += vec3(1.0, 0.82, 0.55) * blink * 0.25 * exp(-abs(x - lx) * 90.0) * exp(-d * 45.0) * (0.6 + 0.4 * w2);

      // haze where sea meets sky
      col = mix(col, mix(PEACH, ROSE, 0.35), exp(-d * 55.0) * 0.55);
    }

    // a soft warm halo behind Bit's island for separation
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
    col += vec3(0.94, 0.77, 0.61) * exp(-dot(p - vec2(0.0, 0.08), p - vec2(0.0, 0.08)) / 0.22) * (0.07 + uPulse * 0.35);

    // vignette
    float v = smoothstep(1.4, 0.25, length(p * vec2(0.82, 1.1)));
    col *= mix(0.58, 1.0, v);

    // film grain
    col += (hash(vUv * uRes + fract(uTime * 7.0) * 91.0) - 0.5) * 0.024;

    gl_FragColor = vec4(col * uReveal, 1.0);
  }
`

export function Sky({ octaves = 4 }: { octaves?: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        defines: { OCTAVES: octaves },
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: new THREE.Vector2(1, 1) },
          uPointer: { value: new THREE.Vector2() },
          uPulse: { value: 0 },
          uReveal: { value: 0 },
        },
      }),
    [octaves],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state, delta) => {
    const u = material.uniforms
    u.uTime.value += Math.min(delta, 0.05)
    u.uRes.value.set(state.size.width, state.size.height)
    u.uPointer.value.x = damp(u.uPointer.value.x, pointer.x, 1.5, delta)
    u.uPointer.value.y = damp(u.uPointer.value.y, pointer.y, 1.5, delta)
    u.uPulse.value = camState.pulse
    u.uReveal.value = camState.reveal
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-100} />
}
