import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[240px] p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Terjadi Kesalahan
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Aplikasi mengalami gangguan. Silakan coba refresh halaman atau hubungi admin jika masalah berlanjut.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Refresh Halaman
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className="mt-6 w-full max-w-lg text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Detail Error (Dev Only)
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground">
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
