import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SPIDER } from './palette'
import { makeAbdomenTexture, makeShadowTexture } from './textures'
import { rng } from '../../lib/math'
import { rawColor } from '../util'

/* ────────────────────────────────────────────────────────────
 *  Bit — an original procedural spider character.
 *  Units: ~1 unit ≈ head radius. Origin = ground under the body.
 * ──────────────────────────────────────────────────────────── */

export const BODY_Y = 1.3
export const HEAD = { c: new THREE.Vector3(0, 0, 0.15), r: new THREE.Vector3(0.95, 0.87, 0.9) }
export const ABD = { c: new THREE.Vector3(0, 0.38, -1.22), r: new THREE.Vector3(1.12, 1.02, 1.22), tilt: -0.25 }
export const EYE_R = 0.34
export const EYE_X = 0.38
/** Thread attachment point (content space). */
export const ATTACH = new THREE.Vector3(0, BODY_Y + 1.42, -1.25)
/** Bounding box used to fit the character into DOM anchors. */
export const DESIGN = { w: 5.9, h: 3.3 }

/** Per-side leg layout, front → back. angle: radians from +Z toward the side. */
export const LEG_LAYOUT = [
  { hip: [0.55, -0.2, 0.62], angle: 0.6, R: 2.55, L: [1.25, 1.5] },
  { hip: [0.78, -0.18, 0.28], angle: 1.15, R: 2.8, L: [1.38, 1.62] },
  { hip: [0.8, -0.18, -0.08], angle: 1.85, R: 2.75, L: [1.38, 1.6] },
  { hip: [0.66, -0.15, -0.42], angle: 2.45, R: 2.45, L: [1.32, 1.55] },
] as const

export interface LegRig {
  hip: THREE.Group
  femur: THREE.Group
  knee: THREE.Group
  L1: number
  L2: number
  side: 1 | -1
  idx: number
  angle: number
  R: number
}

export interface EyeRig {
  socket: THREE.Group
  ball: THREE.Group
  lidTop: THREE.Mesh
  lidBot: THREE.Mesh
  highlights: THREE.Group
  iris: THREE.ShaderMaterial
}

export interface SpiderRig {
  root: THREE.Group
  hop: THREE.Group
  swing: THREE.Group
  content: THREE.Group
  body: THREE.Group
  head: THREE.Group
  abdomen: THREE.Group
  eyes: EyeRig[]
  smallEyes: THREE.Mesh[]
  smile: THREE.Mesh
  mouthO: THREE.Mesh
  palps: THREE.Mesh[]
  tuft: THREE.Group
  legs: LegRig[]
  thread: THREE.Mesh
  shadow: THREE.Mesh
  dispose: () => void
}

export type Quality = 'low' | 'mid' | 'high'

const IRIS_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const IRIS_FRAG = /* glsl */ `
  uniform float uPupil;
  uniform float uTime;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uRing;
  uniform vec3 uPupilCol;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    float r = 1.0 - vUv.y;           // 0 centre → 1 rim
    float a = vUv.x * 6.2831853;
    float s1 = sin(a * 37.0 + sin(a * 5.0) * 2.0) * 0.5 + 0.5;
    float s2 = sin(a * 21.0 + 1.3 + cos(a * 3.0)) * 0.5 + 0.5;
    float streak = s1 * s2;
    vec3 col = mix(uA, uB, smoothstep(0.1, 1.0, r));
    col *= 0.78 + 0.42 * streak * smoothstep(0.15, 0.85, r);
    // warm collarette glow just outside the pupil
    col += uA * 0.35 * smoothstep(0.14, 0.0, abs(r - (uPupil + 0.1)));
    // limbal ring
    col = mix(col, uRing, smoothstep(0.74, 1.0, r));
    // caustic: lower iris catches light (Pixar-style)
    col *= 0.72 + 0.55 * smoothstep(0.45, -0.75, vN.y);
    // pupil
    float p = smoothstep(uPupil, uPupil - 0.04, r);
    col = mix(col, uPupilCol, p);
    gl_FragColor = vec4(col, 1.0);
  }
`

