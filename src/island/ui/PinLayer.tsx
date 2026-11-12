import { content } from '../../data/portfolio'
import { ORDER, islandStore, selectSub, visit } from '../store'
import { bindAnchor, subLabels } from '../pins'
import type { LocationId } from '../../types/content'

function Pin({ id, n }: { id: LocationId; n: number }) {
  const focus = islandStore.use((s) => s.focus)
  const hot = islandStore.use((s) => s.hover === id)
  const visited = islandStore.use((s) => s.visited.includes(id))
  const intro = islandStore.use((s) => s.intro)
  const loc = content.island[id]
  const show = focus === null && !intro
  return (
    <div ref={(el) => bindAnchor(id, el)} className="anchor">
      <button
        type="button"
        className={`pin ${show ? 'pin--on' : ''} ${hot ? 'pin--hot' : ''}`}
        style={{ '--accent': loc.accent } as React.CSSProperties}
        tabIndex={show ? 0 : -1}
        aria-hidden={!show}
        aria-label={`${n}. ${loc.name} — ${loc.purpose}. ${loc.teaser}`}
        onClick={() => visit(id)}
        onMouseEnter={() => islandStore.set({ hover: id })}
        onMouseLeave={() => islandStore.get().hover === id && islandStore.set({ hover: null })}
        onFocus={() => islandStore.set({ hover: id })}
        onBlur={() => islandStore.get().hover === id && islandStore.set({ hover: null })}
      >
        <span className="pin-num" aria-hidden>
          {visited ? '✓' : n}
        </span>
        <span className="pin-text" aria-hidden>
          <span className="pin-name">{loc.name}</span>
          <span className="pin-teaser">{loc.teaser}</span>
        </span>
      </button>
    </div>
  )
}

function Tags({ loc }: { loc: LocationId }) {
  const focus = islandStore.use((s) => s.focus)
  const sub = islandStore.use((s) => s.sub)
  const hover = islandStore.use((s) => s.hover)
  const show = focus === loc
  return (
    <>
      {subLabels(loc).map(({ id, label }) => {
        const key = `${loc}:${id}`
        return (
          <div key={key} ref={(el) => bindAnchor(key, el)} className="anchor">
            <button
              type="button"
              className={`tag ${show ? 'tag--on' : ''} ${sub === id ? 'tag--sel' : ''} ${hover === key ? 'tag--hot' : ''}`}
              style={{ '--accent': content.island[loc].accent } as React.CSSProperties}
              tabIndex={show ? 0 : -1}
              aria-hidden={!show}
              aria-pressed={sub === id}
              onClick={() => selectSub(sub === id ? null : id)}
              onMouseEnter={() => islandStore.set({ hover: key })}
              onMouseLeave={() => islandStore.get().hover === key && islandStore.set({ hover: null })}
            >
              {label}
            </button>
          </div>
        )
      })}
    </>
  )
}

/** Map pins over the island + tags on the objects of the place you're visiting. */
export function PinLayer() {
  return (
    <div className="pin-layer" aria-label="Places and objects on the island">
      {ORDER.map((id, i) => (
        <Pin key={id} id={id} n={i + 1} />
      ))}
      {(['workshop', 'castle', 'lab', 'cove'] as LocationId[]).map((loc) => (
        <Tags key={loc} loc={loc} />
      ))}
    </div>
  )
}
