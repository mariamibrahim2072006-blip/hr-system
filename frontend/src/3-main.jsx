import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui.css'
import App from './App.jsx'

// Route every request that still points at the local dev server to the live backend.
const LIVE_API = (import.meta.env.VITE_API_URL || (window.location.hostname === 'hr-system-frontend-pi.vercel.app' ? 'https://hr-system-backend-eight.vercel.app' : window.location.origin)).replace(/\/api\/?$|\/$/, '')
const originalFetch = window.fetch.bind(window)
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('http://localhost:5000')) {
    input = LIVE_API + input.slice('http://localhost:5000'.length)
  } else if (input instanceof Request && input.url.startsWith('http://localhost:5000')) {
    input = new Request(LIVE_API + input.url.slice('http://localhost:5000'.length), input)
  }
  return originalFetch(input, init)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
