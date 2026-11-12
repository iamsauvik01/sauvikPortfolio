import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { buildSpider, BODY_Y, type LegRig, type Quality } from './buildSpider'
import { spiderCtl, sceneRefs } from '../../lib/spiderCtl'
import { pointer, pointerIdle } from '../../lib/pointer'
import { appStore } from '../../lib/appStore'
import { bump, clamp, damp, easeInOut, lerp, rand, smoothstep } from '../../lib/math'
import { islandHeight } from '../environment/islandShape'

type ActName = 'giggle' | 'wave' | 'spin' | 'enter' | 'hello'
const ACT_DUR: Record<ActName, number> = { giggle: 1.5, wave: 2.3, spin: 1.5, enter: 1.3, hello: 1.8 }
const POKE_CYCLE: ActName[] = ['giggle', 'wave', 'spin']

/** Lid rotation presets (radians about the eye's X axis). */
const LID = { open: -0.82, wide: -1.22, sleepy: -0.12, closed: 1.62 }
const LIDB = { open: 1.0, happy: 0.62 }

const _head = new THREE.Vector3()
const _proj = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _target = new THREE.Vector3()
const _local = new THREE.Vector3()
const _foot = new THREE.Vector3()
const _wave = new THREE.Vector3()
const _inv = new THREE.Matrix4()
const _v = new THREE.Vector3()

function solveLeg(leg: LegRig, targetBodySpace: THREE.Vector3) {
  _v.copy(targetBodySpace).sub(leg.hip.position)
  const yaw = Math.atan2(-_v.z, _v.x)
  const dx = Math.hypot(_v.x, _v.z)
  const dy = _v.y
  const { L1, L2 } = leg
  const D = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.02, (L1 + L2) * 0.998)
  const phi = Math.atan2(dy, dx)
  const a1 = phi + Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1))
  const a2 = -(Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1)))
  leg.hip.rotation.y = yaw
  leg.femur.rotation.z = a1
  leg.knee.rotation.z = a2
}

function makeState() {
  return {
    t: 0,
    expr: { top: LID.open, bot: LIDB.open, pupil: 0.34, smile: 0.6, mouthO: 0 },
    blink: { next: 1.4, t: -1, again: false },
    glance: { kind: 'viewer' as 'viewer' | 'moth' | 'point', next: 0, x: 0, y: 0, moth: 0 },
    act: { name: null as ActName | null, t: 0 },
    pokeIdx: 0,
    tap: { leg: -1, t: 0, next: 3 },
    hangT: 0,
    waveW: 0,
    squash: 0,
    wasAir: false,
    tuft: { a: 0, v: 0, prevYaw: 0, prevY: 0 },
    swing: { a: 0, v: 0, lastScroll: 0 },
    sleepy: 0,
    wake: 0,
    hovering: false,
    prox: 0,
    excite: 0,
    tilt: { v: 0, next: 4, target: 0 },
    snapSeen: -1,
    smallEyeBase: [] as number[],
  }
}

interface Props {
  quality: Quality
  reducedMotion: boolean
  shadows: boolean
}

