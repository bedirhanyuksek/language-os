import { createRoot } from 'react-dom/client'
import { App } from './features/App'
import './style.css'

createRoot(document.getElementById('root')!).render(<App />)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error: unknown) =>
    console.warn('Çevrimdışı uygulama önbelleği kurulamadı.', error))
}
