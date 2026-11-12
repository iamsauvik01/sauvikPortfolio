import type { LocationId } from '../../types/content'

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

/** Small hand-made icons for each place on the island. */
export function PlaceIcon({ id, size = 22, x, y, color }: { id: LocationId; size?: number; x?: number; y?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} x={x} y={y} color={color} aria-hidden>
      {id === 'hut' && (
        <g {...P}>
          <path d="M3.5 11.5 12 4l8.5 7.5" />
          <path d="M6 10v9.5h12V10" />
          <path d="M10.2 19.5v-4.6a1.8 1.8 0 0 1 3.6 0v4.6" />
        </g>
      )}
      {id === 'workshop' && (
        <g {...P}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6" />
        </g>
      )}
      {id === 'castle' && (
        <g {...P}>
          <path d="M4 20.5V8h3v2h2.5V8h5v2H17V8h3v12.5z" />
          <path d="M10 20.5v-4a2 2 0 0 1 4 0v4" />
          <path d="M12 8V3.5l3 1.4-3 1.4" />
        </g>
      )}
      {id === 'lab' && (
        <g {...P}>
          <path d="M9.5 3.5h5M10.3 3.5v5.2L5 18.3a1.6 1.6 0 0 0 1.4 2.2h11.2a1.6 1.6 0 0 0 1.4-2.2l-5.3-9.6V3.5" />
          <path d="M7.4 14.5h9.2" />
          <circle cx="11" cy="17.3" r=".6" fill="currentColor" />
          <circle cx="13.6" cy="16.2" r=".5" fill="currentColor" />
        </g>
      )}
      {id === 'cove' && (
        <g {...P}>
          <path d="M4 11.5h16v8H4z" />
          <path d="M4 11.5C4 7.5 7.5 5 12 5s8 2.5 8 6.5" />
          <path d="M10.5 11.5v3h3v-3" />
        </g>
      )}
      {id === 'lighthouse' && (
        <g {...P}>
          <path d="M9 21l1.2-11h3.6L15 21z" />
          <path d="M9.5 10h5M10 6.8h4V10h-4zM12 3.5v3.3" />
          <path d="M16.5 7.5 21 5.8M16.5 9 21 10.6M7.5 7.5 3 5.8M7.5 9 3 10.6" />
        </g>
      )}
    </svg>
  )
}

export function Arrow({ dir = 'right', size = 18 }: { dir?: 'right' | 'left'; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={dir === 'left' ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M5 12h13M13 6l6 6-6 6" {...P} strokeWidth={2} />
    </svg>
  )
}

/** A hand-drawn arrow for margin notes. */
export function Scribble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 40" className={className} aria-hidden>
      <path d="M4 30c14-2 32-8 46-18 6-4 12-8 22-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M62 1l11 5-8 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
