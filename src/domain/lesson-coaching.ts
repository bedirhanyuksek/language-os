import type { Exercise, Lesson } from '../content/schema'
import type { ExerciseAttempt } from './model'
import type { LearningState } from './state'
import { buildTutorRequest } from './tutor'

export function coachingForAnswer(state: LearningState, lesson: Lesson, exercise: Exercise, attempt: ExerciseAttempt) {
  if (exercise.kind === 'open' && exercise.skill === 'writing' && attempt.evidence.outcome === 'review_required' &&
    typeof attempt.answer === 'string') {
    return {
      label: 'Yanıtım hakkında geri bildirim al',
      request: buildTutorRequest(state, lesson, 'feedback', attempt.answer, { exerciseId: exercise.id }),
    }
  }

  if (attempt.evidence.outcome !== 'incorrect' || attempt.evidence.source !== 'deterministic') return
  const mistakes = state.attempts.filter((item) => item.lessonId === lesson.id && item.conceptId === attempt.conceptId &&
    item.evidence.source === 'deterministic' && item.evidence.outcome === 'incorrect')
  if (mistakes.length >= 2 &&
    lesson.concepts.some(({ id }) => id === attempt.conceptId)) {
    return {
      label: 'Bu hatayı farklı bir örnekle çalış',
      request: buildTutorRequest(state, lesson, 'practice', undefined, { exerciseId: exercise.id, conceptId: attempt.conceptId }),
    }
  }
}
