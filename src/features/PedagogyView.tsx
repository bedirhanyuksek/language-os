import { useState } from 'react'
import { receptionExercises, type Course, type Lesson } from '../content/schema'
import type { Answer, ExerciseAttempt, PedagogyPhase } from '../domain/model'
import { receptionTask, type ExerciseTask } from '../domain/pedagogy'
import { pendingSpeakingCorrections } from '../domain/speaking'
import type { LearningState } from '../domain/state'
import { AudioPlayer } from './AudioPlayer'
import { ExerciseForm } from './ExerciseForm'
import { phaseLabels } from './labels'

export function PedagogyView({ course, lesson, phase, tasks, busy, submit, state }: {
  course: Course; lesson: Lesson; phase: PedagogyPhase; state: LearningState; tasks: ExerciseTask[]; busy: boolean
  submit: (answers: Record<string, Answer>, listening?: 'played' | 'unavailable') => Promise<boolean>
}) {
  const [step, setStep] = useState(0)
  const [collected, setCollected] = useState<Record<string, Answer>>({})
  const [plays, setPlays] = useState(0)
  const [unavailable, setUnavailable] = useState(false)
  const p = lesson.pedagogy!
  const reception = phase === 'reading' || phase === 'listening' ? receptionTask(state, lesson, phase) : undefined
  const reading = reception && 'text' in reception.material ? reception.material : p.reading
  const listening = reception && 'audio' in reception.material ? reception.material : p.listening
  const transferCorrections = phase === 'transfer' ? pendingSpeakingCorrections(state, lesson).filter((item, index, all) =>
    tasks.some(({ conceptId }) => conceptId === item.conceptId) &&
    all.findIndex(({ conceptId }) => conceptId === item.conceptId) === index) : []
  const draft = state.attempts.find(({ exerciseId }) => exerciseId === lesson.production.id)
  const card = phase === 'vocabulary' ? lesson.vocabulary[Math.floor(step / 4)] : undefined
  const entry = p.vocabulary.find(({ cardId }) => cardId === card?.id)
  const vocabStep = step % 4
  const audio = { kind: 'synthesis' as const, locale: p.language === 'en' ? 'en-US' as const : 'ru-RU' as const, rate: .85 }

  async function next(answers: Record<string, Answer>) {
    const all = { ...collected, ...answers }
    if (Object.keys(all).length === tasks.length) return submit(all, phase === 'listening' ? 'played' : undefined)
    setCollected(all)
    setStep(step + 1)
    return true
  }

  return <>
    <header className="page-heading"><div><p className="eyebrow">{lesson.title}</p><h1>{phaseLabels[phase]}</h1></div></header>
    {!!reception?.previous.length && <section className="surface">
      <h2>Farklı bir yolla dene</h2>
      {reception.previous.map(({ id, answer }, index) => <div key={id}>
        <p>Önceki yanıtın: {String(answer)}</p><p>{reception.coaching[index]}</p>
      </div>)}
    </section>}
    {transferCorrections.length > 0 && <details className="surface section">
      <summary>Konuşma hatalarını gözden geçir</summary>
      {transferCorrections.map(({ conceptId, quote, description, explanation, correction }) => {
        const check = p.checks.find((item) => item.conceptId === conceptId)
        return <article key={conceptId} className="section">
          <blockquote lang={p.language}>{quote}</blockquote>
          <p>{description}</p><p>{explanation ?? check?.correction}</p>
          <p lang={p.language}>{correction ?? check?.correctExample}</p>
        </article>
      })}
    </details>}
    {phase === 'revision' && draft && <section className="surface">
      <h2>İlk yazın</h2><blockquote>{String(draft.answer)}</blockquote>
      <h3>Yazını gözden geçir</h3><ul>{p.rubric.map(({ criterion }) => <li key={criterion}>{criterion}</li>)}</ul>
    </section>}
    {phase === 'reading' && <div className="surface section"><p lang={p.language} className="passage">{reading.text}</p></div>}
    {phase === 'listening' && <section className="surface section">
      <h2>Dinlemeden önce</h2><p>{listening.preparation}</p>
      <AudioPlayer audio={listening.audio} text={listening.transcript}
        label={plays ? 'Tekrar dinle' : 'Kaydı dinle'} onEnd={() => { setPlays(plays + 1); setUnavailable(false) }}
        onUnavailable={() => setUnavailable(true)} />
      {unavailable && <button className="link-button" disabled={busy} onClick={() => void submit({}, 'unavailable')}>Metinle çalış ve dinlemeyi atla</button>}
      {plays > 0 && tasks.length > 1 && <p className="section">İlk dinlemede ana fikre, tekrar dinlerken ayrıntıya odaklan.</p>}
    </section>}
    {phase === 'vocabulary' && card && entry && vocabStep === 0 && <article className="surface section">
      <h2 lang={p.language}>{card.term}</h2><p>{card.meaning} · {card.partOfSpeech}</p>
      <p lang={p.language}>{entry.pronunciation}</p><blockquote lang={p.language}>{card.example}</blockquote>
      <p>{card.context}</p><ul>{entry.collocations.map((value) => <li key={value} lang={p.language}>{value}</li>)}</ul>
      <AudioPlayer key={card.id} audio={entry.audio ?? audio} text={card.example} label="Örneği dinle" />
      <div className="button-row"><button className="primary" onClick={() => setStep(step + 1)}>Kelimeyi çalış</button></div>
    </article>}
    {phase === 'vocabulary' && card && vocabStep > 0 && <section className="section">
      <ExerciseForm key={step} tasks={[tasks[(Math.floor(step / 4) * 3) + vocabStep - 1]]}
        language={p.language} busy={busy} submitLabel="Yanıtı kaydet" onSubmit={next} />
    </section>}
    {phase === 'listening' && plays > step && step < tasks.length && <section className="section">
      <ExerciseForm key={step} tasks={[tasks[step]]} language={p.language} busy={busy} submitLabel={step === tasks.length - 1 ? 'Yanıtları değerlendir' : 'Ana fikri kaydet'} onSubmit={next} />
    </section>}
    {phase === 'listening' && step === 1 && plays === 1 && <p className="section" role="status">Ayrıntı sorusuna geçmek için bir kez daha dinle.</p>}
    {phase !== 'listening' && phase !== 'vocabulary' && <section className="section">
      {phase === 'foundation' && <div className="surface">
        <p>Önceki kazanımdaki kısa alıştırmayı çöz. Sonra yeni konuya farklı bir örnekle dön.</p>
        {tasks.map(({ conceptId }) => {
          const check = p.checks.find((item) => item.conceptId === conceptId)
          const prerequisite = check?.foundation?.conceptId
          const prior = course.unit.lessons.find((item) => item.concepts.some(({ id }) => id === prerequisite))
          const example = prior?.pedagogy?.checks.find(({ conceptId }) => conceptId === prerequisite)
          return example && <div key={conceptId}><p>{example.misconception}</p>
            <blockquote lang={p.language}>{example.correctExample}</blockquote></div>
        })}
      </div>}
      <ExerciseForm tasks={tasks} language={p.language} busy={busy} onSubmit={submit} />
    </section>}
  </>
}

