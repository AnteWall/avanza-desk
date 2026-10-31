import { Component, type ReactNode } from "react";

type Props = {
  fallback: (error: unknown, reset: () => void) => ReactNode;
  onReset?: () => void;
  children: ReactNode;
};

/** Catches render errors (including thrown suspense queries) below it. React has no hook for this. */
export class ErrorBoundary extends Component<Props, { error: unknown; failed: boolean }> {
  state = { error: null as unknown, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true };
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null, failed: false });
  };

  render() {
    return this.state.failed
      ? this.props.fallback(this.state.error, this.reset)
      : this.props.children;
  }
}
