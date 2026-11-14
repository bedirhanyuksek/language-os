import type { Course, Exercise, Lesson } from '../content/schema'
import { canAccelerate, pedagogyPlan, phaseTasks, gradeVocabularyRecall, type ExerciseTask } from './pedagogy'
import { bridgeLesson, isLessonEvidence, needsBridge, nextDiagnostic } from './diagnostic'
import { assess } from './assessment'
import { answerSchema, levelSchema, type Answer, type ErrorRecord, type ExerciseAttempt, type SkillMastery, type StudyPlan, type PedagogyPhase } from './model'
import { dayMs, scheduleReview } from './review'
import { reportSchema, validateSpeakingReport, pendingSpeakingCorrections, speakingFocus, speakingSuccesses, speakingWordGaps, type SpeakingReport, type SpeakingSession } from './speaking'
import type { LearningState, StudySession } from './state'

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

export function finishPlacement(state: LearningState, course: Course, answers: Record<string, Answer>, now: string): LearningState {
  if (state.placementAt) throw new Error('Başlangıç taraması zaten tamamlandı.')
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
  for (const concept of lesson.concepts) {
    const { attempts, ready } = getConceptState(state, lesson, concept.id)
    const variants = lesson.teaching
      ? concept.variants.filter(({ kind }) => !['single', 'multiple', 'matching'].includes(kind))
      : concept.variants
    if (ready && lesson.teaching && !attempts.some(({ evidence }) => evidence.observation === 'controlled_production' && evidence.outcome === 'correct')) {
      tasks.push({ conceptId: concept.id, exercise: variants[0], label: concept.label })
      continue
    }
    if (ready) continue
    const last = attempts.at(-1)
    const index = lesson.teaching ? variants.findIndex(({ id }) => id === last?.exerciseId) + 1 : attempts.length
    tasks.push({ conceptId: concept.id, exercise: variants[index % variants.length], label: concept.label })
  }
  if ((!lesson.teaching || !tasks.length) && !state.attempts.some((attempt) => attempt.exerciseId === lesson.production.id)) {
    tasks.push({ conceptId: lesson.objective.id, exercise: lesson.production, label: 'Kendi cümleni yaz' })
  }
  return tasks
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
  return spend({ ...state, reviewHistory: [...state.reviewHistory, { cardId, at: now, result, mode: typedAnswer === undefined ? 'self_review' : 'typed', answer: typedAnswer }], reviews: state.reviews.map((item) => item === card ? scheduleReview(item, result, now) : item) }, 'review', cardId, 1, now)
}

export function finishPedagogy(
  state: LearningState, course: Course, lesson: Lesson, phase: PedagogyPhase,
  answers: Record<string, Answer>, now: string, listening?: 'played' | 'unavailable',
): LearningState {
  if (!state.placementAt || !lesson.pedagogy || !isUnlocked(state, course, lesson)) throw new Error('Çalışma ön koşullarını tamamla.')
  const mastery = masteryFor(state, lesson).status
  if (mastery === 'not_assessed' && (phase !== 'transfer' || !canAccelerate(state, course, lesson))) {
    throw new Error('Önce dersin temel pratiğini tamamla.')
  }
  if (lesson.teaching && phase === 'transfer' && mastery !== 'not_assessed' &&
    !state.attempts.some(({ lessonId, context }) => lessonId === lesson.id && context === 'transfer') &&
    lessonTasks(state, lesson).length) {
    throw new Error('Önce rehberli pratiği ve ilk yazını tamamla.')
  }
  const tasks = phaseTasks(state, lesson, phase, now)
  const plan = pedagogyPlan(state, course, lesson, now, ['ready', 'retained'].includes(mastery))
  if (!tasks.length || plan?.phase !== phase) throw new Error('Çalışma planı değişti.')
  if (phase === 'listening' && listening === 'unavailable') {
    return { ...state, skippedListening: [...state.skippedListening, lesson.id] }
  }
  if (phase === 'listening' && listening !== 'played') throw new Error('Önce kaydı dinle.')
  const attempts = recordAttempts(state, tasks, answers, now, phase, course.version, lesson.id)
  const newCards = phase === 'vocabulary'
    ? lesson.vocabulary.filter(({ id }) => !state.reviews.some(({ cardId }) => cardId === id))
    : []
  return spend({ ...state, attempts: [...state.attempts, ...attempts], reviews: [
    ...state.reviews, ...newCards.map(({ id }) => ({ cardId: id, step: 0, dueAt: now, introducedAt: now })),
  ] }, 'lesson', lesson.id, plan.minutes, now)
}

