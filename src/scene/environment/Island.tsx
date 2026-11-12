import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ISLAND, islandEllipse, islandHeight } from './islandShape'
import { rng, damp } from '../../lib/math'
import { pointer } from '../../lib/pointer'
import { spiderCtl } from '../../lib/spiderCtl'
import { groundPointer } from '../shared'

type Quality = 'low' | 'mid' | 'high'

function vcolor(geo: THREE.BufferGeometry, fn: (x: number, y: number, z: number) => THREE.Color) {
  const p = geo.attributes.position
  const arr = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const c = fn(p.getX(i), p.getY(i), p.getZ(i))
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

/**
 * A floating island: mossy domed top (shared height function), a soft
 * rounded lip, and a rocky underside tapering to a point.
 * Built as one polar grid so normals are seamless.
 */
function buildMound(rings: number, segs: number) {
  // profile: s∈[0,1] → (radius factor t, y). Top part follows islandHeight.
  const TOP = Math.round(rings * 0.55)
  const LIP = 4
  const UNDER = rings - TOP - LIP
  const rows: { t: number; y: number | null; part: 0 | 1 | 2 }[] = []
  for (let i = 0; i <= TOP; i++) rows.push({ t: i / TOP, y: null, part: 0 })
  for (let i = 1; i <= LIP; i++) {
    const a = (i / LIP) * (Math.PI / 2)
    rows.push({ t: 1 + Math.sin(a) * 0.05, y: -(1 - Math.cos(a)) * 0.34, part: 1 })
  }
  for (let i = 1; i <= UNDER; i++) {
    const k = i / UNDER
    rows.push({ t: 1.05 * (1 - Math.pow(k, 1.2)) + 0.02, y: -0.34 - Math.pow(k, 0.8) * 2.1, part: 2 })
  }
  const pos: number[] = []
  const col: number[] = []
  const deep = new THREE.Color('#203a33')
  const moss = new THREE.Color('#5d8a6a')
  const lime = new THREE.Color('#a6b86c')
  const rockA = new THREE.Color('#3c2d40')
  const rockB = new THREE.Color('#6a4d5c')
  const rockC = new THREE.Color('#231a2b')
  const c = new THREE.Color()
  rows.forEach((row, ri) => {
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2
      const wob = row.part === 2 ? 1 + Math.sin(a * 5 + ri * 0.7) * 0.05 + Math.sin(a * 11 + ri) * 0.025 : 1
      const x = Math.cos(a) * row.t * ISLAND.rx * wob
      const z = Math.sin(a) * row.t * ISLAND.rz * wob
      const rim = islandHeight(Math.cos(a) * ISLAND.rx, Math.sin(a) * ISLAND.rz)
      let y: number
      if (row.part === 0) y = row.t === 0 ? islandHeight(0, 0) : islandHeight(x, z)
      else y = rim + (row.y ?? 0) + (row.part === 2 ? Math.sin(a * 7 + ri * 1.3) * 0.06 : 0)
      pos.push(x, y, z)
      if (row.part === 0) {
        const n1 = Math.sin(x * 3.1 + z * 1.7) * 0.5 + Math.sin(x * 7.3 - z * 5.1) * 0.3 + Math.cos(z * 9.7 + x * 2.3) * 0.2
        c.copy(deep).lerp(moss, THREE.MathUtils.clamp(0.6 + n1 * 0.35 - row.t * 0.25, 0, 1))
        if (n1 > 0.55) c.lerp(lime, (n1 - 0.55) * 0.9)
      } else if (row.part === 1) {
        c.copy(deep).lerp(rockA, 0.35 + (ri - TOP) * 0.15)
      } else {
        const k = (ri - TOP - LIP) / UNDER
        const strata = Math.sin(y * 9 + Math.sin(a * 3) * 0.8) * 0.5 + 0.5
        c.copy(rockA).lerp(rockB, strata * 0.55).lerp(rockC, k * 0.8)
        if (k < 0.08) c.lerp(deep, (0.08 - k) * 5)
      }
      col.push(c.r, c.g, c.b)
    }
  })
  const idx: number[] = []
  for (let r = 0; r < rows.length - 1; r++) {
    for (let j = 0; j < segs; j++) {
      const a = r * segs + j
      const b = r * segs + ((j + 1) % segs)
      const d = (r + 1) * segs + j
      const e = (r + 1) * segs + ((j + 1) % segs)
      idx.push(a, b, d, b, e, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Roots dangling from the underside. */
function buildRoots() {
  const r = rng(61)
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2
    const t = 0.25 + r() * 0.45
    const x = Math.cos(a) * ISLAND.rx * t
    const z = Math.sin(a) * ISLAND.rz * t * 0.8 + 0.6
    const y0 = -0.5 - (1 - t) * 1.1
    const len = 0.6 + r() * 1.1
    const pts = [
      new THREE.Vector3(x, y0 + 0.3, z),
      new THREE.Vector3(x + (r() - 0.5) * 0.3, y0 - len * 0.4, z + (r() - 0.5) * 0.2),
      new THREE.Vector3(x + (r() - 0.5) * 0.5, y0 - len * 0.75, z + (r() - 0.5) * 0.3),
      new THREE.Vector3(x + (r() - 0.5) * 0.6, y0 - len, z),
    ]
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.035 + r() * 0.02, 6, false)
    parts.push(vcolor(g, () => new THREE.Color('#5b4048')))
  }
  const g = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return g
}

function buildBlade() {
  const g = new THREE.PlaneGeometry(0.06, 1, 1, 4)
  g.translate(0, 0.5, 0)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) * 0.92))
  const a = new THREE.Color('#1d3a30')
  const b = new THREE.Color('#8fb27a')
  return vcolor(g, (_x, y) => a.clone().lerp(b, y))
}

