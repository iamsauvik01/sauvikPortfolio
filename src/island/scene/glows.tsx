import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../store'
import { glowTexture } from './kit'
import type { LandmarkState } from './Landmark'

/**
 * Every soft glow on the island (lamps, windows, torches, the lighthouse, treasure…) used to be
 * its own sprite — one draw call each. They now register here and are drawn together as a single
 * point cloud, with each glow keeping its own colour, size, position and brightness.
 */
interface GlowEntry {
  obj: THREE.Object3D
  color: THREE.Color
  size: number
  opacity: number
  nightBoost: number
  act: number
  st: React.RefObject<LandmarkState> | null
}

const glows = new Set<GlowEntry>()

export function registerGlow(e: GlowEntry) {
  glows.add(e)
  return () => void glows.delete(e)
}

const MAX = 96

function visibleInScene(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false
  return true
}

export function GlowField() {
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage))
    g.setDrawRange(0, 0)
    return g
  }, [])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTex: { value: glowTexture() }, uScale: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
          uniform float uScale;
          varying vec3 vColor; varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            // a sprite of world size s at distance d covers s * (viewportH / (2 tan(fov/2))) / d pixels
            gl_PointSize = aSize * uScale / -mv.z;
            vColor = aColor; vAlpha = aAlpha;
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTex;
          varying vec3 vColor; varying float vAlpha;
          void main() {
            vec4 t = texture2D(uTex, gl_PointCoord);
            gl_FragColor = vec4(vColor * t.rgb, vAlpha * t.a);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )
  const v = useRef(new THREE.Vector3())

  useFrame(() => {
    mat.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
    const pos = geo.attributes.position as THREE.BufferAttribute
    const col = geo.attributes.aColor as THREE.BufferAttribute
    const siz = geo.attributes.aSize as THREE.BufferAttribute
    const alp = geo.attributes.aAlpha as THREE.BufferAttribute
    let i = 0
    for (const g of glows) {
      if (i >= MAX) break
      if (!visibleInScene(g.obj)) continue
      g.obj.getWorldPosition(v.current)
      pos.setXYZ(i, v.current.x, v.current.y, v.current.z)
      col.setXYZ(i, g.color.r, g.color.g, g.color.b)
      // world scale of the anchor (e.g. a treasure rising out of its chest) scales the glow too
      siz.setX(i, g.size * g.obj.matrixWorld.getMaxScaleOnAxis())
      alp.setX(i, Math.min(1, g.opacity * (1 + world.night * g.nightBoost + (g.st?.current.act ?? 0) * g.act)))
      i++
    }
    geo.setDrawRange(0, i)
    pos.needsUpdate = col.needsUpdate = siz.needsUpdate = alp.needsUpdate = true
  })

  useEffect(() => () => geo.dispose(), [geo])
  return <points geometry={geo} material={mat} frustumCulled={false} raycast={() => null} renderOrder={5} />
}

/* ── soft contact shadows ("blobs") — one instanced draw for all of them ── */
interface BlobEntry {
  obj: THREE.Object3D
  r: number
  opacity: number
}
const blobs = new Set<BlobEntry>()

export function registerBlob(e: BlobEntry) {
  blobs.add(e)
  return () => void blobs.delete(e)
}

const MAX_BLOBS = 64

export function BlobField() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(1, 24)
    g.rotateX(-Math.PI / 2)
    g.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(MAX_BLOBS), 1).setUsage(THREE.DynamicDrawUsage))
    return g
  }, [])
  const mat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#2a1d3a', transparent: true, depthWrite: false })
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
        .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vAlpha;')
    }
    m.customProgramCacheKey = () => 'island-blob'
    return m
  }, [])
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), [])
  useFrame(() => {
    const im = ref.current
    if (!im) return
    const alpha = geo.attributes.aAlpha as THREE.InstancedBufferAttribute
    let i = 0
    for (const b of blobs) {
      if (i >= MAX_BLOBS) break
      if (!visibleInScene(b.obj)) continue
      b.obj.getWorldPosition(tmp.p)
      const k = b.r * b.obj.matrixWorld.getMaxScaleOnAxis()
      tmp.m.compose(tmp.p, tmp.q, tmp.s.set(k, 1, k))
      im.setMatrixAt(i, tmp.m)
      alpha.setX(i, b.opacity)
      i++
    }
    im.count = i
    im.instanceMatrix.needsUpdate = true
    alpha.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, MAX_BLOBS]} frustumCulled={false} renderOrder={1} raycast={() => null} />
}
