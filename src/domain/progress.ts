import { receptionExercises, type Course, type Exercise, type Lesson } from '../content/schema'
import { canAccelerate, hasPendingDelayedReview, pedagogyPlan, phaseTasks, gradeVocabularyRecall, type ExerciseTask } from './pedagogy'
import { bridgeLesson, isLessonEvidence, needsBridge, nextDiagnostic } from './diagnostic'
import { placementEntry } from './adaptive-placement'
import { assess } from './assessment'
import { wordsPrepared } from './instruction'
import { answerSchema, levelSchema, type Answer, type ErrorRecord, type ExerciseAttempt, type Skill, type LearningGoal, type SkillMastery, type StudyPlan, type PedagogyPhase } from './model'
import { phaseMinutes } from './study-session'
import { dayMs, scheduleReview } from './review'
import { reportSchema, validateSpeakingReport, pendingSpeakingCorrections, speakingFocus, speakingSuccesses, speakingWordGaps, type SpeakingReport, type SpeakingSession } from './speaking'
import type { LearningState, StudySession } from './state'
import { vocabularyIndex } from '../content/vocabulary'
import { vocabularyLoad, vocabularyMinutes } from './vocabulary-load'

type AnsweredExercise = { exercise: Exercise; conceptId: string }
export type { ExerciseTask } from './pedagogy'

function recordAttempts(
  state: LearningState, tasks: AnsweredExercise[], answers: Record<string, Answer>,
  now: string, context: ExerciseAttempt['context'], contentVersion: 1 | 2, lessonId?: string,
): ExerciseAttempt[] {
  return tasks.map(({ exercise, conceptId }, index) => {
    const parsed = answerSchema.safeParse(answers[exercise.id])
    if (!parsed.success) throw new Error('Devam etmek için bütün soruları yanıtla.')
    return { id: `${state.profile.id}.attempt.${state.attempts.length + index + 1}`, context,
      contentVersion, lessonId, exerciseId: exercise.id, conceptId, answer: parsed.data,
      at: now, evidence: assess(exercise, parsed.data, state.profile.language) }
  })
}

export function finishPlacement(state: LearningState, course: Course, answers: Record<string, Answer> | null, now: string): LearningState {
  if (state.placementAt) throw new Error('Başlangıç taraması zaten tamamlandı.')
  if (answers === null) {
    if (course.language !== 'es' || state.profile.language !== 'es' || state.placementTrack) {
      throw new Error('Bu başlangıç rotasında kısa taramayı kullan.')
    }
    return { ...state, placementAt: now }
  }
  const tasks = course.placement.map(({ exercise, objectiveId }) => ({ exercise, conceptId: objectiveId }))
  return { ...state, placementAt: now, attempts: recordAttempts(state, tasks, answers, now, 'placement', course.version) }
}

export function finishDiagnostic(state: LearningState, course: Course, exerciseId: string, answer: Answer, now: string, played: boolean) {
  const task = nextDiagnostic(course, state)
  if (!state.placementAt || !task || task.exercise.id !== exerciseId || (task.audio && !played)) {
    throw new Error('Tanılama görevi değişti veya ses henüz dinlenmedi.')
  }
  const attempts = recordAttempts(state, [{ exercise: task.exercise, conceptId: task.lesson.objective.id }],
    { [exerciseId]: answer }, now, 'diagnostic', course.version, task.lesson.id)
  return { ...state, attempts: [...state.attempts, ...attempts] }
}

function getConceptState(state: LearningState, lesson: Lesson, conceptId: string) {
  const attempts = state.attempts.filter((attempt) => attempt.lessonId === lesson.id && attempt.conceptId === conceptId &&
    (attempt.context === 'lesson' || attempt.context === 'transfer'))
  const last = attempts.at(-1)
  return {
    attempts,
    ready: last?.evidence.outcome === 'correct' &&
      !pendingSpeakingCorrections(state, lesson).some((item) => item.conceptId === conceptId),
  }
}

