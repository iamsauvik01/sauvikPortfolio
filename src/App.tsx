import { lazy, Suspense, useEffect, useState } from 'react'
import { appStore } from './lib/appStore'
import { initPointer } from './lib/pointer'
import { device } from './lib/device'
import { spiderCtl, triggerSpider } from './lib/spiderCtl'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Loader } from './components/Loader'
import { Landing } from './components/Landing'
import { GuideBubble } from './components/GuideBubble'
import { IslandExperience } from './island/IslandExperience'

// The 3D world is the heaviest chunk — load it in parallel with the loader.
const World = lazy(() => import('./scene/World'))

export default function App() {
  const phase = appStore.use((s) => s.phase)
  const fallback = appStore.use((s) => s.fallback)
  const [mountPortfolio, setMountPortfolio] = useState(false)

  useEffect(() => initPointer(), [])
  useEffect(() => {
    if (!device.webgl) appStore.set({ fallback: true })
  }, [])

  // the page never scrolls: the landing is a scene and the portfolio is an island
  useEffect(() => {
    document.documentElement.classList.add('locked')
  }, [])

  // build the island quietly in the background once the landing has settled
  useEffect(() => {
    if (mountPortfolio || phase === 'loading') return
    const id = setTimeout(() => setMountPortfolio(true), 1800)
    return () => clearTimeout(id)
  }, [phase, mountPortfolio])

  // poking Bit (works on the landing and while Bit guides the portfolio)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const { phase: ph, fallback: fb } = appStore.get()
      if (fb || (ph !== 'landing' && ph !== 'portfolio')) return
      if (device.mobile && ph === 'portfolio') return
      if ((e.target as Element | null)?.closest?.('a,button,input,textarea,select,[role="button"]')) return
      const s = spiderCtl.screen
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < s.r) triggerSpider('poke')
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  const showPortfolio = phase === 'portfolio' || phase === 'leaving'

  return (
    <>
      {!fallback && (
        <ErrorBoundary onError={() => appStore.set({ fallback: true })}>
          <Suspense fallback={null}>
            <World profile={device} />
          </Suspense>
        </ErrorBoundary>
      )}
      {fallback && !showPortfolio && <div className="landing-css-bg" aria-hidden />}
      {(mountPortfolio || showPortfolio || phase === 'entering') && <IslandExperience visible={showPortfolio} />}
      <Landing />
      <GuideBubble />
      <div id="iris" className="iris" aria-hidden />
      <Loader />
    </>
  )
}
