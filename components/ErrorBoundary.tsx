'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div 
          className="min-h-screen flex items-center justify-center px-4"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <div className="max-w-2xl w-full">
            <div 
              className="rounded-xl shadow-lg p-8 border"
              style={{ 
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)'
              }}
            >
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#fee2e2' }}
                >
                  <AlertTriangle size={40} className="text-red-600" />
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center mb-6">
                <h1 
                  className="text-2xl font-bold mb-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Something went wrong
                </h1>
                <p 
                  className="text-base mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  We're sorry for the inconvenience. An unexpected error occurred.
                </p>
              </div>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6">
                  <details className="cursor-pointer">
                    <summary 
                      className="text-sm font-medium mb-2 hover:underline"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Error details (development only)
                    </summary>
                    <div 
                      className="mt-2 p-4 rounded-lg text-xs font-mono overflow-auto"
                      style={{ 
                        backgroundColor: '#1e293b',
                        color: '#f1f5f9',
                        maxHeight: '200px'
                      }}
                    >
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack trace:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all border"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  <Home size={18} />
                  Go to Home
                </button>
              </div>

              {/* Help Text */}
              <p 
                className="text-center text-sm mt-6"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                If this problem persists, please contact support or refresh the page.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
