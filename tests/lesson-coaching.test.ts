import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import { assess } from '../src/domain/assessment'
import { coachingForAnswer } from '../src/domain/lesson-coaching'
import type { ExerciseAttempt } from '../src/domain/model'
import { initialState } from '../src/domain/state'
import { tutorInput, validateTutorResponse } from '../src/domain/tutor'

const course = catalog.en
const lesson = course.unit.lessons[0]
const state = initialState({ id: '72752ef8-871a-4a80-8299-ccfeec0dc4e1', language: 'en',
  estimate: 'C1', target: 'B2', days: [1], goals: ['professional'], minutes: 30 })

test('routes writing feedback by exercise and retains the original evidence', () => {
  const answer = 'I joined the team last year.'
  const attempt: ExerciseAttempt = { id: 'draft', context: 'lesson', lessonId: lesson.id, contentVersion: 2,
    exerciseId: lesson.production.id, conceptId: lesson.objective.id, answer, at: '2026-11-13T10:00:00.000Z',
    evidence: assess(lesson.production, answer, 'en') }
  const snapshot = { ...state, attempts: [attempt] }
  const choice = coachingForAnswer(snapshot, lesson, lesson.production, attempt)!
  expect(choice.request).toMatchObject({ task: 'feedback', sentence: answer, difficulty: lesson.objective.level })
  expect(tutorInput(choice.request, course)).toMatchObject({ exercise: lesson.production.prompt, sentence: answer })
  expect(() => validateTutorResponse({ task: 'feedback', grammar: 'Correct', vocabulary: 'OK', naturalness: 'OK',
    suitability: 'OK', corrections: [{ quote: 'Invented quote', correction: 'Corrected', explanation: 'Example' }],
  }, choice.request)).toThrow()
  expect(snapshot.attempts[0].evidence.outcome).toBe('review_required')
})

test('keeps correct alternatives local and offers help only after a repeated local miss', () => {
  const concept = lesson.concepts[0]
  const exercise = lesson.pedagogy!.checks[0].transfer[0]
  if (exercise.kind !== 'fill' && exercise.kind !== 'short') throw new Error('Expected text answer')
  const answer = exercise.accepted[0].toUpperCase()
  const correct: ExerciseAttempt = { id: 'correct', context: 'transfer', lessonId: lesson.id, contentVersion: 2,
    exerciseId: exercise.id, conceptId: concept.id, answer, at: '2026-11-13T10:00:00.000Z',
    evidence: assess(exercise, answer, 'en') }
  expect(correct.evidence.outcome).toBe('correct')
  expect(coachingForAnswer(state, lesson, exercise, correct)).toBeUndefined()
  const wrong = { ...correct, answer: 'wrong', evidence: assess(exercise, 'wrong', 'en') }
  expect(coachingForAnswer({ ...state, attempts: [wrong] }, lesson, exercise, wrong)).toBeUndefined()
  const repeated = { ...state, attempts: [wrong, { ...wrong, id: 'retry' }] }
  const choice = coachingForAnswer(repeated, lesson, exercise, repeated.attempts[1])!
  expect(choice.request).toMatchObject({ task: 'practice', conceptId: concept.id, mistakes: [{ conceptId: concept.id, count: 2 }] })
  expect(choice.request.sentence).toBeUndefined()
})
