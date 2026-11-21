import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import type { Exercise } from '../src/content/schema'
import { initialState } from '../src/domain/state'
import { dailyPlan, finishLesson, finishPlacement, lessonTasks } from '../src/domain/progress'

const at = '2026-11-20T10:00:00.000Z'
const answer = (exercise: Exercise) => exercise.kind === 'open' ? exercise.sample :
  exercise.kind === 'short' || exercise.kind === 'fill' ? exercise.accepted[0] : exercise.accepted
const answers = (tasks: { exercise: Exercise }[]) => Object.fromEntries(tasks.map(({ exercise }) => [exercise.id, answer(exercise)]))

for (const course of Object.values(catalog)) {
  test(`${course.language}: teaches active words before asking for an original message`, () => {
    let state = finishPlacement(initialState({ id: '76380dc0-83b3-4295-8346-7ccbf58ac6ca', language: course.language,
      estimate: course.level, target: 'C2', minutes: 60, days: [0,1,2,3,4,5,6], goals: ['general'] }), course, answers(course.placement), at)
    const lesson = course.unit.lessons[0]
    state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), at)
    expect(dailyPlan(state, course, at, 'Europe/Istanbul')).toMatchObject({ kind: 'pedagogy', phase: 'vocabulary', lessonId: lesson.id })
    expect(lessonTasks(state, lesson).some(({ exercise }) => exercise.kind === 'open')).toBe(false)
  })
}

import { productionRequirements, wordsPrepared } from '../src/domain/instruction'
import { dailyProgram } from '../src/domain/daily-program'
import { skillProfile } from '../src/domain/skill-profile'
import { phaseTasks } from '../src/domain/pedagogy'
import { finishPedagogy } from '../src/domain/progress'
import { teachWords } from './teaching-fixture'

function learner(language: 'en' | 'ru', minutes = 30) {
  const course = catalog[language]
  return finishPlacement(initialState({ id: '76380dc0-83b3-4295-8346-7ccbf58ac6ca', language,
    estimate: course.level, target: 'C2', minutes, days: [0,1,2,3,4,5,6], goals: ['general'] }), course,
  { ...answers(course.placement), [language === 'en' ? 'en.diagnostic.2' : 'ru.diagnostic.2']: '___' }, at)
}

test('all published lessons bind their active vocabulary, grammar, strategy and separate transfer checks', () => {
  for (const course of Object.values(catalog)) for (const lesson of course.unit.lessons) {
    expect(lesson.pedagogy, lesson.id).toBeTruthy()
    expect(lesson.teaching?.bridge ?? lesson.pedagogy?.rubric.length, lesson.id).toBeTruthy()
    expect(lesson.pedagogy?.vocabulary.map(({ cardId }) => cardId).sort()).toEqual(lesson.vocabulary.map(({ id }) => id).sort())
    expect(lesson.pedagogy?.checks.map(({ conceptId }) => conceptId).sort()).toEqual(lesson.concepts.map(({ id }) => id).sort())
    const needs = productionRequirements(learner(course.language), lesson)
    expect(needs.vocabulary.every(({ prepared }) => !prepared)).toBe(true)
    expect(needs.grammar.every(({ ready }) => !ready)).toBe(true)
    expect(needs.strategy).toBeTruthy()
  }
})

test('a vocabulary introduction and an original ungraded use never claim independent word mastery', () => {
  const course = catalog.en
  const lesson = course.unit.lessons[0]
  let state = learner('en')
  state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), at)
  const tasks = phaseTasks(state, lesson, 'vocabulary', at)
  state = finishPedagogy(state, course, lesson, 'vocabulary', {
    ...answers(tasks), [lesson.pedagogy!.vocabulary[0].recall.id]: '___',
  }, at)
  const words = productionRequirements(state, lesson).vocabulary
  expect(words[0]).toMatchObject({ introduced: true, practiced: true, prepared: true, recalled: false })
  expect(state.attempts.find(({ exerciseId }) => exerciseId === lesson.pedagogy!.vocabulary[0].use.id)?.evidence.outcome).toBe('review_required')
  expect(skillProfile(state, course, at).find(({ skill }) => skill === 'vocabulary')?.comparison).toBeUndefined()
})

test('prior typed word recall shortens preparation while self reports and a displayed draft do not', () => {
  const state = learner('en')
  const lesson = catalog.en.unit.lessons[0]
  const known = { ...state, reviewHistory: lesson.vocabulary.map(({ id }) => ({ cardId: id, at,
    mode: 'typed' as const, result: 'remembered' as const, answer: String(answer(lesson.pedagogy!.vocabulary.find(({ cardId }) => cardId === id)!.recall)) })) }
  expect(wordsPrepared(known, lesson)).toBe(true)
  expect(wordsPrepared({ ...known, reviewHistory: known.reviewHistory.map((row) => ({ ...row, mode: 'self_review', answer: undefined })) }, lesson)).toBe(false)
  expect(state.attempts.filter(({ context }) => context === 'vocabulary')).toEqual([])
})

