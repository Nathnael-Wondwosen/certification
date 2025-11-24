import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// During local development, prepend VITE_API_URL to /api calls.
// In production on Vercel, we rely on a rewrite to proxy /api to the server (no CORS).
const API_BASE = import.meta.env.VITE_API_URL || ''
const shouldUseProxyBase = typeof window !== 'undefined' && (
  import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(window.location.hostname)
)

if (typeof window !== 'undefined' && API_BASE && shouldUseProxyBase) {
  const originalFetch = window.fetch
  window.fetch = function(input, init) {
    try {
      const url = typeof input === 'string' ? input : input?.url || ''
      if (url.startsWith('/api/')) {
        const next = API_BASE + url
        return originalFetch.call(this, next, init)
      }
      return originalFetch.call(this, input, init)
    } catch (error) {
      console.error('Fetch wrapper error:', error)
      return originalFetch.call(this, input, init)
    }
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)