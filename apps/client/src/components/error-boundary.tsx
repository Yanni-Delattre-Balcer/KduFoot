import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@heroui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
          <div className="max-w-md w-full p-8 border border-danger/20 rounded-3xl bg-danger/5 backdrop-blur-md shadow-2xl">
            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black mb-2">Oups ! Une erreur est survenue</h1>
            <p className="text-default-500 mb-8">
              L'application a rencontré un problème inattendu. Ne vous inquiétez pas, vos données sont en sécurité.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                color="danger" 
                className="font-bold rounded-2xl h-12 shadow-lg shadow-danger/20"
                onPress={() => window.location.reload()}
              >
                Rafraîchir la page
              </Button>
              <Button 
                variant="light"
                className="font-bold h-10"
                onPress={() => window.location.href = "/"}
              >
                Retour à l'accueil
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-black/10 rounded-xl text-left overflow-auto max-h-40">
                <code className="text-xs text-danger/80">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