function colorize(geo: THREE.BufferGeometry, color: THREE.Color) {
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r
    arr[i * 3 + 1] = color.g
    arr[i * 3 + 2] = color.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

/** Tapered tube along +X from x0 to x1. */
function tube(x0: number, x1: number, r0: number, r1: number, color: THREE.Color, radial: number) {
  const g = new THREE.CylinderGeometry(r1, r0, x1 - x0, radial, 1, true)
  g.rotateZ(-Math.PI / 2)
  g.translate((x0 + x1) / 2, 0, 0)
  return colorize(g, color)
}
function ball(x: number, r: number, color: THREE.Color, seg: number) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75))
  g.translate(x, 0, 0)
  return colorize(g, color)
}

function legGeometries(L1: number, L2: number, radial: number) {
  const body = new THREE.Color(SPIDER.body)
  const band = new THREE.Color(SPIDER.band)
  const cream = new THREE.Color(SPIDER.cream)
  const femur = mergeGeometries([
    ball(0, 0.112, body, radial),
    tube(0, L1, 0.094, 0.074, body, radial),
  ])!
  const tibia = mergeGeometries([
    ball(0, 0.084, band, radial),
    tube(0, L2 * 0.58, 0.074, 0.058, body, radial),
    tube(L2 * 0.58, L2 * 0.66, 0.06, 0.055, band, radial),
    tube(L2 * 0.66, L2 * 0.97, 0.055, 0.036, body, radial),
    ball(L2, 0.05, cream, radial),
  ])!
  return { femur, tibia }
}

/** Point + outward normal on the front of the head ellipsoid (head-local). */
function onHead(x: number, y: number, inset = 0) {
  const { c, r } = HEAD
  const k = 1 - (x / r.x) ** 2 - ((y - c.y) / r.y) ** 2
  const z = c.z + r.z * Math.sqrt(Math.max(0.0001, k))
  const n = new THREE.Vector3(x / (r.x * r.x), (y - c.y) / (r.y * r.y), (z - c.z) / (r.z * r.z)).normalize()
  const p = new THREE.Vector3(x, y, z).addScaledVector(n, -inset)
  return { p, n }
}

function fibonacciDirs(count: number) {
  const out: THREE.Vector3[] = []
  const g = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const rad = Math.sqrt(1 - y * y)
    const th = g * i
    out.push(new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad))
  }
  return out
}

