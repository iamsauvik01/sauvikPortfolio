import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { bump, clamp, damp, rand, rng } from '../../lib/math'
import { camState, spiderCtl } from '../../lib/spiderCtl'
import { groundPointer } from '../shared'
import { islandEllipse, islandHeight } from '../environment/islandShape'

/**
 * Tiny jewel beetles crawling over the moss. Fully instanced:
 * 4 draw calls regardless of beetle count.
 */

type BState = 'walk' | 'pause' | 'flee' | 'follow'
interface Beetle {
  x: number
  z: number
  heading: number
  speed: number
  state: BState
  timer: number
  phase: number
  hop: number
  cool: number
  friendly: boolean
  interest: number
  size: number
  seed: number
  antenna: number
}

function shellTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 256, 128)
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(60,30,40,0.35)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 128)
  ctx.fillStyle = '#1b1222'
  ctx.fillRect(256 * 0.25 - 3, 0, 6, 128)
  ctx.fillRect(256 * 0.75 - 3, 0, 6, 128)
  const r = rng(13)
  for (let i = 0; i < 9; i++) {
    ctx.beginPath()
    ctx.arc(20 + r() * 216, 30 + r() * 70, 6 + r() * 7, 0, Math.PI * 2)
    ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function colorGeo(g: THREE.BufferGeometry, hex: string) {
  const c = new THREE.Color(hex)
  const n = g.attributes.position.count
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g
}

const _m = new THREE.Matrix4()
const _l = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3(1, 1, 1)
const _one = new THREE.Vector3(1, 1, 1)

function angleTo(from: number, to: number) {
  let d = to - from
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export function Beetles({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const shellRef = useRef<THREE.InstancedMesh>(null)
  const torsoRef = useRef<THREE.InstancedMesh>(null)
  const legRef = useRef<THREE.InstancedMesh>(null)
  const antRef = useRef<THREE.InstancedMesh>(null)

  const assets = useMemo(() => {
    const shell = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    shell.scale(0.15, 0.12, 0.19)
    shell.translate(0, 0.045, -0.01)
    const head = colorGeo(new THREE.SphereGeometry(0.07, 14, 10).translate(0, 0.06, 0.17), '#1d1426')
    const under = colorGeo(new THREE.SphereGeometry(1, 14, 8).scale(0.13, 0.05, 0.17).translate(0, 0.045, 0), '#1d1426')
    const eyeL = colorGeo(new THREE.SphereGeometry(0.022, 8, 6).translate(0.038, 0.085, 0.215), '#fff6ea')
    const eyeR = colorGeo(new THREE.SphereGeometry(0.022, 8, 6).translate(-0.038, 0.085, 0.215), '#fff6ea')
    const torso = mergeGeometries([head, under, eyeL, eyeR])!
    ;[head, under, eyeL, eyeR].forEach((g) => g.dispose())
    const leg = new THREE.CylinderGeometry(0.011, 0.008, 0.13, 5, 1)
    leg.rotateZ(-Math.PI / 2)
    leg.translate(0.065, 0, 0)
    const antStalk = new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4, 1)
    antStalk.rotateX(Math.PI / 2)
    antStalk.translate(0, 0, 0.06)
    const antTip = new THREE.SphereGeometry(0.016, 8, 6).translate(0, 0, 0.125)
    const ant = mergeGeometries([antStalk, antTip])!
    antStalk.dispose()
    antTip.dispose()
    const tex = shellTexture()
    const shellMat = new THREE.MeshPhysicalMaterial({
      map: tex,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    })
    const darkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })
    const limbMat = new THREE.MeshStandardMaterial({ color: '#1d1426', roughness: 0.7 })
    return { shell, torso, leg, ant, tex, shellMat, darkMat, limbMat }
  }, [])

  useEffect(
    () => () => {
      Object.values(assets).forEach((a) => (a as { dispose: () => void }).dispose())
    },
    [assets],
  )

  const beetles = useMemo<Beetle[]>(() => {
    const r = rng(77)
    return Array.from({ length: count }, (_, i) => {
      const a = r() * Math.PI * 2
      const rad = 1.8 + r() * 1.4
      return {
        x: Math.sin(a) * rad,
        z: Math.cos(a) * rad * 0.8,
        heading: r() * Math.PI * 2,
        speed: 0,
        state: 'walk' as BState,
        timer: 1 + r() * 3,
        phase: r() * 10,
        hop: -1,
        cool: 0,
        friendly: i % 2 === 0,
        interest: 3 + r() * 3,
        size: 0.85 + r() * 0.35,
        seed: r() * 100,
        antenna: 0,
      }
    })
  }, [count])

  useEffect(() => {
    const colors = ['#e0694f', '#e8b04a', '#4fae9e', '#a78be0', '#f08f6e', '#7cc4a4'].map((c) => new THREE.Color(c))
    const sh = shellRef.current
    if (!sh) return
    for (let i = 0; i < count; i++) sh.setColorAt(i, colors[i % colors.length])
    if (sh.instanceColor) sh.instanceColor.needsUpdate = true
  }, [count])

  const time = useRef(0)
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20) * (reducedMotion ? 0.5 : 1)
    time.current += dt
    const t = time.current
    const sh = shellRef.current
    const to = torsoRef.current
    const lg = legRef.current
    const an = antRef.current
    if (!sh || !to || !lg || !an || !spiderCtl.showIsland) return
    const gp = groundPointer

    beetles.forEach((b, i) => {
      const dCur = gp.valid ? Math.hypot(gp.x - b.x, gp.z - b.z) : 99
      b.cool -= dt
      if (dCur < 0.32 && b.hop < 0 && b.cool <= 0) {
        b.hop = 0
        b.cool = 2.5
      }
      if (b.state !== 'flee' && !b.friendly && dCur < 1.2) {
        b.state = 'flee'
        b.timer = 1.1
      } else if (b.friendly && b.state !== 'follow' && b.state !== 'flee' && dCur < 2.6 && b.interest > 0) {
        b.state = 'follow'
      }
      if (camState.scatter > 0.2 && b.state !== 'flee') {
        b.state = 'flee'
        b.timer = 1.4
      }

      let desired = b.heading
      let targetSpeed = 0
      switch (b.state) {
        case 'walk':
          desired = b.heading + Math.sin(t * 0.7 + b.seed) * 0.9
          targetSpeed = 0.3
          b.timer -= dt
          if (b.timer < 0) {
            b.state = 'pause'
            b.timer = rand(0.8, 2.4)
          }
          break
        case 'pause':
          targetSpeed = 0
          b.timer -= dt
          if (b.timer < 0) {
            b.state = 'walk'
            b.timer = rand(2, 5)
            b.heading += rand(-1.3, 1.3)
          }
          break
        case 'flee': {
          const fx = camState.scatter > 0.2 ? b.x : b.x - gp.x
          const fz = camState.scatter > 0.2 ? b.z : b.z - gp.z
          desired = Math.atan2(fx, fz)
          targetSpeed = 1.1
          b.timer -= dt
          if (b.timer < 0) {
            b.state = 'pause'
            b.timer = rand(0.6, 1.4)
          }
          break
        }
        case 'follow':
          desired = Math.atan2(gp.x - b.x, gp.z - b.z)
          targetSpeed = dCur > 0.5 ? 0.55 : 0
          b.interest -= dt
          if (b.interest < 0 || dCur > 3.2) {
            b.state = 'walk'
            b.timer = rand(2, 4)
            b.interest = -rand(5, 9)
          }
          break
      }
      if (b.interest < 0 && b.state !== 'follow') {
        b.interest += dt
        if (b.interest >= 0) b.interest = rand(3, 6)
      }

      // stay on the island, keep clear of Bit's body
      const el = islandEllipse(b.x, b.z)
      if (el > 0.8) desired = b.heading + angleTo(b.heading, Math.atan2(-b.x, -b.z)) * clamp((el - 0.8) * 6, 0, 1)
      const bodyD = b.x * b.x + (b.z + 0.4) * (b.z + 0.4)
      if (bodyD < 1.6) desired = Math.atan2(b.x, b.z + 0.4)

      const turnRate = b.state === 'flee' ? 7 : 3
      b.heading += angleTo(b.heading, desired) * Math.min(1, turnRate * dt)
      b.speed = damp(b.speed, targetSpeed, 5, dt)
      b.x += Math.sin(b.heading) * b.speed * dt
      b.z += Math.cos(b.heading) * b.speed * dt
      b.phase += b.speed * dt * 32
      b.antenna += dt * (b.state === 'pause' ? 7 : 3)

      let hopY = 0
      let spinA = 0
      if (b.hop >= 0) {
        b.hop += dt
        const k = b.hop / 0.55
        hopY = bump(k) * 0.32
        spinA = Math.min(1, k) * Math.PI
        if (k >= 1) {
          b.hop = -1
          b.heading += Math.PI
        }
      }

      const y = islandHeight(b.x, b.z) + hopY + Math.abs(Math.sin(b.phase * 0.5)) * 0.008
      _e.set(0, b.heading + spinA, Math.sin(b.phase * 0.5) * 0.04)
      _q.setFromEuler(_e)
      _p.set(b.x, y, b.z)
      _s.setScalar(b.size)
      _m.compose(_p, _q, _s)
      sh.setMatrixAt(i, _m)
      to.setMatrixAt(i, _m)

      for (let j = 0; j < 6; j++) {
        const side = j < 3 ? 1 : -1
        const k = j % 3
        const off = ((k + (side > 0 ? 0 : 1)) % 2) * Math.PI
        const swing = Math.sin(b.phase + off) * 0.45 * Math.min(1, b.speed * 3)
        const lift = Math.max(0, Math.sin(b.phase + off + Math.PI / 2)) * 0.25 * Math.min(1, b.speed * 3)
        _e.set(0, (side > 0 ? 0 : Math.PI) + swing * side + (k - 1) * 0.5 * side, -0.55 + lift, 'YXZ')
        _q.setFromEuler(_e)
        _p.set(side * 0.09, 0.045, (1 - k) * 0.08)
        _l.compose(_p, _q, _one)
        _l.premultiply(_m)
        lg.setMatrixAt(i * 6 + j, _l)
      }
      for (let j = 0; j < 2; j++) {
        const side = j === 0 ? 1 : -1
        _e.set(-0.55 + Math.sin(b.antenna + j) * 0.18, side * 0.35 + Math.sin(b.antenna * 0.7 + j * 2) * 0.12, 0)
        _q.setFromEuler(_e)
        _p.set(side * 0.03, 0.09, 0.22)
        _l.compose(_p, _q, _one)
        _l.premultiply(_m)
        an.setMatrixAt(i * 2 + j, _l)
      }
    })
    sh.instanceMatrix.needsUpdate = true
    to.instanceMatrix.needsUpdate = true
    lg.instanceMatrix.needsUpdate = true
    an.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={shellRef} args={[assets.shell, assets.shellMat, count]} frustumCulled={false} />
      <instancedMesh ref={torsoRef} args={[assets.torso, assets.darkMat, count]} frustumCulled={false} />
      <instancedMesh ref={legRef} args={[assets.leg, assets.limbMat, count * 6]} frustumCulled={false} />
      <instancedMesh ref={antRef} args={[assets.ant, assets.limbMat, count * 2]} frustumCulled={false} />
    </group>
  )
}
