import { lazy, Suspense, useEffect, useState } from 'react'
import { gsap } from '../hooks/useGsap'
import { appStore } from '../lib/appStore'
import { device } from '../lib/device'
import { spiderCtl } from '../lib/spiderCtl'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ORDER, islandStore, overview, resetIsland, selectSub, step, visit, world } from './store'
import { Arrival, Dock, Hud } from './ui/Chrome'
import { StoryPanel } from './ui/Panel'
import { Logbook } from './ui/Logbook'
import { FlatIsland } from './ui/FlatIsland'
import { loadGround } from './scene/groundSource'
import { PinLayer } from './ui/PinLayer'
import './island.css'

const IslandCanvas = lazy(() => import('./scene/IslandCanvas'))

/** The story card's paper grain: a 140px noise tile, drawn once (cheap to paint, unlike an SVG filter). */
function paintPaperGrain() {
  if (typeof document === 'undefined' || document.documentElement.style.getPropertyValue('--paper-grain')) return
  const c = document.createElement('canvas')
  c.width = c.height = 140
  const g = c.getContext('2d')
  if (!g) return
  const img = g.createImageData(140, 140)
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 115
    img.data[i + 1] = 89
    img.data[i + 2] = 64
    img.data[i + 3] = Math.random() * 36
  }
  g.putImageData(img, 0, 0)
  document.documentElement.style.setProperty('--paper-grain', `url(${c.toDataURL('image/png')})`)
}
paintPaperGrain()

/** Keyboard: ←/→ between places, 1–6 to jump, Esc to step back out. */
function useKeys(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('input,textarea,select,[contenteditable]')) return
      const s = islandStore.get()
      if (s.logbook) return
      if (e.key === 'Escape') {
        if (s.sub) selectSub(null)
        else if (s.focus) overview()
        return
      }
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (/^[1-6]$/.test(e.key)) visit(ORDER[Number(e.key) - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

/** The lighthouse brings the night in; everywhere else it's golden hour. */
function useTimeOfDay() {
  useEffect(() => {
    let last: string | null = null
    return islandStore.subscribe(() => {
      const { focus } = islandStore.get()
      const want = focus === 'lighthouse' ? 'night' : 'day'
      if (want === last) return
      last = want
      gsap.to(world, { night: want === 'night' ? 1 : 0, duration: 2.8, ease: 'power2.inOut', overwrite: true })
    })
  }, [])
}

/** Bit swings on its thread while the camera travels. */
function useBitSway(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let dir = 1
    const tick = () => {
      spiderCtl.sway = world.travel * 2200 * dir
    }
    const un = islandStore.subscribe(() => {
      dir = -dir
    })
    gsap.ticker.add(tick)
    return () => {
      un()
      gsap.ticker.remove(tick)
      spiderCtl.sway = 0
    }
  }, [enabled])
}

export function IslandExperience({ visible }: { visible: boolean }) {
  const phase = appStore.use((s) => s.phase)
  const fallback = appStore.use((s) => s.fallback)
  const flat = islandStore.use((s) => s.flat)
  const logbook = islandStore.use((s) => s.logbook)
  const live = phase === 'portfolio' || phase === 'leaving'
  const use3D = device.webgl && !fallback && !flat

  // start building the ground in a worker right away (no main-thread cost)
  useEffect(() => {
    if (device.webgl) loadGround(device.tier)
  }, [])

  // painted signs on the island need the display font before they're drawn
  const [fonts, setFonts] = useState(false)
  useEffect(() => {
    const done = () => setFonts(true)
    Promise.all([
      document.fonts.load('800 40px "Bricolage Grotesque Variable"'),
      document.fonts.load('400 16px "Figtree Variable"'),
      document.fonts.load('600 20px "Caveat Variable"'),
    ]).then(done, done)
    const t = setTimeout(done, 3000)
    return () => clearTimeout(t)
  }, [])

  // the logbook is the heaviest bit of UI: build it the first time someone opens it
  const [logbookMounted, setLogbookMounted] = useState(false)
  useEffect(() => {
    if (logbook) setLogbookMounted(true)
  }, [logbook])

  useKeys(phase === 'portfolio')
  useTimeOfDay()
  useBitSway(live && use3D)

  // fresh island every time you come back from Bit's world
  useEffect(() => {
    if (phase === 'landing') resetIsland()
  }, [phase])

  return (
    <div className="island-root" style={{ visibility: visible ? 'visible' : 'hidden' }} aria-hidden={!visible} inert={!visible}>
      <div className="island-stage">
        {use3D ? (
          <ErrorBoundary onError={() => islandStore.set({ flat: true })}>
            <Suspense fallback={null}>{fonts && <IslandCanvas profile={device} active={live && !logbook} />}</Suspense>
          </ErrorBoundary>
        ) : (
          <FlatIsland />
        )}
      </div>
      {/* Bit dangles here while guiding (desktop) */}
      <div id="guide-anchor" aria-hidden className="pointer-events-none fixed left-[clamp(230px,17vw,320px)] top-[64px] hidden h-[150px] w-[120px] lg:block" />
      {/* mounted (hidden) while the visitor is still on the landing page, so the dive only reveals it */}
      {use3D && <PinLayer />}
      <Hud />
      <Arrival />
      <Dock />
      <StoryPanel />
      {logbookMounted && <Logbook />}
    </div>
  )
}
