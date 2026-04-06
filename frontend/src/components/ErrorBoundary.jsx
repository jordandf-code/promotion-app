// components/ErrorBoundary.jsx
// Catches unhandled errors in the React tree and shows a recovery UI
// instead of crashing the entire app.

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: 480, margin: '4rem auto' }}>
        <h2>Something went wrong</h2>
        <p style={{ color: '#666', margin: '1rem 0' }}>
          An unexpected error occurred. Try refreshing the page.
        </p>
        <details style={{ textAlign: 'left', marginTop: '1rem', color: '#999', fontSize: '0.85rem' }}>
          <summary>Error details</summary>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
            {this.state.error?.message}
          </pre>
        </details>
        <button
          style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem', cursor: 'pointer' }}
          onClick={() => window.location.reload()}
        >
          Refresh page
        </button>
      </div>
    );
  }
}
