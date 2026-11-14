import type { Course, Exercise, Lesson } from '../content/schema'
import type { ListeningActivity } from '../content/pedagogy-schema'
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

type DiagnosticTask = {
  exercise: Exercise
  lesson: Lesson
  label: string
  passage?: string
  audio?: Pick<ListeningActivity, 'audio' | 'transcript'>
}

export function diagnosticTasks(course: Course, state: LearningState): DiagnosticTask[] {
  const bridge = bridgeLesson(course)
  if (!bridge?.pedagogy) return []
  const core = course.unit.lessons[0]
  const lesson = needsFoundation(state) ? bridge : core
  const pedagogy = lesson.pedagogy?.diagnostic
  if (!pedagogy) return []
  const foundation = [
    { exercise: pedagogy.reading.question, lesson, label: 'Okuma', passage: pedagogy.reading.text },
    { exercise: pedagogy.listening.detail, lesson, label: 'Dinleme', audio: pedagogy.listening },
  ]
  const advanced = advancedSamples[course.language]
  const candidate = course.unit.lessons.find(({ id }) => id === advanced.lessonId)
  const successes = state.attempts.filter(({ context, exerciseId, evidence }) =>
    context === 'diagnostic' && evidence.outcome === 'correct' && foundation.some(({ exercise }) => exercise.id === exerciseId))
  if (!candidate || lesson === bridge || successes.length < foundation.length) return foundation
  return [...foundation, ...advanced.exercises.map((exercise) => ({
    exercise, lesson: candidate, label: exercise.skill === 'grammar' ? 'Dil bilgisi' : 'Kelime ve kalıp',
  }))]
}

const advancedSamples: Record<Course['language'], { lessonId: string; exercises: Exercise[] }> = {
  en: { lessonId: 'en.conditional', exercises: [
    { id: 'en.route.condition', kind: 'fill', skill: 'grammar', prompt: 'If the venue does not confirm, we won’t book it. We won’t book it ___ the venue confirms.',
      accepted: ['unless'], explanation: 'Unless aynı olumsuz koşulu tek bağlaçla ifade eder.' },
    { id: 'en.route.deadline', kind: 'short', skill: 'vocabulary', prompt: 'İşin son teslim tarihine yetişmek anlamında “___ the deadline” ifadesindeki fiili yaz.',
      accepted: ['meet', 'make'], explanation: 'Meet the deadline ve make the deadline, belirtilen zamana yetişmeyi anlatır.' },
  ] },
  ru: { lessonId: 'ru.service', exercises: [
    { id: 'ru.route.request', kind: 'fill', skill: 'grammar', prompt: 'İsteği tamamla: Я хочу, ___ вы проверили адрес.',
      accepted: ['чтобы'], explanation: 'İstenen eylem için чтобы kullanılır.' },
    { id: 'ru.route.order', kind: 'short', skill: 'vocabulary', prompt: '“Sipariş numarası” kalıbını Rusça yaz.',
      accepted: ['номер заказа'], explanation: 'Заказ sipariş, номер заказа sipariş numarasıdır.' },
  ] },
}

export function needsBridge(course: Course, state: LearningState, lesson: Lesson) {
  if (lesson.id !== bridgeLesson(course)?.id) return false
  if (state.attempts.some((item) => item.lessonId === lesson.id && item.context !== 'diagnostic')) return true
  if (!course.unit.lessons.some((item) => item !== lesson && item.objective.level === state.profile.target) &&
    state.profile.target === lesson.objective.level) return true
  return needsFoundation(state) || state.attempts.some((item) =>
    item.context === 'diagnostic' && item.evidence.skill === 'reading' && item.evidence.outcome === 'incorrect')
}

export function nextDiagnostic(course: Course, state: LearningState) {
  return diagnosticTasks(course, state).find(({ exercise }) =>
    !state.attempts.some((attempt) => attempt.context === 'diagnostic' && attempt.exerciseId === exercise.id))
}

export function isLessonEvidence({ context }: ExerciseAttempt) {
  return context !== 'placement' && context !== 'diagnostic'
}
