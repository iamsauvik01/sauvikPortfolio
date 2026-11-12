import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onError: (error: unknown) => void
}

/** Catches WebGL / scene failures so the site can fall back to the 2D world. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[Discover Sauvik] 3D world unavailable, using the 2D fallback.', error)
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