export function finishTypedReview(state: LearningState, course: Course, cardId: string, answer: string, now: string) {
  if (!answer.trim() || answer.length > 2000) throw new Error('Geçerli bir hatırlama yanıtı yaz.')
  const exercise = course.unit.lessons.flatMap((lesson) => lesson.pedagogy?.vocabulary ?? [])
    .find((entry) => entry.cardId === cardId)?.recall
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
  if (!lesson.speaking || !state.attempts.some((attempt) => attempt.lessonId === lesson.id)) {
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
  return lesson.prerequisites.every((prerequisite) => {
    const source = course.unit.lessons.find(({ objective }) => objective.id === prerequisite)
    return source && ['ready', 'retained'].includes(masteryFor(state, source).status)
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
  return ['A1', 'A2'].includes(state.profile.target) || state.attempts.filter(({ context, evidence }) =>
    context === 'placement' && evidence.skill === 'grammar' && evidence.outcome === 'incorrect').length >= 4 ||
    state.attempts.some(({ lessonId, context }) => lessonId === 'en.identity' && context === 'lesson')
}

export function dailyPlan(state: LearningState, course: Course, now: string, timeZone: string): StudyPlan {
  const today = new Date(now)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short' })
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(today)
  if (!state.profile.days.includes(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday))) {
    return { kind: 'rest', reason: 'Bugün çalışma takviminde dinlenme günü. İlerlemen sıradaki çalışma gününe taşınır.' }
  }
  const used = dailyMinutes(state, now, timeZone)
  const available = state.profile.minutes - used
  const targetIndex = levelSchema.options.indexOf(state.profile.target)
  const eligible = course.unit.lessons.filter((lesson) => levelSchema.options.indexOf(lesson.objective.level) <= targetIndex &&
    (course.language !== 'en' || lesson.objective.level !== 'A1' || needsEnglishStarter(state)))
  const starter = eligible.find(({ id }) => id === 'en.identity')
  const starterPending = starter && !['ready', 'retained'].includes(masteryFor(state, starter).status)
  const bridge = bridgeLesson(course)
  const bridgePending = bridge && eligible.includes(bridge) && needsBridge(course, state, bridge) &&
    !['ready', 'retained'].includes(masteryFor(state, bridge).status)
  const unlocked = eligible.filter((lesson) => isUnlocked(state, course, lesson) &&
    (lesson !== bridge || needsBridge(course, state, lesson)) &&
    (starterPending ? lesson === starter : !bridgePending || lesson === bridge || (course.language === 'en' && lesson.objective.level === 'A1')))
  const reportCards = new Map<string, number>()
  for (const { report, importedAt } of state.speakingAssessments) {
    for (const id of speakingWordGaps(report)) {
      const lastReviewAt = state.reviews.find(({ cardId }) => cardId === id)?.lastAt
      if (!lastReviewAt || lastReviewAt < importedAt) {
        reportCards.set(id, (reportCards.get(id) ?? 0) + 1)
      }
    }
  }
  const cards = dueCards(state, now).sort((a, b) => (reportCards.get(b) ?? 0) - (reportCards.get(a) ?? 0))
  let task: StudyPlan | undefined
  if (cards.length && available > 0) {
    const cardIds = cards.slice(0, available)
    const fromSpeaking = cardIds.find((id) => reportCards.has(id))
    if (fromSpeaking) {
      const term = course.unit.lessons.flatMap(({ vocabulary }) => vocabulary).find(({ id }) => id === fromSpeaking)?.term
      return { kind: 'review', cardIds, minutes: cardIds.length,
        reason: `Konuşma raporunda “${term}” için kelime veya kalıp eksiği görüldü. İfadeyi hatırla ve kullanım örneğini incele.` }
    }
    const missed = cardIds.find((id) => {
      const previousReview = state.reviewHistory.filter(({ cardId }) => cardId === id).at(-1)
      if (previousReview) return previousReview.result === 'again'
      return state.attempts.some(({ conceptId, context, evidence }) => conceptId === id && context === 'vocabulary' &&
        evidence.observation === 'controlled_production' && evidence.outcome === 'incorrect')
    })
    const term = missed && course.unit.lessons.flatMap(({ vocabulary }) => vocabulary).find(({ id }) => id === missed)?.term
    return { kind: 'review', cardIds, minutes: cardIds.length, reason: term
      ? `“${term}” son denemede hatırlanmadı. İpucundan hareketle yeniden yazmayı dene.`
      : 'Hatırlama zamanı gelen kelimeler önce çalışılır.' }
  }
  const developing = unlocked.find((lesson) => masteryFor(state, lesson).status === 'developing' &&
    !lesson.concepts.some(({ id }) => {
      const recent = state.attempts.filter(({ at, conceptId, context }) => conceptId === id &&
        (context === 'lesson' || context === 'transfer') && date.format(new Date(at)) === date.format(today)).slice(-3)
      return recent.length === 3 && recent.every(({ evidence }) => evidence.outcome === 'incorrect')
    }))
  if (developing) {
    const tasks = lessonTasks(state, developing)
    const onlyProduction = tasks.length === 1 && tasks[0].exercise.kind === 'open'
    if (developing.pedagogy) {
      task = pedagogyPlan(state, course, developing, now, false)
      if (task?.kind === 'pedagogy' && task.phase === 'transfer' && tasks.length &&
        (developing.teaching || (!onlyProduction && !canAccelerate(state, course, developing))) &&
        !state.attempts.some(({ lessonId, context }) => lessonId === developing.id && context === 'transfer')) task = undefined
    }
    if (!task && tasks.length) task = { kind: 'practice', lessonId: developing.id, minutes: onlyProduction ? 3 : developing.minutes,
      reason: onlyProduction ? 'Rehberli pratiği tamamladın. Şimdi öğrendiğin yapıyla kendi mesajını yaz.'
        : `Farklı örneklerle çalışılacak konular: ${tasks.map(({ label }) => label).join(', ')}.` }
  }
  if (!task) {
    for (const lesson of unlocked) {
      const mastery = masteryFor(state, lesson).status
      if (mastery !== 'ready' && mastery !== 'retained') continue
      if (lesson.pedagogy && !state.attempts.some(({ exerciseId }) => exerciseId === lesson.production.id)) {
        task = { kind: 'practice', lessonId: lesson.id, minutes: 3, reason: 'Yeni bağlamı çözdün. Şimdi kendi cümleni kur ve örnek ölçütlerle karşılaştır.' }
      } else if (lesson.pedagogy) task = pedagogyPlan(state, course, lesson, now, true)
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
    const goalWeight = (lesson: Lesson) => lesson.goals.filter((goal) => state.profile.goals.includes(goal)).length
    const next = unlocked.filter((lesson) => masteryFor(state, lesson).status === 'not_assessed')
      .sort((a, b) => misses(b) - misses(a) || goalWeight(b) - goalWeight(a))[0]
    if (next && canAccelerate(state, course, next)) task = pedagogyPlan(state, course, next, now, false)
    else if (next) task = { kind: 'lesson', lessonId: next.id, minutes: next.minutes,
      reason: next === bridge ? 'Tarama, kısa bir temel çalışmanın sonraki görevleri kolaylaştırabileceğini gösterdi.' : misses(next) ? 'Başlangıç taramasında bu kazanım için çalışma fırsatı görüldü.'
        : next.prerequisites.length ? 'Ön koşullar tamamlandı ve sıradaki kazanım açıldı.' : 'Başlangıç ünitesinin ilk kazanımı.' }
  }
  if ((task && 'minutes' in task && task.minutes > available) || (cards.length && available <= 0)) {
    return { kind: 'budget', reason: 'Bugünkü süreye yeni çalışma sığmıyor. Çalışma sırası kaydedildi.' }
  }
  if (task) return task
  if (unlocked.some((lesson) => masteryFor(state, lesson).status === 'developing')) {
    return { kind: 'budget', reason: 'Bugünkü onarım çalışmasına ara ver. Başka bir örnekle sonraki çalışma gününde devam edebilirsin.' }
  }
  if (!eligible.length) {
    return { kind: 'out_of_scope', reason: `Bu dildeki başlangıç ünitesi ${course.level} düzeyinde. Hedefini Ayarlar’dan güncelleyebilirsin.` }
  }
  const hasTargetLessons = eligible.some(({ objective }) => objective.level === state.profile.target)
  return { kind: 'complete', reason: 'Yayımlanan rotanın ilk turu bitti. Vadesi gelen kazanım kontrolleri ve kelime tekrarları plana eklenir.' +
    (hasTargetLessons ? ' Bu bantta yayımlanan kazanımlar seçilidir.' : ` ${state.profile.target} hedefi için bu dilde ders henüz yayımlanmadı.`) }
}
