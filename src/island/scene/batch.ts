import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Static batching.
 *
 * Each landmark is authored as dozens of small meshes, which is pleasant to build but costs
 * one draw call + one matrix update per mesh, every frame. After the island is built we merge
 * every mesh that never moves into one mesh per material, per "batch root".
 *
 *   userData.batch → a batch root: its static descendants are merged into it. The root itself may
 *                    move (a door, a spinning pedestal) — everything inside moves with it.
 *   userData.dyn   → animated on its own: never merged (its own batch roots still are).
 *
 * Merged meshes keep the originals' materials (so animated colours / glow still work), shadow
 * flags and pickability, so clicks and hovers bubble to the same handlers as before.
 */
export const ROOT = { batch: true }
export const DYN = { dyn: true }

const boundary = (o: THREE.Object3D) => o.userData.batch === true || o.userData.dyn === true

function collect(root: THREE.Object3D, out: THREE.Mesh[]) {
  for (const c of root.children) {
    if (boundary(c)) continue
    const m = c as THREE.Mesh
    if (
      m.isMesh &&
      !(m as THREE.InstancedMesh).isInstancedMesh &&
      !Array.isArray(m.material) &&
      m.children.length === 0 &&
      m.geometry?.attributes.position
    )
      out.push(m)
    collect(c, out)
  }
}

// (userData objects are shared constants — never mutate them; remember baked roots here)
const baked = new WeakSet<THREE.Object3D>()

const WHITE = new THREE.Color(1, 1, 1)

/**
 * Non-indexed copy in root space with matching attributes. Painted parts also carry their own
 * finish per vertex — colour, roughness/metalness (aRM) and glow (aEmi) — and faceted parts get
 * their facets baked into the normals, so ONE material can draw them all.
 */
function prepare(src: THREE.BufferGeometry, m: THREE.Matrix4, paint: THREE.MeshStandardMaterial | null) {
  const g = (src.index ? src.toNonIndexed() : src.clone()).applyMatrix4(m)
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k)
  const n = g.attributes.position.count
  if (!g.attributes.normal || paint?.flatShading) g.computeVertexNormals() // non-indexed → per-face normals
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2))
  const c = paint ? paint.color : WHITE
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  if (paint) {
    const rm = new Float32Array(n * 2)
    const em = new Float32Array(n * 3)
    const e = paint.emissive
    const k = paint.emissiveIntensity
    for (let i = 0; i < n; i++) {
      rm[i * 2] = paint.roughness
      rm[i * 2 + 1] = paint.metalness
      em[i * 3] = e.r * k
      em[i * 3 + 1] = e.g * k
      em[i * 3 + 2] = e.b * k
    }
    g.setAttribute('aRM', new THREE.Float32BufferAttribute(rm, 2))
    g.setAttribute('aEmi', new THREE.Float32BufferAttribute(em, 3))
  }
  return g
}

/** The shared paint: standard PBR, but colour / roughness / metalness / glow come per vertex. */
const paints = new Map<string, THREE.MeshStandardMaterial>()
function paintMaterial(src: THREE.MeshStandardMaterial) {
  const key = [src.side, src.transparent, src.opacity].join('|')
  let m = paints.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, side: src.side, transparent: src.transparent, opacity: src.opacity })
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aRM;\nattribute vec3 aEmi;\nvarying vec2 vRM;\nvarying vec3 vEmi;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRM = aRM;\nvEmi = aEmi;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vRM;\nvarying vec3 vEmi;')
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRM.x;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vRM.y;')
        .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = vEmi;')
    }
    m.customProgramCacheKey = () => 'island-paint'
    paints.set(key, m)
  }
  return m
}

/** Merge static meshes under every batch root in `scene`. Returns [before, after] mesh counts. */
export function bakeStatic(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true)
  const roots: THREE.Object3D[] = []
  scene.traverse((o) => {
    if (o.userData.batch === true && !baked.has(o)) roots.push(o)
  })
  let before = 0
  let after = 0
  const inv = new THREE.Matrix4()
  const rel = new THREE.Matrix4()
  for (const root of roots) {
    baked.add(root)
    const meshes: THREE.Mesh[] = []
    collect(root, meshes)
    if (meshes.length < 2) continue
    inv.copy(root.matrixWorld).invert()
    const groups = new Map<string, { mat: THREE.Material; mesh: THREE.Mesh; geos: THREE.BufferGeometry[]; cast: boolean; recv: boolean }>()
    for (const m of meshes) {
      const src = m.material as THREE.Material
      // plain shared colours fold into ONE vertex-coloured material per finish
      const paint = src.userData.paint === true && (src as THREE.MeshStandardMaterial).isMeshStandardMaterial
      const mat = paint ? paintMaterial(src as THREE.MeshStandardMaterial) : src
      // one draw per material: shadow flags are OR-ed and every merged part is clickable
      // (decorations become part of their landmark's click target)
      const key = `${mat.uuid}|${m.renderOrder}|${m.visible}`
      rel.multiplyMatrices(inv, m.matrixWorld)
      const g = prepare(m.geometry, rel, paint ? (src as THREE.MeshStandardMaterial) : null)
      let entry = groups.get(key)
      if (!entry) groups.set(key, (entry = { mat, mesh: m, geos: [], cast: false, recv: false }))
      entry.geos.push(g)
      entry.cast ||= m.castShadow
      entry.recv ||= m.receiveShadow
    }
    before += meshes.length
    for (const { mat, mesh, geos, cast, recv } of groups.values()) {
      const geo = mergeGeometries(geos, false)!
      geo.computeBoundingSphere()
      geos.forEach((g) => g.dispose())
      const out = new THREE.Mesh(geo, mat)
      out.castShadow = cast
      out.receiveShadow = recv
      out.renderOrder = mesh.renderOrder
      out.visible = mesh.visible
      out.matrixAutoUpdate = false
      out.updateMatrix()
      out.name = 'baked'
      root.add(out)
      after++
    }
    // the originals leave the scene graph entirely: no draw calls, no matrix updates
    for (const m of meshes) m.parent?.remove(m)
  }
  // anything left that can never move doesn't need its matrix recomputed every frame
  scene.traverse((o) => {
    if (o === scene || o.userData.dyn || o.userData.batch) return
    let p: THREE.Object3D | null = o
    let still = true
    while (p && p !== scene) {
      if (p.userData.dyn || p.userData.batch) {
        still = false
        break
      }
      p = p.parent
    }
    if (still && !(o as THREE.Camera).isCamera && !(o as THREE.Light).isLight) o.matrixAutoUpdate = false
  })
  return [before, after]
}
