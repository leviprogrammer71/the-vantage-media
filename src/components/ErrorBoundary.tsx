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
          className="min-h-[60vh] flex flex-col items-center justify-center text-center px-10"
          role="alert"
        >
          <h1
            className="text-5xl text-primary mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            SOMETHING WENT WRONG
          </h1>
          <p className="text-muted-foreground mb-6">
            An unexpected error occurred.
            <br />
            Your credits were not affected.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-8 py-4 font-bold"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            RELOAD PAGE
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
