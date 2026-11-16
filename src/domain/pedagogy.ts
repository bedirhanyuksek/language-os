import type { Course, Exercise, Lesson } from '../content/schema'
import { pendingSpeakingCorrections } from './speaking'
import { assess } from './assessment'
import type { ExerciseAttempt, PedagogyPhase, StudyPlan } from './model'
import type { LearningState } from './state'

export type ExerciseTask = { exercise: Exercise; conceptId: string; label: string }

export function canAccelerate(state: LearningState, course: Course, lesson: Lesson) {
  return Boolean(lesson.pedagogy && lesson.concepts.every(({ id }) => {
    const diagnosticIds = course.placement.filter((item) => item.diagnosticConceptId === id).map(({ exercise }) => exercise.id)
    const samples = state.attempts.filter((item) => item.context === 'placement' && item.contentVersion === 2 &&
      diagnosticIds.includes(item.exerciseId))
    return samples.length === diagnosticIds.length && samples.every(({ evidence }) => evidence.outcome === 'correct') &&
      samples.some(({ evidence }) => evidence.observation === 'recognition') &&
      samples.some(({ evidence }) => evidence.observation === 'controlled_production')
  }))
}

export function receptionTask(state: LearningState, lesson: Lesson, phase: 'reading' | 'listening') {
  const p = lesson.pedagogy
  if (!p) return
  const attempts = state.attempts.filter((item) => item.lessonId === lesson.id && item.context === phase)
  if (phase === 'listening' && state.skippedListening.includes(lesson.id)) return
  const initial = phase === 'reading' ? p.reading : p.listening
  if (!attempts.length) return { material: initial, previous: [] as ExerciseAttempt[], coaching: [] as string[] }
  const retry = p.receptionRetry?.[phase]
  if (!retry) return
  const ids = phase === 'reading' ? [p.reading.question.id] : [p.listening.main.id, p.listening.detail.id]
  const previous = attempts.filter(({ exerciseId, evidence }) => ids.includes(exerciseId) && evidence.outcome === 'incorrect')
  if (!previous.length) return
  if (attempts.some(({ exerciseId }) => !ids.includes(exerciseId))) return
  const coaching = 'coaching' in retry ? [retry.coaching] : previous.map(({ exerciseId }) =>
    exerciseId === p.listening.main.id ? retry.mainCoaching : retry.detailCoaching)
  return { material: retry, previous, coaching }
}

