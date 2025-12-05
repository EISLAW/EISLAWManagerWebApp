import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * ErrorBoundary - Catches React errors and displays a fallback UI
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught error:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback, componentName } = this.props

      // Allow custom fallback
      if (fallback) {
        return fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8" dir="rtl">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-2">
              משהו השתבש
            </h2>

            <p className="text-slate-600 mb-6">
              {componentName
                ? `אירעה שגיאה ב${componentName}. נסה לרענן את הדף.`
                : 'אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.'}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-slate-100 rounded-lg p-4 mb-6 text-left text-sm">
                <p className="font-mono text-red-600 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                נסה שוב
              </button>

              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                <Home className="w-4 h-4" />
                דף הבית
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * withErrorBoundary - HOC to wrap components with ErrorBoundary
 */
export function withErrorBoundary(Component, componentName) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary componentName={componentName}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
