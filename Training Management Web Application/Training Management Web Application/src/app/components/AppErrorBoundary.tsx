import React from 'react';
import { Button } from './ui/button';

type AppErrorBoundaryState = {
  error: Error | null;
  info: React.ErrorInfo | null;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
    info: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      error,
      info: null,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed in error boundary:', error, info);
    this.setState({ error, info });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const storedUser = (() => {
      try {
        return JSON.parse(window.localStorage.getItem('dmo_user') || 'null');
      } catch {
        return null;
      }
    })();

    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-destructive/30 bg-card p-6 shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive/80">
            Runtime Error
          </p>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
            The page crashed before it could render.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This screen is shown so we can see the actual frontend error instead of a blank page.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-background/80 p-4">
            <p className="text-sm font-medium text-foreground">Error message</p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-destructive">
              {this.state.error.name}: {this.state.error.message}
            </pre>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-background/80 p-4">
            <p className="text-sm font-medium text-foreground">Signed-in user</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {storedUser?.name || 'Unknown user'} • {storedUser?.role || 'unknown role'} • {storedUser?.email || 'no email'}
            </p>
          </div>

          {this.state.info?.componentStack ? (
            <div className="mt-4 rounded-2xl border border-border bg-background/80 p-4">
              <p className="text-sm font-medium text-foreground">Component stack</p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {this.state.info.componentStack}
              </pre>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button type="button" onClick={this.handleReload}>
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
