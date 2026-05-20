import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="p-10 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[40px] max-w-md w-full">
            <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Ops! Algo deu errado</h2>
            <div className="bg-black/40 p-4 rounded-2xl mb-8 text-left">
              <p className="text-rose-400 text-sm font-mono break-words">
                {this.state.error?.message || "Ocorreu um erro inesperado."}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 uppercase italic tracking-tighter"
              >
                <RefreshCw className="w-5 h-5" />
                Recarregar Sistema
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }} 
                className="w-full py-3 bg-white/10 text-white/60 text-[10px] font-black rounded-xl hover:bg-white/20 transition-all uppercase tracking-widest"
              >
                Limpar Cache e Sair
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