export function phaseTasks(state: LearningState, lesson: Lesson, phase: PedagogyPhase, now: string): ExerciseTask[] {
  const p = lesson.pedagogy
  if (!p) return []
  const task = (exercise: Exercise, conceptId: string, label: string) => ({ exercise, conceptId, label })
  const objective = lesson.objective.id
  const previous = state.attempts.filter((item) => item.lessonId === lesson.id && item.context === phase)
  const pending = (exercise: Exercise, conceptId: string, label: string) =>
    previous.some(({ exerciseId }) => exerciseId === exercise.id) ? [] : [task(exercise, conceptId, label)]
  if (phase === 'reading' || phase === 'listening') {
    const reception = receptionTask(state, lesson, phase)
    if (!reception) return []
    const { material, previous } = reception
    if ('question' in material) return [task(material.question, objective, 'Metni yorumla')]
    return [
      ...(!previous.length || previous.some(({ exerciseId }) => exerciseId === p.listening.main.id)
        ? [task(material.main, objective, 'Ana fikir')] : []),
      ...(!previous.length || previous.some(({ exerciseId }) => exerciseId === p.listening.detail.id)
        ? [task(material.detail, objective, 'Ayrıntı')] : []),
    ]
  }
  if (phase === 'revision') return p.revision ? pending(p.revision, objective, 'Yazını yeniden düzenle') : []
  if (phase === 'vocabulary') {
    const pendingCards = p.vocabulary.filter(({ use }) => !previous.some(({ exerciseId }) => exerciseId === use.id))
    // Repeated misses and cards awaiting a first review represent unfinished work.
    const unfinished = state.reviews.filter(({ lastResult }) => lastResult !== 'remembered').length
    // Anchor the batch to saved activity so midnight or a new due time cannot change an open form.
    const lastActivity = state.activity.at(-1)?.at ?? state.placementAt
    const due = lastActivity ? state.reviews.filter(({ dueAt }) => dueAt <= lastActivity).length : 0
    const batchSize = Math.max(unfinished, due) >= state.profile.minutes ? 1 : 3
    return pendingCards.slice(0, batchSize).flatMap(({ cardId, recognize, recall, use }) => {
      const label = lesson.vocabulary.find(({ id }) => id === cardId)!.term
      return [task(recognize, cardId, label), task(recall, cardId, 'Aktif hatırlama'), task(use, cardId, 'Cümle içinde kullanım')]
    })
  }

  const speakingCorrections = phase === 'transfer' ? pendingSpeakingCorrections(state, lesson) : []
  const priority = [...new Set(speakingCorrections.map(({ conceptId }) => conceptId))]
  const orderedChecks = [
    ...priority.flatMap((id) => p.checks.filter(({ conceptId }) => conceptId === id)),
    ...p.checks.filter(({ conceptId }) => !priority.includes(conceptId)),
  ]
  return orderedChecks.flatMap((check) => {
    const concept = lesson.concepts.find(({ id }) => id === check.conceptId)!
    const history = previous.filter(({ conceptId }) => conceptId === concept.id)
    const last = history.at(-1)
    const related = state.attempts.filter((item) => item.lessonId === lesson.id && item.conceptId === concept.id)
    if (phase === 'foundation') {
      const foundation = check.foundation
      if (!foundation || last?.evidence.outcome === 'correct') return []
      const triggered = related.some(({ context, answer, evidence }) =>
        (context === 'transfer' || context === 'lesson') && evidence.outcome === 'incorrect' &&
        typeof answer === 'string' && foundation.errorAnswers.some((key) =>
          key.toLowerCase() === answer.toLowerCase().trim().replace(/[.!?]+$/, '')))
      return triggered ? [task(foundation.exercise, concept.id, 'Ön koşulu yeniden çalış')] : []
    }
    if (phase === 'transfer') {
      const latest = related.filter(({ context }) => context === 'transfer' || context === 'lesson').at(-1)
      const needsSpeakingCheck = priority.includes(concept.id)
      if (latest === last && last?.evidence.outcome === 'correct' && !needsSpeakingCheck) return []
      const fresh = needsSpeakingCheck && check.transfer.find(({ id }) => !history.some(({ exerciseId }) => exerciseId === id))
      return [task(fresh || check.transfer[history.length % check.transfer.length], concept.id, concept.label)]
    }
    const transfer = related.filter(({ context, evidence }) => context === 'transfer' && evidence.outcome === 'correct').at(-1)
    const anchor = last && (!transfer || state.attempts.indexOf(last) > state.attempts.indexOf(transfer)) ? last : transfer
    if (!anchor || (anchor === last && last?.evidence.outcome === 'correct') ||
      Date.parse(now) - Date.parse(anchor.at) < p.reviewAfterHours * 3_600_000) return []
    const fresh = check.delayed.find((item) => !history.some(({ exerciseId }) => exerciseId === item.id))
    return fresh ? [task(fresh, concept.id, concept.label)] : []
  })
}

