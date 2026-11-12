import { gsap } from '../hooks/useGsap'
import { appStore } from './appStore'
import { camState, setSpiderAnchor, spiderCtl, triggerSpider } from './spiderCtl'
import { islandStore } from '../island/store'
import { device } from './device'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

let active: gsap.core.Timeline | null = null

function iris() {
  return document.getElementById('iris')
}

function toPortfolio() {
  camState.dive = 0
  camState.scatter = 0
  camState.pulse = 0
  spiderCtl.excite = 0
  spiderCtl.look = null
  // Bit comes along as a guide, dangling at the edge of the island view
  setSpiderAnchor('guide-anchor', 'hang', { snap: true, island: false })
  appStore.set({ phase: 'portfolio', activeSection: 'intro' })
}

/**
 * If the island is still warming up (slow device, or a very quick tap), keep the eye shut a
 * moment longer instead of opening onto a stuttering first frame. Never longer than 10 s.
 */
function holdForIsland(tl: gsap.core.Timeline) {
  const s = islandStore.get()
  if (s.ready || s.flat || appStore.get().fallback || !device.webgl) return
  tl.pause()
  let done = false
  const go = () => {
    if (done) return
    done = true
    un()
    clearTimeout(timer)
    tl.resume()
  }
  const un = islandStore.subscribe(() => {
    const st = islandStore.get()
    if (st.ready || st.flat) go()
  })
  const timer = setTimeout(go, 10000)
}

/**
 * DISCOVER SAUVIK → the camera dives into Bit's eye; the pupil fills the
 * screen, then an iris opens onto the portfolio world.
 */
export function enterPortfolio() {
  const { phase, fallback } = appStore.get()
  if (phase !== 'landing') return
  const el = iris()
  if (!el) return
  active?.kill()
  appStore.set({ phase: 'entering', ctaHover: false })
  spiderCtl.excite = 0.8
  // look straight at the visitor
  spiderCtl.look = { x: spiderCtl.screen.x, y: spiderCtl.screen.y }
  triggerSpider('enter')
  const ui = document.getElementById('landing-ui')

  const tl = gsap.timeline({ onComplete: () => (active = null) })
  active = tl
  if (reduced() || fallback) {
    tl.set(el, { visibility: 'visible', opacity: 0, '--r': '0%' })
      .to(ui, { opacity: 0, duration: 0.35 }, 0)
      .to(el, { opacity: 1, duration: 0.45 }, 0.1)
      .add(toPortfolio)
      .add(() => holdForIsland(tl))
      .to(el, { opacity: 0, duration: 0.6 }, '+=0.2')
      .set(el, { visibility: 'hidden' })
    return
  }

  tl.set(el, { visibility: 'visible', opacity: 0, '--r': '0%' })
    .to(camState, { pulse: 1, duration: 0.3, ease: 'power2.out' }, 0)
    .to(camState, { pulse: 0, duration: 1.4, ease: 'power2.inOut' }, 0.3)
    .to(camState, { scatter: 1, duration: 0.9, ease: 'power2.out' }, 0.15)
    .to(ui, { opacity: 0, y: 24, duration: 0.55, ease: 'power2.in' }, 0)
    .to(camState, { dive: 1, duration: 1.6, ease: 'power3.inOut' }, 0.55)
    .to(el, { opacity: 1, duration: 0.32, ease: 'none' }, 1.85)
    .add(toPortfolio, 2.2)
    .add(() => holdForIsland(tl), 2.25)
    .to(el, { '--r': '135%', duration: 1.5, ease: 'power2.inOut' }, 2.3)
    .set(el, { visibility: 'hidden', opacity: 0 })
    .add(() => triggerSpider('hello'))
}

/** The iris closes on the portfolio and re-opens on the living world. */
export function returnToLanding() {
  const { phase } = appStore.get()
  if (phase !== 'portfolio') return
  const el = iris()
  if (!el) return
  active?.kill()
  appStore.set({ phase: 'leaving' })
  const r = reduced()
  const tl = gsap.timeline({ onComplete: () => (active = null) })
  active = tl
  tl.set(el, { visibility: 'visible', opacity: r ? 0 : 1, '--r': r ? '0%' : '135%' })
  if (r) tl.to(el, { opacity: 1, duration: 0.4 })
  else tl.to(el, { '--r': '0%', duration: 1.1, ease: 'power2.inOut' })
  tl.add(() => {
    window.scrollTo(0, 0)
    spiderCtl.waving = false
    setSpiderAnchor('landing-anchor', 'ground', { snap: true, island: true })
    camState.reveal = 0.25
    appStore.set({ phase: 'landing', activeSection: 'intro' })
  })
    .to(el, { opacity: 0, duration: 0.8 }, '+=0.15')
    .to(camState, { reveal: 1, duration: 1.4, ease: 'power2.out' }, '<')
    .set(el, { visibility: 'hidden' })
    .add(() => triggerSpider('hello'))
}

