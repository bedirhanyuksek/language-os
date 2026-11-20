import { useState } from 'react'
import type { StudyPlan } from '../domain/model'
import type { Lesson } from '../content/schema'
import { recurringErrors } from '../domain/progress'
import { buildSpeakingPrompt, chatGPT, parseSpeakingReport, speakingFocus, speakingCorrections, speakingWordGaps, type SpeakingObservation, type SpeakingReport, type SpeakingSession } from '../domain/speaking'
import type { LearningState } from '../domain/state'

export function SpeakingView({ lesson, session, state, plan, busy, onImport, onSkip, onContinue }: {
  lesson: Lesson; session: SpeakingSession; state: LearningState; plan: StudyPlan; busy: boolean
  onImport: (report: SpeakingReport) => Promise<boolean>
  onSkip: () => Promise<boolean>
  onContinue: () => void
}) {
  const [raw, setRaw] = useState('')
  const [candidate, setCandidate] = useState<SpeakingReport>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const errors = recurringErrors(state, lesson)
  const focus = speakingFocus(state, lesson)
  const prompt = buildSpeakingPrompt(session, lesson, focus)
  const imported = state.speakingAssessments.find(({ report }) => report.sessionId === session.id)?.report

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
      setCandidate(parseSpeakingReport(raw, session, lesson))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Rapor doğrulanamadı.')
    }
  }

  if (imported) return <>
    <header className="page-heading"><div><h1>Konuşma raporun</h1><p>{lesson.title}</p></div></header>
    <section className="surface"><ReportDetails report={imported} lesson={lesson} /></section>
    <section className="surface section">
      <h2>Günlük planın</h2>
      <p>{plan.reason}</p>
      {speakingCorrections(imported).length > 0 && <p>Rapordaki eşleşen dil bilgisi hataları için açıklama ve yeni bağlamda kontrol planlanır.</p>}
      {speakingWordGaps(imported).length > 0 && <p>Rapordaki eşleşen kelimeler ve kalıplar tekrar sırasına alınır.</p>}
      <button className="primary" onClick={onContinue}>Günlük plana dön</button>
    </section>
  </>

  return <>
    <header className="page-heading"><div><p className="eyebrow">{lesson.title} · {lesson.objective.level}</p>
      <h1>Konuşma oturumu</h1><p>{lesson.speaking?.scenario}</p></div></header>
    <section className="surface">
      <h2>Konuşma hedeflerin</h2>
      <p>{focus.reason}</p>
      {session.language === 'en' && <p>Sorular İngilizce. Önemli hatalar için kısa Türkçe açıklama isteyebilirsin.</p>}
      {session.language === 'es' && <p>Sorular İspanyolca. Önemli hatalar için kısa Türkçe açıklama isteyebilirsin.</p>}
      <ul className="goals-list">{lesson.speaking?.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
      <h3>Hesap açmadan sesli prova</h3>
      <p>Durumu canlandır ve yukarıdaki hedefleri tek seferde sesli yanıtla. Sonra hedefleri kontrol et ve yanıtını farklı bir ayrıntıyla bir kez daha söyle. Bu prova konuşma puanı oluşturmaz.</p>
      <ul>{lesson.speaking?.rubric.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
      {errors.length > 0 && <p>Önceki çalışmandan yeniden dene: {errors.map(({ label, example }) => `${label} (“${example}”)`).join(' · ')}</p>}
      <h3>ChatGPT ile isteğe bağlı pratik</h3>
      <p>Talimatı kopyala ve ChatGPT’ye yapıştır. Ardından ChatGPT’de ses modunu aç. Erişim ve kullanım kotası hesabına bağlıdır.</p>
      <div className="button-row">
        <button className="secondary" onClick={() => void copy()}>Talimatı kopyala</button>
        <a className="primary" href={chatGPT.url} target="_blank" rel="noopener noreferrer">ChatGPT’yi aç <span aria-hidden>↗</span></a>
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
      <textarea aria-label="Konuşma raporu JSON" className="code-input" rows={5} maxLength={75000} spellCheck={false}
        placeholder='{ "schemaVersion": 2, … }' value={raw}
        onChange={(event) => { setRaw(event.target.value); setCandidate(undefined); setError('') }} />
      <div className="button-row">
        <button className="secondary" onClick={validate} disabled={!raw.trim() || busy}>Raporu doğrula</button>
        {!state.skippedSpeaking.includes(lesson.id) && <button className="link-button" disabled={busy}
          onClick={() => void onSkip()}>Konuşmayı daha sonra yap</button>}
      </div>
      {error && <p role="alert" className="notice error">{error}</p>}
      {candidate && <div className="report-preview">
        <h3>Rapor önizlemesi</h3>
        <p>Onaylamadan önce alıntıları kendi oturumunla karşılaştır.</p>
        <ReportDetails report={candidate} lesson={lesson} />
        <button className="primary" disabled={busy} onClick={() => void onImport(candidate)}>Raporu onayla ve kaydet</button>
      </div>}
    </section>
  </>
}

const observationLabels: Record<SpeakingObservation['kind'], string> = {
  independent_correct: 'Bağımsız doğru kullanım',
  error_observed: 'Gözlenen hata',
  teacher_assisted: 'Öğretmen yardımıyla düzeltildi',
  repeated_after_correction: 'Düzeltmeden sonra tekrarlandı',
  transferred: 'Yeni bağlamda bağımsız kullanım',
  insufficient_evidence: 'Yetersiz kanıt',
}

function ReportDetails({ report, lesson }: { report: SpeakingReport; lesson: Lesson }) {
  const transcript = { full: 'tam', partial: 'kısmi', unavailable: 'yok' }[report.transcriptAvailability]
  return <>
    <p>Dış kaynaklı gözlem · Transkript {transcript}. Alıntılar aktarılan rapordan geliyor.</p>
    {report.schemaVersion === 1 ? <>
      <p>Eski rapor biçimi · {report.observedErrors.length} hata · {report.vocabularyGaps.length} kelime eksiği · {report.successfulUses.length} başarılı kullanım bildirimi. Yardım düzeyi ölçülmedi.</p>
      {report.evidence.map(({ id, quote }) => <blockquote key={id} lang={report.language}>{quote}</blockquote>)}
      {report.observedErrors.map(({ description }, index) => <p key={index}>{description}</p>)}
      {report.corrections.map(({ text }, index) => <p key={index}><strong>Düzeltme</strong> <span lang={report.language}>{text}</span></p>)}
    </> : <>
      {!report.observations.length && <p>Bu oturumda sınıflandırılabilecek konuşma kanıtı kaydedilmedi.</p>}
      {report.observations.map((item) => {
        const { target } = item
        const label = target.kind === 'unmapped' ? target.label : target.kind === 'objective' ? lesson.objective.description :
          target.kind === 'concept' ? lesson.concepts.find(({ id }) => id === target.id)?.label :
            lesson.vocabulary.find(({ id }) => id === target.id)?.term
        return <article className="section feedback" key={item.id}>
          <h3>{observationLabels[item.kind]}</h3>
          <p>{label}</p>
          {item.quote && <blockquote lang={report.language}>{item.quote}</blockquote>}
          {item.kind === 'error_observed' && <>
            <p>{item.description}</p><p>{item.explanation}</p>
            <p><strong>Düzeltilmiş örnek</strong> <span lang={report.language}>{item.correction}</span></p>
            {target.kind === 'unmapped' && <p>Bu konu için müfredatta eşleşen çalışma bulunmuyor.</p>}
          </>}
          {item.kind === 'transferred' && <p>{item.newContext}</p>}
          {item.kind === 'insufficient_evidence' && <p>{item.reason}</p>}
        </article>
      })}
      <p>Ölçülmeyen hedefler: {[
        ...lesson.concepts.map(({ id, label }) => ({ id, label })),
        ...lesson.vocabulary.map(({ id, term }) => ({ id, label: term })),
      ].filter(({ id }) => !report.observations.some(({ kind, target }) =>
        kind !== 'insufficient_evidence' && target.kind !== 'unmapped' && target.id === id))
        .map(({ label }) => label).join(', ') || 'Listelenen hedeflerin her biri için en az bir gözlem var.'}</p>
    </>}
    <p>Telaffuz, akıcılık ve genel konuşma düzeyi bu raporla ölçülmedi.</p>
  </>
}
