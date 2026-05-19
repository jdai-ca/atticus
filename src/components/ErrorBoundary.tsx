import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Label shown in the error heading, e.g. "Chat" or "Settings" */
  area?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console so Electron's main-process log capture picks it up
    console.error(
      `[ErrorBoundary:${this.props.area ?? "App"}] Uncaught render error`,
      error,
      info.componentStack,
    );
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { area = "App" } = this.props;
    const message = this.state.error?.message ?? "Unknown error";

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-900 text-gray-100">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {area} encountered an error
        </h2>
        <p className="text-sm text-gray-400 mb-6 max-w-md text-center">
          {message}
        </p>
        <button
          onClick={this.handleReload}
          className="flex items-center gap-2 px-4 py-2 bg-legal-gold text-gray-900 font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }
}
