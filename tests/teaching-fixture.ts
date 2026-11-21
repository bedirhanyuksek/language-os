import type { Course, Exercise, Lesson } from '../src/content/schema'
import { wordsPrepared } from '../src/domain/instruction'
import { phaseTasks } from '../src/domain/pedagogy'
import { finishPedagogy } from '../src/domain/progress'
import type { LearningState } from '../src/domain/state'

export const sampleAnswers = (tasks: { exercise: Exercise }[]) => Object.fromEntries(tasks.map(({ exercise }) =>
  [exercise.id, exercise.kind === 'open' ? exercise.sample : exercise.kind === 'fill' || exercise.kind === 'short'
    ? exercise.accepted[0] : exercise.accepted]))

// Build prerequisite evidence through the same operations as the learner flow.
export function teachWords(state: LearningState, course: Course, lesson: Lesson, at: string) {
  let next = state
  while (!wordsPrepared(next, lesson)) {
    const tasks = phaseTasks(next, lesson, 'vocabulary', at)
    if (!tasks.length) throw new Error('Vocabulary fixture has no available teaching task')
    next = finishPedagogy(next, course, lesson, 'vocabulary', sampleAnswers(tasks), at)
  }
  return next
}