export function PedagogyResults({ lesson, phase, attempts, onContinue, state, retryListening }: {
  lesson: Lesson; phase: PedagogyPhase; state: LearningState; attempts: ExerciseAttempt[]; onContinue: () => void; retryListening?: boolean
}) {
  const p = lesson.pedagogy!
  const retry = p.receptionRetry?.listening
  const listening = retry && retryListening ? retry : p.listening
  const alternate = p.receptionRetry
  const alternateIds = [alternate?.reading.question.id, alternate?.listening.main.id, alternate?.listening.detail.id]
  const finalFailure = attempts.some(({ exerciseId, evidence }) =>
    evidence.outcome === 'incorrect' && alternateIds.includes(exerciseId))
  const draft = phase === 'revision' && state.attempts.find(({ exerciseId }) => exerciseId === lesson.production.id)
  const exercises = [...receptionExercises(p), ...(p.revision ? [p.revision] : []),
    ...p.checks.flatMap(({ transfer, delayed, foundation }) => [...transfer, ...delayed, ...(foundation ? [foundation.exercise] : [])]),
    ...p.vocabulary.flatMap(({ recognize, recall, use }) => [recognize, recall, use])]
  return <>
    <header className="page-heading"><div><p className="eyebrow">{phaseLabels[phase]}</p><h1>Çalışma sonucu</h1></div></header>
    {phase === 'listening' && <article className="surface">
      <h2>Transkript</h2><p lang={p.language}>{listening.transcript}</p>
      <AudioPlayer audio={listening.audio} text={listening.transcript} label="Transkriptle dinle" />
      {!attempts.length && <p>Bu çalışma için dinleme kanıtı kaydedilmedi.</p>}
    </article>}
    {finalFailure && <p className="notice">Yeni örnekte de zorlandın. Bu beceride kanıt henüz eksik; mevcut iki görev kullanıldı. Diğer becerilere çalışmaya devam edebilirsin.</p>}
    {draft && <article className="surface section"><h2>İlk yazın</h2><p>{String(draft.answer)}</p></article>}
    {attempts.map((attempt) => {
      const exercise = exercises.find(({ id }) => id === attempt.exerciseId)
      if (!exercise) return null
      const check = p.checks.find(({ conceptId }) => conceptId === attempt.conceptId)
      const wrong = attempt.evidence.outcome === 'incorrect'
      return <article key={attempt.id} className="surface feedback section">
        <p className={`status ${attempt.evidence.outcome}`}>{wrong ? (finalFailure ? 'Kanıt eksik' : 'Tekrar çalışılacak') :
          attempt.evidence.outcome === 'correct' ? 'Doğru' : 'İnceleme bekliyor'}</p>
        <h2>{exercise.prompt}</h2><p><strong>Yanıtın</strong> {Array.isArray(attempt.answer) ? attempt.answer.join(' · ') : attempt.answer}</p>
        {wrong && exercise.kind !== 'open' && <p><strong>Beklenen yanıt</strong> {Array.isArray(exercise.accepted) ? exercise.accepted.join(' / ') : exercise.accepted}</p>}
        {exercise.kind === 'open' && <p><strong>Örnek</strong> {exercise.sample}</p>}
        <p>{exercise.explanation}</p>
        {wrong && check && phase !== 'foundation' && <p>{check.misconception} · <s>{check.incorrectExample}</s> → {check.correctExample}</p>}
      </article>
    })}
    <button className="primary" onClick={onContinue}>Günlük plana dön</button>
  </>
}