export function pedagogyPlan(state: LearningState, course: Course, lesson: Lesson, now: string, ready: boolean): Extract<StudyPlan, { kind: 'pedagogy' }> | undefined {
  const phase = (phase: PedagogyPhase, reason: string) => ({ kind: 'pedagogy' as const, phase, lessonId: lesson.id, reason,
    minutes: { foundation: 3, transfer: 4, reading: 2, listening: 3, vocabulary: 5, delayed: 3, revision: 3 }[phase] })
  const foundation = phaseTasks(state, lesson, 'foundation', now)[0]
  if (foundation) {
    const id = lesson.pedagogy?.checks.find(({ conceptId }) => conceptId === foundation.conceptId)?.foundation?.conceptId
    const prior = course.unit.lessons.find((item) => item.concepts.some((concept) => concept.id === id))
    return phase('foundation', `Yanıtın önceki kazanımda bir eksik gösterdi. Önce “${prior?.title}” konusuna dön.`)
  }
  const transfer = phaseTasks(state, lesson, 'transfer', now)
  if (transfer.length) {
    const relevant = new Set(transfer.map(({ conceptId }) => conceptId))
    const previous = state.attempts.filter(({ lessonId, conceptId, context }) => lessonId === lesson.id &&
      relevant.has(conceptId) && (context === 'lesson' || context === 'transfer')).at(-1)
    const reportError = pendingSpeakingCorrections(state, lesson).find(({ conceptId }) => relevant.has(conceptId))
    if (reportError) return phase('transfer', `Konuşma raporunda şu gözlem var: ${reportError.description} Aynı yapıyı yeni bağlamda dene.`)
    if (previous?.evidence.outcome === 'incorrect') {
      return { ...phase('transfer', `Önceki yanıtın “${String(previous.answer)}”. Bu yapıyı başka bir durumda dene.`),
        evidenceId: previous.id }
    }
    return phase('transfer', canAccelerate(state, course, lesson) &&
      !state.attempts.some(({ lessonId, context }) => lessonId === lesson.id && context !== 'diagnostic')
      ? 'Başlangıçta hem tanıma hem üretim kanıtın var. Doğrudan yeni bağlamda dene.'
      : 'Kazanımı yeni bir bağlamda, seçenek yardımı olmadan kullan.')
  }
  if (!ready) return
  const phases = [
    ['reading', 'Yapıyı kısa bir metinde anlamlandır.'],
    ['listening', 'Ana fikri ve bir ayrıntıyı metni görmeden yakala.'],
    ['vocabulary', 'Kelimeleri bağlam içinde öğren, sonra hatırla ve bir cümlede kullan.'],
    ['revision', 'İlk yazını rubrikle gözden geçir ve yeni sürümünü kaydet.'],
    ['delayed', 'Önceki üretimin üzerinden en az bir gün geçti. Farklı bir bağlamda hatırla.'],
  ] as const
  const listeningSample = state.attempts.filter(({ context, evidence }) =>
    context === 'diagnostic' && evidence.skill === 'listening').at(-1)
  const readingTried = state.attempts.some(({ lessonId, context }) => lessonId === lesson.id && context === 'reading')
  const prioritizeListening = !readingTried && listeningSample?.evidence.outcome === 'incorrect'
  const ordered = prioritizeListening ? [phases[1], phases[0], ...phases.slice(2)] : phases
  for (const [key, reason] of ordered) {
    if (!phaseTasks(state, lesson, key, now).length) continue
    const previous = key === 'reading' || key === 'listening' ? receptionTask(state, lesson, key)?.previous[0] : undefined
    return previous ? { ...phase(key, `Önceki yanıtın “${String(previous.answer)}”. İlgili ipucunu incele ve başka bir kaynakla dene.`),
      evidenceId: previous.id } : key === 'listening' && prioritizeListening
      ? { ...phase(key, 'Başlangıç dinleme örneğinde ayrıntıyı kaçırdın. Önce ana fikri, sonra ayrıntıyı dinle.'), evidenceId: listeningSample.id }
      : phase(key, reason)
  }
}

export function gradeVocabularyRecall(exercise: Exercise, answer: string, language: Course['language']) {
  return assess(exercise, answer, language).outcome === 'correct' ? 'remembered' : 'again'
}