for (const minutes of [5, 15, 30, 60]) test(`${minutes} minute programs preserve debt and offer a genuine learning alternative`, () => {
  const base = learner('en', minutes)
  const course = catalog.en
  const cards = course.unit.lessons.flatMap(({ vocabulary }) => vocabulary).slice(0, 65)
  const state = { ...base, reviews: cards.map(({ id }) => ({ cardId: id, step: 0, dueAt: '2026-10-01T10:00:00.000Z', introducedAt: '2026-09-01T10:00:00.000Z' })) }
  const program = dailyProgram(state, course, at, 'Europe/Istanbul')
  expect(program.scheduled).toBeLessThanOrEqual(minutes)
  expect(program.deferred).toBeGreaterThanOrEqual(0)
  expect(program.sequence.some(({ kind }) => kind !== 'review')).toBe(true)
  if (minutes > 5) expect(program.alternatives.some(({ kind }) => kind !== 'review')).toBe(true)
  expect(state.reviews).toEqual(cards.map(({ id }) => ({ cardId: id, step: 0, dueAt: '2026-10-01T10:00:00.000Z', introducedAt: '2026-09-01T10:00:00.000Z' })))
})

test('weekly comparison requires a new task with matching skill, family and known support conditions', () => {
  const course = catalog.en
  const lesson = course.unit.lessons[0]
  let state = learner('en', 60)
  state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), at)
  state = teachWords(state, course, lesson, at)
  state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), at)
  state = finishPedagogy(state, course, lesson, 'transfer', answers(phaseTasks(state, lesson, 'transfer', at)), at)
  const next = '2026-11-21T10:00:00.000Z'
  // Isolate delay from optional alımlama phases without manufacturing a correct answer.
  for (const phase of ['reading', 'listening', 'revision'] as const) {
    const tasks = phaseTasks(state, lesson, phase, at)
    state = finishPedagogy(state, course, lesson, phase, answers(tasks), at, phase === 'listening' ? 'played' : undefined)
  }
  state = finishPedagogy(state, course, lesson, 'delayed', answers(phaseTasks(state, lesson, 'delayed', next)), next)
  expect(skillProfile(state, course, next).find(({ skill }) => skill === 'writing')?.rows
    .find(({ stage }) => stage === 'Yeni metin örneği')).toMatchObject({ result: 'İnceleme bekliyor' })
  expect(skillProfile(state, course, next).find(({ skill }) => skill === 'grammar')?.comparison).toBeUndefined()
  const known = { ...state, attempts: state.attempts.map((row) => ({ ...row, study: { sessionId: '76380dc0-83b3-4295-8346-7ccbf58ac6ca', plays: 0, supports: [] } })) }
  expect(skillProfile(known, course, next).find(({ skill }) => skill === 'grammar')?.comparison).toBeTruthy()
  const stale = { ...known, attempts: known.attempts.map((row) => row.context === 'transfer' ? { ...row, at: '2026-10-01T10:00:00.000Z' } : row) }
  expect(skillProfile(stale, course, next).find(({ skill }) => skill === 'grammar')?.comparison).toBeUndefined()
  const assisted = { ...known, attempts: known.attempts.map((row) => row.context === 'delayed' ? { ...row, study: { ...row.study, supports: ['rubric'] } } : row) }
  expect(skillProfile(assisted, course, next).find(({ skill }) => skill === 'grammar')?.comparison).toBeUndefined()
  expect(skillProfile(known, course, next).find(({ skill }) => skill === 'speaking')?.measured).toBe(false)
})


test('the daily sequence reserves concrete conditional stages without writing predicted successes', () => {
  const state = learner('en', 30)
  const before = structuredClone(state)
  const program = dailyProgram(state, catalog.en, at, 'Europe/Istanbul')
  expect(program.conditional.map(({ label }) => label)).toEqual(expect.arrayContaining(['Gerekli kelime ve kalıpları öğrenme', 'Yeni bağlamda kendi mesajın']))
  expect(program.scheduled).toBeLessThanOrEqual(program.remaining)
  expect(state).toEqual(before)
})

test('an older profile with completed grammar and missing prerequisite words keeps its evidence and waits for instruction', () => {
  const course = catalog.en
  const [first, second] = course.unit.lessons
  let state = learner('en', 60)
  state = finishLesson(state, course, first, answers(lessonTasks(state, first)), at)
  state = teachWords(state, course, first, at)
  state = finishLesson(state, course, first, answers(lessonTasks(state, first)), at)
  state = finishPedagogy(state, course, first, 'transfer', answers(phaseTasks(state, first, 'transfer', at)), at)
  // Reproduce an older valid history in which words were scheduled after transfer.
  const older = { ...state, attempts: state.attempts.filter(({ context }) => context !== 'vocabulary'), reviews: [], reviewHistory: [] }
  const original = structuredClone(older)
  expect(dailyPlan(older, course, at, 'Europe/Istanbul', false)).toMatchObject({ phase: 'vocabulary', lessonId: first.id })
  expect(() => finishLesson(older, course, second, answers(lessonTasks(older, second)), at)).toThrow(/ön koşul/)
  expect(older).toEqual(original)
})
