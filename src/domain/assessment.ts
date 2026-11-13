import type { Exercise } from '../content/schema'
import { skillSchema, type Answer, type Assessment, type AssessmentEvidence, type ExerciseAttempt, type Language } from './model'

const normalize = (answer: string, language: Language) =>
  answer.normalize('NFC').trim().toLocaleLowerCase(language)
    .replace(/’/g, "'").replace(/[.?!]+$/, '').trim().replace(/\s+/g, ' ')

export function assess(exercise: Exercise, answer: Answer, language: Language): AssessmentEvidence {
  const skill = exercise.skill
  if (exercise.kind === 'open') {
    return { skill, observation: 'free_production', source: 'learner_text', outcome: 'review_required', confidence: 'low' }
  }
  let correct = false
  if (exercise.kind === 'single') correct = answer === exercise.accepted
  else if (exercise.kind === 'fill' || exercise.kind === 'short') {
    correct = typeof answer === 'string' && exercise.accepted.some((value) => normalize(value, language) === normalize(answer, language))
  } else if (Array.isArray(answer)) {
    const expected = exercise.kind === 'multiple' ? [...exercise.accepted].sort() : exercise.accepted
    const actual = exercise.kind === 'multiple' ? [...answer].sort() : answer
    correct = actual.length === expected.length && actual.every((value, index) => value === expected[index])
  }
  return {
    skill, observation: ['single', 'multiple', 'matching'].includes(exercise.kind) ? 'recognition' : 'controlled_production',
    source: 'deterministic', outcome: correct ? 'correct' : 'incorrect', confidence: 'high',
  }
}

export function mapPlacement(attempts: ExerciseAttempt[]): Assessment[] {
  return skillSchema.options.map((skill) => {
    const evidence = attempts.filter((attempt) => (attempt.context === 'placement' || attempt.context === 'diagnostic') && attempt.evidence.skill === skill)
    const scored = evidence.filter((attempt) => attempt.evidence.source === 'deterministic')
    return {
      skill, status: scored.length ? 'sampled' : evidence.length ? 'review_required' : 'not_assessed',
      correct: scored.filter((attempt) => attempt.evidence.outcome === 'correct').length, total: scored.length,
      confidence: evidence.length ? 'low' : null, evidenceIds: evidence.map((attempt) => attempt.id),
    }
  })
}