export function masteryFor(state: LearningState, lesson: Lesson): SkillMastery {
  const attempts = state.attempts.filter((attempt) => attempt.lessonId === lesson.id && isLessonEvidence(attempt))
  const observations: SkillMastery['observations'] = {}
  for (const { evidence } of attempts) {
    observations[evidence.observation] = (observations[evidence.observation] ?? 0) + 1
  }
  const delayed = state.reviews.filter((card) => lesson.vocabulary.some(({ id }) => id === card.cardId) &&
    card.lastResult === 'remembered' && card.lastAt &&
    Date.parse(card.lastAt) - Date.parse(card.introducedAt) >= dayMs)
  if (delayed.length) observations.retention = delayed.length
  const speakingEvidence = state.speakingAssessments.filter(({ report }) =>
    report.lessonId === lesson.id && (report.schemaVersion === 1
      ? report.observedErrors.length > 0 || report.successfulUses.length > 0 || report.vocabularyGaps.length > 0
      : report.observations.length > 0))
  const unaided = speakingEvidence.flatMap(({ report }) =>
    speakingSuccesses(report).map(({ id }) => `${report.sessionId}.${id}`))
  if (unaided.length) observations.speaking_independent = unaided.length
  if (speakingEvidence.length) observations.speaking_application = speakingEvidence.length
  const ready = lesson.concepts.every(({ id }) => getConceptState(state, lesson, id).ready)
  const transferred = !lesson.pedagogy || lesson.pedagogy.checks.every(({ conceptId }) =>
    attempts.filter((item) => item.context === 'transfer' && item.conceptId === conceptId).at(-1)?.evidence.outcome === 'correct')
  const delayedGrammar = lesson.pedagogy && lesson.pedagogy.checks.every(({ conceptId }) => {
    const transfer = attempts.filter((item) => item.context === 'transfer' && item.conceptId === conceptId).at(-1)
    const check = attempts.filter((item) => item.context === 'delayed' && item.conceptId === conceptId).at(-1)
    return transfer && check?.evidence.outcome === 'correct' && attempts.indexOf(check) > attempts.indexOf(transfer)
  })
  if (delayedGrammar) observations.retention = (observations.retention ?? 0) + lesson.concepts.length
  const retained = ready && transferred && (lesson.pedagogy ? delayedGrammar : delayed.length === lesson.vocabulary.length)
  return { status: retained ? 'retained' : ready && transferred ? 'ready' : attempts.length ? 'developing' : 'not_assessed',
    evidenceIds: [...attempts.map(({ id }) => id), ...delayed.map(({ cardId }) => cardId),
      ...speakingEvidence.map(({ report }) => report.sessionId), ...unaided], observations }
}

export function lessonTasks(state: LearningState, lesson: Lesson): ExerciseTask[] {
  const tasks: ExerciseTask[] = []
  const guidedRetries: ExerciseTask[] = []
  let allReady = true
  for (const concept of lesson.concepts) {
    const { attempts, ready } = getConceptState(state, lesson, concept.id)
    allReady &&= ready
    const needsControlled = lesson.teaching && !attempts.some(({ evidence }) =>
      evidence.observation === 'controlled_production' && evidence.outcome === 'correct')
    if (ready && !needsControlled) continue
    const variants = lesson.teaching
      ? concept.variants.filter(({ kind }) => !['single', 'multiple', 'matching'].includes(kind))
      : concept.variants
    const exercise = variants.find(({ id }) => !attempts.some(({ exerciseId }) => exerciseId === id))
    if (exercise) tasks.push({ conceptId: concept.id, exercise, label: concept.label })
    else if (lesson.teaching && attempts.at(-1)?.evidence.outcome === 'incorrect' &&
      !attempts.some(({ context }) => context === 'transfer')) {
      // Guided practice can revisit a model. Independent transfer still needs a fresh sample.
      const latestByExercise = new Map(attempts.map(({ exerciseId }, index) => [exerciseId, index]))
      const lastTried = variants.map(({ id }) => latestByExercise.get(id)!)
      const retry = variants[lastTried.indexOf(Math.min(...lastTried))]
      if (retry) guidedRetries.push({ conceptId: concept.id, exercise: retry, label: concept.label })
    }
  }
  if ((!lesson.pedagogy || (allReady && !tasks.length && !guidedRetries.length && wordsPrepared(state, lesson))) &&
    !state.attempts.some((attempt) => attempt.exerciseId === lesson.production.id)) {
    tasks.push({ conceptId: lesson.objective.id, exercise: lesson.production, label: 'Kendi cümleni yaz' })
  }
  return tasks.length ? tasks : guidedRetries
}

function spend(state: LearningState, kind: StudySession['kind'], itemId: string, minutes: number, now: string): LearningState {
  const session = { id: `${state.profile.id}.study.${state.activity.length + 1}`, kind, itemId, at: now, minutes }
  return { ...state, activity: [...state.activity, session] }
}

