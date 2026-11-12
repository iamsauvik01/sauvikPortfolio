# Discover Sauvik — a little world of its own

An immersive, interactive portfolio for **Sauvik Das**, Software Engineer.

1. **The landing page.** Visitors arrive in a tiny floating world with **Bit**, a procedural 3D spider.
   Bit watches the cursor, blinks and reacts to clicks.
2. **The dive.** **DISCOVER SAUVIK** sends the camera into Bit's eye, and an iris opens.
3. **Sauvik Island.** The iris opens onto an explorable 3D island. The island *is* the portfolio: each
   place on it tells one part of the story, and Bit dangles on a thread as a guide.

| # | Place | Tells you about | You can poke… |
| --- | --- | --- | --- |
| 1 | The Welcome Hut | About me | The door swings open and the lights come on |
| 2 | The Workshop | Skills | 6 machines: Java Engine, Framework Forge, Paint Shop, Data Vault, API Relay, Blueprint Bench |
| 3 | The Castle | Experience | Gatehouse (university) → Tower (Scriptscode) → Keep (NIC). The story climbs. |
| 4 | The Innovation Lab | Projects | 4 pedestals, each with a miniature world (MSPSDC, CIBF, EdTech, Hotel) |
| 5 | Treasure Cove | Achievements | A chest that opens; 3 real treasures rise out of it |
| 6 | The Lighthouse | Contact | Night falls and the beam comes on. Email, GitHub and a "message in a bottle" |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build
```

`dist/` is a static site. Deploy it to any static host (Netlify, Vercel, GitHub Pages, S3, Nginx).

## Editing content

Every word lives in **`src/data/portfolio.ts`**, typed by `src/types/content.ts`.
You can change the copy without touching any 3D or layout code.

| What | Where |
| --- | --- |
| Name, roles (landing page) | `personal` |
| Email, GitHub, **LinkedIn**, résumé | `contact` (LinkedIn and résumé stay hidden while empty) |
| Arrival card + Bit's overview line | `island.arrival`, `island.overviewBit` |
| About, field notes | `island.hut` |
| Skills, grouped into workshop stations | `island.workshop.stations` (each part has a *use*, never a level) |
| Experience chapters | `island.castle.chapters` |
| Projects | `island.lab.projects` (copy, stack, colours) |
| Achievements | `island.cove.treasures` |
| Contact copy | `island.lighthouse` |
| What Bit says at each place | the `bit` field on each place |

**Project links:** only add real repository or live-demo URLs to a project's `links`. Buttons only
appear when the array has items.

## How it's built

- **React 19 + TypeScript + Vite**, **Tailwind CSS v4**
- **Three.js / React Three Fiber / drei.** There are two canvases. Bit's world (landing page + the
  hanging guide) is layered over the island canvas. Both are lazy-loaded.
- **GSAP** for the landing choreography, the dive, panels and the day → night shift
- **Type system:** Bricolage Grotesque (display), Figtree (body), Caveat (hand-written notes),
  self-hosted with Fontsource. The landing page keeps its original Fraunces / Manrope / JetBrains Mono.

```
src/
  data/ types/        all content + its types
  components/         landing page, loader, Bit's speech bubble, 2D SVG Bit
  scene/              Bit's world (landing page) — unchanged by the island
  island/
    terrain.ts        the island's height function, landmark sites, tour paths
    layout.ts         camera framings for every place and object
    store.ts          where you are, what you've visited, day/night
    pins.ts           world-anchored labels projected into one DOM layer
    IslandExperience.tsx   ties the canvas, UI, keyboard and time of day together
    island.css        the island's UI + type system
    scene/
      IslandCanvas.tsx    canvas, shader warm-up, baked shadows
      CameraDirector.tsx  arcing flights, drag-to-orbit, framing beside the story card
      Atmosphere.tsx      sky dome, depth-shaded ocean with foam, lights, clouds
      Ground.tsx          painted terrain + instanced vegetation (kept out of camera sight lines)
      Life.tsx            gulls, a sailboat, fireflies
      Landmark.tsx        hover / click / "activation" for every place and object
      landmarks/          Hut (+ pier), Workshop, Castle, Lab, Cove, Lighthouse
    ui/                   HUD, dock, arrival card, story panel + stories, logbook, flat map
