import { createRoot } from 'react-dom/client'
import { Suspense } from 'react'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-surface-500 text-sm animate-pulse">Cargando…</div>}>
      <App />
    </Suspense>
  </ErrorBoundary>,
)
