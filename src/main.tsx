import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { App } from './features/App'
import './fonts.css'
import './style.css'
import './mobile.css'

createRoot(document.getElementById('root')!).render(<App />)

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error: unknown) =>
    console.warn('Çevrimdışı uygulama önbelleği kurulamadı.', error))
}