```

### Navigating the island

- **Mouse:** click a pin, a building or any tagged object. Drag to look around, scroll to zoom.
- **Touch:** tap, drag and pinch. The story card becomes a bottom sheet.
- **Keyboard:** `←` / `→` step between places, `1`–`6` jump to a place, `Esc` steps back out.
  Every pin, tag and control is a real, focusable button.
- **The quick read:** a one-page "logbook" with everything in it, for visitors in a hurry and for
  screen readers.

### Performance

The island is prepared while the visitor is still on the landing page, in small pieces, so neither
Bit nor the dive ever stalls:

1. **Web Worker** (`groundWorker.ts`). Terrain, seabed height map, and every tree, palm, rock,
   tuft and flower (instance matrices + colours) are computed off the main thread.
2. **Staggered mounting.** Landmarks are created one per idle slice (`Stagger` in `IslandCanvas.tsx`).
3. **Static batching** (`scene/batch.ts`). Each landmark is authored as many small meshes; after
   mounting, everything that never moves is merged per moving group. Plain colours, roughness,
   metalness, glow and faceting are stored per vertex, so one material draws a whole building.
   Animated parts are marked `userData={DYN}` and moving groups `userData={ROOT}`.
4. **Warm-up** (`Warmup`). Builds the environment map, compiles shaders in parallel chunks
   (`compileAsync`), then renders one hidden frame to upload buffers. The island doesn't render
   until this is done. If someone taps DISCOVER early, the work stops waiting for idle time and the
   iris stays shut a moment longer instead of opening onto a stutter.

While exploring:

- About 135 draw calls instead of about 630, and about 400 scene objects instead of about 875. Static
  objects never recompute their matrices, and hover lifts only update while they change.
- All glows are one point cloud, all contact shadows one instanced mesh, each smoke plume one
  instanced mesh, and the gulls three. Vegetation is instanced.
- Shadows are **baked** (the sun never moves): one shadow pass after a place finishes animating.
- Labels are projected into one DOM layer and only touched when they move. Bit's speech bubble
  never reads layout inside the frame loop. No `backdrop-filter` sits over the live canvas.
- The island renders only while you're on it, and pauses behind the logbook (which is itself
  built on first open).
- Quality tiers (`low` / `mid` / `high`) scale terrain density, vegetation, shadows and DPR, and
  `PerformanceMonitor` lowers DPR further if the frame rate drops. On phones Bit's world pauses
  completely and Bit's lines move into the story card.

Profiling helpers (run against `npm run build && npm run preview`, with `?debug` in the URL):

```bash
URL="http://localhost:4173/?debug" node tools/perf.mjs 4        # fps, p95, long tasks per phase at 4× CPU throttle
URL="http://localhost:4173/?debug" node tools/cpuprof.mjs       # hottest functions per moment
URL="http://localhost:4173/?debug" node tools/warmlog.mjs       # warm-up step timings
URL="http://localhost:4173/?debug" node tools/quicktap.mjs      # slow phone, DISCOVER tapped instantly
```

### Accessibility and fallbacks

- `prefers-reduced-motion` shortens camera flights and removes drift, parallax and gulls.
- Without WebGL, an illustrated SVG map of the same island replaces the 3D scene. The panels, dock,
  keyboard controls and logbook all keep working.
- Colours on project cards pick dark or light ink automatically for contrast.

## Visual QA helpers

```bash
node tools/shoot.mjs full 1440 900          # landing + dive + the island tour, desktop
node tools/shoot.mjs island 390 844         # the island tour, phone
ONLY="lab:cibf,cove" node tools/shoot.mjs island 1440 900   # just some places / objects
node tools/shoot.mjs interact 1440 900      # clicks, keys, drag, logbook, leave + re-enter
RM=1 node tools/shoot.mjs island 1440 900   # reduced motion
NOGL=1 node tools/shoot.mjs island 1440 900 # no-WebGL illustrated map
node tools/fps.mjs                          # rough frame-rate check
node --experimental-strip-types tools/terrain-preview.mjs   # top-down height map → .shots/terrain.png
```

Screenshots are saved to `.shots/`. The scripts expect Chrome at
`C:/Program Files/Google/Chrome/Application/chrome.exe`, and the dev server (or `URL=…`) must be running.
