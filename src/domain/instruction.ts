import type { Lesson } from '../content/schema'
import { assess } from './assessment'
import type { LearningState } from './state'

// Instruction and practice are prerequisites for attempting a task, never claims of mastery.
export function wordPreparation(state: LearningState, lesson: Lesson) {
  return lesson.vocabulary.map((card) => {
    const learning = lesson.pedagogy?.vocabulary.find(({ cardId }) => cardId === card.id)
    const attempts = state.attempts.filter(({ conceptId, context }) => conceptId === card.id && context === 'vocabulary')
    const recall = attempts.find(({ exerciseId }) => exerciseId === learning?.recall.id)
    const use = attempts.find(({ exerciseId }) => exerciseId === learning?.use.id)
    const lastReview = state.reviewHistory.filter(({ cardId }) => cardId === card.id).at(-1)
    const known = lastReview?.mode === 'typed' && lastReview.result === 'remembered' && learning &&
      typeof lastReview.answer === 'string' && assess(learning.recall, lastReview.answer, state.profile.language).outcome === 'correct'
    return { card, introduced: attempts.length > 0, practiced: Boolean(use),
      recalled: recall?.evidence.outcome === 'correct' || known,
      prepared: !learning || Boolean(use) || known }
  })
}

export function wordsPrepared(state: LearningState, lesson: Lesson) {
  const vocabulary = lesson.pedagogy?.vocabulary
  if (!vocabulary) return true
  const used = new Set(state.attempts.filter(({ lessonId, context }) => lessonId === lesson.id && context === 'vocabulary')
    .map(({ exerciseId }) => exerciseId))
  return vocabulary.every((entry) => {
    if (used.has(entry.use.id)) return true
    const review = [...state.reviewHistory].reverse().find(({ cardId }) => cardId === entry.cardId)
    return review?.mode === 'typed' && review.result === 'remembered' && typeof review.answer === 'string' &&
      assess(entry.recall, review.answer, state.profile.language).outcome === 'correct'
  })
}

export function productionRequirements(state: LearningState, lesson: Lesson) {
  const grammar = lesson.concepts.map((concept) => {
    const samples = state.attempts.filter(({ lessonId, conceptId, context }) => lessonId === lesson.id && conceptId === concept.id &&
      ['lesson', 'transfer', 'delayed'].includes(context))
    const latest = samples.at(-1)
    return { id: concept.id, label: concept.label, practiced: samples.length > 0,
      ready: latest?.evidence.outcome === 'correct',
      transferred: samples.some(({ context, evidence }) => context === 'transfer' && evidence.outcome === 'correct') }
  })
  return { grammar, vocabulary: wordPreparation(state, lesson), strategy: lesson.teaching?.bridge ?? lesson.pedagogy?.rubric.map(({ criterion }) => criterion).join(' · ') }
}