export function finishLesson(
  state: LearningState, course: Course, lesson: Lesson, answers: Record<string, Answer>, now: string,
): LearningState {
  if (!state.placementAt || !isUnlocked(state, course, lesson)) throw new Error('Dersin ön koşullarını tamamla.')
  const tasks = lessonTasks(state, lesson)
  if (!tasks.length || tasks.some(({ exercise }) => answers[exercise.id] === undefined) ||
    (lesson.teaching && Object.keys(answers).length !== tasks.length)) {
    throw new Error('Çalışma planı değişti. Günlük planı yeniden aç.')
  }
  const attempts = recordAttempts(state, tasks, answers, now, 'lesson', course.version, lesson.id)
  const newCards = (lesson.pedagogy ? [] : lesson.vocabulary).filter(({ id }) => !state.reviews.some(({ cardId }) => cardId === id))
  return spend({ ...state, attempts: [...state.attempts, ...attempts], reviews: [
    ...state.reviews, ...newCards.map(({ id }) => ({ cardId: id, step: 0, dueAt: now, introducedAt: now })),
  ] }, 'lesson', lesson.id, tasks.every(({ exercise }) => exercise.kind === 'open') ? 3 : lesson.minutes, now)
}

export function finishReview(state: LearningState, cardId: string, result: 'again' | 'remembered', now: string, typedAnswer?: string): LearningState {
  const card = state.reviews.find((item) => item.cardId === cardId)
  if (!card || card.dueAt > now) throw new Error('Bu kartın tekrar zamanı değişti.')
  let previousMisses = 0
  if (result === 'again' && card.lastResult === 'again') {
    for (let index = state.reviewHistory.length - 1; index >= 0; index--) {
      const entry = state.reviewHistory[index]
      if (entry.cardId !== cardId) continue
      if (entry.result === 'remembered') break
      previousMisses++
      if (previousMisses === 3) break
    }
  }
  return spend({ ...state,
    reviewHistory: [...state.reviewHistory, { cardId, at: now, result, mode: typedAnswer === undefined ? 'self_review' : 'typed', answer: typedAnswer }],
    reviews: state.reviews.map((item) => item === card ? scheduleReview(item, result, now, previousMisses) : item),
  }, 'review', cardId, 1, now)
}

export function finishPedagogy(
  state: LearningState, course: Course, lesson: Lesson, phase: PedagogyPhase,
  answers: Record<string, Answer>, now: string, listening?: 'played' | 'unavailable', taskAt = now,
  vocabularyCardIds?: readonly string[],
): LearningState {
  if (!state.placementAt || !lesson.pedagogy || !isUnlocked(state, course, lesson)) throw new Error('Çalışma ön koşullarını tamamla.')
  const mastery = masteryFor(state, lesson).status
  if (mastery === 'not_assessed' && (!['transfer', 'vocabulary'].includes(phase) || !canAccelerate(state, course, lesson))) {
    throw new Error('Önce dersin temel pratiğini tamamla.')
  }
  if (lesson.teaching && phase === 'transfer' && !canAccelerate(state, course, lesson) && mastery !== 'not_assessed' &&
    !state.attempts.some(({ lessonId, context }) => lessonId === lesson.id && context === 'transfer') &&
    lessonTasks(state, lesson).length) {
    throw new Error('Önce rehberli pratiği ve ilk yazını tamamla.')
  }
  if (vocabularyCardIds && phase !== 'vocabulary') throw new Error('Kelime grubu bu çalışmaya ait değil.')
  const tasks = phaseTasks(state, lesson, phase, taskAt, vocabularyCardIds)
  const plan = pedagogyPlan(state, course, lesson, taskAt, ['ready', 'retained'].includes(mastery))
  const alternateReception = (phase === 'reading' || phase === 'listening') &&
    (plan?.phase === 'reading' || plan?.phase === 'listening')
  if (!tasks.length || (plan?.phase !== phase && !alternateReception)) throw new Error('Çalışma planı değişti.')
  if (phase === 'listening' && lesson.teaching?.audioMode === 'script-practice') {
    return spend({ ...state, skippedListening: [...state.skippedListening, lesson.id] },
      'lesson', lesson.id, phaseMinutes.listening, now)
  }
  if (phase === 'listening' && listening === 'unavailable') {
    return { ...state, skippedListening: [...state.skippedListening, lesson.id] }
  }
  if (phase === 'listening' && listening !== 'played') throw new Error('Önce kaydı dinle.')
  if (vocabularyCardIds && Object.keys(answers).length !== tasks.length) throw new Error('Kelime grubu değişti.')
  const attempts = recordAttempts(state, tasks, answers, now, phase, course.version, lesson.id)
  const newCards = phase === 'vocabulary'
    ? lesson.vocabulary.filter(({ id }) => tasks.some(({ conceptId }) => conceptId === id) &&
      !state.reviews.some(({ cardId }) => cardId === id))
    : []
  return spend({ ...state, attempts: [...state.attempts, ...attempts], reviews: [
    ...state.reviews, ...newCards.map(({ id }) => ({ cardId: id, step: 0, dueAt: now, introducedAt: now })),
  ] }, 'lesson', lesson.id, vocabularyCardIds ? vocabularyMinutes(vocabularyCardIds.length) : phaseMinutes[phase], now)
}

