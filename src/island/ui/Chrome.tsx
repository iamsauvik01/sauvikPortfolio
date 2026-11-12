import { useEffect, useRef } from 'react'
import { BookOpen, LogOut, Map as MapIcon } from 'lucide-react'
import { gsap, useMediaQuery } from '../../hooks/useGsap'
import { appStore } from '../../lib/appStore'
import { returnToLanding } from '../../lib/transitions'
import { content } from '../../data/portfolio'
import { SvgSpider } from '../../components/SvgSpider'
import { ORDER, islandStore, overview, visit } from '../store'
import { Arrow, PlaceIcon } from './icons'

const isl = content.island

/* ── top bar ───────────────────────────────────────────────────── */
export function Hud() {
  const focus = islandStore.use((s) => s.focus)
  const intro = islandStore.use((s) => s.intro)
  const phase = appStore.use((s) => s.phase)
  const ref = useRef<HTMLDivElement>(null)

  // slide in every time we arrive on the island
  useEffect(() => {
    if (phase !== 'portfolio' || !ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tw = gsap.fromTo(ref.current.children, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, delay: 1.2, ease: 'power3.out' })
    return () => {
      tw.kill()
      if (ref.current) gsap.set(ref.current.children, { clearProps: 'all' })
    }
  }, [phase])

  return (
    <div ref={ref} className="hud">
      <button type="button" className="brand" onClick={() => overview()} aria-label="Sauvik Island — show the whole island">
        <SvgSpider size={34} />
        <span className="flex flex-col items-start gap-1">
          <span className="brand-name">{content.personal.name}</span>
          <span className="brand-where">{focus ? `now at: ${isl[focus].name}` : intro ? 'just landed' : 'exploring the island'}</span>
        </span>
      </button>
      <div className="flex items-center gap-2">
        {focus && (
          <button type="button" className="chipbtn" onClick={() => overview()}>
            <MapIcon size={16} aria-hidden /> <span className="hidden sm:inline">Whole island</span>
          </button>
        )}
        <button type="button" className="chipbtn" onClick={() => islandStore.set({ logbook: true })} aria-haspopup="dialog">
          <BookOpen size={16} aria-hidden /> <span className="hidden sm:inline">The quick read</span>
        </button>
        <button type="button" className="chipbtn chipbtn--icon" onClick={() => returnToLanding()} aria-label={`Leave the island — back to ${content.mascot}'s world`} title={`Back to ${content.mascot}'s world`}>
          <LogOut size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/* ── the six stops ─────────────────────────────────────────────── */
export function Dock() {
  const focus = islandStore.use((s) => s.focus)
  const visited = islandStore.use((s) => s.visited)
  const intro = islandStore.use((s) => s.intro)
  const wide = useMediaQuery('(min-width: 900px)')
  const hidden = intro || (!wide && focus !== null)
  // keep the dock centred in the space left of the story panel
  const left = focus && wide ? `calc((100vw - min(520px, 40vw) - 28px) / 2)` : '50%'
  return (
    <nav
      className="dock"
      aria-label="Places on the island"
      style={{ left, opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto', transform: `translateX(-50%) translateY(${hidden ? 30 : 0}px)` }}
      aria-hidden={hidden}
    >
      {ORDER.map((id, i) => {
        const loc = isl[id]
        return (
          <button
            key={id}
            type="button"
            className="dock-stop"
            style={{ '--accent': loc.accent } as React.CSSProperties}
            aria-current={focus === id ? 'true' : undefined}
            aria-label={`${i + 1}. ${loc.name} — ${loc.purpose}${visited.includes(id) ? ' (visited)' : ''}`}
            onClick={() => visit(id)}
            tabIndex={hidden ? -1 : 0}
          >
            <PlaceIcon id={id} />
            {visited.includes(id) && focus !== id && (
              <span className="dock-seen" aria-hidden>
                ✓
              </span>
            )}
            <span className="dock-tip" aria-hidden>
              {loc.name} <span style={{ color: 'var(--ink-faint)' }}>· {loc.purpose}</span>
            </span>
          </button>
        )
      })}
      <span className="dock-progress" aria-live="polite">
        {visited.length === ORDER.length ? 'island complete!' : `${visited.length} of ${ORDER.length} explored`}
      </span>
    </nav>
  )
}

/* ── arrival card ──────────────────────────────────────────────── */
export function Arrival() {
  const intro = islandStore.use((s) => s.intro)
  const phase = appStore.use((s) => s.phase)
  const ref = useRef<HTMLDivElement>(null)
  const show = intro && phase === 'portfolio'
  const a = isl.arrival

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (show) {
      gsap.set(el, { autoAlpha: 1 })
      if (reduced) return
      // explicit fromTo so a re-run (StrictMode, fast re-entry) can never strand things invisible
      const items = el.querySelectorAll('[data-a]')
      const words = el.querySelectorAll('.arrival-title span')
      const tl = gsap.timeline({ delay: 1.6 })
      tl.fromTo(items, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.12, ease: 'power4.out' })
        .fromTo(words, { yPercent: 110, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.05, ease: 'power4.out' }, 0.1)
      return () => {
        tl.kill()
        gsap.set([...items, ...words], { clearProps: 'all' })
      }
    }
    gsap.to(el, { autoAlpha: 0, duration: 0.5, ease: 'power2.in' })
  }, [show])

  const [w1, w2] = a.title.split(' ')
  return (
    <div ref={ref} className="arrival" style={{ visibility: 'hidden' }} aria-hidden={!show}>
      <div className="arrival-inner">
        <p data-a className="t-hand text-[clamp(1.5rem,3vw,2.2rem)] text-[#ffcf9f]">
          {a.kicker}
        </p>
        <h1 className="arrival-title t-display mt-1 overflow-hidden pb-[0.06em]">
          <span className="inline-block">{w1}</span> <span className="inline-block text-[#ffcf9f]">{w2}</span>
        </h1>
        <p data-a className="mt-4 max-w-[46ch] text-[clamp(1rem,1.4vw,1.15rem)] leading-relaxed text-[#fff5e8]/90">
          {a.population}
        </p>
        <p data-a className="mt-2 max-w-[46ch] text-[0.98rem] text-[#fff5e8]/75">
          {a.hint}
        </p>
        <div data-a className="mt-7 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-main !bg-[#fbf4e8] !text-[#241c36]" onClick={() => visit('hut')} tabIndex={show ? 0 : -1}>
            {a.start} <Arrow />
          </button>
          <button type="button" className="btn-ghost" onClick={() => islandStore.set({ intro: false })} tabIndex={show ? 0 : -1}>
            {a.explore}
          </button>
        </div>
      </div>
    </div>
  )
}
