import { useEffect, useRef } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { gsap } from '../../hooks/useGsap'
import { content } from '../../data/portfolio'
import { islandStore, visit } from '../store'
import type { LocationId } from '../../types/content'
import { PlaceIcon } from './icons'

const isl = content.island

function Section({ id, n, children }: { id: LocationId; n: number; children: React.ReactNode }) {
  const loc = isl[id]
  return (
    <section className="py-10 md:py-14" style={{ '--accent': loc.accent } as React.CSSProperties} aria-labelledby={`lb-${id}`}>
      <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-10">
        <div>
          <p className="t-kicker flex items-center gap-2 text-[var(--accent)]">
            <PlaceIcon id={id} size={16} /> {String(n).padStart(2, '0')} · {loc.purpose}
          </p>
          <h2 id={`lb-${id}`} className="t-title mt-2 text-[1.5rem]">
            {loc.name}
          </h2>
          <button
            type="button"
            className="t-hand mt-2 text-[1.15rem] text-[var(--accent)] hover:underline"
            onClick={() => {
              islandStore.set({ logbook: false })
              visit(id)
            }}
          >
            visit it on the island →
          </button>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}

/** Everything on one page — for visitors in a hurry (and for screen readers). */
export function Logbook() {
  const open = islandStore.use((s) => s.logbook)
  const ref = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (open) {
      gsap.set(el, { visibility: 'visible' })
      el.scrollTop = 0
      gsap.fromTo(el, { clipPath: 'inset(100% 0 0 0 round 30px)' }, { clipPath: 'inset(0% 0 0 0 round 0px)', duration: reduced ? 0.01 : 0.8, ease: 'power4.inOut' })
      closeBtn.current?.focus({ preventScroll: true })
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && islandStore.set({ logbook: false })
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    gsap.to(el, {
      clipPath: 'inset(100% 0 0 0 round 30px)',
      duration: reduced ? 0.01 : 0.6,
      ease: 'power3.inOut',
      onComplete: () => void gsap.set(el, { visibility: 'hidden' }),
    })
  }, [open])

  const { hut, workshop, castle, lab, cove, lighthouse } = isl
  const { contact } = content

  return (
    <div ref={ref} className="logbook" role="dialog" aria-modal="true" aria-label="The quick read" style={{ visibility: 'hidden' }} inert={!open}>
      <div className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 md:px-10">
          <p className="t-kicker text-[var(--ink-faint)]">The quick read · {content.personal.name}</p>
          <button ref={closeBtn} type="button" className="close-x" onClick={() => islandStore.set({ logbook: false })} aria-label="Close the quick read">
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-5 pb-24 md:px-10">
        <header className="pb-6 pt-12 md:pt-16">
          <p className="note">In a hurry? Fair enough.</p>
          <h1 className="t-display mt-2 text-[clamp(2.8rem,7vw,5.6rem)]">
            The whole island, <span className="t-display-soft">on one page.</span>
          </h1>
          <p className="t-body mt-4 max-w-[60ch]">
            {content.personal.name} · {content.personal.roles.join(' · ')}.{' '}
            <a className="font-semibold text-[var(--ink-i)] underline decoration-2 underline-offset-4" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          </p>
        </header>

        <Section id="hut" n={1}>
          <p className="t-title text-[1.6rem]">{hut.headline}</p>
          {hut.paragraphs.map((p) => (
            <p key={p} className="t-body mt-3">
              {p}
            </p>
          ))}
          <dl className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {hut.facts.map((f) => (
              <div key={f.label}>
                <dt className="t-kicker text-[var(--ink-faint)]">{f.label}</dt>
                <dd className="font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="workshop" n={2}>
          <p className="t-title text-[1.6rem]">{workshop.headline}</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {workshop.stations.map((s) => (
              <div key={s.id}>
                <p className="t-kicker text-[var(--accent)]">{s.tag}</p>
                <p className="mt-1 text-[0.98rem] leading-relaxed">
                  {s.parts.map((p) => p.name).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="castle" n={3}>
          <ol className="grid gap-6">
            {[...castle.chapters].reverse().map((c) => (
              <li key={c.id}>
                <p className="t-kicker text-[var(--ink-faint)]">{c.when}</p>
                <p className="t-title mt-1 text-[1.3rem]">
                  {c.role} — {c.place}
                </p>
                <ul className="ticks mt-2">
                  {c.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                {c.stack.length > 0 && <p className="mt-2 text-[0.88rem] text-[var(--ink-faint)]">{c.stack.join(' · ')}</p>}
              </li>
            ))}
          </ol>
        </Section>

        <Section id="lab" n={4}>
          <div className="grid gap-7">
            {lab.projects.map((p) => (
              <article key={p.id}>
                <p className="t-kicker" style={{ color: p.accent }}>
                  {p.code}
                  {p.status ? ` · ${p.status}` : ''}
                </p>
                <h3 className="t-title mt-1 text-[1.3rem]">{p.fullName}</h3>
                <p className="t-body mt-1">{p.tagline}</p>
                <ul className="ticks mt-2" style={{ '--accent': p.accent } as React.CSSProperties}>
                  {p.built.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[0.88rem] text-[var(--ink-faint)]">{p.stack.flatMap((g) => g.items).join(' · ')}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section id="cove" n={5}>
          <ul className="grid gap-3">
            {cove.treasures.map((t) => (
              <li key={t.id}>
                <span className="t-title text-[1.15rem]">{t.title}.</span> <span className="t-body">{t.detail}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="lighthouse" n={6}>
          <p className="t-title text-[1.6rem]">{lighthouse.body}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a className="btn-main" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
            <a className="btn-ghost" href={contact.github} target="_blank" rel="noreferrer">
              GitHub <ArrowUpRight size={16} aria-hidden />
            </a>
            {contact.linkedin && (
              <a className="btn-ghost" href={contact.linkedin} target="_blank" rel="noreferrer">
                LinkedIn <ArrowUpRight size={16} aria-hidden />
              </a>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
