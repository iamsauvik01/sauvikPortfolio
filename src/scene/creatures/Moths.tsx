import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clamp, damp, rand, rng } from '../../lib/math'
import { pointer, pointerIdle } from '../../lib/pointer'
import { camState, sceneRefs } from '../../lib/spiderCtl'
import { rawColor } from '../util'

/**
 * Glimmer moths — small glowing fantasy insects. Some are curious and come
 * to visit the cursor for a while; others are shy and dart away. A quick
 * flick of the cursor through one startles it into a loop.
 */

interface Moth {
  pos: THREE.Vector3
  vel: THREE.Vector3
  seed: number[]
  curious: boolean
  interest: number
  pause: number
  nextPause: number
  flap: number
  startle: number
  yaw: number
  bank: number
}

function wingTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.translate(0, 64)
  const g = ctx.createLinearGradient(0, 0, 128, 0)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(1, 'rgba(255,255,255,0.45)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(2, -6)
  ctx.bezierCurveTo(40, -62, 120, -60, 124, -18)
  ctx.bezierCurveTo(126, 10, 90, 22, 60, 16)
  ctx.bezierCurveTo(90, 30, 96, 58, 64, 58)
  ctx.bezierCurveTo(36, 58, 12, 30, 2, 8)
  ctx.closePath()
  ctx.fill()
  // eyespot + veins
  ctx.fillStyle = 'rgba(80,50,90,0.35)'
  ctx.beginPath()
  ctx.arc(84, -22, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,240,220,0.9)'
  ctx.beginPath()
  ctx.arc(84, -22, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(80,50,90,0.25)'
  ctx.lineWidth = 2
  ;[-40, -15, 10, 35].forEach((a) => {
    ctx.beginPath()
    ctx.moveTo(4, 0)
    ctx.quadraticCurveTo(50, a * 0.6, 110, a)
    ctx.stroke()
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const GLOW_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vPulse;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vPulse = 0.6 + 0.4 * sin(uTime * (2.0 + aSeed) + aSeed * 10.0);
    gl_PointSize = 52.0 * uPixelRatio * (12.0 / -mv.z) * (0.75 + vPulse * 0.35);
  }
`
const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vPulse;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.2) * uOpacity * vPulse;
    gl_FragColor = vec4(uColor * a, a);
  }
`

const _m = new THREE.Matrix4()
const _w = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler(0, 0, 0, 'YXZ')
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _desired = new THREE.Vector3()
const _tmp = new THREE.Vector3()
const _cursor = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _proj = new THREE.Vector3()
const _spider = new THREE.Vector3()
const _tail = new THREE.Vector3()

export function Moths({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const wingRef = useRef<THREE.InstancedMesh>(null)

  const assets = useMemo(() => {
    const b1 = new THREE.CapsuleGeometry(0.032, 0.11, 4, 8)
    b1.rotateX(Math.PI / 2)
    const b2 = new THREE.SphereGeometry(0.036, 10, 8).translate(0, 0.004, 0.085)
    const body = mergeGeometries([b1, b2])!
    b1.dispose()
    b2.dispose()
    const wing = new THREE.PlaneGeometry(0.24, 0.24)
    wing.translate(0.12, 0, 0)
    wing.rotateX(-Math.PI / 2)
    const tex = wingTexture()
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#e9dcf7', roughness: 0.9, emissive: '#6a5a8a', emissiveIntensity: 0.35 })
    const wingMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity: 0.88,
      toneMapped: false,
    })
    const glowGeo = new THREE.BufferGeometry()
    glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) seeds[i] = Math.random()
    glowGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uColor: { value: rawColor('#ffcf8a') },
        uOpacity: { value: 0.9 },
      },
    })
    return { body, wing, tex, bodyMat, wingMat, glowGeo, glowMat }
  }, [count])

  useEffect(
    () => () => {
      Object.values(assets).forEach((a) => (a as { dispose: () => void }).dispose())
    },
    [assets],
  )

  const moths = useMemo<Moth[]>(() => {
    const r = rng(31)
    return Array.from({ length: count }, (_, i) => ({
      pos: new THREE.Vector3((r() - 0.5) * 10, (r() - 0.5) * 5, (r() - 0.5) * 3),
      vel: new THREE.Vector3(),
      seed: [r() * 10, r() * 10, r() * 10, r() * 10, 0.7 + r() * 0.6],
      curious: i % 3 !== 2,
      interest: 3 + r() * 4,
      pause: 0,
      nextPause: 4 + r() * 8,
      flap: r() * 10,
      startle: 0,
      yaw: 0,
      bank: 0,
    }))
  }, [count])

  useEffect(() => {
    const tints = ['#d9c6ff', '#ffd4bd', '#c4f0e2', '#fff1c9'].map((c) => new THREE.Color(c))
    const w = wingRef.current
    if (!w) return
    for (let i = 0; i < count; i++) {
      w.setColorAt(i * 2, tints[i % tints.length])
      w.setColorAt(i * 2 + 1, tints[i % tints.length])
    }
    if (w.instanceColor) w.instanceColor.needsUpdate = true
    sceneRefs.moths = moths.map((m) => ({ x: m.pos.x, y: m.pos.y, z: m.pos.z }))
    return () => {
      sceneRefs.moths = []
    }
  }, [count, moths])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const t = state.clock.elapsedTime
    const body = bodyRef.current
    const wing = wingRef.current
    if (!body || !wing) return
    const cam = state.camera as THREE.PerspectiveCamera
    const { width, height } = state.size
    const halfH = cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    const halfW = halfH * (width / height)
    const speedK = reducedMotion ? 0.45 : 1
    const cursorActive = pointer.engaged && pointerIdle() < 3
    if (sceneRefs.eye) sceneRefs.eye.getWorldPosition(_spider)
    const glowPos = assets.glowGeo.attributes.position as THREE.BufferAttribute
    assets.glowMat.uniforms.uTime.value = t
    assets.glowMat.uniforms.uPixelRatio.value = state.viewport.dpr
    assets.glowMat.uniforms.uOpacity.value = 0.9 * camState.reveal

    moths.forEach((m, i) => {
      const [s1, s2, s3, s4, f] = m.seed
      // wander
      _desired.set(
        Math.sin(t * 0.37 * f + s1) + 0.5 * Math.sin(t * 0.71 * f + s2),
        Math.sin(t * 0.29 * f + s3) * 0.8,
        Math.sin(t * 0.23 * f + s4) * 0.6,
      )
      _desired.normalize().multiplyScalar(0.95)

      // bounds
      const bx = halfW * 0.92
      const by = halfH * 0.85
      if (m.pos.x > bx) _desired.x -= (m.pos.x - bx) * 2
      if (m.pos.x < -bx) _desired.x -= (m.pos.x + bx) * 2
      if (m.pos.y > by) _desired.y -= (m.pos.y - by) * 2
      if (m.pos.y < -by) _desired.y -= (m.pos.y + by) * 2
      if (m.pos.z > 2.5) _desired.z -= (m.pos.z - 2.5) * 2
      if (m.pos.z < -3) _desired.z -= (m.pos.z + 3) * 2

      // keep a polite distance from Bit's face
      _tmp.copy(m.pos).sub(_spider)
      const dS = _tmp.length()
      if (dS < 1.6) _desired.addScaledVector(_tmp.normalize(), (1.6 - dS) * 3)

      // cursor
      let lambda = 1.6
      if (cursorActive) {
        _dir.set(pointer.x, pointer.y, 0.5).unproject(cam).sub(cam.position).normalize()
        const k = (m.pos.z - cam.position.z) / _dir.z
        _cursor.copy(cam.position).addScaledVector(_dir, k)
        _tmp.copy(_cursor).sub(m.pos)
        const d = _tmp.length()
        if (m.curious) {
          if (m.interest > 0 && d < 4) {
            _cursor.x += Math.cos(t * 3 + s1) * 0.4
            _cursor.y += Math.sin(t * 2.6 + s2) * 0.3
            _desired.copy(_cursor).sub(m.pos).multiplyScalar(1.6).clampLength(0, 2.2)
            m.interest -= dt
            if (m.interest <= 0) m.interest = -rand(5, 9)
          }
        } else if (d < 1.8) {
          _desired.addScaledVector(_tmp.normalize(), -2.6 * (1.8 - d))
          lambda = 4
        }
        // startle: cursor flicked right through it
        _proj.copy(m.pos).project(cam)
        const px = (_proj.x * 0.5 + 0.5) * width
        const py = (-_proj.y * 0.5 + 0.5) * height
        if (m.startle <= 0 && Math.hypot(px - pointer.px, py - pointer.py) < 26) {
          m.startle = 1
          m.vel.set(rand(-1, 1), 2.4, rand(-0.5, 0.5))
        }
      }
      if (m.interest < 0) {
        m.interest += dt
        if (m.interest >= 0) m.interest = rand(3, 6)
      }

      // scatter on the cinematic transition
      if (camState.scatter > 0.01) {
        _tmp.copy(m.pos).sub(_spider).normalize()
        _desired.addScaledVector(_tmp, camState.scatter * 6)
        lambda = 4
      }

      // occasional hover-pause
      m.nextPause -= dt
      if (m.nextPause <= 0 && m.pause <= 0) {
        m.pause = rand(1.2, 2.4)
        m.nextPause = rand(6, 13)
      }
      let hover = 1
      if (m.pause > 0) {
        m.pause -= dt
        hover = 0.12
        _desired.y += Math.sin(t * 3 + s1) * 0.15
      }
      if (m.startle > 0) {
        m.startle -= dt * 1.4
        _desired.set(Math.cos(t * 9 + s1) * 2.5, Math.sin(t * 9 + s1) * 2.5, 0)
        lambda = 5
      }

      _desired.multiplyScalar(hover * speedK)
      m.vel.x = damp(m.vel.x, _desired.x, lambda, dt)
      m.vel.y = damp(m.vel.y, _desired.y, lambda, dt)
      m.vel.z = damp(m.vel.z, _desired.z, lambda, dt)
      m.pos.addScaledVector(m.vel, dt)

      // orientation
      const horiz = Math.hypot(m.vel.x, m.vel.z)
      if (horiz > 0.05) {
        const yaw = Math.atan2(m.vel.x, m.vel.z)
        let dy = yaw - m.yaw
        while (dy > Math.PI) dy -= Math.PI * 2
        while (dy < -Math.PI) dy += Math.PI * 2
        m.yaw += dy * Math.min(1, dt * 6)
        m.bank = damp(m.bank, clamp(-dy * 2, -0.6, 0.6), 4, dt)
      }
      const pitch = clamp(-Math.atan2(m.vel.y, Math.max(0.2, horiz)) * 0.6, -0.6, 0.6)
      m.flap += dt * (m.pause > 0 ? 10 : 17) * (reducedMotion ? 0.6 : 1)
      const flapA = 0.25 + Math.sin(m.flap) * 0.8

      _e.set(pitch, m.yaw, m.bank)
      _q.setFromEuler(_e)
      _m.compose(m.pos, _q, _s.set(1.6, 1.6, 1.6))
      body.setMatrixAt(i, _m)

      _q.setFromAxisAngle(_tmp.set(0, 0, 1), flapA)
      _w.compose(_p.set(0.025, 0.012, 0.0), _q, _s.set(1, 1, 1)).premultiply(_m)
      wing.setMatrixAt(i * 2, _w)
      _q.setFromAxisAngle(_tmp.set(0, 0, 1), -flapA)
      _w.compose(_p.set(-0.025, 0.012, 0.0), _q, _s.set(-1, 1, 1)).premultiply(_m)
      wing.setMatrixAt(i * 2 + 1, _w)

      _tail.set(0, 0, -0.09).applyMatrix4(_m)
      glowPos.setXYZ(i, _tail.x, _tail.y, _tail.z)
      const ref = sceneRefs.moths[i]
      if (ref) {
        ref.x = m.pos.x
        ref.y = m.pos.y
        ref.z = m.pos.z
      }
    })
    body.instanceMatrix.needsUpdate = true
    wing.instanceMatrix.needsUpdate = true
    glowPos.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[assets.body, assets.bodyMat, count]} frustumCulled={false} />
      <instancedMesh ref={wingRef} args={[assets.wing, assets.wingMat, count * 2]} frustumCulled={false} />
      <points geometry={assets.glowGeo} material={assets.glowMat} frustumCulled={false} />
    </group>
  )
}
