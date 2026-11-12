import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pointer } from '../lib/pointer'
import { appStore } from '../lib/appStore'
import { camState, sceneRefs } from '../lib/spiderCtl'
import { damp } from '../lib/math'
import { BASE_CAM_Z, BASE_FOV } from './Stage'
import { EYE_R } from './spider/buildSpider'

const _base = new THREE.Vector3()
const _look = new THREE.Vector3()
const _eye = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _dive = new THREE.Vector3()

/** Gentle mouse parallax on the landing world, plus the cinematic dive into Bit's eye. */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const par = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    const cam = state.camera as THREE.PerspectiveCamera
    const dt = Math.min(delta, 1 / 20)
    const phase = appStore.get().phase
    const allow = !reducedMotion && phase !== 'portfolio' && phase !== 'leaving'
    const P = par.current
    P.x = damp(P.x, allow ? pointer.x * 0.45 : 0, 2, dt)
    P.y = damp(P.y, allow ? pointer.y * 0.25 : 0, 2, dt)
    _base.set(P.x, P.y, BASE_CAM_Z)
    _look.set(P.x * 0.3, P.y * 0.3, 0)

    const d = camState.dive
    if (d > 0.0001 && sceneRefs.eye) {
      const eye = sceneRefs.eye
      eye.getWorldPosition(_eye)
      const e = eye.matrixWorld.elements
      const ws = Math.hypot(e[0], e[1], e[2])
      _fwd.set(0, 0, 1).transformDirection(eye.matrixWorld)
      _dive.copy(_eye).addScaledVector(_fwd, EYE_R * ws * 1.25)
      cam.position.lerpVectors(_base, _dive, d)
      _look.lerp(_eye, Math.min(1, d * 1.8))
    } else {
      cam.position.copy(_base)
    }
    cam.lookAt(_look)
    const fov = BASE_FOV - d * 8
    if (Math.abs(cam.fov - fov) > 0.001) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })
  return null
}