function buildFlower() {
  const parts: THREE.BufferGeometry[] = []
  const white = new THREE.Color('#ffffff')
  const core = new THREE.Color('#f3c56a')
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const s = new THREE.SphereGeometry(0.06, 10, 6)
    s.scale(1, 0.35, 0.6)
    s.translate(0.07, 0, 0)
    s.rotateY(a)
    parts.push(vcolor(s, () => white))
  }
  const c = new THREE.SphereGeometry(0.04, 10, 8)
  c.translate(0, 0.015, 0)
  parts.push(vcolor(c, () => core))
  const g = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return g
}

function buildMushroom(capColor: string, h: number, r: number, seed: number) {
  const rand = rng(seed)
  const cream = new THREE.Color('#f3e4cf')
  const cap = new THREE.Color(capColor)
  const stem = new THREE.CylinderGeometry(r * 0.32, r * 0.42, h, 16, 1)
  stem.translate(0, h / 2, 0)
  const capG = new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)
  capG.scale(1, 0.62, 1)
  capG.translate(0, h - r * 0.08, 0)
  const under = new THREE.CircleGeometry(r * 0.98, 28)
  under.rotateX(Math.PI / 2)
  under.translate(0, h - r * 0.08, 0)
  const parts = [vcolor(stem, () => cream), vcolor(capG, () => cap), vcolor(under, () => cream.clone().multiplyScalar(0.8))]
  for (let i = 0; i < 6; i++) {
    const th = rand() * Math.PI * 2
    const ph = 0.35 + rand() * 0.75
    const sp = new THREE.SphereGeometry(r * (0.1 + rand() * 0.07), 10, 6)
    sp.scale(1, 0.4, 1)
    const nx = Math.sin(ph) * Math.cos(th)
    const ny = Math.cos(ph)
    const nz = Math.sin(ph) * Math.sin(th)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, ny, nz))
    sp.applyQuaternion(q)
    sp.translate(nx * r, h - r * 0.08 + ny * r * 0.62, nz * r)
    parts.push(vcolor(sp, () => cream))
  }
  const g = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return g
}