export function Spider({ quality, reducedMotion, shadows }: Props) {
  const rig = useMemo(() => buildSpider(quality), [quality])
  const S = useRef(makeState()).current

  useEffect(() => {
    rig.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = shadows && (o as THREE.Mesh).castShadow
    })
    rig.eyes.forEach((e) => (e.ball.rotation.order = 'YXZ'))
    rig.body.rotation.order = 'YXZ'
    S.smallEyeBase = rig.smallEyes.map((m) => m.scale.x)
    sceneRefs.eye = rig.eyes[1].socket
    S.swing.lastScroll = window.scrollY
    return () => {
      sceneRefs.eye = null
      document.documentElement.classList.remove('spider-hover')
      rig.dispose()
    }
  }, [rig, shadows, S])

  const start = (name: ActName) => {
    S.act.name = name
    S.act.t = 0
  }

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    S.t += dt
    const t = S.t
    const cam = state.camera as THREE.PerspectiveCamera
    const { width, height } = state.size
    const motion = reducedMotion ? 0.35 : 1
    const phase = appStore.get().phase

    /* ── one-shot actions ─────────────────────────────── */
    while (spiderCtl.queue.length) {
      const a = spiderCtl.queue.shift()!
      if (a === 'poke') start(POKE_CYCLE[S.pokeIdx++ % POKE_CYCLE.length])
      else if (a === 'enter') start('enter')
      else if (a === 'hello' && !S.act.name) start('hello')
    }
    let hopY = 0
    let spin = 0
    let wiggle = 0
    let surprise = 0
    let happy = 0
    let waveAct = 0
    let lean = 0
    const A = S.act
    if (A.name) {
      A.t += dt
      const p = A.t
      switch (A.name) {
        case 'giggle':
          surprise = bump(p / 0.4)
          hopY = 0.55 * bump((p - 0.12) / 0.5)
          happy = smoothstep(0.45, 0.7, p) * (1 - smoothstep(1.3, 1.5, p))
          wiggle = p > 0.62 ? Math.sin((p - 0.62) * 30) * 0.13 * Math.max(0, 1 - (p - 0.62) / 0.88) : 0
          break
        case 'wave':
          happy = smoothstep(0, 0.25, p) * (1 - smoothstep(2.0, 2.3, p))
          waveAct = smoothstep(0.05, 0.35, p) * (1 - smoothstep(1.85, 2.2, p))
          lean = -0.08 * waveAct
          break
        case 'spin':
          surprise = bump(p / 0.3)
          hopY = 0.95 * bump((p - 0.15) / 0.8)
          spin = easeInOut(clamp((p - 0.2) / 0.7, 0, 1)) * Math.PI * 2
          happy = smoothstep(0.9, 1.1, p) * (1 - smoothstep(1.3, 1.5, p))
          break
        case 'enter':
          surprise = bump(p / 0.35) * 0.6
          hopY = 0.7 * bump((p - 0.1) / 0.55)
          happy = smoothstep(0.3, 0.6, p)
          break
        case 'hello':
          happy = bump(p / 1.8)
          waveAct = smoothstep(0.05, 0.3, p) * (1 - smoothstep(1.4, 1.75, p))
          break
      }
      if (A.t >= ACT_DUR[A.name]) A.name = null
    }
    if (reducedMotion) {
      hopY *= 0.35
      spin = 0
      wiggle *= 0.3
    }
    const air = clamp(hopY / 0.4, 0, 1)
    const inAir = hopY > 0.02
    if (S.wasAir && !inAir) S.squash = 1
    S.wasAir = inAir
    S.squash = damp(S.squash, 0, 7, dt)

    /* ── mode blend (ground ↔ hanging) ─────────────────── */
    const hangTarget = spiderCtl.mode === 'hang' ? 1 : 0
    if (S.snapSeen !== spiderCtl.snapId) {
      S.snapSeen = spiderCtl.snapId
      S.hangT = hangTarget
    }
    S.hangT = damp(S.hangT, hangTarget, 4, dt)
    const H = S.hangT

    S.excite = damp(S.excite, spiderCtl.excite, 6, dt)

    /* ── where am I on screen? ─────────────────────────── */
    rig.head.getWorldPosition(_head)
    _proj.copy(_head).project(cam)
    const sx = (_proj.x * 0.5 + 0.5) * width
    const sy = (-_proj.y * 0.5 + 0.5) * height
    const e = rig.root.matrixWorld.elements
    const worldScale = Math.hypot(e[0], e[1], e[2])
    const headDist = cam.position.distanceTo(_head)
    const pxPerUnit = height / (2 * headDist * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2))
    const pxR = 1.6 * worldScale * pxPerUnit
    spiderCtl.screen.x = sx
    spiderCtl.screen.y = sy + pxR * 0.1
    spiderCtl.screen.r = pxR

    const idle = pointerIdle()
    const active = pointer.engaged && (pointer.touch ? pointer.down || idle < 1.5 : idle < 4.5)
    const dPx = Math.hypot(pointer.px - sx, pointer.py - sy)
    S.prox = damp(S.prox, active ? 1 - smoothstep(pxR * 0.9, pxR * 3.2, dPx) : 0, 4, dt)

    const canHover = phase === 'landing' || phase === 'portfolio'
    const hov = canHover && !pointer.touch && dPx < pxR && active
    if (hov !== S.hovering) {
      S.hovering = hov
      document.documentElement.classList.toggle('spider-hover', hov)
    }

    /* ── sleepiness after a long idle ───────────────────── */
    const sleepTarget = idle > 20 && !A.name && spiderCtl.excite < 0.1 && !spiderCtl.waving ? 1 : 0
    if (S.sleepy > 0.5 && sleepTarget === 0) S.wake = 1
    S.sleepy = damp(S.sleepy, sleepTarget, sleepTarget ? 0.5 : 6, dt)
    S.wake = damp(S.wake, 0, 2.5, dt)

    /* ── gaze target in client px ───────────────────────── */
    let gx = sx
    let gy = sy
    const G = S.glance
    if (spiderCtl.look) {
      gx = spiderCtl.look.x
      gy = spiderCtl.look.y
    } else if (active) {
      gx = pointer.px
      gy = pointer.py
    } else {
      if (t > G.next) {
        G.next = t + rand(1.3, 3.4)
        const r = Math.random()
        if (r < 0.45) G.kind = 'viewer'
        else if (r < 0.8 && sceneRefs.moths.length && H < 0.5) {
          G.kind = 'moth'
          G.moth = Math.floor(Math.random() * sceneRefs.moths.length)
        } else {
          G.kind = 'point'
          G.x = rand(-1, 1) * pxR * 3
          G.y = rand(-0.8, 0.8) * pxR * 2
        }
      }
      if (G.kind === 'moth' && sceneRefs.moths[G.moth]) {
        const m = sceneRefs.moths[G.moth]
        _proj.set(m.x, m.y, m.z).project(cam)
        gx = (_proj.x * 0.5 + 0.5) * width
        gy = (-_proj.y * 0.5 + 0.5) * height
      } else if (G.kind === 'point') {
        gx = sx + G.x
        gy = sy + G.y
      }
      if (S.sleepy > 0.3) gy = lerp(gy, sy + pxR * 2.5, S.sleepy)
    }

    // project into the world on a point between camera and spider
    _dir.set((gx / width) * 2 - 1, -(gy / height) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize()
    _target.copy(cam.position).addScaledVector(_dir, headDist * lerp(0.6, 0.86, S.prox))
    // during the dive Bit stares straight into the lens — that's the doorway
    const diving = phase === 'entering'
    if (diving) _target.copy(cam.position)

    const eyeLambda = reducedMotion ? 8 : 18
    for (const eye of rig.eyes) {
      _local.copy(_target)
      eye.socket.worldToLocal(_local)
      const yaw = clamp(Math.atan2(_local.x, _local.z), -0.6, 0.6)
      const pitch = clamp(-Math.atan2(_local.y, Math.hypot(_local.x, _local.z)), -0.48, 0.48)
      eye.ball.rotation.y = damp(eye.ball.rotation.y, yaw, eyeLambda, dt)
      eye.ball.rotation.x = damp(eye.ball.rotation.x, pitch, eyeLambda, dt)
    }

    /* ── head / body follow ───────────────────────────── */
    _local.copy(_target)
    rig.content.worldToLocal(_local)
    const yawB = Math.atan2(_local.x, _local.z)
    const pitchB = -Math.atan2(_local.y - BODY_Y, Math.hypot(_local.x, _local.z))
    const body = rig.body
    body.rotation.y = damp(body.rotation.y, clamp(yawB * 0.55, -0.42, 0.42), 3.2 * motion + 0.6, dt)
    body.rotation.x = damp(body.rotation.x, clamp(pitchB * 0.4, -0.16, 0.2) + S.sleepy * 0.1, 3, dt)
    const T = S.tilt
    if (t > T.next) {
      T.next = t + rand(3, 7)
      T.target = Math.random() < 0.4 ? rand(-0.12, 0.12) : 0
    }
    const curiousTilt = 0.13 * S.prox * Math.sign(pointer.px - sx || 1)
    T.v = damp(T.v, T.target * motion + curiousTilt + S.sleepy * 0.12, 2.5, dt)
    body.rotation.z = T.v + wiggle + lean

    const breathe = Math.sin(t * 1.6) * 0.035 * motion
    const bounce = S.excite * Math.abs(Math.sin(t * 6.5)) * 0.12 * motion
    body.position.y = BODY_Y + breathe + bounce - S.sleepy * 0.08 - S.squash * 0.12
    body.scale.set(1 + 0.07 * S.squash, 1 - 0.1 * S.squash, 1 + 0.07 * S.squash)
    rig.abdomen.scale.setScalar(1 + Math.sin(t * 1.6 - 0.6) * 0.018 * motion)
    rig.abdomen.rotation.z = Math.sin(t * 0.9) * 0.03 * motion - body.rotation.z * 0.3

    rig.hop.position.y = hopY
    rig.hop.rotation.y = spin
    rig.shadow.visible = H < 0.98
    rig.shadow.scale.set(4.6 * (1 - hopY * 0.3), 1, 4.2 * (1 - hopY * 0.3))
    ;(rig.shadow.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - hopY * 0.5) * (1 - H)

    /* ── expressions ──────────────────────────────────── */
    const hoverJoy = S.hovering ? 0.55 : 0
    const joy = Math.max(happy, S.excite, hoverJoy)
    let top = lerp(LID.open, LID.wide, S.prox * 0.45)
    let bot = LIDB.open
    let pupil = 0.34 + S.prox * 0.08
    let smile = 0.6
    let mo = 0
    // happy squint only for brief joy (giggles, hover); excitement = big bright eyes
    bot = lerp(bot, LIDB.happy, Math.max(happy, hoverJoy) * (1 - S.excite))
    smile = lerp(smile, 1, joy)
    top = lerp(top, LID.wide, S.excite * 0.8)
    pupil = lerp(pupil, 0.5, S.excite)
    const sur = Math.max(surprise, S.wake)
    top = lerp(top, LID.wide, sur)
    pupil = lerp(pupil, 0.24, sur * 0.8)
    mo = Math.max(mo, sur)
    top = lerp(top, LID.sleepy, S.sleepy)
    pupil = lerp(pupil, 0.38, S.sleepy)

    const E = S.expr
    E.top = damp(E.top, top, 10, dt)
    E.bot = damp(E.bot, bot, 10, dt)
    E.pupil = damp(E.pupil, pupil, 6, dt)
    E.smile = damp(E.smile, smile, 8, dt)
    E.mouthO = damp(E.mouthO, mo, 12, dt)

    /* ── blinking ─────────────────────────────────────── */
    const B = S.blink
    B.next -= dt
    if (B.t < 0 && B.next <= 0) {
      B.t = 0
      B.next = S.sleepy > 0.5 ? rand(1.2, 2.4) : rand(2.2, 5.8)
      B.again = Math.random() < 0.2
    }
    let close = 0
    if (B.t >= 0) {
      B.t += dt
      const bt = B.t
      const openDur = 0.14 * (1 + S.sleepy * 3)
      if (bt < 0.07) close = bt / 0.07
      else if (bt < 0.11) close = 1
      else close = 1 - (bt - 0.11) / openDur
      if (bt > 0.11 && close <= 0) {
        close = 0
        B.t = -1
        if (B.again) {
          B.again = false
          B.next = 0.12
        }
      }
    }
    close = diving ? 0 : clamp(close, 0, 1)
    for (const eye of rig.eyes) {
      eye.lidTop.rotation.x = lerp(E.top, LID.closed, close)
      eye.lidBot.rotation.x = E.bot
      eye.highlights.visible = close < 0.55
      eye.iris.uniforms.uPupil.value = E.pupil
    }
    rig.smallEyes.forEach((m, i) => {
      const b = S.smallEyeBase[i] ?? 0.1
      m.scale.set(b, b * (1 - close * 0.85), b)
    })

    rig.smile.visible = E.mouthO < 0.92
    rig.smile.scale.set(0.85 + 0.35 * E.smile, (0.5 + 0.8 * E.smile) * (1 - E.mouthO), 1)
    const o = Math.max(0.0001, E.mouthO)
    rig.mouthO.scale.set(0.075 * o, 0.09 * o, 0.03 * o)
    rig.palps.forEach((p, i) => {
      p.rotation.x = Math.sin(t * (3 + joy * 11) + i * 1.7) * 0.18 * (0.25 + joy) * motion
      p.position.y = -0.68 + Math.sin(t * (3 + joy * 11) + i * 1.7) * 0.02 * joy
    })

    /* ── tuft secondary motion (damped spring) ──────────── */
    const tf = S.tuft
    const yawVel = (body.rotation.y - tf.prevYaw) / dt
    const yVel = (body.position.y + hopY - tf.prevY) / dt
    tf.prevYaw = body.rotation.y
    tf.prevY = body.position.y + hopY
    tf.v += (-tf.a * 60 - tf.v * 6 - yawVel * 2.2 - yVel * 1.2) * dt
    tf.a += tf.v * dt
    rig.tuft.rotation.z = clamp(tf.a, -0.5, 0.5)
    rig.tuft.rotation.x = clamp(-yVel * 0.05, -0.3, 0.3)

    /* ── hanging swing driven by scroll velocity ─────────── */
    const sw = S.swing
    const sv = clamp((window.scrollY - sw.lastScroll) / dt + spiderCtl.sway, -4000, 4000)
    sw.lastScroll = window.scrollY
    sw.v += (-sw.a * 10 - sw.v * 2.4 + sv * 0.0004 * motion) * dt
    sw.a += sw.v * dt
    rig.swing.rotation.z = (clamp(sw.a, -0.45, 0.45) + Math.sin(t * 0.7) * 0.035 * motion) * H
    rig.swing.rotation.x = Math.sin(t * 0.53) * 0.025 * H * motion
    rig.thread.visible = H > 0.01
    rig.thread.scale.y = Math.max(0.0001, 60 * H)

    /* ── legs ─────────────────────────────────────────── */
    S.waveW = damp(S.waveW, Math.max(waveAct, spiderCtl.waving ? 1 : 0), 6, dt)
    const W = S.waveW
    const TP = S.tap
    TP.next -= dt
    if (TP.leg < 0 && TP.next <= 0 && H < 0.5 && !reducedMotion) {
      TP.leg = Math.floor(Math.random() * rig.legs.length)
      TP.t = 0
      TP.next = rand(2.5, 6)
    }
    if (TP.leg >= 0) {
      TP.t += dt
      if (TP.t > 0.45) TP.leg = -1
    }

    body.updateMatrix()
    _inv.copy(body.matrix).invert()
    rig.legs.forEach((leg, i) => {
      const s = leg.side
      const sa = Math.sin(leg.angle)
      const ca = Math.cos(leg.angle)
      const fx = s * sa * leg.R
      const fz = ca * leg.R
      const fy = islandHeight(fx, fz)
      const hx = s * sa * leg.R * 0.62
      const hz = ca * leg.R * 0.55
      const hy = BODY_Y - 0.85 - leg.idx * 0.06 + Math.sin(t * 1.3 + leg.idx + s) * 0.07 * motion
      _foot.set(lerp(fx, hx, H), lerp(fy, hy, H), lerp(fz, hz, H))
      if (air > 0) {
        _foot.x *= 1 - 0.22 * air
        _foot.z *= 1 - 0.22 * air
        _foot.y += 0.45 * air
      }
      let lift = S.excite * Math.max(0, Math.sin(t * 11 + ((leg.idx + (s > 0 ? 0 : 1)) % 2) * Math.PI)) * 0.16
      if (TP.leg === i) lift += bump(TP.t / 0.45) * 0.22
      _foot.y += lift * (1 - H) * motion
      if (leg.idx === 0 && s === 1 && W > 0.001) {
        _wave.set(
          2.1 + Math.sin(t * 8) * 0.32 * motion,
          BODY_Y + 1.25 + Math.cos(t * 8) * 0.22 * motion,
          1.45,
        )
        _foot.lerp(_wave, W)
      }
      _foot.applyMatrix4(_inv)
      solveLeg(leg, _foot)
    })
  })

  return <primitive object={rig.root} />
}