export function TypedReview({ card, learning, busy, grade, onRate }: {
  card: Lesson['vocabulary'][number]
  learning: NonNullable<Lesson['pedagogy']>['vocabulary'][number]
  busy: boolean
  grade: (answer: string) => 'remembered' | 'again'
  onRate: (answer: string) => Promise<boolean>
}) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(false)
  return <article className="surface review-card">
    <h2>İfadeyi hatırla</h2><p>{learning.recall.prompt}</p>
    {!feedback ? <form onSubmit={(event) => { event.preventDefault(); setFeedback(true) }}>
      <input type="text" aria-label="Hatırladığın ifade" value={answer} maxLength={2000} onChange={(event) => setAnswer(event.target.value)} required />
      <div className="button-row"><button className="primary" disabled={!answer.trim()}>Yanıtı karşılaştır</button></div>
    </form> : <>
      <p>{grade(answer) === 'remembered' ? 'Doğru hatırladın.' : 'Bu ifade için kısa bir tekrar planlanacak.'}</p>
      <p><strong>Yanıtın</strong> {answer}</p><p><strong>Hedef ifade</strong> {card.term}</p>
      <blockquote>{card.example}</blockquote>
      <p><strong>Birlikte kullanılan ifadeler</strong> {learning.collocations.join(' · ')}</p>
      <button className="primary" disabled={busy} onClick={() => void onRate(answer)}>Tekrarı kaydet</button>
    </>}
  </article>
}
