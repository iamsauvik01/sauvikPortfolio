import { useEffect, useRef } from 'react'
import { gsap, useGsap } from '../hooks/useGsap'
import { appStore } from '../lib/appStore'
import { spiderCtl, triggerSpider } from '../lib/spiderCtl'
import { enterPortfolio } from '../lib/transitions'
import { device } from '../lib/device'
import { content } from '../data/portfolio'
import { SvgSpider } from './SvgSpider'

const WORD_A = 'Discover'
const WORD_B = 'Sauvik'

/** HTML layer of the living world: composition anchor, CTA and hints. */
export function Landing() {
  const phase = appStore.use((s) => s.phase)
  const fallback = appStore.use((s) => s.fallback)
  const root = useRef<HTMLDivElement>(null)
  const cta = useRef<HTMLButtonElement>(null)
  const visible = phase === 'loading' || phase === 'landing' || phase === 'entering'
  const touch = device.coarse

  // entrance choreography every time we arrive at the landing world
  useGsap(
    () => {
      if (phase !== 'landing') return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      gsap.set(root.current, { opacity: 1, y: 0 })
      if (reduced) return
      const tl = gsap.timeline({ delay: 0.35 })
      tl.from('[data-l="top"]', { opacity: 0, y: -10, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, 0)
        .from('[data-l="eyebrow"]', { opacity: 0, y: 12, duration: 0.8, ease: 'power3.out' }, 0.4)
        .from('.cta-shell', { opacity: 0, scale: 0.92, duration: 1, ease: 'power3.out' }, 0.5)
        .from('.cta-letter', { yPercent: 110, opacity: 0, stagger: 0.035, duration: 0.9, ease: 'power4.out' }, 0.6)
        .from('[data-l="hint"]', { opacity: 0, y: 8, duration: 0.9, stagger: 0.12, ease: 'power2.out' }, 1.2)
    },
    [phase],
    root,
  )

  // Enter key starts the journey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || appStore.get().phase !== 'landing') return
      const t = e.target as HTMLElement
      if (t && t !== document.body && t.closest('button,a,input,textarea')) return
      enterPortfolio()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onEnter = () => {
    if (appStore.get().phase !== 'landing') return
    appStore.set({ ctaHover: true })
    spiderCtl.excite = 1
    const r = cta.current?.getBoundingClientRect()
    if (r) spiderCtl.look = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      gsap.fromTo('.cta-letter', { y: 0 }, { y: -4, duration: 0.22, stagger: 0.025, yoyo: true, repeat: 1, ease: 'sine.out', overwrite: true })
  }
  const onLeave = () => {
    appStore.set({ ctaHover: false })
    if (appStore.get().phase === 'landing') {
      spiderCtl.excite = 0
      spiderCtl.look = null
    }
    if (cta.current) gsap.to(cta.current, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
  }
  const onMove = (e: React.MouseEvent) => {
    const el = cta.current
    if (!el || touch) return
    const r = el.getBoundingClientRect()
    gsap.to(el, {
      x: (e.clientX - (r.left + r.width / 2)) * 0.18,
      y: (e.clientY - (r.top + r.height / 2)) * 0.3,
      duration: 0.5,
      ease: 'power3.out',
    })
  }

  if (!visible) return null

  return (
    <div id="landing-ui" ref={root} className="pointer-events-none fixed inset-0 z-20 select-none">
      <h1 className="sr-only">Discover Sauvik — the portfolio of {content.personal.name}, software engineer</h1>

      {/* the 3D stage fits itself into this box */}
      <div
        id="landing-anchor"
        className="absolute left-1/2 top-[15svh] h-[40svh] w-[118vw] -translate-x-1/2 sm:w-[92vw] md:top-[7svh] md:h-[43svh] md:w-[min(78vw,900px)]"
      >
        {fallback && (
          <div className="flex h-full w-full items-end justify-center">
            <SvgSpider size={Math.min(420, window.innerWidth * 0.7)} title={`${content.mascot}, the spider`} />
          </div>
        )}
      </div>

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5 md:px-10 md:pt-8">
        <div data-l="top">
          <p className="font-display text-lg leading-none text-bone md:text-xl">{content.personal.name}</p>
          <p className="eyebrow mt-2 !text-[0.62rem]">{content.personal.roles[0]}</p>
        </div>
        <div data-l="top" className="pointer-events-auto flex flex-col items-end gap-2 text-right">
          <p className="eyebrow hidden !text-[0.62rem] sm:block">A little world of its own</p>
          <button
            type="button"
            onClick={() => enterPortfolio()}
            className="link-underline font-sans text-xs text-mist transition-colors hover:text-bone"
          >
            Skip the intro
          </button>
        </div>
      </div>

      {/* call to action */}
      <div className="absolute inset-x-0 bottom-[8svh] flex flex-col items-center px-5 md:bottom-[9svh]">
        <p data-l="eyebrow" className="eyebrow mb-4 md:mb-5">
          Step inside
        </p>
        <div className="cta-shell pointer-events-auto">
          <button
            ref={cta}
            type="button"
            className="cta group flex items-center gap-3 px-6 py-3.5 md:gap-5 md:px-9 md:py-4"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onMouseMove={onMove}
            onFocus={onEnter}
            onBlur={onLeave}
            onClick={() => enterPortfolio()}
            aria-label="Discover Sauvik — enter the portfolio"
          >
            <span aria-hidden className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-peach/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-peach" />
            </span>
            <span aria-hidden className="flex items-baseline gap-3 overflow-hidden py-1 md:gap-4">
              <span className="flex font-sans text-[0.8rem] font-semibold uppercase tracking-[0.34em] text-bone/85 md:text-[0.95rem]">
                {WORD_A.split('').map((c, i) => (
                  <span key={i} className="cta-letter inline-block">
                    {c}
                  </span>
                ))}
              </span>
              <span className="wonk flex font-display text-[1.9rem] italic uppercase leading-none tracking-[0.04em] text-peach md:text-[2.6rem]">
                {WORD_B.split('').map((c, i) => (
                  <span key={i} className="cta-letter inline-block">
                    {c}
                  </span>
                ))}
              </span>
            </span>
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-bone/70 transition-transform duration-500 group-hover:translate-x-1 md:h-5 md:w-5">
              <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p data-l="hint" className="mt-5 max-w-[34ch] text-center text-[0.8rem] leading-relaxed text-mist md:mt-6">
          {touch ? `Drag to look around — tap ${content.mascot} to say hello.` : `${content.mascot} is watching your cursor. Click ${content.mascot} to say hello.`}
        </p>
      </div>

      {/* corner details */}
      <div className="absolute bottom-6 left-10 hidden lg:block" data-l="hint">
        <p className="eyebrow !text-[0.6rem]">{content.personal.roles.slice(1).join(' · ')}</p>
      </div>
      <div className="absolute bottom-6 right-10 hidden items-center gap-2 lg:flex" data-l="hint">
        <span className="eyebrow !text-[0.6rem]">Press</span>
        <kbd className="rounded-md border border-bone/20 px-1.5 py-0.5 font-mono text-[0.62rem] text-bone/70">Enter</kbd>
      </div>
      <button type="button" className="sr-only pointer-events-auto" onClick={() => triggerSpider('poke')}>
        Say hello to {content.mascot}
      </button>
    </div>
  )
}
