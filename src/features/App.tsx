import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { catalog } from '../content/catalog'
import { beginSpeaking, dailyPlan, finishLesson, finishPlacement, finishDiagnostic, finishReview, finishPedagogy, finishTypedReview, importReport, lessonTasks } from '../domain/progress'
import { nextDiagnostic } from '../domain/diagnostic'
import { DiagnosticView } from './DiagnosticView'
import { phaseTasks, gradeVocabularyRecall, receptionTask } from '../domain/pedagogy'
import type { ExerciseAttempt, PedagogyPhase } from '../domain/model'
import { initialState, type LearningState } from '../domain/state'
import { IndexedLearningRepository, parseBackup } from '../persistence/repository'
import { ExerciseForm } from './ExerciseForm'
import { languageLabels, skillLabels } from './labels'
import { ProfileForm } from './ProfileForm'
import { Settings } from './Settings'
import { SpeakingView } from './SpeakingView'
import { Dashboard, LessonNotes, LessonResults, ReviewCard, SkillProfile } from './StudyViews'

type Screen =
  | { type: 'home' | 'skills' | 'settings' | 'diagnostic' }
  | { type: 'lesson' | 'speaking'; lessonId: string }
  | { type: 'pedagogy'; phase: PedagogyPhase; lessonId: string }
  | { type: 'pedagogy-results'; phase: PedagogyPhase; lessonId: string; attempts: ExerciseAttempt[]; retryListening?: boolean }
  | { type: 'results'; lessonId: string; attempts: ExerciseAttempt[] }
  | { type: 'review'; cardIds: string[]; index: number }

const PedagogyView = lazy(() => import('./PedagogyView').then((module) => ({ default: module.PedagogyView })))
const PedagogyResults = lazy(() => import('./PedagogyView').then((module) => ({ default: module.PedagogyResults })))
const TypedReview = lazy(() => import('./PedagogyView').then((module) => ({ default: module.TypedReview })))

const repository = new IndexedLearningRepository()
const nowISO = () => new Date().toISOString()

