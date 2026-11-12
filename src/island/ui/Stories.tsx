import { useState } from 'react'
import { ArrowUpRight, Check, Copy, FileText, Mail, RotateCcw, Send } from 'lucide-react'
import { content } from '../../data/portfolio'
import { returnToLanding } from '../../lib/transitions'
import { islandStore, selectSub, visit } from '../store'
import type { ChapterId, ProjectId, StationId, TreasureId } from '../../types/content'
import { Arrow, Scribble } from './icons'

const isl = content.island

/** Dark ink on light accents, white on deep ones. */
function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? '#241c36' : '#ffffff'
}

/** Split a headline so the last couple of words get a marker swash. */
function Swashed({ text, words = 2 }: { text: string; words?: number }) {
  const parts = text.split(' ')
  const head = parts.slice(0, -words).join(' ')
  const tail = parts.slice(-words).join(' ')
  return (
    <>
      {head} <span className="swash">{tail}</span>
    </>
  )
}

function Headline({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`t-display text-[clamp(2.1rem,3.1vw,3.15rem)] text-[var(--ink-i)] ${className}`}>{children}</h2>
}

/* ── 01 · the welcome hut ──────────────────────────────────────── */
export function HutStory() {
  const h = isl.hut
  const [first, ...rest] = h.headline.split('. ')
  return (
    <div>
      <p data-in className="note">
        {h.hello}
      </p>
      <Headline className="mt-2">
        <span data-in className="t-display-soft block">
          {first}.
        </span>
        <span data-in className="block">
          <Swashed text={rest.join('. ')} words={2} />
        </span>
      </Headline>
      <p data-in className="t-body mt-6 !text-[1.12rem] !text-[var(--ink-i)]">
        {h.paragraphs[0]}
      </p>
      {h.paragraphs.slice(1).map((p, i) => (
        <p data-in key={i} className="t-body mt-4">
          {p}
        </p>
      ))}
      <div data-in className="mt-7">
        <p className="t-kicker mb-3 text-[var(--ink-faint)]">Field notes</p>
        <div className="factgrid">
          {h.facts.map((f) => (
            <div key={f.label} className="fact">
              <span className="t-kicker fact-label">{f.label}</span>
              <span className="fact-value">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div data-in className="mt-7 flex items-end gap-3">
        <p className="note max-w-[30ch] !text-[1.25rem]">{h.outro}</p>
        <Scribble className="mb-1 h-8 w-16 flex-none text-[var(--accent)]" />
      </div>
    </div>
  )
}

/* ── 02 · the workshop ─────────────────────────────────────────── */
export function WorkshopStory() {
  const w = isl.workshop
  const sub = islandStore.use((s) => s.sub) as StationId | null
  const st = w.stations.find((s) => s.id === sub)
  return (
    <div>
      <Headline>
        <span data-in className="block">
          <Swashed text={w.headline} words={3} />
        </span>
      </Headline>
      <p data-in className="t-body mt-4">
        {w.intro}
      </p>
      <div data-in className="tabs mt-6" role="group" aria-label="Workshop stations">
        {w.stations.map((s) => (
          <button key={s.id} type="button" className="tab" aria-pressed={sub === s.id} onClick={() => selectSub(sub === s.id ? null : s.id)}>
            {s.name.replace('The ', '')}
          </button>
        ))}
      </div>
      {st ? (
        <div key={st.id} className="card-sub mt-5 about-card-in">
          <p className="t-kicker text-[var(--accent)]">{st.tag}</p>
          <h3 className="t-title mt-2 text-[1.9rem]">{st.name}</h3>
          <p className="note mt-2 !text-[1.2rem] !text-[var(--ink-soft)]">{st.quip}</p>
          <div className="mt-3">
            {st.parts.map((p) => (
              <div key={p.name} className="part">
                <span className="part-name">{p.name}</span>
                <span className="part-use">{p.use}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div data-in className="mt-5 grid grid-cols-2 gap-2.5">
          {w.stations.map((s) => (
            <button key={s.id} type="button" onClick={() => selectSub(s.id)} className="card-sub group !p-4 text-left transition-transform duration-300 hover:-translate-y-0.5">
              <span className="t-kicker block text-[var(--ink-faint)]">{s.tag}</span>
              <span className="t-title mt-1.5 block text-[1.12rem]">{s.name}</span>
              <span className="mt-2 block text-[0.8rem] text-[var(--ink-soft)]">
                {s.parts.length} {s.parts.length === 1 ? 'part' : 'parts'} inside →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 03 · the castle ───────────────────────────────────────────── */
export function CastleStory() {
  const c = isl.castle
  const sub = islandStore.use((s) => s.sub) as ChapterId | null
  const ordered = [...c.chapters].reverse()
  return (
    <div>
      <Headline>
        <span data-in className="block">
          <Swashed text={c.headline} words={3} />
        </span>
      </Headline>
      <p data-in className="t-body mt-4">
        {c.intro}
      </p>
      <div className="timeline mt-6">
        {ordered.map((ch) => {
          const open = sub === ch.id
          return (
            <div key={ch.id} data-in className="mb-1">
              <button type="button" className="tl-item" aria-pressed={open} aria-expanded={open} onClick={() => selectSub(open ? null : ch.id)}>
                <span className="tl-dot">{ch.chapter.replace('Chapter ', '')}</span>
                <span className="min-w-0">
                  <span className="t-kicker block text-[var(--ink-faint)]">
                    {ch.building} · {ch.when}
                  </span>
                  <span className="t-title mt-1 block text-[1.25rem]">{ch.place}</span>
                  <span className="mt-0.5 block text-[0.92rem] text-[var(--ink-soft)]">{ch.role}</span>
                </span>
              </button>
              {open && (
                <div className="about-card-in ml-[46px] mt-1 pb-3">
                  <p className="t-body !text-[var(--ink-i)]">{ch.story}</p>
                  <ul className="ticks mt-3">
                    {ch.highlights.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  {ch.stack.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ch.stack.map((s) => (
                        <span key={s} className="pill">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!sub && (
        <p data-in className="note mt-4 !text-[1.2rem]">
          ↑ tap a chapter (or a building) to read it
        </p>
      )}
    </div>
  )
}

/* ── 04 · the innovation lab ───────────────────────────────────── */
export function LabStory() {
  const l = isl.lab
  const sub = islandStore.use((s) => s.sub) as ProjectId | null
  const i = l.projects.findIndex((p) => p.id === sub)
  const p = l.projects[i]
  if (p) {
    const nextP = l.projects[(i + 1) % l.projects.length]
    return (
      <div key={p.id}>
        <button type="button" data-in onClick={() => selectSub(null)} className="t-kicker mb-4 inline-flex items-center gap-1.5 text-[var(--ink-faint)] hover:text-[var(--ink-i)]">
          <Arrow dir="left" size={14} /> All creations
        </button>
        <div data-in className="proj-head" style={{ '--p1': p.accent, '--p2': p.accent2, color: inkOn(p.accent) } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <span className="t-kicker opacity-90">{p.code}</span>
            {p.status && <span className="rounded-full bg-white/20 px-2.5 py-1 text-[0.72rem] font-semibold">{p.status}</span>}
          </div>
          <h3 className="t-display mt-3 text-[clamp(1.9rem,2.6vw,2.5rem)]">{p.title}</h3>
          <p className="mt-2 text-[0.85rem] opacity-90">{p.fullName}</p>
        </div>
        <p data-in className="t-body mt-5 !text-[1.06rem] !text-[var(--ink-i)]">
          {p.tagline}
        </p>
        <div data-in className="mt-6">
          <p className="t-kicker text-[var(--ink-faint)]">What I built</p>
          <ul className="ticks mt-2" style={{ '--accent': p.accent } as React.CSSProperties}>
            {p.built.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
        <div data-in className="mt-6">
          <p className="t-kicker text-[var(--ink-faint)]">Under the hood</p>
          <div className="mt-2 grid gap-2">
            {p.stack.map((g) => (
              <div key={g.role} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="w-[8.5rem] flex-none text-[0.8rem] font-semibold text-[var(--ink-soft)]">{g.role}</span>
                <span className="flex flex-wrap gap-1.5">
                  {g.items.map((it) => (
                    <span key={it} className="pill">
                      {it}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
          {p.stackNote && <p className="mt-3 text-[0.82rem] italic text-[var(--ink-faint)]">{p.stackNote}</p>}
        </div>
        {p.links.length > 0 && (
          <div data-in className="mt-6 flex flex-wrap gap-2">
            {p.links.map((ln) => (
              <a key={ln.href} href={ln.href} target="_blank" rel="noreferrer" className="btn-main !py-2.5 !text-[0.9rem]">
                {ln.label} <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
        )}
        <button type="button" data-in onClick={() => selectSub(nextP.id)} className="card-sub mt-7 flex w-full items-center justify-between !py-4 text-left">
          <span>
            <span className="t-kicker block text-[var(--ink-faint)]">Next creation</span>
            <span className="t-title mt-1 block text-[1.1rem]">{nextP.title}</span>
          </span>
          <Arrow />
        </button>
      </div>
    )
  }
  return (
    <div>
      <Headline>
        <span data-in className="block">
          <Swashed text={l.headline} words={3} />
        </span>
      </Headline>
      <p data-in className="t-body mt-4">
        {l.intro}
      </p>
      <div className="mt-6 grid gap-3">
        {l.projects.map((pr, k) => (
          <button
            key={pr.id}
            data-in
            type="button"
            onClick={() => selectSub(pr.id)}
            className="proj-head group text-left transition-transform duration-300 hover:-translate-y-1"
            style={{ '--p1': pr.accent, '--p2': pr.accent2, color: inkOn(pr.accent), transform: `rotate(${k % 2 ? 0.5 : -0.5}deg)` } as React.CSSProperties}
          >
            <span className="flex items-center justify-between">
              <span className="t-kicker opacity-90">{pr.code}</span>
              <span className="opacity-80 transition-transform duration-300 group-hover:translate-x-1">
                <Arrow />
              </span>
            </span>
            <span className="t-display mt-2 block text-[1.55rem]">{pr.title}</span>
            <span className="mt-1.5 block text-[0.85rem] leading-snug opacity-90">{pr.fullName}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── 05 · treasure cove ────────────────────────────────────────── */
export function CoveStory() {
  const c = isl.cove
  const sub = islandStore.use((s) => s.sub) as TreasureId | null
  return (
    <div>
      <Headline>
        <span data-in className="block">
          <Swashed text={c.headline} words={2} />
        </span>
      </Headline>
      <p data-in className="t-body mt-4">
        {c.intro}
      </p>
      <div className="mt-6 grid gap-3">
        {c.treasures.map((t, k) => {
          const on = sub === t.id
          return (
            <button
              key={t.id}
              data-in
              type="button"
              onClick={() => selectSub(on ? null : t.id)}
              aria-pressed={on}
              className="card-sub flex items-start gap-4 text-left transition-all duration-300 hover:-translate-y-0.5"
              style={{ boxShadow: on ? `0 0 0 2.5px ${t.color}` : undefined, transform: `rotate(${k === 1 ? 0.6 : -0.4}deg)` }}
            >
              <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl" style={{ background: t.color }}>
                <TreasureGlyph id={t.id} />
              </span>
              <span>
                <span className="t-title block text-[1.3rem]">{t.title}</span>
                <span className="mt-1 block text-[0.95rem] leading-snug text-[var(--ink-soft)]">{t.detail}</span>
                <span className="note mt-2 block !text-[1.15rem]" style={{ color: t.color }}>
                  {t.quip}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TreasureGlyph({ id }: { id: TreasureId }) {
  const p = { fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 24 24" width={28} height={28} aria-hidden>
      {id === 'trophy' && (
        <g {...p}>
          <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
          <path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.5M17 6h2.5a2.5 2.5 0 0 1-2.6 3.5M12 14v3M8.5 20.5h7M9.5 17h5v3.5h-5z" />
        </g>
      )}
      {id === 'medal' && (
        <g {...p}>
          <path d="M8 3.5l2.5 6M16 3.5l-2.5 6" />
          <circle cx="12" cy="15" r="5.5" />
          <path d="M12 12.3l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
        </g>
      )}
      {id === 'crown' && (
        <g {...p}>
          <path d="M4 17.5 3 8l5 4 4-6.5 4 6.5 5-4-1 9.5z" />
          <path d="M4.5 20.5h15" />
        </g>
      )}
    </svg>
  )
}

/* ── 06 · the lighthouse ───────────────────────────────────────── */
export function LighthouseStory() {
  const l = isl.lighthouse
  const { contact, mascot } = content
  const [copied, setCopied] = useState(false)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      window.location.href = `mailto:${contact.email}`
    }
  }
  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Hello from Sauvik Island${name ? ` — ${name}` : ''}`)
    const body = encodeURIComponent(`${msg}${name ? `\n\n— ${name}` : ''}`)
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`
  }

  return (
    <div>
      <Headline>
        <span data-in className="block">
          <Swashed text={l.headline} words={2} />
        </span>
      </Headline>
      <p data-in className="t-body mt-4 !text-[1.08rem] !text-[var(--ink-i)]">
        {l.body}
      </p>

      <div data-in className="mt-6 grid gap-2.5">
        <div className="card-sub flex items-center gap-3 !p-3 !pl-4">
          <Mail size={20} className="flex-none text-[var(--accent)]" aria-hidden />
          <a href={`mailto:${contact.email}`} className="t-title min-w-0 flex-1 truncate text-[1.05rem] hover:underline">
            {contact.email}
          </a>
          <button type="button" onClick={copy} className="chipbtn !h-9 !px-3 !text-[0.8rem] !shadow-none" aria-live="polite">
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href={contact.github} target="_blank" rel="noreferrer" className="card-sub flex flex-1 items-center justify-between gap-2 !p-4 transition-transform duration-300 hover:-translate-y-0.5">
            <span className="t-title text-[1.02rem]">GitHub</span>
            <ArrowUpRight size={18} aria-hidden />
          </a>
          {contact.linkedin && (
            <a href={contact.linkedin} target="_blank" rel="noreferrer" className="card-sub flex flex-1 items-center justify-between gap-2 !p-4 transition-transform duration-300 hover:-translate-y-0.5">
              <span className="t-title text-[1.02rem]">LinkedIn</span>
              <ArrowUpRight size={18} aria-hidden />
            </a>
          )}
          {contact.resume && (
            <a href={contact.resume} target="_blank" rel="noreferrer" className="card-sub flex flex-1 items-center justify-between gap-2 !p-4 transition-transform duration-300 hover:-translate-y-0.5">
              <span className="t-title text-[1.02rem]">Résumé</span>
              <FileText size={18} aria-hidden />
            </a>
          )}
        </div>
      </div>

      <form data-in onSubmit={send} className="mailbox mt-7">
        <p className="note !text-[1.4rem]">{l.bottlePrompt}</p>
        <label className="sr-only" htmlFor="bottle-name">
          Your name
        </label>
        <input id="bottle-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
        <label className="sr-only" htmlFor="bottle-msg">
          Your message
        </label>
        <textarea id="bottle-msg" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ahoy! I’d like to talk about…" required />
        <button type="submit" className="btn-main justify-self-start" disabled={!msg.trim()} style={{ opacity: msg.trim() ? 1 : 0.55 }}>
          Cork it & send <Send size={16} aria-hidden />
        </button>
        <p className="text-[0.78rem] text-[var(--ink-faint)]">Opens your email app with the message ready to go.</p>
      </form>

      <div data-in className="mt-8 rounded-[22px] bg-[var(--ink-i)] p-5 text-[var(--paper)]">
        <p className="t-hand text-[1.35rem] leading-snug text-[#ffcf9f]">{l.signoff}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => returnToLanding()} className="btn-main !bg-[var(--paper)] !text-[var(--ink-i)] !py-2.5 !text-[0.9rem]">
            Back to {mascot}’s world <Arrow />
          </button>
          <button type="button" onClick={() => visit('hut')} className="btn-ghost !py-2.5 !text-[0.9rem]">
            <RotateCcw size={15} aria-hidden /> Tour again
          </button>
        </div>
      </div>
    </div>
  )
}
