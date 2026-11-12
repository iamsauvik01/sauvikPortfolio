import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/manrope/index.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
// the island's type system
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/figtree/index.css'
import '@fontsource-variable/caveat/index.css'
import './styles/index.css'
import App from './App'
import { spiderCtl } from './lib/spiderCtl'
import { appStore } from './lib/appStore'
import { islandStore } from './island/store'

// dev-only debug handle for visual QA
if (import.meta.env.DEV || location.search.includes('debug')) Object.assign(window, { __bit: { spiderCtl, appStore, islandStore } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
