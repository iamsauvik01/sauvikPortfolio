import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { gsap, useMediaQuery } from '../../hooks/useGsap'
import { appStore } from '../../lib/appStore'
import { device } from '../../lib/device'
import { content } from '../../data/portfolio'
import { SvgSpider } from '../../components/SvgSpider'
import { ORDER, islandStore, nextOf, overview, visit } from '../store'
import type { LocationId } from '../../types/content'
import { Arrow, PlaceIcon } from './icons'
import { CastleStory, CoveStory, HutStory, LabStory, LighthouseStory, WorkshopStory } from './Stories'

const STORY: Record<LocationId, () => React.JSX.Element> = {
  hut: HutStory,
  workshop: WorkshopStory,
  castle: CastleStory,
  lab: LabStory,
  cove: CoveStory,
  lighthouse: LighthouseStory,
}

/** The paper card that tells each place's story. */
export function StoryPanel() {
  const focus = islandStore.use((s) => s.focus)
  const sub = islandStore.use((s) => s.sub)
  const fallback = appStore.use((s) => s.fallback)
  const flat = islandStore.use((s) => s.flat)
  const wide = useMediaQuery('(min-width: 900px)')
  const [shown, setShown] = useState<LocationId | null>(focus)
  const root = useRef<HTMLElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const open = focus !== null

  // enter / leave
  useLayoutEffect(() => {
    const el = root.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (open) {
      setShown(focus)
      if (!el) return
      gsap.killTweensOf(el)
      gsap.set(el, { visibility: 'visible' })
      if (reduced) gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 0.25 })
      else
        gsap.fromTo(
          el,
          wide ? { x: 60, opacity: 0, rotate: 1.2 } : { y: '100%', opacity: 1 },
          { x: 0, y: 0, opacity: 1, rotate: 0, duration: 0.9, delay: 0.25, ease: 'power4.out', overwrite: true },
        )
    } else if (el) {
      gsap.to(el, {
        ...(wide ? { x: 60, opacity: 0 } : { y: '100%' }),
        duration: reduced ? 0.2 : 0.5,
        ease: 'power3.in',
        overwrite: true,
        onComplete: () => {
          gsap.set(el, { visibility: 'hidden' })
          setShown(null)
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // switching places while open: swap the content with a little shuffle
  useEffect(() => {
    if (!open || !focus) return
    setShown(focus)
  }, [focus, open])

  // stagger the content in whenever the story (or selected object) changes
  useLayoutEffect(() => {
    const sc = scroller.current
    if (!sc || !shown) return
    sc.scrollTop = 0
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = sc.querySelectorAll('[data-in]')
    const tw = gsap.fromTo(items, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, delay: 0.15, ease: 'power3.out' })
    return () => {
      tw.kill()
      gsap.set(items, { clearProps: 'all' })
    }
  }, [shown, shown === 'lab' ? sub : null])

  const id = shown
  const loc = id ? content.island[id] : null
  const n = id ? ORDER.indexOf(id) + 1 : 0
  const next = id ? nextOf(id) : null
  const prev = id && n > 1 ? ORDER[n - 2] : null
  const Story = id ? STORY[id] : null
  const bitInside = device.mobile || fallback || flat || !wide

  return (
    <aside
      ref={root}
      className="panel"
      style={{ visibility: 'hidden', '--accent': loc?.accent } as React.CSSProperties}
      aria-label={loc ? `${loc.name} — ${loc.purpose}` : undefined}
      aria-hidden={!open}
      inert={!open}
    >
      {loc && id && Story && (
        <>
          <header className="panel-top">
            <span className="stamp">
              <span className="stamp-num">{String(n).padStart(2, '0')}</span>
              <span className="flex flex-col">
                <span className="t-kicker text-[var(--accent)]">{loc.purpose}</span>
                <span className="t-title text-[1.05rem]">{loc.name}</span>
              </span>
            </span>
            <button type="button" className="close-x" onClick={() => overview()} aria-label="Close and see the whole island">
              <X size={18} aria-hidden />
            </button>
          </header>

          <div ref={scroller} className="panel-scroll" key={id}>
            {bitInside && (
              <div data-in className="mb-5 flex items-start gap-3">
                <SvgSpider size={46} />
                <p className="bit-bubble !max-w-none flex-1 !shadow-none" style={{ background: 'var(--paper-2)' }}>
                  <b>{content.mascot}</b>
                  {loc.bit}
                </p>
              </div>
            )}
            <Story />
          </div>

          <footer className="panel-foot">
            {prev ? (
              <button type="button" className="prev" onClick={() => visit(prev)}>
                <Arrow dir="left" size={16} /> {content.island[prev].name}
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button type="button" className="next" onClick={() => visit(next)} style={{ '--accent': content.island[next].accent } as React.CSSProperties}>
                <PlaceIcon id={next} size={18} />
                <span>
                  Next: <span className="opacity-80">{content.island[next].name.replace('The ', '')}</span>
                </span>
                <Arrow size={16} />
              </button>
            ) : (
              <button type="button" className="next" onClick={() => overview()}>
                See the whole island <Arrow size={16} />
              </button>
            )}
          </footer>
        </>
      )}
    </aside>
  )
}