export function finishTypedReview(state: LearningState, course: Course, cardId: string, answer: string, now: string) {
  if (!answer.trim() || answer.length > 2000) throw new Error('Geçerli bir hatırlama yanıtı yaz.')
  const exercise = vocabularyIndex(course).get(cardId)?.learning?.recall
  if (!exercise) throw new Error('Kelime üretim görevi bulunamadı.')
  return finishReview(state, cardId, gradeVocabularyRecall(exercise, answer, course.language), now, answer.trim())
}

export function recurringErrors(state: LearningState, lesson: Lesson): ErrorRecord[] {
  return lesson.concepts.flatMap(({ id, label }) => {
    const incorrect = state.attempts.filter((attempt) => attempt.conceptId === id && attempt.evidence.outcome === 'incorrect')
    if (incorrect.length < 2) return []
    const last = incorrect.at(-1)!
    return [{ id: last.id, lessonId: lesson.id, label, example: String(last.answer) }]
  })
}

export function beginSpeaking(state: LearningState, lesson: Lesson, now: string, sessionId: string): LearningState {
  if (!lesson.speaking || !wordsPrepared(state, lesson) || !state.attempts.some((attempt) => attempt.lessonId === lesson.id)) {
    throw new Error('Konuşma görevini açmak için önce dersi tamamla.')
  }
  if (state.speakingSessions.some((session) => session.lessonId === lesson.id)) return state
  const session: SpeakingSession = {
    id: sessionId, lessonId: lesson.id, language: state.profile.language, target: state.profile.target, createdAt: now,
  }
  return { ...state, speakingSessions: [...state.speakingSessions, session] }
}

export function importReport(state: LearningState, lesson: Lesson, candidate: SpeakingReport, now: string): LearningState {
  const report = reportSchema.parse(candidate)
  if (state.speakingAssessments.some((assessment) => assessment.report.sessionId === report.sessionId)) {
    throw new Error('Bu oturumun raporu daha önce kaydedildi.')
  }
  const session = state.speakingSessions.find(({ id }) => id === report.sessionId)
  if (!session) throw new Error('Konuşma oturumu bulunamadı.')
  validateSpeakingReport(report, session, lesson)
  const gaps = new Set(speakingWordGaps(report))
  const newCards = lesson.vocabulary.filter(({ id }) => gaps.has(id) && !state.reviews.some(({ cardId }) => cardId === id))
  return spend({ ...state,
    speakingAssessments: [...state.speakingAssessments, { report, importedAt: now, attemptCountAtImport: state.attempts.length, source: 'external_report' }],
    reviews: [
      ...state.reviews.map((card) => gaps.has(card.cardId)
        ? { cardId: card.cardId, introducedAt: card.introducedAt, dueAt: now, step: 0 }
        : card),
      ...newCards.map(({ id }) => ({ cardId: id, introducedAt: now, dueAt: now, step: 0 })),
    ],
  }, 'speaking', session.id, 5, now)
}

export function isUnlocked(state: LearningState, course: Course, lesson: Lesson): boolean {
  const entry = placementEntry(state)
  if (entry?.guidedEntry && entry.id === lesson.id) return true
  return lesson.prerequisites.every((prerequisite) => {
    const source = course.unit.lessons.find(({ objective }) => objective.id === prerequisite)
    return source && ['ready', 'retained'].includes(masteryFor(state, source).status) && wordsPrepared(state, source)
  })
}

export function dueCards(state: LearningState, now: string): string[] {
  return state.reviews.filter(({ dueAt }) => dueAt <= now).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map(({ cardId }) => cardId)
}

