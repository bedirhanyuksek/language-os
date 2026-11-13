import type { Course, Lesson } from '../content/schema'
import type { ExerciseAttempt } from './model'
import type { LearningState } from './state'

export function bridgeLesson(course: Course) {
  return course.unit.lessons.find(({ id }) => id === (course.language === 'ru' ? 'ru.cyrillic' : 'en.routine'))
}

function needsFoundation(state: LearningState) {
  const evidence = state.attempts.filter(({ context }) => context === 'placement')
  return evidence.some(({ evidence }) => evidence.skill === 'reading' && evidence.outcome === 'incorrect') ||
    evidence.filter(({ evidence }) => evidence.skill === 'grammar' && evidence.outcome === 'incorrect').length >= 3
}

export function diagnosticTasks(course: Course, state: LearningState) {
  const bridge = bridgeLesson(course)
  if (!bridge?.pedagogy) return []
  const core = course.unit.lessons[0]
  const lesson = needsFoundation(state) ? bridge : core
  const pedagogy = lesson.pedagogy?.diagnostic
  if (!pedagogy) return []
  return [
    { exercise: pedagogy.reading.question, lesson, label: 'Okuma', passage: pedagogy.reading.text },
    { exercise: pedagogy.listening.detail, lesson, label: 'Dinleme', audio: pedagogy.listening },
  ]
}

export function needsBridge(course: Course, state: LearningState, lesson: Lesson) {
  if (lesson.id !== bridgeLesson(course)?.id) return false
  if (state.attempts.some((item) => item.lessonId === lesson.id && item.context !== 'diagnostic')) return true
  if (!course.unit.lessons.some((item) => item !== lesson && item.objective.level === state.profile.target) &&
    state.profile.target === lesson.objective.level) return true
  return needsFoundation(state) || state.attempts.some((item) =>
    item.context === 'diagnostic' && item.evidence.outcome === 'incorrect')
}

export function nextDiagnostic(course: Course, state: LearningState) {
  return diagnosticTasks(course, state).find(({ exercise }) =>
    !state.attempts.some((attempt) => attempt.context === 'diagnostic' && attempt.exerciseId === exercise.id))
}

export function isLessonEvidence({ context }: ExerciseAttempt) {
  return context !== 'placement' && context !== 'diagnostic'
}
