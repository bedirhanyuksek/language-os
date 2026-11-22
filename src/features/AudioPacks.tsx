import { useEffect, useState } from 'react'
import type { Language } from '../domain/model'
import { audioPackIndexSchema, type AudioPack } from '../content/audio-packs'
import { downloadAudioPack, installedAudioPacks, removeAudioPack } from '../domain/audio-pack-storage'

export function AudioPacks({ language }: { language: Language }) {
  const [packs, setPacks] = useState<AudioPack[]>([])
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!globalThis.caches || !globalThis.crypto?.subtle) return
    const controller = new AbortController()
    void Promise.all([
      fetch('/audio-packs/index.json', { signal: controller.signal }).then(async (response) => {
        if (!response.ok) return []
        return audioPackIndexSchema.parse(await response.json()).packs
      }),
      installedAudioPacks(),
    ]).then(([catalog, local]) => {
      if (!controller.signal.aborted) {
        setPacks(catalog)
        setInstalled(local)
      }
    }).catch(() => { /* The bundled curriculum is available without downloadable packs. */ })
    return () => controller.abort()
  }, [])
  const available = packs.filter((pack) => pack.language === language)
  if (!available.length) return null

  async function change(pack: AudioPack) {
    setBusy(true)
    setMessage('')
    try {
      if (installed.has(pack.id)) await removeAudioPack(pack.id)
      else await downloadAudioPack(pack)
      setInstalled(await installedAudioPacks())
    } catch {
      setMessage('Ses paketi güncellenemedi. Bağlantıyı ve boş depolama alanını kontrol et.')
    } finally {
      setBusy(false)
    }
  }
  return <section className="surface section">
    <h2>Çevrimdışı ses paketleri</h2>
    {available.map((pack) => <p key={pack.id}>{pack.label}{' '}
      <button className="secondary" type="button" disabled={busy} onClick={() => void change(pack)}>
        {installed.has(pack.id) ? 'Cihazdan kaldır' : 'Çevrimdışı indir'}
      </button>
    </p>)}
    {message && <p role="status">{message}</p>}
  </section>
}
