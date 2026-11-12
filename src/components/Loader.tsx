import { useEffect, useRef, useState } from 'react'
import { gsap } from '../hooks/useGsap'
import { appStore } from '../lib/appStore'
import { camState } from '../lib/spiderCtl'
import { SvgSpider } from './SvgSpider'

/**
 * Bit lowers itself on a thread while the world spins up:
 * fonts, the 3D chunk and the first compiled frames.
 */
export function Loader() {
  const phase = appStore.use((s) => s.phase)
  const sceneReady = appStore.use((s) => s.sceneReady)
  const fallback = appStore.use((s) => s.fallback)
  const [fonts, setFonts] = useState(false)
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const spiderRef = useRef<HTMLDivElement>(null)
  const prog = useRef({ v: 0 })
  const started = useRef(performance.now())

  useEffect(() => {
    let alive = true
    const done = () => alive && setFonts(true)
    document.fonts?.ready.then(done).catch(done)
    const t = setTimeout(done, 2500)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [])

  // creeping progress toward the next milestone
  useEffect(() => {
    const target = sceneReady || fallback ? 100 : fonts ? 82 : 46
    const tw = gsap.to(prog.current, {
      v: target,
      duration: target === 100 ? 0.6 : 3.2,
      ease: target === 100 ? 'power2.out' : 'power1.out',
      onUpdate: () => {
        const v = prog.current.v
        if (pctRef.current) pctRef.current.textContent = String(Math.round(v)).padStart(2, '0')
        if (spiderRef.current) spiderRef.current.style.transform = `translate3d(0, ${(-1 + v / 100) * 30}vh, 0)`
      },
    })
    return () => {
      tw.kill()
    }
  }, [sceneReady, fallback, fonts])

  // leave once everything is ready (and the loader has been seen briefly)
  useEffect(() => {
    if (phase !== 'loading' || !fonts || !(sceneReady || fallback)) return
    const wait = Math.max(0, 1100 - (performance.now() - started.current))
    const id = setTimeout(() => {
      const tl = gsap.timeline({ onComplete: () => setGone(true) })
      tl.to(root.current, { opacity: 0, duration: 0.9, ease: 'power2.inOut', delay: 0.5 })
        .add(() => appStore.set({ phase: 'landing' }), 0.6)
        .to(camState, { reveal: 1, duration: 2, ease: 'power2.out' }, 0.6)
    }, wait)
    return () => clearTimeout(id)
  }, [phase, fonts, sceneReady, fallback])

  // safety net: never trap the visitor behind the loader
  useEffect(() => {
    const id = setTimeout(() => {
      if (appStore.get().phase === 'loading') appStore.set({ sceneReady: true })
    }, 15000)
    return () => clearTimeout(id)
  }, [])

  if (gone) return null
  return (
    <div
      ref={root}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-ink"
      role="status"
      aria-live="polite"
      aria-label="Loading the little world"
    >
      <div ref={spiderRef} className="flex flex-col items-center" style={{ transform: 'translate3d(0,-30vh,0)' }}>
        <SvgSpider size={92} thread track={false} look={{ x: 0, y: 0.6 }} />
      </div>
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <span className="eyebrow">Spinning the web</span>
        <span className="font-display text-5xl tabular-nums text-bone/90">
          <span ref={pctRef}>00</span>
          <span className="text-2xl text-mist">%</span>
        </span>
      </div>
      <p className="absolute bottom-8 font-display text-sm italic text-mist">Discover Sauvik — a little world of its own</p>
    </div>
  )
}
