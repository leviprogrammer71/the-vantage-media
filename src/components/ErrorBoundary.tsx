import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-[70vh] lux-bg-bone flex flex-col items-center justify-center text-center px-10"
          role="alert"
          style={{ color: "var(--lux-ink)" }}
        >
          <div className="lux-eyebrow mb-5" style={{ color: "var(--lux-rust)" }}>
            INTERMISSION · UNEXPECTED ERROR
          </div>
          <h1 className="lux-display" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1 }}>
            Something went wrong
            <br />
            <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>behind the lens.</span>
          </h1>
          <p className="lux-prose mt-5 mb-8" style={{ maxWidth: 420, color: "var(--lux-ash)" }}>
            An unexpected error occurred. Your credits were not affected — reload and pick up where you left off.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-none px-8 py-4"
            style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", fontFamily: "'Space Mono', monospace", letterSpacing: "0.14em" }}
          >
            RELOAD PAGE →
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
