/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an uncaught rendering error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleLogout = () => {
    localStorage.removeItem("ramdiri_library_token");
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in" id="portal-error-boundary-screen">
          <div className="bg-red-600 text-white p-5 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 shrink-0 animate-pulse text-white" />
            <div>
              <h2 className="text-base font-black tracking-wide uppercase sm:text-lg">
                Portal Application Exception
              </h2>
              <p className="text-xs text-red-100 font-medium">
                An unexpected system runtime crash was caught by our active protection layer.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {this.props.fallbackTitle || "Render Execution Suspended"}
              </h3>
              <p className="text-xs text-slate-550 leading-relaxed">
                A rendering thread or state validation rule has thrown a critical exception. The interface was stopped safely to protect the system memory state. No permanent offline storage records have been corrupted.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 text-red-400 p-4.5 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto space-y-1.5 shadow-inner">
                <p className="font-extrabold">🚨 Exception: {this.state.error.toString()}</p>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-slate-500 max-h-40 overflow-y-auto leading-normal whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>Retry Rendering / Refresh Page</span>
              </button>
              
              <button
                type="button"
                onClick={this.handleLogout}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-red-200 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Reset User Session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
