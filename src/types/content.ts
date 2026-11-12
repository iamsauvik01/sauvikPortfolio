/**
 * Content model.
 * Every word on the site lives in `src/data/portfolio.ts` and is typed here,
 * so copy can change without touching any 3D or layout code.
 */

export interface PersonalInfo {
  name: string
  firstName: string
  /** Short professional identity (used on the landing page). */
  roles: string[]
}

export interface ContactInfo {
  email: string
  github: string
  /** LinkedIn profile URL. Leave empty ('') to hide it everywhere. */
  linkedin: string
  /** Optional résumé/CV URL. Leave empty to hide. */
  resume: string
}

export type LocationId = 'hut' | 'workshop' | 'castle' | 'lab' | 'cove' | 'lighthouse'

/** Shared by every place on the island. */
export interface LocationMeta {
  id: LocationId
  /** Full place name, e.g. "The Workshop". */
  name: string
  /** What the place is about, e.g. "Skills". */
  purpose: string
  /** One-line teaser shown on the island map pin. */
  teaser: string
  /** What Bit says when you arrive. */
  bit: string
  /** Signature colour of the place (UI accents, pins, stamps). */
  accent: string
}

export interface Fact {
  label: string
  value: string
}

export interface HutContent extends LocationMeta {
  hello: string
  headline: string
  paragraphs: string[]
  facts: Fact[]
  outro: string
}

export interface Part {
  name: string
  /** What it's for — never a proficiency level. */
  use: string
}

export type StationId = 'engine' | 'forge' | 'studio' | 'vault' | 'relay' | 'bench'

export interface Station {
  id: StationId
  name: string
  /** Category label, e.g. "Languages". */
  tag: string
  quip: string
  parts: Part[]
}

export interface WorkshopContent extends LocationMeta {
  headline: string
  intro: string
  stations: Station[]
}

export type ChapterId = 'gate' | 'tower' | 'keep'

export interface Chapter {
  id: ChapterId
  /** e.g. "Chapter 1". */
  chapter: string
  /** Building name on the island, e.g. "The Keep". */
  building: string
  when: string
  place: string
  role: string
  story: string
  highlights: string[]
  stack: string[]
}

export interface CastleContent extends LocationMeta {
  headline: string
  intro: string
  chapters: Chapter[]
}

export interface TechGroup {
  role: string
  items: string[]
}

export interface ProjectLink {
  label: string
  href: string
}

export type ProjectId = 'mspsdc' | 'cibf' | 'edtech' | 'hotel'

export interface Project {
  id: ProjectId
  code: string
  fullName: string
  title: string
  tagline: string
  /** Optional status, e.g. "Ongoing". Empty = hidden. */
  status: string
  built: string[]
  stack: TechGroup[]
  /** Optional clarification shown under the stack. */
  stackNote: string
  /** Only real URLs. Empty = no buttons rendered. */
  links: ProjectLink[]
  accent: string
  accent2: string
}

export interface LabContent extends LocationMeta {
  headline: string
  intro: string
  projects: Project[]
}

export type TreasureId = 'trophy' | 'medal' | 'crown'

export interface Treasure {
  id: TreasureId
  title: string
  detail: string
  quip: string
  color: string
}

export interface CoveContent extends LocationMeta {
  headline: string
  intro: string
  treasures: Treasure[]
}

export interface LighthouseContent extends LocationMeta {
  headline: string
  body: string
  bottlePrompt: string
  signoff: string
}

export interface ArrivalCopy {
  kicker: string
  title: string
  population: string
  hint: string
  start: string
  explore: string
}

export interface IslandContent {
  arrival: ArrivalCopy
  /** Bit's line while you look at the whole island. */
  overviewBit: string
  hut: HutContent
  workshop: WorkshopContent
  castle: CastleContent
  lab: LabContent
  cove: CoveContent
  lighthouse: LighthouseContent
}

export interface PortfolioContent {
  personal: PersonalInfo
  contact: ContactInfo
  /** The spider's name. */
  mascot: string
  island: IslandContent
}
