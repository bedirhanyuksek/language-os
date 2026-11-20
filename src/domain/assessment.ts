import type { Exercise } from '../content/schema'
import { skillSchema, type Answer, type Assessment, type AssessmentEvidence, type ExerciseAttempt, type Language } from './model'

/** 'legacy' reproduces the original strict comparison so older backups still validate. */
export type AssessmentRules = 'current' | 'legacy'

// Latin letters that look like Cyrillic ones; learners on a non-Russian keyboard often mix them in.
const cyrillicLookalikes: Record<string, string> = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у' }

function normalize(answer: string, language: Language, rules: AssessmentRules) {
  if (rules === 'legacy') {
    return answer.normalize('NFC').trim().toLocaleLowerCase(language)
      .replace(/’/g, "'").replace(/[.?!]+$/, '').trim().replace(/\s+/g, ' ')
  }
  let text = answer.normalize('NFC').toLocaleLowerCase(language).replace(/[’‘`´]/g, "'")
  if (language === 'ru') {
    // Russian stress marks are optional; English accents must remain significant.
    text = text.normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC')
      .replace(/ё/g, 'е').replace(/[‐‑–—]/g, '-')
    if (/\p{Script=Cyrillic}/u.test(text)) text = text.replace(/[a-z]/g, (letter) => cyrillicLookalikes[letter] ?? letter)
  }
  // Inner commas, quotes and brackets do not change whether a short answer is right.
  return text.replace(/["«»„“”]/g, '').replace(/[,;:()]/g, ' ')
    .replace(/^[\s.?!…¿¡]+|[\s.?!…]+$/g, '').replace(/\s+/g, ' ').trim()
}

/** True when a Russian answer has letters but none of them are Cyrillic, e.g. typed on a Turkish keyboard. */
export function missingCyrillic(answer: string) {
  return /\p{L}/u.test(answer) && !/\p{Script=Cyrillic}/u.test(answer)
}

export function assess(exercise: Exercise, answer: Answer, language: Language, rules: AssessmentRules = 'current'): AssessmentEvidence {
  const skill = exercise.skill
  if (exercise.kind === 'open') {
    return { skill, observation: 'free_production', source: 'learner_text', outcome: 'review_required', confidence: 'low' }
  }
  let correct = false
  if (exercise.kind === 'single') correct = answer === exercise.accepted
  else if (exercise.kind === 'fill' || exercise.kind === 'short') {
    correct = typeof answer === 'string' && exercise.accepted.some((value) => normalize(value, language, rules) === normalize(answer, language, rules))
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
