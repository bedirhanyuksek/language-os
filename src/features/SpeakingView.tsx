import { useState } from 'react'
import type { Lesson } from '../content/schema'
import { recurringErrors } from '../domain/progress'
import { buildSpeakingPrompt, chatGPT, parseSpeakingReport, type SpeakingReport, type SpeakingSession } from '../domain/speaking'
import type { LearningState } from '../domain/state'

export function SpeakingView({ lesson, session, state, busy, onImport, onSkip }: {
  lesson: Lesson; session: SpeakingSession; state: LearningState; busy: boolean
  onImport: (report: SpeakingReport) => Promise<boolean>
  onSkip: () => Promise<boolean>
}) {
  const [raw, setRaw] = useState('')
  const [candidate, setCandidate] = useState<SpeakingReport>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const errors = recurringErrors(state, lesson)
  const prompt = buildSpeakingPrompt(session, lesson, errors.map(({ label, example }) => `${label}: ${example}`))
  const imported = state.speakingAssessments.some(({ report }) => report.sessionId === session.id)

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setMessage('Konuşma talimatı kopyalandı.')
    } catch {
      setMessage('Talimatı aşağıdaki metin alanından seçip kopyalayabilirsin.')
    }
  }

  function validate() {
    try {
      if (imported) throw new Error('Bu oturumun raporu daha önce kaydedildi.')
      setCandidate(parseSpeakingReport(raw, session, lesson))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Rapor doğrulanamadı.')
    }
  }

  return <>
    <header className="page-heading"><div><p className="eyebrow">{lesson.title} · {lesson.objective.level}</p>
      <h1>Konuşma oturumu</h1><p>{lesson.speaking?.scenario}</p></div></header>
    <section className="surface">
      <h2>Konuşma hedeflerin</h2>
      <ul className="goals-list">{lesson.speaking?.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
      <h3>Hesap açmadan sesli prova</h3>
      <p>Durumu canlandır ve yukarıdaki hedefleri tek seferde sesli yanıtla. Sonra hedefleri kontrol et ve yanıtını farklı bir ayrıntıyla bir kez daha söyle. Bu prova konuşma puanı oluşturmaz.</p>
      <ul>{lesson.speaking?.rubric.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
      {errors.length > 0 && <p>Önceki çalışmandan yeniden dene: {errors.map(({ label, example }) => `${label} (“${example}”)`).join(' · ')}</p>}
      <h3>ChatGPT ile isteğe bağlı pratik</h3>
      <p>Talimatı kopyala ve ChatGPT’ye yapıştır. Ardından ChatGPT’de ses modunu aç. Erişim ve kullanım kotası hesabına bağlıdır.</p>
      <div className="button-row">
        <button className="secondary" onClick={() => void copy()}>Talimatı kopyala</button>
        <a className="primary" href={chatGPT.url} target="_blank" rel="noopener noreferrer">ChatGPT ile konuşmayı başlat <span aria-hidden>↗</span></a>
      </div>
      {message && <p role="status">{message}</p>}
      <details><summary>Konuşma talimatını görüntüle</summary>
        <textarea readOnly aria-label="Konuşma talimatı" value={prompt} rows={8} />
      </details>
      <small className="session-id">Oturum kimliği <code>{session.id}</code></small>
    </section>
    <section className="surface section">
      <h2>Konuşma raporunu aktar</h2>
      <p>Oturum sonunda ChatGPT’nin verdiği JSON raporunu buraya yapıştır. Kanıtları gözden geçirip kaydet.</p>
      {imported ? <p role="status" className="notice">Bu oturumun raporu kaydedildi.</p> : <>
        <textarea aria-label="Konuşma raporu JSON" className="code-input" rows={5} maxLength={75000} spellCheck={false}
          placeholder='{ "schemaVersion": 1, … }' value={raw}
          onChange={(event) => { setRaw(event.target.value); setCandidate(undefined); setError('') }} />
        <div className="button-row">
          <button className="secondary" onClick={validate} disabled={!raw.trim() || busy}>Raporu doğrula</button>
          {!state.skippedSpeaking.includes(lesson.id) && <button className="link-button" disabled={busy}
            onClick={() => void onSkip()}>Konuşmayı daha sonra yap</button>}
        </div>
      </>}
      {error && <p role="alert" className="notice error">{error}</p>}
      {candidate && !imported && <div className="report-preview">
        <h3>Rapor önizlemesi</h3>
        <p>{candidate.observedErrors.length} hata · {candidate.vocabularyGaps.length} kelime eksiği · {candidate.successfulUses.length} başarılı kullanım</p>
        <p>Transkript {({ full: 'tam', partial: 'kısmi', unavailable: 'yok' })[candidate.transcriptAvailability]} · Dış kaynaklı gözlem</p>
        {candidate.evidence.map(({ id, quote }) => <blockquote key={id}>{quote}</blockquote>)}
        {candidate.observedErrors.map(({ description }, index) => <p key={index}>{description}</p>)}
        {candidate.corrections.map(({ text }, index) => <p key={index}><strong>Düzeltme</strong> {text}</p>)}
        <button className="primary" disabled={busy} onClick={() => void onImport(candidate)}>Raporu onayla ve kaydet</button>
      </div>}
    </section>
  </>
}