export function dailyMinutes(state: LearningState, now: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short' })
  const today = formatter.format(new Date(now))
  return state.activity.filter(({ at }) => formatter.format(new Date(at)) === today)
    .reduce((sum, { minutes }) => sum + minutes, 0)
}

export function needsEnglishStarter(state: LearningState) {
  const entry = placementEntry(state)
  return (!entry && (state.profile.selfEstimateUnknown || ['A1', 'A2'].includes(state.profile.estimate))) ||
    entry?.id === 'en.identity' || ['A1', 'A2'].includes(state.profile.target) || state.attempts.filter(({ context, evidence }) =>
    context === 'placement' && evidence.skill === 'grammar' && evidence.outcome === 'incorrect').length >= 4 ||
    state.attempts.some(({ lessonId, context }) => lessonId === 'en.identity' && context === 'lesson')
}

export function routeLessons(state: LearningState, course: Course) {
  const targetIndex = levelSchema.options.indexOf(state.profile.target)
  const bridge = bridgeLesson(course)
  const includeBridge = bridge && needsBridge(course, state, bridge)
  const skipStarter = course.language === 'en' && !needsEnglishStarter(state)
  const starterObjectives = new Set<string>()
  return course.unit.lessons.filter((lesson) => {
    // The catalog orders prerequisites before their dependents.
    if (skipStarter && (lesson.objective.level === 'A1' || lesson.prerequisites.some((id) => starterObjectives.has(id)))) {
      starterObjectives.add(lesson.objective.id)
      return false
    }
    return levelSchema.options.indexOf(lesson.objective.level) <= targetIndex && (lesson !== bridge || includeBridge)
  })
}

export function rankEligibleLessons(lessons: Lesson[], prioritySkills: Skill[], goals: LearningGoal[], misses: (lesson: Lesson) => number) {
  const priorityWeight = (lesson: Lesson) => {
    if (!prioritySkills.length) return 0
    const skills = new Set(lesson.concepts.flatMap(({ variants }) => variants.map(({ skill }) => skill)))
    if (lesson.vocabulary.length) skills.add('vocabulary')
    skills.add(lesson.production.skill)
    if (lesson.speaking) skills.add('speaking')
    if (lesson.pedagogy) for (const exercise of receptionExercises(lesson.pedagogy)) {
      if (exercise.skill !== 'listening' || lesson.teaching?.audioMode !== 'script-practice') skills.add(exercise.skill)
    }
    const rank = prioritySkills.findIndex((skill) => skills.has(skill))
    return rank === -1 ? prioritySkills.length : rank
  }
  const goalWeight = (lesson: Lesson) => lesson.goals.filter((goal) => goals.includes(goal)).length
  return [...lessons].sort((a, b) => misses(b) - misses(a) || goalWeight(b) - goalWeight(a) || priorityWeight(a) - priorityWeight(b))
}