function buildPebbles() {
  const parts: THREE.BufferGeometry[] = []
  const r = rng(41)
  ;[
    [-2.9, 0.8, 0.42],
    [-2.45, 1.3, 0.22],
    [3.05, -0.3, 0.3],
  ].forEach(([x, z, s]) => {
    const g = new THREE.IcosahedronGeometry(1, 3)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i))
      const n = 1 + Math.sin(v.x * 3 + r()) * 0.06 + Math.sin(v.y * 5) * 0.04
      v.multiplyScalar(n)
      p.setXYZ(i, v.x, v.y, v.z)
    }
    g.scale(s * 1.3, s * 0.7, s)
    g.translate(x, islandHeight(x, z) + s * 0.25, z)
    g.computeVertexNormals()
    parts.push(vcolor(g, (_x, y) => new THREE.Color('#5d566e').lerp(new THREE.Color('#8e86a3'), THREE.MathUtils.clamp(y * 2, 0, 1))))
  })
  const g = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return g
}

const _ray = new THREE.Raycaster()
const _inv = new THREE.Matrix4()
const _ndc = new THREE.Vector2()
const _hit = new THREE.Vector3()
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

export function Island({ quality, children }: { quality: Quality; children?: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const grassUniforms = useRef({ uTime: { value: 0 }, uPush: { value: new THREE.Vector3(0, -99, 0) } })

  const assets = useMemo(() => {
    const rings = quality === 'high' ? 70 : quality === 'mid' ? 54 : 40
    const mound = buildMound(rings, quality === 'high' ? 128 : quality === 'mid' ? 96 : 72)
    const moundMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.95,
      sheen: 1,
      sheenColor: new THREE.Color('#a9cf97'),
      sheenRoughness: 0.55,
    })

    // grass
    const blade = buildBlade()
    const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = grassUniforms.current.uTime
      shader.uniforms.uPush = grassUniforms.current.uPush
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec3 uPush;')
        .replace(
          '#include <project_vertex>',
          /* glsl */ `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
            vec3 root = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            float h = position.y;
            float ph = root.x * 1.7 + root.z * 1.3;
            mvPosition.x += sin(uTime * 1.5 + ph) * 0.09 * h * h;
            mvPosition.z += cos(uTime * 1.1 + ph * 0.7) * 0.05 * h * h;
            vec2 away = root.xz - uPush.xz;
            float d = length(away);
            float push = (1.0 - smoothstep(0.0, 0.9, d)) * 0.35 * h;
            mvPosition.xz += normalize(away + 0.0001) * push;
            mvPosition.y -= push * 0.3;
          #endif
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;
          `,
        )
    }
    const grassCount = quality === 'high' ? 520 : quality === 'mid' ? 300 : 160
    const grass = new THREE.InstancedMesh(blade, grassMat, grassCount)
    const r = rng(5)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const s = new THREE.Vector3()
    const p = new THREE.Vector3()
    let placed = 0
    while (placed < grassCount) {
      const x = (r() * 2 - 1) * ISLAND.rx
      const z = (r() * 2 - 1) * ISLAND.rz
      const el = islandEllipse(x, z)
      if (el > 0.97) continue
      const nearBody = x * x + (z + 0.4) * (z + 0.4) < 1.6
      const inFront = Math.abs(x) < 1.6 && z > 0.3
      let hgt = 0.22 + r() * 0.42
      if (nearBody) continue
      if (inFront) hgt *= 0.5
      hgt *= 1 - el * 0.4
      p.set(x, islandHeight(x, z) - 0.02, z)
      e.set((r() - 0.5) * 0.35, r() * Math.PI, (r() - 0.5) * 0.35)
      q.setFromEuler(e)
      s.set(0.7 + r() * 0.8, hgt, 1)
      m.compose(p, q, s)
      grass.setMatrixAt(placed++, m)
    }
    grass.instanceMatrix.needsUpdate = true

    // flowers
    const flowerGeo = buildFlower()
    const flowerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })
    const flowerCount = quality === 'low' ? 8 : 16
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount)
    const fc = ['#f6d6c6', '#cdb8f2', '#f2a582', '#fff4e6'].map((c) => new THREE.Color(c))
    for (let i = 0; i < flowerCount; i++) {
      let x = 0
      let z = 0
      do {
        x = (r() * 2 - 1) * ISLAND.rx * 0.9
        z = (r() * 2 - 1) * ISLAND.rz * 0.9
      } while (islandEllipse(x, z) > 0.9 || x * x + z * z < 3.2)
      p.set(x, islandHeight(x, z) + 0.03, z)
      e.set((r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3)
      q.setFromEuler(e)
      s.setScalar(0.8 + r() * 0.7)
      m.compose(p, q, s)
      flowers.setMatrixAt(i, m)
      flowers.setColorAt(i, fc[i % fc.length])
    }

    // mushrooms
    const mushMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.4, sheen: 0.5 })
    const glowMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.4,
      emissive: new THREE.Color('#2f8f86'),
      emissiveIntensity: 0.9,
      clearcoat: 0.6,
    })
    const mushrooms = [
      { geo: buildMushroom('#d9775c', 0.95, 0.5, 1), x: -2.95, z: -1.15, rot: 0.2, mat: mushMat },
      { geo: buildMushroom('#e7a06e', 0.5, 0.27, 2), x: -2.5, z: -0.45, rot: -0.25, mat: mushMat },
      { geo: buildMushroom('#7fd0c4', 0.6, 0.3, 3), x: 2.95, z: -1.35, rot: -0.15, mat: glowMat },
      { geo: buildMushroom('#9fe0d4', 0.32, 0.17, 4), x: 3.3, z: -0.7, rot: 0.3, mat: glowMat },
    ].map((mm) => {
      const mesh = new THREE.Mesh(mm.geo, mm.mat)
      mesh.position.set(mm.x, islandHeight(mm.x, mm.z) - 0.03, mm.z)
      mesh.rotation.z = mm.rot
      mesh.castShadow = quality === 'high'
      return mesh
    })

    const pebbles = new THREE.Mesh(buildPebbles(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }))
    const roots = new THREE.Mesh(buildRoots(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))

    const moundMesh = new THREE.Mesh(mound, moundMat)
    moundMesh.receiveShadow = quality === 'high'

    return { moundMesh, grass, flowers, mushrooms, pebbles, roots }
  }, [quality])

  useEffect(
    () => () => {
      const { moundMesh, grass, flowers, mushrooms, pebbles, roots } = assets
      ;[moundMesh, grass, flowers, pebbles, roots, ...mushrooms].forEach((o) => {
        o.geometry.dispose()
        ;(o.material as THREE.Material).dispose()
      })
    },
    [assets],
  )

  const shown = useRef(1)
  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    shown.current = damp(shown.current, spiderCtl.showIsland ? 1 : 0, 6, Math.min(delta, 0.05))
    g.visible = shown.current > 0.01
    g.scale.setScalar(0.6 + 0.4 * shown.current)
    g.position.y = -0.6 * (1 - shown.current)
    if (!g.visible) {
      groundPointer.valid = false
      return
    }
    grassUniforms.current.uTime.value += Math.min(delta, 0.05)

    // project pointer onto the ground (stage-local) so grass & beetles can react
    _ndc.set(pointer.x, pointer.y)
    _ray.setFromCamera(_ndc, state.camera)
    _inv.copy(g.matrixWorld).invert()
    _ray.ray.applyMatrix4(_inv)
    const hit = _ray.ray.intersectPlane(_plane, _hit)
    if (hit && pointer.engaged && islandEllipse(hit.x, hit.z) < 1.4) {
      groundPointer.x = hit.x
      groundPointer.z = hit.z
      groundPointer.valid = true
      grassUniforms.current.uPush.value.set(hit.x, 0, hit.z)
    } else {
      groundPointer.valid = false
      grassUniforms.current.uPush.value.set(0, -99, 99)
    }
  })

  return (
    <group ref={group}>
      <primitive object={assets.moundMesh} />
      <primitive object={assets.grass} />
      <primitive object={assets.flowers} />
      <primitive object={assets.pebbles} />
      <primitive object={assets.roots} />
      {assets.mushrooms.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      {children}
    </group>
  )
}
