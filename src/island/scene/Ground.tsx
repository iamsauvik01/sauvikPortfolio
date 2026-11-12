import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { merge, placed, puffGeometry, withSway } from './kit'
import type { GroundData, Tier } from './groundData'

/* ── terrain (data from the ground worker) ─────────────────────── */
export function Terrain({ tier, data }: { tier: Tier; data: GroundData['terrain'] }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.position, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3))
    g.setAttribute('color', new THREE.BufferAttribute(data.color, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(data.uv, 2))
    g.setIndex(new THREE.BufferAttribute(data.index, 1))
    g.computeBoundingSphere()
    return g
  }, [data])
  const m = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), [])
  return <mesh geometry={geo} material={m} receiveShadow castShadow={tier === 'high'} raycast={() => null} />
}

/* ── geometries ────────────────────────────────────────────────── */
function treeGeos() {
  const trunk = new THREE.CylinderGeometry(0.09, 0.16, 1.3, 6)
  trunk.translate(0, 0.65, 0)
  const canopy = puffGeometry(5, 4, 1)
  canopy.scale(0.95, 0.85, 0.95)
  canopy.translate(0, 1.75, 0)
  return { trunk, canopy }
}

function pineGeo() {
  const parts = [0, 1, 2].map((i) => placed(new THREE.ConeGeometry(0.85 - i * 0.2, 1.1, 7), 0, 0.9 + i * 0.62, 0))
  return merge(parts)
}

function palmGeos() {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.15, 1.4, 0), new THREE.Vector3(0.75, 2.6, 0))
  const trunk = new THREE.TubeGeometry(curve, 8, 0.09, 6, false)
  const leaves: THREE.BufferGeometry[] = []
  for (let i = 0; i < 7; i++) {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.quadraticCurveTo(0.6, 0.22, 1.35, 0)
    shape.quadraticCurveTo(0.6, -0.22, 0, 0)
    const g = new THREE.ShapeGeometry(shape, 4)
    // droop
    const p = g.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k)
      p.setZ(k, -x * x * 0.32)
    }
    g.rotateX(Math.PI / 2)
    g.rotateZ(0.25)
    g.rotateY((i / 7) * Math.PI * 2)
    g.translate(0.75, 2.6, 0)
    leaves.push(g)
  }
  const crown = merge(leaves)
  crown.computeVertexNormals()
  return { trunk, crown }
}

function grassGeo() {
  const blades = [0, 1, 2, 3].map((i) => {
    const g = new THREE.ConeGeometry(0.045, 0.42 + (i % 2) * 0.12, 3)
    g.translate(0, 0.2, 0)
    return placed(g, Math.cos(i * 1.7) * 0.08, 0, Math.sin(i * 1.7) * 0.08, 1, 0, Math.cos(i * 2.3) * 0.25, Math.sin(i * 2.3) * 0.25)
  })
  return merge(blades)
}

/* ── vegetation ────────────────────────────────────────────────── */
export function Vegetation({ tier, data }: { tier: Tier; data: GroundData['veg'] }) {

  const geos = useMemo(() => {
    const t = treeGeos()
    const p = palmGeos()
    const rock = new THREE.DodecahedronGeometry(0.6, 0)
    rock.scale(1, 0.62, 0.85)
    return {
      ...t,
      pine: pineGeo(),
      pineTrunk: new THREE.CylinderGeometry(0.08, 0.12, 0.8, 5).translate(0, 0.4, 0),
      palmTrunk: p.trunk,
      palmCrown: p.crown,
      rock,
      bush: puffGeometry(9, 3, 1).scale(0.55, 0.42, 0.55).translate(0, 0.25, 0),
      grass: grassGeo(),
      flower: new THREE.IcosahedronGeometry(0.075, 0).translate(0, 0.28, 0),
    }
  }, [])

  const mats = useMemo(
    () => ({
      trunk: new THREE.MeshStandardMaterial({ color: '#8a5a3c', roughness: 0.9 }),
      canopy: withSway(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), 0.025),
      pine: withSway(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true }), 0.02),
      palmTrunk: new THREE.MeshStandardMaterial({ color: '#b98a5c', roughness: 0.9 }),
      palmCrown: withSway(new THREE.MeshStandardMaterial({ color: '#4f9e4f', roughness: 0.8, side: THREE.DoubleSide }), 0.04),
      rock: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }),
      bush: withSway(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), 0.03),
      grass: withSway(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), 0.12),
      flower: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.08 }),
    }),
    [],
  )

  const refs = {
    trunk: useRef<THREE.InstancedMesh>(null),
    canopy: useRef<THREE.InstancedMesh>(null),
    pine: useRef<THREE.InstancedMesh>(null),
    pineTrunk: useRef<THREE.InstancedMesh>(null),
    palmTrunk: useRef<THREE.InstancedMesh>(null),
    palmCrown: useRef<THREE.InstancedMesh>(null),
    rock: useRef<THREE.InstancedMesh>(null),
    bush: useRef<THREE.InstancedMesh>(null),
    grass: useRef<THREE.InstancedMesh>(null),
    flower: useRef<THREE.InstancedMesh>(null),
  }

  // matrices + colours arrive precomputed from the ground worker
  useLayoutEffect(() => {
    for (const key of Object.keys(refs) as (keyof typeof refs)[]) {
      const im = refs[key].current
      const set = data[key]
      if (!im) continue
      im.instanceMatrix = new THREE.InstancedBufferAttribute(set.matrices, 16)
      if (set.colors) im.instanceColor = new THREE.InstancedBufferAttribute(set.colors, 3)
      im.count = set.count
      im.computeBoundingSphere()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const shadow = tier === 'high'
  const none = () => null
  return (
    <group>
      <instancedMesh ref={refs.trunk} args={[geos.trunk, mats.trunk, data.trunk.count]} castShadow={shadow} raycast={none} />
      <instancedMesh ref={refs.canopy} args={[geos.canopy, mats.canopy, data.canopy.count]} castShadow={shadow} receiveShadow={shadow} raycast={none} />
      <instancedMesh ref={refs.pine} args={[geos.pine, mats.pine, data.pine.count]} castShadow={shadow} raycast={none} />
      <instancedMesh ref={refs.pineTrunk} args={[geos.pineTrunk, mats.trunk, data.pineTrunk.count]} raycast={none} />
      <instancedMesh ref={refs.palmTrunk} args={[geos.palmTrunk, mats.palmTrunk, data.palmTrunk.count]} castShadow={shadow} raycast={none} />
      <instancedMesh ref={refs.palmCrown} args={[geos.palmCrown, mats.palmCrown, data.palmCrown.count]} castShadow={shadow} raycast={none} />
      <instancedMesh ref={refs.rock} args={[geos.rock, mats.rock, data.rock.count]} castShadow={shadow} receiveShadow={shadow} raycast={none} />
      <instancedMesh ref={refs.bush} args={[geos.bush, mats.bush, data.bush.count]} castShadow={shadow} raycast={none} />
      <instancedMesh ref={refs.grass} args={[geos.grass, mats.grass, data.grass.count]} raycast={none} />
      <instancedMesh ref={refs.flower} args={[geos.flower, mats.flower, data.flower.count]} raycast={none} />
    </group>
  )
}