export function dailyPlan(state: LearningState, course: Course, now: string, timeZone: string, includeReviews = true): StudyPlan {
  const today = new Date(now)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short' })
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(today)
  if (!state.profile.days.includes(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday))) {
    return { kind: 'rest', reason: 'Bugün çalışma takviminde dinlenme günü. İlerlemen sıradaki çalışma gününe taşınır.' }
  }
  const used = dailyMinutes(state, now, timeZone)
  const available = state.profile.minutes - used
  const load = vocabularyLoad(state, course, now, timeZone, available)
  let deferredVocabulary = false
  const planPedagogy = (lesson: Lesson, ready: boolean) => {
    const plan = pedagogyPlan(state, course, lesson, now, ready, load)
    if (!plan && load.availableNew === 0 && pedagogyPlan(state, course, lesson, now, ready)?.phase === 'vocabulary') {
      deferredVocabulary = true
    }
    return plan
  }
  const eligible = routeLessons(state, course)
  const starter = eligible.find(({ id }) => id === 'en.identity')
  const starterPending = starter && !['ready', 'retained'].includes(masteryFor(state, starter).status)
  const bridge = bridgeLesson(course)
  const bridgePending = bridge && eligible.includes(bridge) &&
    !['ready', 'retained'].includes(masteryFor(state, bridge).status)
  const unlocked = eligible.filter((lesson) => isUnlocked(state, course, lesson) &&
    (starterPending ? lesson === starter : !bridgePending || lesson === bridge || (course.language === 'en' && lesson.objective.level === 'A1')))
  let task: StudyPlan | undefined
  const developingLessons = unlocked.filter((lesson) => masteryFor(state, lesson).status === 'developing')
  const pausedToday = (lesson: Lesson) => lesson.concepts.some(({ id }) => {
    const recent = state.attempts.filter(({ at, conceptId, context }) => conceptId === id &&
      (context === 'lesson' || context === 'transfer') && date.format(new Date(at)) === date.format(today)).slice(-3)
    return recent.length === 3 && recent.every(({ evidence }) => evidence.outcome === 'incorrect')
  })
  let assessmentGap: Lesson | undefined
  let guidedRetry: StudyPlan | undefined
  for (const developing of developingLessons) {
    const vocabularyWasDeferred = deferredVocabulary
    const tasks = lessonTasks(state, developing)
    const onlyProduction = tasks.length === 1 && tasks[0].exercise.kind === 'open'
    if (developing.pedagogy) {
      task = planPedagogy(developing, false)
      if (task?.kind === 'pedagogy' && task.phase === 'transfer' && tasks.length &&
        !canAccelerate(state, course, developing) && (developing.teaching || !onlyProduction) &&
        !state.attempts.some(({ lessonId, context }) => lessonId === developing.id && context === 'transfer')) task = undefined
    }
    if (!task && tasks.length) {
      const repeated = !onlyProduction && tasks.every(({ exercise }) => state.attempts.some(({ context, lessonId, exerciseId }) =>
        context === 'lesson' && lessonId === developing.id && exerciseId === exercise.id))
      const practice: StudyPlan = { kind: 'practice', lessonId: developing.id, minutes: onlyProduction ? 3 : developing.minutes,
        reason: onlyProduction ? 'Rehberli pratiği tamamladın. Şimdi öğrendiğin yapıyla kendi mesajını yaz.'
          : repeated ? 'Bu yapı için öğrenme desteği gerekiyor. Açıklamayı incele ve rehberli örneği yeniden dene.'
            : `Önceki yanıtın için açıklamalı prova ve yeni soru. Çalışılacak konular ${tasks.map(({ label }) => label).join(', ')}.` }
      if (repeated) {
        if (!pausedToday(developing)) guidedRetry ??= practice
        continue
      }
      task = practice
    }
    if (task && !pausedToday(developing)) break
    if (!task && !vocabularyWasDeferred && !deferredVocabulary) assessmentGap ??= developing
    task = undefined
  }
  if (!task) {
    const priorities = state.profile.prioritySkills ?? []
    const receptionPriority = (lesson: Lesson) => {
      if (!lesson.pedagogy) return priorities.length + 1
      const plan = pedagogyPlan(state, course, lesson, now, true, load)
      const phase = plan?.phase
      return (phase === 'reading' || phase === 'listening') && priorities.includes(phase) ? priorities.indexOf(phase) : priorities.length + 1
    }
    const readyLessons = priorities.some((skill) => skill === 'reading' || skill === 'listening')
      ? [...unlocked].sort((a, b) => receptionPriority(a) - receptionPriority(b)) : unlocked
    for (const lesson of readyLessons) {
      const mastery = masteryFor(state, lesson).status
      if (mastery !== 'ready' && mastery !== 'retained') continue
      if (lesson.pedagogy && !wordsPrepared(state, lesson)) {
        task = planPedagogy(lesson, true)
      } else if (lesson.pedagogy && !state.attempts.some(({ exerciseId }) => exerciseId === lesson.production.id)) {
        task = { kind: 'practice', lessonId: lesson.id, minutes: 3, reason: 'Yeni bağlamı çözdün. Şimdi kendi cümleni kur ve örnek ölçütlerle karşılaştır.' }
      } else if (lesson.pedagogy) task = planPedagogy(lesson, true)
      if (!task && lesson.speaking && !state.skippedSpeaking.includes(lesson.id) &&
        !state.speakingAssessments.some(({ report }) => report.lessonId === lesson.id)) {
        task = { kind: 'speaking', lessonId: lesson.id, minutes: 5,
          reason: `${state.speakingAssessments.length ? '' : 'Henüz konuşma raporun yok. '} ${speakingFocus(state, lesson).reason}`.trim() }
      }
      if (task) break
    }
  }
  if (!task) {
    const misses = (lesson: Lesson) => state.attempts.filter((attempt) =>
      (attempt.context === 'placement' || attempt.context === 'diagnostic') &&
      attempt.conceptId === lesson.objective.id && attempt.evidence.outcome === 'incorrect').length
    const entry = placementEntry(state)
    const choices = rankEligibleLessons(unlocked.filter((lesson) => masteryFor(state, lesson).status === 'not_assessed'),
      state.profile.prioritySkills ?? [], state.profile.goals, misses)
    const hasCourseProgress = state.attempts.some(({ context }) => context === 'lesson' || context === 'transfer')
    const completedRescreen = state.placementTrack?.origin === 'existing' && Boolean(state.placementTrack.completedAt)
    const next = choices.find(({ id }) => id === entry?.id && (!hasCourseProgress || completedRescreen) &&
      !state.attempts.some(({ lessonId, context }) => lessonId === id && (context === 'lesson' || context === 'transfer'))) ?? choices[0]
    if (next && canAccelerate(state, course, next)) task = planPedagogy(next, false)
    else if (next) task = { kind: 'lesson', lessonId: next.id, minutes: next.minutes,
      reason: next.id === entry?.id ? entry.reason : next === bridge ? 'Tarama, kısa bir temel çalışmanın sonraki görevleri kolaylaştırabileceğini gösterdi.' : misses(next) ? 'Başlangıç taramasında bu kazanım için çalışma fırsatı görüldü.'
        : next.prerequisites.length ? 'Ön koşullar tamamlandı ve sıradaki kazanım açıldı.' : 'Başlangıç ünitesinin ilk kazanımı.' }
  }
  task ??= guidedRetry
  const cards = dueCards(state, now)
  // A five-minute assignment can consume the whole session. Under sustained pressure,
  // alternate with a review-focused study day so neither queue is starved.
  let reviewFocus = false
  if (state.profile.minutes === 5 && cards.length >= 10) {
    const todayKey = date.format(today)
    const previous = state.activity.filter(({ at }) => date.format(new Date(at)) !== todayKey)
    const lastActivity = previous.at(-1)
    if (lastActivity) {
      const lastDay = date.format(new Date(lastActivity.at))
      const overdue = state.reviews.filter(({ dueAt }) => dueAt <= now && date.format(new Date(dueAt)) !== todayKey).length
      reviewFocus = overdue >= 10 && previous.some(({ at, kind }) => kind !== 'review' && date.format(new Date(at)) === lastDay)
    }
  }
  const reserved = !reviewFocus && task && 'minutes' in task && task.minutes <= available ? task.minutes : 0
  const continuationCosts: Partial<Record<StudyPlan['kind'] | PedagogyPhase, [number, number]>> = {
    lesson: [5, 8], practice: [3, 6], vocabulary: [3, 7], transfer: [2, 5], reading: [3, 6],
  }
  const phase = task?.kind === 'pedagogy' ? task.phase : task?.kind
  const costs = phase ? continuationCosts[phase] ?? [3, 3] : [0, 0]
  const followOn = state.profile.minutes >= 15 ? costs[state.profile.minutes >= 30 ? 1 : 0] : 0
  const reserve = reserved + (reserved && reserved + followOn <= available ? followOn : 0)
  const reviewedToday = state.activity.filter(({ kind, at }) => kind === 'review' && date.format(new Date(at)) === date.format(today)).length
  const failures = state.reviews.filter(({ dueAt, lastResult }) => dueAt <= now && lastResult === 'again').length
  // A recovery horizon limits today's queue while preserving every deferred due date.
  const reportCards = new Map<string, number>()
  for (const { report, importedAt } of state.speakingAssessments) {
    for (const id of speakingWordGaps(report)) {
      const lastReviewAt = state.reviews.find(({ cardId }) => cardId === id)?.lastAt
      if (!lastReviewAt || lastReviewAt < importedAt) reportCards.set(id, (reportCards.get(id) ?? 0) + 1)
    }
  }
  const recoveryQuota = Math.ceil((cards.length + reviewedToday) / 2) + failures
  const reviewSlots = Math.min(available - reserve, state.profile.minutes <= 5 || !task ? available : Math.max(reportCards.size, recoveryQuota - reviewedToday))
  if (includeReviews && cards.length && reviewSlots > 0) {
    const failed = new Set(state.reviews.filter(({ lastResult }) => lastResult === 'again').map(({ cardId }) => cardId))
    const cardIds = cards.sort((a, b) => (reportCards.get(b) ?? 0) - (reportCards.get(a) ?? 0) || Number(failed.has(b)) - Number(failed.has(a))).slice(0, reviewSlots)
    const fromSpeaking = cardIds.find((id) => reportCards.has(id))
    if (fromSpeaking) {
      const term = vocabularyIndex(course).get(fromSpeaking)?.card.term
      return { kind: 'review', cardIds, minutes: cardIds.length,
        reason: `Konuşma raporunda “${term}” için kelime veya kalıp eksiği görüldü. İfadeyi hatırla ve kullanım örneğini incele.` }
    }
    const missed = cardIds.find((id) => {
      const previousReview = state.reviewHistory.filter(({ cardId }) => cardId === id).at(-1)
      if (previousReview) return previousReview.result === 'again'
      return state.attempts.some(({ conceptId, context, evidence }) => conceptId === id && context === 'vocabulary' &&
        evidence.observation === 'controlled_production' && evidence.outcome === 'incorrect')
    })
    const term = missed && vocabularyIndex(course).get(missed)?.card.term
    return { kind: 'review', cardIds, minutes: cardIds.length, reason: reviewFocus
      ? 'Gecikmiş kelime tekrarları birikti. Bugünkü kısa oturumda önce bunları çalış; sıradaki öğretim etkinliği planında kalır.'
      : term ? `“${term}” son denemede hatırlanmadı. İpucundan hareketle yeniden yazmayı dene.`
      : reserved > 0 && cardIds.length < cards.length
        ? 'Hatırlama zamanı gelen kelimelerin bir kısmını çalış. Kalan süre sıradaki çalışma için ayrıldı.'
        : 'Hatırlama zamanı gelen kelimeleri çalış.' }
  }
  if ((task && 'minutes' in task && task.minutes > available) || (cards.length && available <= 0)) {
    return { kind: 'budget', reason: 'Bugünkü süreye yeni çalışma sığmıyor. Çalışma sırası kaydedildi.' }
  }
  if (task) return assessmentGap
    ? { ...task, reason: `Önceki kazanım için yeni değerlendirme örneği kalmadı. ${task.reason}` }
    : task
  if (deferredVocabulary) return { kind: 'budget', reason: 'Yeni kelimeler için bugünkü süre veya çalışma yükü sınırına ulaştın. Kalan kelimeler sırada.' }
  if (assessmentGap) return { kind: 'assessment_gap', lessonId: assessmentGap.id,
    reason: 'Bu kazanım için yeni bağımsız örnek kalmadı. Açıklamayı yeniden çalışabilir veya uygun diğer çalışmalara dönebilirsin.' }
  if (unlocked.some((lesson) => masteryFor(state, lesson).status === 'developing')) {
    return { kind: 'budget', reason: 'Bugünkü onarım çalışmasına ara ver. Başka bir örnekle sonraki çalışma gününde devam edebilirsin.' }
  }
  if (!eligible.length) {
    return { kind: 'out_of_scope', reason: `Bu dildeki başlangıç ünitesi ${course.level} düzeyinde. Hedefini Ayarlar’dan güncelleyebilirsin.` }
  }
  const locked = eligible.find((lesson) => {
    if (isUnlocked(state, course, lesson)) return false
    const { status } = masteryFor(state, lesson)
    return status !== 'retained' && (status !== 'ready' || Boolean(lesson.pedagogy))
  })
  if (locked) return { kind: 'prerequisite_wait', lessonId: locked.id,
    reason: 'Bu kazanımın açılması için önce gerekli temel çalışma tamamlanmalı.' }
  const awaitingRetention = unlocked.filter((lesson) => lesson.pedagogy && masteryFor(state, lesson).status === 'ready')
  const pendingReview = awaitingRetention.find((lesson) => hasPendingDelayedReview(state, lesson, now))
  if (pendingReview) return { kind: 'review_wait', lessonId: pendingReview.id,
    reason: 'Gecikmeli kontrolün zamanı geldiğinde günlük plana eklenecek.' }
  if (awaitingRetention.length) return { kind: 'assessment_gap', lessonId: awaitingRetention[0].id,
    reason: 'Yeni gecikmeli kontrol örneği kalmadı. Açıklamayı yeniden çalışabilirsin.' }
  const hasTargetLessons = eligible.some(({ objective }) => objective.level === state.profile.target)
  return { kind: 'complete', reason: 'Yayımlanan rotanın ilk turu bitti. Vadesi gelen kazanım kontrolleri ve kelime tekrarları plana eklenir.' +
    (hasTargetLessons ? ' Bu bantta yayımlanan kazanımlar seçilidir.' : ` ${state.profile.target} hedefi için bu dilde ders henüz yayımlanmadı.`) }
}
