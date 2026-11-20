import { Capacitor } from '@capacitor/core'

export const mobileTutorNotice = "ChatGPT bağlantısı mobil uygulamada henüz yok. Speaking Coach'un kopyala/yapıştır akışı çalışır."

export function isLocalTutorAvailable() {
  return !Capacitor.isNativePlatform() && globalThis.location?.origin === 'http://127.0.0.1:4173'
}
