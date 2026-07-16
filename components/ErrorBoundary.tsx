"use client";

import { Component, type ReactNode } from "react";

/**
 * Minimal client error boundary. Wraps the WebGL canvas so that a Three.js /
 * WebGL runtime failure (unsupported GPU, context loss, shader error) shows a
 * fallback instead of white-screening the whole page. The overlay chrome lives
 * outside this boundary, so the title and credit survive a canvas failure.
 */
export default class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
