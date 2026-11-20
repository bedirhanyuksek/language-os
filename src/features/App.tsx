import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { catalog } from '../content/catalog'
import { beginSpeaking, dailyPlan, finishLesson, finishPlacement, finishDiagnostic, finishReview, finishPedagogy, finishTypedReview, importReport, lessonTasks } from '../domain/progress'
import { nextDiagnostic } from '../domain/diagnostic'
import { DiagnosticView } from './DiagnosticView'
import { phaseTasks, gradeVocabularyRecall, receptionTask } from '../domain/pedagogy'
import type { ExerciseAttempt, Language, PedagogyPhase } from '../domain/model'
import { initialState, type LearningState } from '../domain/state'
import { IndexedLearningRepository, localLearningOrigin, parseBackup, type QuarantineNotice } from '../persistence/repository'
import type { MigrationIssue } from '../persistence/migration'
import { StorageAccessError, storageIssue as describeStorageIssue, type StorageIssue } from '../persistence/storage-error'
import { ExerciseForm } from './ExerciseForm'
import { SpanishPlacement } from './SpanishPlacement'
import { languageLabels, skillLabels } from './labels'
import { ProfileForm } from './ProfileForm'
import { TutorSettings } from './TutorPanel'
import { Settings } from './Settings'
import { SpeakingView } from './SpeakingView'
import { Dashboard, LessonStudy, LessonResults, ReviewCard, SkillProfile } from './StudyViews'

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

  const course = state && catalog[state.profile.language]
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
        <ProfileForm busy={busy} onSave={(profile) => save(() => repository.create(initialState(profile)), () => go({ type: 'home' }))} />
        <details><summary>Önceden kaydedilmiş bir yedeğin var mı?</summary>
          <SettingsRestore busy={busy} restore={(candidate) => save(() => repository.restore(candidate, undefined), () => go({ type: 'home' }))} />
        </details>
      </section>
    </div>
  } else if (newLanguage) {
    content = <section className="surface">
      <h1>{languageLabels[newLanguage]} çalışma planını kur</h1>
      <ProfileForm key={newLanguage} fixedLanguage={newLanguage} busy={busy} onSave={(profile) =>
        save(() => repository.switchLanguage(state.profile.id, newLanguage, initialState(profile)), () => go({ type: 'home' }))} />
      <button className="secondary" disabled={busy} onClick={() => go({ type: 'home' })}>Vazgeç</button>
    </section>
  } else if (!state.placementAt && screen.type !== 'settings') {
    content = <>
      <header className="page-heading"><div><p className="eyebrow">{languageLabels[course.language]} · {course.placement.length} soru</p>
        <h1>Başlangıç taraması</h1><p>Elinden geldiğince yanıtla. Sonuçlar çalışma planın için ilk ipuçlarını verir.</p></div></header>
      {course.language === 'es' ? <SpanishPlacement course={course} busy={busy}
        onSubmit={(answers) => update((current) => finishPlacement(current, course, answers, nowISO()), () => go({ type: 'skills' }))} /> :
      <ExerciseForm key={course.id} placement language={course.language} busy={busy}
        tasks={course.placement.map(({ exercise, objectiveId }) => ({ exercise, conceptId: objectiveId, label: skillLabels[exercise.skill] }))}
        onSubmit={(answers) => update((current) => finishPlacement(current, course, answers, nowISO()), () => go({ type: 'skills' }))} />}
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
    else if (screen.type === 'skills') content = <><SkillProfile state={state} course={course} plan={plan} now={now} />
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
        <LessonStudy key={tasks.map(({ exercise }) => exercise.id).join('|')} tasks={tasks}
          lesson={lesson} state={state} busy={busy}
          onSubmit={(answers) => update((current) => finishLesson(current, course, lesson, answers, nowISO()),
            (saved) => go({ type: 'results', lessonId: lesson.id, attempts: saved.attempts.slice(-tasks.length) }))} />
      </>
    } else if (screen.type === 'results' && lesson) content = <LessonResults lesson={lesson} state={state}
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
          {learning ? <TypedReview key={card.id} card={card} learning={learning} language={course.language} busy={busy}
            grade={(answer) => gradeVocabularyRecall(learning.recall, answer, course.language)}
            onRate={(answer) => update((current) => finishTypedReview(current, course, card.id, answer, nowISO()), afterReview)} />
            : <ReviewCard key={card.id} card={card} index={screen.index} total={screen.cardIds.length} busy={busy}
              onRate={async (result) => { await update((current) => finishReview(current, card.id, result, nowISO()), afterReview) }} />}
        </>
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
      content = <>
        <Dashboard state={state} course={course} plan={plan} start={start} now={now} />
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