/** Instanced fuzz over an ellipsoid surface. */
function fuzz(
  center: THREE.Vector3,
  radii: THREE.Vector3,
  count: number,
  skip: (d: THREE.Vector3) => boolean,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  seed: number,
  lenRange: [number, number],
) {
  const dirs = fibonacciDirs(count).filter((d) => !skip(d))
  const mesh = new THREE.InstancedMesh(geo, mat, dirs.length)
  const r = rng(seed)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const back = new THREE.Vector3(0, 0.25, -1)
  const s = new THREE.Vector3()
  dirs.forEach((d, i) => {
    const p = new THREE.Vector3(d.x * radii.x, d.y * radii.y, d.z * radii.z).add(center)
    const n = new THREE.Vector3(d.x / radii.x, d.y / radii.y, d.z / radii.z).normalize()
    const dir = n.clone().lerp(back, 0.62 + r() * 0.12).normalize()
    dir.x += (r() - 0.5) * 0.3
    dir.z += (r() - 0.5) * 0.3
    dir.normalize()
    q.setFromUnitVectors(up, dir)
    const len = lenRange[0] + r() * (lenRange[1] - lenRange[0])
    s.set(0.8 + r() * 0.5, len, 0.8 + r() * 0.5)
    p.addScaledVector(n, -0.015)
    m.compose(p, q, s)
    mesh.setMatrixAt(i, m)
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

export function buildSpider(quality: Quality): SpiderRig {
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x)
    return x
  }
  const seg = quality === 'high' ? 64 : quality === 'mid' ? 48 : 32
  const legRadial = quality === 'low' ? 10 : 16

  /* ── Materials ───────────────────────────────────────── */
  const velvetParams: THREE.MeshPhysicalMaterialParameters = {
    color: SPIDER.body,
    roughness: 0.62,
    sheen: 1,
    sheenRoughness: 0.32,
    sheenColor: new THREE.Color(SPIDER.sheen),
    clearcoat: 0.08,
    clearcoatRoughness: 0.55,
  }
  const velvet = track(new THREE.MeshPhysicalMaterial(velvetParams))
  const abdTex = track(makeAbdomenTexture())
  const abdMat = track(new THREE.MeshPhysicalMaterial({ ...velvetParams, color: '#ffffff', map: abdTex }))
  const legMat = track(new THREE.MeshPhysicalMaterial({ ...velvetParams, color: '#ffffff', vertexColors: true }))
  const lidMat = track(
    new THREE.MeshPhysicalMaterial({ ...velvetParams, color: SPIDER.bodyLight, side: THREE.DoubleSide }),
  )
  const mittMat = track(
    new THREE.MeshPhysicalMaterial({ ...velvetParams, color: '#7a5f9e', sheenColor: new THREE.Color('#ffc9b0') }),
  )
  const tuftMat = track(new THREE.MeshPhysicalMaterial({ ...velvetParams, color: SPIDER.bodyLight }))
  const hairMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }))
  const scleraMat = track(
    new THREE.MeshPhysicalMaterial({
      color: SPIDER.sclera,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: '#3a302a',
      emissiveIntensity: 0.35,
    }),
  )
  const corneaMat = track(
    new THREE.MeshPhysicalMaterial({
      color: '#000000',
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.3,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  const sparkleMat = track(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }))
  const smallEyeMat = track(
    new THREE.MeshPhysicalMaterial({ color: '#120c1c', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
  )
  const mouthMat = track(new THREE.MeshStandardMaterial({ color: SPIDER.mouth, roughness: 0.55 }))
  const blushMat = track(
    new THREE.MeshBasicMaterial({ color: SPIDER.blush, transparent: true, opacity: 0.32, depthWrite: false }),
  )
  const silkMat = track(
    new THREE.MeshBasicMaterial({ color: SPIDER.silk, transparent: true, opacity: 0.55, toneMapped: false }),
  )
  const shadowTex = track(makeShadowTexture())
  const shadowMat = track(
    new THREE.MeshBasicMaterial({ color: '#05030c', map: shadowTex, transparent: true, opacity: 0.6, depthWrite: false }),
  )

  /* ── Hierarchy ───────────────────────────────────────── */
  const root = new THREE.Group()
  root.name = 'bit'
  const hop = new THREE.Group()
  const swing = new THREE.Group()
  swing.position.copy(ATTACH)
  const content = new THREE.Group()
  content.position.copy(ATTACH).multiplyScalar(-1)
  root.add(hop)
  hop.add(swing)
  swing.add(content)

  const body = new THREE.Group()
  body.position.y = BODY_Y
  content.add(body)

  /* ── Head ────────────────────────────────────────────── */
  const sphere = track(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)))
  const head = new THREE.Group()
  body.add(head)
  const headMesh = new THREE.Mesh(sphere, velvet)
  headMesh.position.copy(HEAD.c)
  headMesh.scale.copy(HEAD.r)
  headMesh.castShadow = true
  head.add(headMesh)

  const hairGeo = track(new THREE.ConeGeometry(0.03, 1, 5, 1))
  hairGeo.translate(0, 0.5, 0)
  {
    const pos = hairGeo.attributes.position
    const cols = new Float32Array(pos.count * 3)
    const a = new THREE.Color(SPIDER.body)
    const b = new THREE.Color('#8a76c8')
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      c.copy(a).lerp(b, pos.getY(i))
      cols.set([c.r, c.g, c.b], i * 3)
    }
    hairGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3))
  }
  const hairCount = quality === 'high' ? 1 : quality === 'mid' ? 0.65 : 0.38
  const headFuzz = fuzz(
    HEAD.c,
    HEAD.r,
    Math.round(300 * hairCount),
    (d) => (d.z > 0.18 && d.y < 0.66) || d.y < -0.55,
    hairGeo,
    hairMat,
    11,
    [0.05, 0.09],
  )
  head.add(headFuzz)

  /* ── Eyes ────────────────────────────────────────────── */
  const eyeGeo = track(new THREE.SphereGeometry(EYE_R, 40, 30))
  const irisGeo = track(new THREE.SphereGeometry(EYE_R * 1.004, 48, 14, 0, Math.PI * 2, 0, 0.72))
  irisGeo.rotateX(Math.PI / 2)
  const corneaGeo = track(new THREE.SphereGeometry(EYE_R * 1.035, 40, 30))
  const lidTopGeo = track(new THREE.SphereGeometry(EYE_R * 1.07, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2))
  const lidBotGeo = track(new THREE.SphereGeometry(EYE_R * 1.065, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2))
  const sparkGeo = track(new THREE.SphereGeometry(1, 16, 12))

  const eyes: EyeRig[] = [1, -1].map((side) => {
    const socket = new THREE.Group()
    socket.position.set(EYE_X * side, 0.14, 0.86)
    socket.rotation.y = 0.1 * side
    head.add(socket)
    const sclera = new THREE.Mesh(eyeGeo, scleraMat)
    socket.add(sclera)
    const ball = new THREE.Group()
    socket.add(ball)
    const iris = track(
      new THREE.ShaderMaterial({
        vertexShader: IRIS_VERT,
        fragmentShader: IRIS_FRAG,
        uniforms: {
          uPupil: { value: 0.34 },
          uTime: { value: 0 },
          uA: { value: rawColor(SPIDER.irisA) },
          uB: { value: rawColor(SPIDER.irisB) },
          uRing: { value: rawColor(SPIDER.irisRing) },
          uPupilCol: { value: rawColor(SPIDER.pupil) },
        },
      }),
    )
    const irisMesh = new THREE.Mesh(irisGeo, iris)
    ball.add(irisMesh)
    const cornea = new THREE.Mesh(corneaGeo, corneaMat)
    cornea.renderOrder = 2
    socket.add(cornea)
    const highlights = new THREE.Group()
    const h1 = new THREE.Mesh(sparkGeo, sparkleMat)
    const d1 = new THREE.Vector3(-0.36, 0.42, 0.83).normalize()
    h1.position.copy(d1).multiplyScalar(EYE_R * 1.02)
    h1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d1)
    h1.scale.set(0.058, 0.058, 0.03)
    const h2 = new THREE.Mesh(sparkGeo, sparkleMat)
    const d2 = new THREE.Vector3(0.3, -0.3, 0.9).normalize()
    h2.position.copy(d2).multiplyScalar(EYE_R * 1.02)
    h2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d2)
    h2.scale.set(0.024, 0.024, 0.014)
    highlights.add(h1, h2)
    socket.add(highlights)
    const lidTop = new THREE.Mesh(lidTopGeo, lidMat)
    const lidBot = new THREE.Mesh(lidBotGeo, lidMat)
    lidTop.rotation.x = -0.8
    lidBot.rotation.x = 1.0
    socket.add(lidTop, lidBot)
    return { socket, ball, lidTop, lidBot, highlights, iris }
  })

  // little secondary eyes — a jumping-spider wink to biology
  const smallEyes: THREE.Mesh[] = []
  ;[
    [0.72, 0.42, 0.1],
    [-0.72, 0.42, 0.1],
    [0.33, 0.66, 0.075],
    [-0.33, 0.66, 0.075],
  ].forEach(([x, y, r]) => {
    const { p } = onHead(x, y, r * 0.45)
    const m = new THREE.Mesh(sparkGeo, smallEyeMat)
    m.position.copy(p)
    m.scale.setScalar(r)
    head.add(m)
    smallEyes.push(m)
  })

  /* ── Face ────────────────────────────────────────────── */
  const mouthG = new THREE.Group()
  {
    const { p, n } = onHead(0, -0.37, -0.005)
    mouthG.position.copy(p)
    mouthG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
  }
  head.add(mouthG)
  const smileGeo = track(new THREE.TorusGeometry(0.135, 0.024, 10, 28, Math.PI * 0.72))
  const smile = new THREE.Mesh(smileGeo, mouthMat)
  smile.rotation.z = -Math.PI / 2 - Math.PI * 0.36
  smile.position.y = 0.06
  mouthG.add(smile)
  const mouthO = new THREE.Mesh(sparkGeo, mouthMat)
  mouthO.scale.set(0.0001, 0.0001, 0.0001)
  mouthG.add(mouthO)

  const blushGeo = track(new THREE.CircleGeometry(0.13, 28))
  ;[1, -1].forEach((side) => {
    const { p, n } = onHead(0.6 * side, -0.2, -0.012)
    const m = new THREE.Mesh(blushGeo, blushMat)
    m.position.copy(p)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
    m.scale.set(1.15, 0.8, 1)
    m.renderOrder = 3
    head.add(m)
  })

  const palps: THREE.Mesh[] = [1, -1].map((side) => {
    const m = new THREE.Mesh(sparkGeo, mittMat)
    m.position.set(0.17 * side, -0.68, 0.72)
    m.scale.set(0.095, 0.11, 0.1)
    m.castShadow = true
    head.add(m)
    return m
  })

  /* ── Tuft (secondary motion) ─────────────────────────── */
  const tuft = new THREE.Group()
  tuft.position.set(0, 0.8, 0.12)
  head.add(tuft)
  ;[
    [
      [0, 0, 0],
      [0.02, 0.2, 0.04],
      [0.12, 0.33, 0.16],
      [0.24, 0.3, 0.3],
    ],
    [
      [-0.06, 0, -0.04],
      [-0.1, 0.17, -0.02],
      [-0.2, 0.25, 0.08],
      [-0.27, 0.2, 0.18],
    ],
    [
      [0.04, 0, -0.08],
      [0.08, 0.15, -0.14],
      [0.1, 0.22, -0.02],
    ],
  ].forEach((pts, i) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    const g = track(new THREE.TubeGeometry(curve, 16, 0.034 - i * 0.006, 8, false))
    const m = new THREE.Mesh(g, tuftMat)
    tuft.add(m)
  })

  /* ── Abdomen ─────────────────────────────────────────── */
  const abdomen = new THREE.Group()
  abdomen.position.copy(ABD.c)
  abdomen.rotation.x = ABD.tilt
  body.add(abdomen)
  const abdMesh = new THREE.Mesh(sphere, abdMat)
  abdMesh.scale.copy(ABD.r)
  abdMesh.rotation.y = Math.PI / 2
  abdMesh.castShadow = true
  abdomen.add(abdMesh)
  const abdFuzz = fuzz(
    new THREE.Vector3(),
    ABD.r,
    Math.round(420 * hairCount),
    (d) => d.y < -0.5 || (d.z > 0.55 && d.y < 0.3),
    hairGeo,
    hairMat,
    23,
    [0.05, 0.085],
  )
  abdomen.add(abdFuzz)

  /* ── Legs ────────────────────────────────────────────── */
  const legs: LegRig[] = []
  LEG_LAYOUT.forEach((l, idx) => {
    const { femur: fGeo, tibia: tGeo } = legGeometries(l.L[0], l.L[1], legRadial)
    track(fGeo)
    track(tGeo)
    ;([1, -1] as const).forEach((side) => {
      const hip = new THREE.Group()
      hip.position.set(l.hip[0] * side, l.hip[1], l.hip[2])
      const femur = new THREE.Group()
      const knee = new THREE.Group()
      knee.position.x = l.L[0]
      const fm = new THREE.Mesh(fGeo, legMat)
      const tm = new THREE.Mesh(tGeo, legMat)
      fm.castShadow = tm.castShadow = true
      femur.add(fm)
      knee.add(tm)
      femur.add(knee)
      hip.add(femur)
      body.add(hip)
      legs.push({ hip, femur, knee, L1: l.L[0], L2: l.L[1], side, idx, angle: l.angle, R: l.R })
    })
  })

  /* ── Silk thread & shadow ────────────────────────────── */
  const threadGeo = track(new THREE.CylinderGeometry(0.014, 0.014, 1, 6, 1, true))
  threadGeo.translate(0, 0.5, 0)
  const thread = new THREE.Mesh(threadGeo, silkMat)
  thread.position.copy(ATTACH)
  thread.scale.y = 0.0001
  thread.visible = false
  content.add(thread)

  const shadowGeo = track(new THREE.PlaneGeometry(1, 1))
  shadowGeo.rotateX(-Math.PI / 2)
  const shadow = new THREE.Mesh(shadowGeo, shadowMat)
  shadow.position.set(0, 0.07, -0.35)
  shadow.scale.set(4.6, 1, 4.2)
  shadow.renderOrder = 1
  root.add(shadow)

  return {
    root,
    hop,
    swing,
    content,
    body,
    head,
    abdomen,
    eyes,
    smallEyes,
    smile,
    mouthO,
    palps,
    tuft,
    legs,
    thread,
    shadow,
    dispose: () => {
      disposables.forEach((d) => d.dispose())
      headFuzz.dispose()
      abdFuzz.dispose()
    },
  }
}
