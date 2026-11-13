import { useRef, useState } from 'react'
import type { LearningState, Profile } from '../domain/state'
import { exportBackup, parseBackup } from '../persistence/repository'
import { ProfileForm } from './ProfileForm'

export function Settings({ state, busy, onSave, onRestore, notice }: {
  state: LearningState; busy: boolean
  onSave: (profile: Profile) => Promise<boolean>
  onRestore: (candidate: LearningState) => Promise<boolean>
  notice: (message: string) => void
}) {
  const [candidate, setCandidate] = useState<LearningState>()
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  function download() {
    const url = URL.createObjectURL(new Blob([exportBackup(state)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'language-os-backup.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function pick(file?: File) {
    setCandidate(undefined)
    setError('')
    if (!file) return
    try {
      if (file.size > 10_000_000) throw new Error('Yedek 10 MB sınırını aşıyor.')
      setCandidate(parseBackup(await file.text()))
    } catch {
      setError('Bu dosya geçerli bir Language OS yedeği olarak doğrulanamadı.')
    }
  }
  return <>
    <header className="page-heading"><div><h1>Ayarlar</h1></div></header>
    <section className="surface">
      <h2>Çalışma tercihleri</h2>
      <ProfileForm initial={state.profile} busy={busy} onSave={async (profile) => {
        const saved = await onSave(profile)
        if (saved) notice('Ayarlar kaydedildi.')
        return saved
      }} />
    </section>
    <section className="surface section">
      <h2>Yerel kayıtlar</h2><p>Yedek dosyası yanıtlarını ve içe aktardığın konuşma alıntılarını içerir.</p>
      <div className="button-row">
        <button className="secondary" onClick={download}>Yedeği indir</button>
        <button className="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>Yedek seç</button>
        <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Yedek dosyası" hidden
          onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = '' }} />
      </div>
      {candidate && <div className="notice">
        <p>Bu yedek etkin yerel profili ve ilerlemeyi değiştirecek.</p>
        <div className="button-row">
          <button className="primary" disabled={busy} onClick={() => void onRestore(candidate)}>Yedeği geri yükle</button>
          <button className="link-button" onClick={() => setCandidate(undefined)}>Vazgeç</button>
        </div>
      </div>}
      {error && <p className="notice error" role="alert">{error}</p>}
    </section>
  </>
}
