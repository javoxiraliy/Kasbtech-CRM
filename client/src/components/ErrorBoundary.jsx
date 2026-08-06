import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-dark-950 text-white">
          <div className="max-w-md w-full p-8 rounded-3xl bg-dark-900 border border-dark-800 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Xatolik yuz berdi</h2>
              <p className="text-dark-400 text-sm">
                Sahifani yuklashda kutilmagan texnik xatolik yuzaga keldi. Sahifani qayta yangilang.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 font-mono text-xs text-red-300 text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/30"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sahifani Yangilash (F5)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
