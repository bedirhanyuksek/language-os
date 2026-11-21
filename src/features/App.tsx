import { useCallback, type ReactNode, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { catalog } from '../content/catalog'
import { vocabularyIndex } from '../content/vocabulary'
import { beginSpeaking, dailyPlan, finishLesson, finishPlacement, finishDiagnostic, finishReview, finishPedagogy, finishTypedReview, importReport, lessonTasks, isUnlocked } from '../domain/progress'
import { assessmentItem, beginPlacementTrack, finishMiniPlacement, nextPlacementItem, recordPlacementSample, upcomingPlacement } from '../domain/adaptive-placement'
import { PlacementView } from './PlacementView'
import { nextDiagnostic } from '../domain/diagnostic'
import type { Course } from '../content/schema'
import { phaseMinutes, studyContentRevision, studyKey, type StudyDefinition, type StudyDraft, type StudyTask } from '../domain/study-session'
import { vocabularyMinutes } from '../domain/vocabulary-load'
import { StudySession } from './StudySession'
import type { StudyControls } from './study-session-context'
import { DiagnosticView } from './DiagnosticView'
import { phaseTasks, gradeVocabularyRecall, receptionTask } from '../domain/pedagogy'
import type { Answer, ExerciseAttempt, Language, PedagogyPhase } from '../domain/model'
import { initialState, type LearningState } from '../domain/state'
import { IndexedLearningRepository, localLearningOrigin, parseBackup, studyCursor, type QuarantineNotice } from '../persistence/repository'
import type { MigrationIssue } from '../persistence/migration'
import { StorageAccessError, storageIssue as describeStorageIssue, type StorageIssue } from '../persistence/storage-error'
import { ExerciseForm } from './ExerciseForm'
import { SpanishPlacement } from './SpanishPlacement'
import { languageLabels, skillLabels } from './labels'
import { ProfileForm } from './ProfileForm'
import { TutorSettings } from './TutorPanel'
import { Settings } from './Settings'
import { SpeakingView } from './SpeakingView'
import { Dashboard, LessonStudy, LessonNotes, LessonResults, ReviewCard, SkillProfile } from './StudyViews'

type Screen =
  | { type: 'home' | 'skills' | 'settings' | 'diagnostic' | 'assessment' | 'assessment-paused' }
  | { type: 'lesson' | 'speaking' | 'explanation'; lessonId: string }
  | { type: 'pedagogy'; phase: PedagogyPhase; lessonId: string; vocabularyCardIds?: string[] }
  | { type: 'pedagogy-results'; phase: PedagogyPhase; lessonId: string; attempts: ExerciseAttempt[]; retryListening?: boolean }
  | { type: 'results'; lessonId: string; attempts: ExerciseAttempt[] }
  | { type: 'review'; cardIds: string[]; index: number }

const PedagogyView = lazy(() => import('./PedagogyView').then((module) => ({ default: module.PedagogyView })))
const PedagogyResults = lazy(() => import('./PedagogyView').then((module) => ({ default: module.PedagogyResults })))
const TypedReview = lazy(() => import('./PedagogyView').then((module) => ({ default: module.TypedReview })))

const repository = new IndexedLearningRepository()
const nowISO = () => new Date().toISOString()

function withStudyBudget(state: LearningState, budget: number) {
  return state.profile.minutes === budget ? state : { ...state, profile: { ...state.profile, minutes: budget } }
}

function defineStudy(state: LearningState, course: Course, task: StudyTask, now: string): StudyDefinition | undefined {
  const lesson = 'lessonId' in task ? course.unit.lessons.find(({ id }) => id === task.lessonId) : undefined
  if (lesson && !isUnlocked(state, course, lesson)) return
  const selected = task.kind === 'pedagogy' ? task.vocabularyCardIds : undefined
  const supplemental = new Set(lesson?.vocabulary.filter((card) => card.supplemental).map(({ id }) => id))
  // Supplemental cards do not change the content revision of pre-existing lesson drafts.
  const teaching = lesson?.teaching && supplemental.size
    ? { ...lesson.teaching, vocabulary: lesson.teaching.vocabulary.filter(({ cardId }) => !supplemental.has(cardId) || selected?.includes(cardId)) }
    : lesson?.teaching
  let itemIds: string[] = []
  let minutes = 0
  let content: unknown
  let reason: StudyDefinition['reason'] = 'new_learning'
  if (task.kind === 'placement' && !state.placementAt) {
    itemIds = course.placement.map(({ exercise }) => exercise.id)
    content = course.placement
  }
  if (task.kind === 'placement') reason = 'new_assessment'
  if (task.kind === 'assessment') {
    const item = assessmentItem(task.itemId)
    if (item && item.route === state.placementTrack?.route && !state.placementTrack.samples.some(({ itemId }) => itemId === item.id)) {
      itemIds = [item.id]
      content = item
      reason = 'new_assessment'
    }
  }
  if (task.kind === 'diagnostic' && state.placementAt) {
    reason = 'new_assessment'
    const diagnostic = nextDiagnostic(course, state)
    if (diagnostic) {
      itemIds = [diagnostic.exercise.id]
      content = [diagnostic.exercise, diagnostic.passage, diagnostic.audio]
    }
  }
  if (task.kind === 'lesson' && lesson) {
    const tasks = lessonTasks(state, lesson)
    itemIds = tasks.map(({ exercise }) => exercise.id)
    content = [tasks, teaching, lesson.pedagogy?.rubric]
    const writing = tasks.every(({ exercise }) => exercise.kind === 'open')
    minutes = writing ? 3 : lesson.minutes
    if (writing) reason = 'new_assessment'
    else if (state.attempts.some(({ lessonId, context, evidence }) =>
      lessonId === lesson.id && context === 'lesson' && evidence.outcome === 'incorrect')) reason = 'guided_repair'
  }
  if (task.kind === 'pedagogy' && lesson) {
    const tasks = phaseTasks(state, lesson, task.phase, now, selected)
    itemIds = tasks.map(({ exercise }) => exercise.id)
    const reception = task.phase === 'reading' || task.phase === 'listening' ? receptionTask(state, lesson, task.phase) : undefined
    const vocabulary = task.phase === 'vocabulary' ? lesson.vocabulary.filter(({ id }) => !supplemental.has(id) || selected?.includes(id)) : undefined
    content = [tasks, reception?.material, teaching, vocabulary]
    minutes = selected ? vocabularyMinutes(selected.length) : phaseMinutes[task.phase]
    reason = task.phase === 'foundation' ? 'prerequisite' : task.phase === 'delayed' ? 'due_review' :
      task.phase === 'revision' ? 'writing_revision' : task.phase === 'vocabulary' ? 'new_learning' : 'new_assessment'
  }
  if (task.kind === 'review' && state.reviews.some(({ cardId, dueAt }) => cardId === task.cardId && dueAt <= now)) {
    const entry = vocabularyIndex(course).get(task.cardId)
    if (entry) {
      itemIds = [task.cardId]
      content = [entry.card, entry.learning]
    }
    minutes = 1
    reason = 'due_review'
  }
  return itemIds.length ? { task, itemIds, minutes, reason, budget: state.profile.minutes, contentVersion: course.version, contentRevision: studyContentRevision(content) } : undefined
}

function canResume(state: LearningState, course: Course, draft: StudyDraft) {
  const current = defineStudy(withStudyBudget(state, draft.budget), course, draft.task, draft.openedAt)
  return Boolean(current && studyKey(current) === studyKey(draft))
}

function resumeScreen(task: StudyTask): Screen {
  if (task.kind === 'review') return { type: 'review', cardIds: [task.cardId], index: 0 }
  if (task.kind === 'lesson') return { type: 'lesson', lessonId: task.lessonId }
  if (task.kind === 'pedagogy') return { type: 'pedagogy', lessonId: task.lessonId, phase: task.phase, vocabularyCardIds: task.vocabularyCardIds }
  return { type: task.kind === 'diagnostic' || task.kind === 'assessment' ? task.kind : 'home' }
}


export function App() {
  const [state, setState] = useState<LearningState>()
  const [ready, setReady] = useState(false)
  const [storageIssue, setStorageIssue] = useState<StorageIssue>()
  const [quarantine, setQuarantine] = useState<QuarantineNotice[]>([])
  const [allowNewProfile, setAllowNewProfile] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetBlocked, setResetBlocked] = useState(false)
  const [resetError, setResetError] = useState('')
  const resetInFlight = useRef(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [newLanguage, setNewLanguage] = useState<Language>()
  const [screen, setScreen] = useState<Screen>(() => ({
    type: new URLSearchParams(window.location.search).get('chatgpt') === 'return' ? 'settings' : 'home',
  }))
  const [now, setNow] = useState(nowISO)
  const inFlight = useRef(false)
  const studyQueue = useRef(Promise.resolve())
  const onStoredDraft = useCallback((profileId: string, draft: StudyDraft) => {
    setState((current) => {
      if (!current || current.profile.id !== profileId) return current
      const drafts = current.studyDrafts ?? []
      const prior = drafts.find(({ id }) => id === draft.id)
      if (prior && prior.revision >= draft.revision) return current
      return { ...current, studyDrafts: [...drafts.filter(({ id }) => id !== draft.id), draft] }
    })
  }, [])
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('chatgpt') === 'return') window.history.replaceState(null, '', '/')
    let active = true
    const unsubscribe = repository.onBlocked(() => {
      if (resetInFlight.current) setResetBlocked(true)
      else if (active) setStorageIssue(describeStorageIssue('upgrade', { name: 'BlockedError' }))
    })
    repository.openWorkspace().then(({ state: saved, quarantine: notices }) => {
      if (!active || resetInFlight.current) return
      setState(saved)
      setQuarantine(notices)
      setStorageIssue(undefined)
      setReady(true)
    }).catch((cause: unknown) => {
      if (!active || resetInFlight.current) return
      setStorageIssue(cause instanceof StorageAccessError
        ? describeStorageIssue(cause.operation, cause.cause, cause.issues) : describeStorageIssue('open', cause))
    })
    const timer = window.setInterval(() => setNow(nowISO()), 30_000)
    return () => { active = false; unsubscribe(); window.clearInterval(timer) }
  }, [])

  function go(next: Screen) {
    setNewLanguage(undefined)
    setError('')
    setNotice('')
    setNow(nowISO())
    setScreen(next)
    window.scrollTo(0, 0)
    mainRef.current?.focus()
  }

  async function save(work: () => Promise<LearningState | undefined>, after?: (saved: LearningState) => void, missing?: () => void) {
    if (inFlight.current) return false
    inFlight.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await studyQueue.current
      const saved = await work()
      if (!saved) { missing?.(); return false }
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

  async function resetLocalData() {
    if (!confirmReset || resetInFlight.current || inFlight.current) return
    resetInFlight.current = true
    setResetting(true)
    setResetError('')
    try {
      await repository.resetLocalData(window.location.origin)
      window.location.reload()
    } catch {
      setResetError('Yerel veriler sıfırlanamadı. Sayfayı yeniden yükleyip tekrar dene.')
      resetInFlight.current = false
      setResetting(false)
      setResetBlocked(false)
    }
  }

  const course = catalog[state?.profile.language ?? 'en']
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const assessment = state && nextPlacementItem(state, now, timeZone)
  function study(task: StudyTask, render: (session: StudyControls) => ReactNode) {
    if (!state) return
    const existing = [...(state.studyDrafts ?? [])].reverse().find((draft) =>
      JSON.stringify(draft.task) === JSON.stringify(task) && canResume(state, course, draft))
    const definition = existing ? { task, contentVersion: existing.contentVersion, contentRevision: existing.contentRevision, itemIds: existing.itemIds,
      minutes: existing.minutes, budget: existing.budget, reason: existing.reason } : defineStudy(state, course, task, now)
    if (!definition) return <p className="notice">Bu çalışma değişti. Günlük plana dönüp yeni çalışmayı açabilirsin.</p>
    return <StudySession key={`${state.profile.id}:${studyKey(definition)}`} profileId={state.profile.id}
      definition={definition} cursor={studyCursor(state)} repository={repository} queue={studyQueue} onStored={onStoredDraft}>
      {render}
    </StudySession>
  }

  function completeStudy(session: StudyControls, change: (current: LearningState) => LearningState,
    after: (saved: LearningState) => void) {
    if (!state) return Promise.resolve(false)
    return save(() => {
      const draft = session.snapshot()
      return repository.completeStudy(state.profile.id, draft.id, draft.revision, draft.elapsedSeconds, (current, stored) => {
        if (!canResume(current, course, stored)) throw new Error('Bu çalışma değişti. Günlük planı yeniden aç.')
        return { ...change(withStudyBudget(current, stored.budget)), profile: current.profile }
      })
    }, after)
  }

  function placement(item: NonNullable<typeof assessment>, mini: boolean) {
    return study({ kind: 'assessment', itemId: item.id }, (session) => <PlacementView
      item={item} language={course.language} busy={busy} mini={mini}
      submit={(status, answer, audioPlayed, transcript) => completeStudy(session, (current) =>
        recordPlacementSample(current, item.id, { status, answer, audioPlayed, transcript }, nowISO(), timeZone),
        (saved) => go(mini && !saved.placementAt ? { type: 'assessment' } : { type: 'skills' }))}
      leave={() => go({ type: mini ? 'assessment-paused' : 'home' })}
      startLearning={mini ? () => void update((current) => finishMiniPlacement(current, nowISO()), () => go({ type: 'skills' })) : undefined}
    />)
  }

  let content
  if (resetting) {
    content = <p role="status">{resetBlocked
      ? 'Sıfırlama bekliyor. Bu adresteki diğer Language OS sekmelerini kapat.'
      : 'Language OS veritabanı sıfırlanıyor…'}</p>
  } else if (screen.type === 'settings' && !state) {
    content = <><header className="page-heading"><h1>Ayarlar</h1></header><TutorSettings /></>
  } else if (!ready) {
    content = storageIssue ? <button className="primary" onClick={() => window.location.reload()}>Yeniden dene</button> : <p role="status" className="loading">Yerel kayıt açılıyor…</p>
  } else if (!state && quarantine.some(({ active }) => active) && !allowNewProfile) {
    content = <section className="surface">
      <h1>Önceki profil koruma altında</h1>
      <p>Önceki ilerleme henüz yüklenemedi. Teknik ayrıntıları paylaşarak uygun geçişin belirlenmesini sağlayabilirsin.</p>
      <button className="secondary" onClick={() => setAllowNewProfile(true)}>Ayrı bir yeni profille devam et</button>
    </section>
  } else if (!state || !course) {
    content = <div className="onboarding">
      <header className="onboarding-intro"><p className="eyebrow">Kişisel öğrenme stüdyosu</p>
        <h1>Öğrenme planını kur.</h1><p className="lede">Dilini, hedefini ve çalışma zamanını seç. Kısa bir taramayla başlayacağız.</p>
        <div className="specimen" aria-hidden="true">
          <span className="specimen-glyph specimen-latin" lang="en">Aa</span>
          <span className="specimen-glyph specimen-cyrillic" lang="ru">Яя</span>
          <span className="specimen-note specimen-note-latin">Latin · 26 harf</span>
          <span className="specimen-note specimen-note-cyrillic" lang="ru">Кириллица · 33 буквы</span>
        </div></header>
      <section className="surface onboarding-form">
        <ProfileForm busy={busy} onSave={(profile) => save(() => repository.create(beginPlacementTrack(initialState(profile), nowISO())), () => go({ type: 'home' }))} />
        <details><summary>Önceden kaydedilmiş bir yedeğin var mı?</summary>
          <SettingsRestore busy={busy} restore={(candidate) => save(() => repository.restore(candidate, undefined), () => go({ type: 'home' }))} />
        </details>
      </section>
    </div>
  } else if (newLanguage) {
    content = <section className="surface">
      <h1>{languageLabels[newLanguage]} çalışma planını kur</h1>
      <ProfileForm key={newLanguage} fixedLanguage={newLanguage} busy={busy} onSave={(profile) =>
        save(() => repository.switchLanguage(state.profile.id, newLanguage, beginPlacementTrack(initialState(profile), nowISO())), () => go({ type: 'home' }))} />
      <button className="secondary" disabled={busy} onClick={() => go({ type: 'home' })}>Vazgeç</button>
    </section>
  } else if (state.placementTrack && !state.placementAt && screen.type !== 'settings') {
    content = screen.type === 'assessment-paused' || !assessment
      ? <section className="surface section"><h1>Başlangıç taraması</h1>
        <p>Yerel kaydın saklandı. Tarama hazır olduğunda devam edebilir veya ilk dersi açabilirsin.</p>
        {assessment && <button className="primary" onClick={() => go({ type: 'assessment' })}>Devam et</button>}
        <button className="secondary" disabled={busy}
          onClick={() => void update((current) => finishMiniPlacement(current, nowISO()), () => go({ type: 'skills' }))}>Öğretime geç</button>
      </section> : placement(assessment, true)
  } else if (!state.placementAt && screen.type !== 'settings') {
    content = <>
      <header className="page-heading"><div><p className="eyebrow">{languageLabels[course.language]} · {course.placement.length} soru</p>
        <h1>Başlangıç taraması</h1><p>Elinden geldiğince yanıtla. Sonuçlar çalışma planın için ilk ipuçlarını verir.</p></div></header>
      {study({ kind: 'placement' }, (session) => {
        const submit = (answers: Record<string, Answer> | null) => completeStudy(session,
          (current) => finishPlacement(current, course, answers, nowISO()), () => go({ type: 'skills' }))
        return course.language === 'es'
          ? <SpanishPlacement course={course} busy={busy} onSubmit={submit} />
          : <ExerciseForm key={course.id} placement language={course.language} busy={busy}
            tasks={course.placement.map(({ exercise, objectiveId }) => ({ exercise, conceptId: objectiveId, label: skillLabels[exercise.skill] }))}
            onSubmit={submit} />
      })}
    </>
  } else {
    const plan = dailyPlan(state, course, now, timeZone)
    const lesson = 'lessonId' in screen ? course.unit.lessons.find(({ id }) => id === screen.lessonId) : undefined
    const speakingSession = lesson && state.speakingSessions.find(({ lessonId }) => lessonId === lesson.id)

    function start(selectedPlan = plan) {
      const plan = selectedPlan
      if (plan.kind === 'assessment_gap') go({ type: 'explanation', lessonId: plan.lessonId })
      else if (plan.kind === 'review') go({ type: 'review', cardIds: plan.cardIds, index: 0 })
      else if (plan.kind === 'pedagogy') go({ type: 'pedagogy', phase: plan.phase, lessonId: plan.lessonId, vocabularyCardIds: plan.vocabularyCardIds })
      else if (plan.kind === 'lesson' || plan.kind === 'practice') go({ type: 'lesson', lessonId: plan.lessonId })
      else if (plan.kind === 'speaking') {
        const selected = course?.unit.lessons.find(({ id }) => id === plan.lessonId)
        if (selected) void update((current) => beginSpeaking(current, selected, nowISO(), crypto.randomUUID()), () => go({ type: 'speaking', lessonId: selected.id }))
      }
    }

    const diagnostic = state.placementTrack?.origin === 'new' ? undefined : nextDiagnostic(course, state)
    const upcoming = state.placementTrack && upcomingPlacement(state, now, timeZone)
    const assessmentAction = assessment
      ? <section className="surface section"><p>Sıradaki ek örnek · {skillLabels[assessment.skill]} · {assessment.focus}</p>
        <button className="secondary" onClick={() => go({ type: 'assessment' })}>Ek değerlendirmeyi aç</button></section>
      : upcoming ? <p className="notice">Sonraki uygun çalışma gününde {skillLabels[upcoming.item.skill].toLocaleLowerCase('tr')} için farklı bir örnek açılacak.</p>
      : !state.placementTrack && course.language !== 'es' ? <button className="link-button" disabled={busy}
        onClick={() => void update((current) => beginPlacementTrack(current, nowISO()), () => go({ type: 'assessment' }))}>
        İsteğe bağlı ek değerlendirmeyi başlat
      </button> : null
    if (screen.type === 'assessment' && assessment) content = placement(assessment, false)
    else if (screen.type === 'diagnostic' && diagnostic) content = study({ kind: 'diagnostic' }, (session) => <DiagnosticView key={diagnostic.exercise.id}
      state={state} course={course} busy={busy} back={() => go({ type: 'home' })}
      submit={(id, answer, played) => completeStudy(session, (current) => finishDiagnostic(current, course, id, answer, nowISO(), played),
        (saved) => go({ type: nextDiagnostic(course, saved) ? 'diagnostic' : 'skills' }))} />)
    else if (screen.type === 'skills') content = <><SkillProfile state={state} course={course} plan={plan} now={now} />
      {assessmentAction}
      {diagnostic && <button className="secondary" onClick={() => go({ type: 'diagnostic' })}>Tanılamaya devam et</button>}
      <button className="primary" onClick={() => go({ type: 'home' })}>Günlük planı aç <span aria-hidden>→</span></button></>
    else if (screen.type === 'settings') content = <Settings key={state.profile.id} state={state} busy={busy} notice={setNotice}
      onSave={(profile) => update((current) => ({ ...current, profile }))}
      onRestore={(candidate) => save(() => repository.restore(candidate, state), () => {
        go({ type: 'home' })
        setNotice('Yedek geri yüklendi.')
      })} />
    else if (screen.type === 'explanation' && lesson) content = <>
      <header className="page-heading"><div><h1>{lesson.title}</h1>
        <p>Önceki örnekleri gözden geçir. Yeni değerlendirme örneği bekleniyor; bu gözden geçirme puanlanmaz.</p></div></header>
      <LessonNotes lesson={lesson} state={state} />
      <button className="primary" onClick={() => go({ type: 'home' })}>Günlük plana dön</button>
    </>
    else if (screen.type === 'lesson' && lesson) {
      const tasks = lessonTasks(state, lesson)
      content = study({ kind: 'lesson', lessonId: lesson.id }, (session) => <>
        <header className="page-heading"><div><p className="eyebrow">{languageLabels[course.language]} · {lesson.objective.level}</p>
          <h1>{lesson.title}</h1><p>{lesson.objective.description}</p></div></header>
        <LessonStudy key={tasks.map(({ exercise }) => exercise.id).join('|')} tasks={tasks}
          lesson={lesson} state={state} busy={busy}
          onSubmit={(answers) => completeStudy(session, (current) => finishLesson(current, course, lesson, answers, nowISO()),
            (saved) => go({ type: 'results', lessonId: lesson.id, attempts: saved.attempts.slice(-tasks.length) }))} />
      </>)
    } else if (screen.type === 'results' && lesson) content = <LessonResults lesson={lesson} state={state}
      attempts={screen.attempts} onContinue={() => go({ type: 'home' })} />
    else if (screen.type === 'pedagogy' && lesson && lesson.pedagogy) {
      const selected = screen.vocabularyCardIds
      content = study({ kind: 'pedagogy', lessonId: lesson.id, phase: screen.phase, ...(selected && { vocabularyCardIds: selected }) }, (session) => {
        const tasks = phaseTasks(withStudyBudget(state, session.draft.budget), lesson, screen.phase, session.draft.openedAt, selected)
        return <PedagogyView course={course} lesson={lesson} phase={screen.phase} tasks={tasks} state={state}
          busy={busy} submit={(answers, listening) => completeStudy(session, (current) =>
            finishPedagogy(current, course, lesson, screen.phase, answers, nowISO(), listening, session.draft.openedAt, selected),
            (saved) => go({ type: 'pedagogy-results', phase: screen.phase, lessonId: lesson.id,
              retryListening: screen.phase === 'listening' && Boolean(receptionTask(state, lesson, 'listening')?.previous.length),
              attempts: listening === 'unavailable' ? [] : saved.attempts.slice(-tasks.length) }))} />
      })
    } else if (screen.type === 'pedagogy-results' && lesson && lesson.pedagogy) {
      content = <PedagogyResults lesson={lesson} phase={screen.phase} state={state} attempts={screen.attempts} retryListening={screen.retryListening} onContinue={() => go({ type: 'home' })} />
    } else if (screen.type === 'review') {
      const entry = vocabularyIndex(course).get(screen.cardIds[screen.index])
      if (entry) {
        const { card, learning } = entry
        const afterReview = () => {
          if (screen.index + 1 < screen.cardIds.length) go({ ...screen, index: screen.index + 1 })
          else { go({ type: 'home' }); setNotice('Kelime tekrarları kaydedildi.') }
        }
        content = study({ kind: 'review', cardId: card.id }, (session) => <>
          <header className="page-heading"><div><h1>Kelime tekrarı</h1><p>Kart {screen.index + 1} / {screen.cardIds.length}</p></div></header>
          {learning ? <TypedReview key={card.id} card={card} learning={learning} language={course.language} busy={busy}
            grade={(answer) => gradeVocabularyRecall(learning.recall, answer, course.language)}
            onRate={(answer) => completeStudy(session, (current) => finishTypedReview(current, course, card.id, answer, nowISO()), afterReview)} />
            : <ReviewCard key={card.id} card={card} index={screen.index} total={screen.cardIds.length} busy={busy}
              onRate={async (result) => { await completeStudy(session, (current) => finishReview(current, card.id, result, nowISO()), afterReview) }} />}
        </>)
      }
    } else if (screen.type === 'speaking' && lesson && speakingSession) {
      content = <SpeakingView key={speakingSession.id} lesson={lesson} session={speakingSession} state={state} plan={plan} busy={busy}
        onContinue={() => go({ type: 'home' })}
        onSkip={() => update((current) => ({ ...current, skippedSpeaking: [...new Set([...current.skippedSpeaking, lesson.id])] }),
          () => go({ type: 'home' }))}
        onImport={(report) => update((current) => importReport(current, lesson, report, nowISO()),
          () => { window.scrollTo(0, 0); mainRef.current?.focus(); setNotice('Rapor kaydedildi ve günlük plan güncellendi.') })} />
    } else {
      const pending = state.speakingSessions.find((session) =>
        !state.speakingAssessments.some(({ report }) => report.sessionId === session.id))
      const savedDrafts = [...(state.studyDrafts ?? [])].reverse()
      const resume = savedDrafts.find((draft) => canResume(state, course, draft) &&
        (draft.task.kind !== 'assessment' || draft.task.itemId === assessment?.id))
      const resumeLessonId = resume && 'lessonId' in resume.task ? resume.task.lessonId : undefined
      content = <>
        {resume && <section className="surface section">
          <h2>Yarım kalan çalışma</h2>
          <p>{resumeLessonId ? course.unit.lessons.find(({ id }) => id === resumeLessonId)?.title :
            resume.task.kind === 'review' ? 'Kelime tekrarı' : 'Başlangıç tanılaması'}
            {resume.minutes > 0 && ` · Yaklaşık ${resume.minutes} dk`}</p>
          <p>Kaydedilen adım, taslak ve açtığın desteklerle devam et.</p>
          <button className="primary" onClick={() => go(resumeScreen(resume.task))}>Devam et</button>
        </section>}
        {!resume && savedDrafts.some((draft) => !canResume(state, course, draft)) && <p className="notice">Bir taslağın içeriği veya öğretim ön koşulu değişti. Taslak yerel kayıtta ve yedekte korundu; gerekli öğretimden sonra yeniden değerlendirilecek.</p>}
        <Dashboard state={state} course={course} plan={plan} start={() => start()} choose={start} now={now} />
        {assessmentAction}
        {diagnostic && <button className="link-button" onClick={() => go({ type: 'diagnostic' })}>Tanılamaya devam et</button>}
        {state.speakingAssessments.length > 0 && <details className="section">
          <summary>Kaydedilen konuşma raporları</summary>
          <ul>{[...state.speakingAssessments].reverse().map(({ report }) => <li key={report.sessionId}>
            <button className="link-button" onClick={() => go({ type: 'speaking', lessonId: report.lessonId })}>
              {course.unit.lessons.find(({ id }) => id === report.lessonId)?.title}
            </button>
          </li>)}</ul>
        </details>}
        {pending && plan.kind !== 'speaking' && <button className="link-button" onClick={() =>
          go({ type: 'speaking', lessonId: pending.lessonId })}>Hazırlanan konuşma oturumunu aç</button>}
      </>
    }
  }

  return <div className={state ? 'app has-profile' : 'app'}>
    <a className="skip-link" href="#main">İçeriğe geç</a>
    <header className="topbar">
      <button type="button" className="brand" disabled={busy} onClick={() => go({ type: 'home' })}>
        <img src="/icon.svg" width="30" height="30" alt="" /><span>Language <strong>OS</strong></span>
      </button>
      <nav aria-label="Ana menü">
        {state && <button disabled={busy || resetting} onClick={() => go({ type: 'home' })} aria-current={screen.type === 'home' ? 'page' : undefined}>Plan</button>}
        {state?.placementAt && <button disabled={busy || resetting} onClick={() => go({ type: 'skills' })} aria-current={screen.type === 'skills' ? 'page' : undefined}>Beceri profili</button>}
        <button disabled={busy || resetting} onClick={() => go({ type: 'settings' })} aria-current={screen.type === 'settings' ? 'page' : undefined}>Ayarlar</button>
      </nav>
      {state && !storageIssue && <label className="top-language">Çalışma dili <select aria-label="Çalışma dili"
        value={newLanguage ?? state.profile.language} disabled={busy || resetting}
        onChange={(event) => {
          const language = event.target.value as Language
          if (language === state.profile.language) go({ type: 'home' })
          else void save(() => repository.switchLanguage(state.profile.id, language), () => go({ type: 'home' }),
            () => { go({ type: 'home' }); setNewLanguage(language) })
        }}>
        <option value="en">İngilizce</option><option value="ru">Rusça</option><option value="es">İspanyolca</option>
      </select></label>}
    </header>
    <main id="main" tabIndex={-1} ref={mainRef} className={state ? 'workspace' : 'workspace welcome'}>
      {storageIssue && <section className="notice error">
        <p role="alert">Tarayıcı yerel kaydı açamadı. {storageIssue.advice}</p>
        <details><summary>Teknik ayrıntılar</summary>
          <p>Adres <code>{window.location.origin}</code></p>
          <p>İşlem <code>{{ open: 'IndexedDB.open(language-os)', read: 'workspace.get(active)',
            validate: 'workspace.get(active) → kayıt doğrulama', upgrade: 'IndexedDB sürüm geçişi' }[storageIssue.operation]}</code></p>
          <p>Hata türü <code>{storageIssue.type}{storageIssue.innerType && ` → ${storageIssue.innerType}`}</code></p>
          {storageIssue.issues && <MigrationIssueList issues={storageIssue.issues} />}
        </details>
      </section>}
      {quarantine.length > 0 && <section className="notice">
        <p role="status">Doğrulanamayan {quarantine.length} öğrenme kaydı özgün içeriğiyle yerelde korumaya alındı.</p>
        <details><summary>Geçişin teknik ayrıntıları</summary>
          {quarantine.map(({ id, active, sourceVersion, targetVersion, issues }) => <div key={id}>
            <p>{active ? 'Etkin profil' : 'Diğer çalışma kaydı'} · IndexedDB şeması {sourceVersion} → {targetVersion} · ZodError</p>
            <MigrationIssueList issues={issues} />
          </div>)}
        </details>
      </section>}
      {window.location.origin === localLearningOrigin && !resetting &&
        (storageIssue || quarantine.length > 0 || (screen.type === 'settings' && state)) &&
        <section className="surface section" aria-label="Yerel veri sıfırlama">
          {confirmReset ? <>
            <h2>Yerel veriler silinsin mi?</h2>
            <p>Bu Chrome profilinde {localLearningOrigin} adresindeki Language OS veritabanı silinir.
              Profil, ilerleme, öğrenci yanıtları, kelime tekrarları, konuşma raporları ve korumaya alınan kayıtlar geri alınamaz.</p>
            <p>Diğer adreslerin verileri, tarayıcı önbelleği, indirilen yedekler ve ChatGPT hesap bağlantısı korunur.</p>
            <div className="button-row">
              <button className="secondary" disabled={busy} onClick={() => setConfirmReset(false)}>Vazgeç</button>
              <button className="primary" disabled={busy} onClick={() => void resetLocalData()}>Yerel verileri kalıcı olarak sil</button>
            </div>
          </> : <button className="secondary" disabled={busy} onClick={() => setConfirmReset(true)}>Yerel verileri sıfırla</button>}
          {resetError && <p role="alert">{resetError}</p>}
        </section>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      <Suspense fallback={<p role="status" className="loading">Çalışma açılıyor…</p>}>{content}</Suspense>
    </main>
    <footer><span>Language OS</span><span>İlerleme bu tarayıcıda saklanır.</span></footer>
  </div>
}

function MigrationIssueList({ issues }: { issues: readonly MigrationIssue[] }) {
  return <ul>{issues.map((issue, index) => <li key={index}>
    {issue.recordType} · <code>{issue.path}</code> · <code>{issue.code}</code>
    {issue.expected && <> · Beklenen <code>{issue.expected}</code></>}
    {issue.contentVersion && <> · İçerik v{issue.contentVersion}</>}
    {issue.reportVersion && <> · Rapor v{issue.reportVersion}</>}
  </li>)}</ul>
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