export function App() {
  const [state, setState] = useState<LearningState>()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [screen, setScreen] = useState<Screen>({ type: 'home' })
  const [now, setNow] = useState(nowISO)
  const inFlight = useRef(false)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    repository.read().then((saved) => { setState(saved); setReady(true) })
      .catch(() => setError('Tarayıcıdaki yerel kayıt açılamadı.'))
    const timer = window.setInterval(() => setNow(nowISO()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  function go(next: Screen) {
    setError('')
    setNotice('')
    setNow(nowISO())
    setScreen(next)
    window.scrollTo(0, 0)
    mainRef.current?.focus()
  }

  async function save(work: () => Promise<LearningState>, after?: (saved: LearningState) => void) {
    if (inFlight.current) return false
    inFlight.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const saved = await work()
      setState(saved)
      setNow(nowISO())
      after?.(saved)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Öğrenme kaydı saklanamadı.')
      return false
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  function update(change: (current: LearningState) => LearningState, after?: (saved: LearningState) => void) {
    return state ? save(() => repository.update(state.profile.id, change), after) : Promise.resolve(false)
  }

  const course = state && catalog[state.profile.language]
  let content
  if (!ready) {
    content = error ? <button className="primary" onClick={() => window.location.reload()}>Yeniden dene</button> : <p role="status">Yerel kayıt açılıyor…</p>
  } else if (!state || !course) {
    content = <div className="onboarding">
      <header className="onboarding-intro"><p className="eyebrow">Kişisel öğrenme stüdyosu</p>
        <h1>Öğrenme planını kur.</h1><p>Dilini, hedefini ve çalışma zamanını seç. Kısa bir taramayla başlayacağız.</p></header>
      <section className="surface onboarding-form">
        <ProfileForm busy={busy} onSave={(profile) => save(() => repository.create(initialState(profile)), () => go({ type: 'home' }))} />
        <details><summary>Önceden kaydedilmiş bir yedeğin var mı?</summary>
          <SettingsRestore busy={busy} restore={(candidate) => save(() => repository.restore(candidate, undefined), () => go({ type: 'home' }))} />
        </details>
      </section>
    </div>
  } else if (!state.placementAt && screen.type !== 'settings') {
    content = <>
      <header className="page-heading"><div><p className="eyebrow">{languageLabels[course.language]} · {course.placement.length} soru</p>
        <h1>Başlangıç taraması</h1><p>Elinden geldiğince yanıtla. Sonuçlar çalışma planın için ilk ipuçlarını verir.</p></div></header>
      <ExerciseForm key={course.id} placement language={course.language} busy={busy}
        tasks={course.placement.map(({ exercise, objectiveId }) => ({ exercise, conceptId: objectiveId, label: skillLabels[exercise.skill] }))}
        onSubmit={(answers) => update((current) => finishPlacement(current, course, answers, nowISO()), () => go({ type: 'skills' }))} />
    </>
  } else {
    const plan = dailyPlan(state, course, now, Intl.DateTimeFormat().resolvedOptions().timeZone)
    const lesson = 'lessonId' in screen ? course.unit.lessons.find(({ id }) => id === screen.lessonId) : undefined
    const speakingSession = lesson && state.speakingSessions.find(({ lessonId }) => lessonId === lesson.id)

    function start() {
      if (plan.kind === 'review') go({ type: 'review', cardIds: plan.cardIds, index: 0 })
      else if (plan.kind === 'pedagogy') go({ type: 'pedagogy', phase: plan.phase, lessonId: plan.lessonId })
      else if (plan.kind === 'lesson' || plan.kind === 'practice') go({ type: 'lesson', lessonId: plan.lessonId })
      else if (plan.kind === 'speaking') {
        const selected = course?.unit.lessons.find(({ id }) => id === plan.lessonId)
        if (selected) void update((current) => beginSpeaking(current, selected, nowISO(), crypto.randomUUID()), () => go({ type: 'speaking', lessonId: selected.id }))
      }
    }

    const diagnostic = nextDiagnostic(course, state)
    if (screen.type === 'diagnostic' && diagnostic) content = <DiagnosticView key={diagnostic.exercise.id}
      state={state} course={course} busy={busy} back={() => go({ type: 'home' })}
      submit={(id, answer, played) => update((current) => finishDiagnostic(current, course, id, answer, nowISO(), played),
        (saved) => go({ type: nextDiagnostic(course, saved) ? 'diagnostic' : 'skills' }))} />
    else if (screen.type === 'skills') content = <><SkillProfile state={state} course={course} />
      {diagnostic && <button className="secondary" onClick={() => go({ type: 'diagnostic' })}>Tanılamaya devam et</button>}
      <button className="primary" onClick={() => go({ type: 'home' })}>Günlük planı aç <span aria-hidden>→</span></button></>
    else if (screen.type === 'settings') content = <Settings key={state.profile.id} state={state} busy={busy} notice={setNotice}
      onSave={(profile) => update((current) => ({ ...current, profile }))}
      onRestore={(candidate) => save(() => repository.restore(candidate, state), () => {
        go({ type: 'home' })
        setNotice('Yedek geri yüklendi.')
      })} />
    else if (screen.type === 'lesson' && lesson) {
      const tasks = lessonTasks(state, lesson)
      content = <>
        <header className="page-heading"><div><p className="eyebrow">{languageLabels[course.language]} · {lesson.objective.level}</p>
          <h1>{lesson.title}</h1><p>{lesson.objective.description}</p></div></header>
        {tasks.some(({ exercise }) => exercise.kind !== 'open') && <LessonNotes lesson={lesson} />}
        {lesson.pedagogy && <details><summary>Yazını kontrol etmek için ölçütler</summary>
          <ul>{lesson.pedagogy.rubric.map(({ criterion }) => <li key={criterion}>{criterion}</li>)}</ul>
        </details>}
        <section className="section"><h2>Alıştırma</h2>
          <ExerciseForm key={tasks.map(({ exercise }) => exercise.id).join('|')} tasks={tasks}
            language={course.language} busy={busy}
            onSubmit={(answers) => update((current) => finishLesson(current, course, lesson, answers, nowISO()),
              (saved) => go({ type: 'results', lessonId: lesson.id, attempts: saved.attempts.slice(-tasks.length) }))} />
        </section>
      </>
    } else if (screen.type === 'results' && lesson) content = <LessonResults lesson={lesson}
      attempts={screen.attempts} onContinue={() => go({ type: 'home' })} />
    else if (screen.type === 'pedagogy' && lesson && lesson.pedagogy) {
      const tasks = phaseTasks(state, lesson, screen.phase, now)
      content = <PedagogyView course={course} key={`${lesson.id}:${screen.phase}`} lesson={lesson} phase={screen.phase} tasks={tasks} state={state}
        busy={busy} submit={(answers, listening) => update((current) =>
          finishPedagogy(current, course, lesson, screen.phase, answers, nowISO(), listening),
          (saved) => go({ type: 'pedagogy-results', phase: screen.phase, lessonId: lesson.id,
            retryListening: screen.phase === 'listening' && Boolean(receptionTask(state, lesson, 'listening')?.previous.length),
            attempts: listening === 'unavailable' ? [] : saved.attempts.slice(-tasks.length) }))} />
    } else if (screen.type === 'pedagogy-results' && lesson && lesson.pedagogy) {
      content = <PedagogyResults lesson={lesson} phase={screen.phase} state={state} attempts={screen.attempts} retryListening={screen.retryListening} onContinue={() => go({ type: 'home' })} />
    } else if (screen.type === 'review') {
      const card = course.unit.lessons.flatMap((item) => item.vocabulary).find(({ id }) => id === screen.cardIds[screen.index])
      if (card) {
        const learning = course.unit.lessons.flatMap((item) => item.pedagogy?.vocabulary ?? []).find(({ cardId }) => cardId === card.id)
        const afterReview = () => {
          if (screen.index + 1 < screen.cardIds.length) go({ ...screen, index: screen.index + 1 })
          else { go({ type: 'home' }); setNotice('Kelime tekrarları kaydedildi.') }
        }
        content = <>
          <header className="page-heading"><div><h1>Kelime tekrarı</h1><p>Kart {screen.index + 1} / {screen.cardIds.length}</p></div></header>
          {learning ? <TypedReview key={card.id} card={card} learning={learning} busy={busy}
            grade={(answer) => gradeVocabularyRecall(learning.recall, answer, course.language)}
            onRate={(answer) => update((current) => finishTypedReview(current, course, card.id, answer, nowISO()), afterReview)} />
            : <ReviewCard key={card.id} card={card} index={screen.index} total={screen.cardIds.length} busy={busy}
              onRate={async (result) => { await update((current) => finishReview(current, card.id, result, nowISO()), afterReview) }} />}
        </>
      }
    } else if (screen.type === 'speaking' && lesson && speakingSession) {
      content = <SpeakingView key={speakingSession.id} lesson={lesson} session={speakingSession} state={state} busy={busy}
        onSkip={() => update((current) => ({ ...current, skippedSpeaking: [...new Set([...current.skippedSpeaking, lesson.id])] }),
          () => go({ type: 'home' }))}
        onImport={(report) => update((current) => importReport(current, lesson, report, nowISO()),
          () => { go({ type: 'home' }); setNotice('Rapor kaydedildi ve günlük plan güncellendi.') })} />
    } else {
      const pending = state.speakingSessions.find((session) =>
        !state.speakingAssessments.some(({ report }) => report.sessionId === session.id))
      content = <>
        <Dashboard state={state} course={course} plan={plan} start={start} />
        {diagnostic && <button className="link-button" onClick={() => go({ type: 'diagnostic' })}>Tanılamaya devam et</button>}
        {pending && plan.kind !== 'speaking' && <button className="link-button" onClick={() =>
          go({ type: 'speaking', lessonId: pending.lessonId })}>Hazırlanan konuşma oturumunu aç</button>}
      </>
    }
  }

  return <div className={state ? 'app has-profile' : 'app'}>
    <a className="skip-link" href="#main">İçeriğe geç</a>
    <header className="topbar">
      <button type="button" className="brand" disabled={busy} onClick={() => go({ type: 'home' })}>
        <img src="/icon.svg" width="34" height="34" alt="" /><span>Language <strong>OS</strong></span>
      </button>
      {state && <nav aria-label="Ana menü">
        <button disabled={busy} onClick={() => go({ type: 'home' })} aria-current={screen.type === 'home' ? 'page' : undefined}>Plan</button>
        {state.placementAt && <button disabled={busy} onClick={() => go({ type: 'skills' })} aria-current={screen.type === 'skills' ? 'page' : undefined}>Beceri profili</button>}
        <button disabled={busy} onClick={() => go({ type: 'settings' })} aria-current={screen.type === 'settings' ? 'page' : undefined}>Ayarlar</button>
      </nav>}
      {course && <span className="top-language">{languageLabels[course.language]} · {course.level}</span>}
    </header>
    <main id="main" tabIndex={-1} ref={mainRef} className={state ? 'workspace' : 'workspace welcome'}>
      {error && <p className="notice error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      <Suspense fallback={<p role="status">Çalışma açılıyor…</p>}>{content}</Suspense>
    </main>
    <footer><span>Language OS</span><span>İlerleme bu tarayıcıda saklanır.</span></footer>
  </div>
}

function SettingsRestore({ busy, restore }: { busy: boolean; restore: (state: LearningState) => Promise<boolean> }) {
  const [file, setFile] = useState<File>()
  const [error, setError] = useState('')
  return <div className="backup-inline">
    <input type="file" accept=".json,application/json" aria-label="Yedek dosyası" onChange={(event) => setFile(event.target.files?.[0])} />
    <button className="secondary" disabled={busy || !file} onClick={async () => {
      if (!file) return
      setError('')
      try {
        if (file.size > 10_000_000) throw new Error('Yedek 10 MB sınırını aşıyor.')
        await restore(parseBackup(await file.text()))
      } catch { setError('Dosya geçerli bir Language OS yedeği olarak doğrulanamadı.') }
    }}>Yedeği geri yükle</button>
    {error && <p role="alert">{error}</p>}
  </div>
}
