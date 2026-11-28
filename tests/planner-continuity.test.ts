import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import type { Course } from '../src/content/schema'
import { phaseTasks } from '../src/domain/pedagogy'
import { dailyPlan, finishLesson, finishPedagogy, finishPlacement, isUnlocked, lessonTasks, masteryFor } from '../src/domain/progress'
import { initialState } from '../src/domain/state'
import { sampleAnswers, teachWords } from './teaching-fixture'

const at = '2026-11-13T10:00:00.000Z'
const nextDay = '2026-11-14T10:00:00.000Z'
const zone = 'Europe/Istanbul'
const english = catalog.en

function start() {
  return finishPlacement(initialState({
    id: 'acdc92e4-faae-4d28-8b32-d58e488ed68d', language: 'en', estimate: 'A1', target: 'B1',
    minutes: 60, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6],
  }), english, sampleAnswers(english.placement), at)
}

function withLessons(...ids: string[]): Course {
  return { ...english, unit: { ...english.unit, lessons: english.unit.lessons.filter(({ id }) => ids.includes(id)) } }
}

test('English A1 to B1 includes the starter prerequisites in a legacy placement profile', () => {
  const course = withLessons('en.identity', 'en.cafe', 'en.station', 'en.rebook')
  const state = start()
  const starter = course.unit.lessons.find(({ id }) => id === 'en.identity')!
  const rebook = course.unit.lessons.find(({ id }) => id === 'en.rebook')!
  expect(isUnlocked(state, course, rebook)).toBe(false)
  expect(() => finishLesson(state, course, rebook, sampleAnswers(lessonTasks(state, rebook)), at)).toThrow(/ön koşul/)
  expect(dailyPlan(state, course, at, zone)).toMatchObject({ kind: 'lesson', lessonId: starter.id })
})

test('a route with a prerequisite outside the target band reports the wait', () => {
  const base = withLessons('en.identity', 'en.cafe')
  const course: Course = { ...base, unit: { ...base.unit, lessons: base.unit.lessons.map((lesson) =>
    lesson.id === 'en.identity' ? { ...lesson, objective: { ...lesson.objective, level: 'B2' } } : lesson) } }
  const state = start()
  expect(dailyPlan(state, course, at, zone)).toMatchObject({ kind: 'prerequisite_wait', lessonId: 'en.cafe' })
})

test('the last lesson still has a delayed check before the route ends', () => {
  const course = withLessons('en.identity')
  const [lesson] = course.unit.lessons
  let state = start()
  state = finishLesson(state, course, lesson, sampleAnswers(lessonTasks(state, lesson)), at)
  state = teachWords(state, course, lesson, at)
  state = finishLesson(state, course, lesson, sampleAnswers(lessonTasks(state, lesson)), at)
  for (const phase of ['transfer', 'reading', 'listening', 'revision'] as const) {
    state = finishPedagogy(state, course, lesson, phase, sampleAnswers(phaseTasks(state, lesson, phase, at)),
      at, phase === 'listening' ? 'played' : undefined)
  }
  state = { ...state, skippedSpeaking: [lesson.id] }
  expect(masteryFor(state, lesson).status).toBe('ready')
  expect(phaseTasks(state, lesson, 'delayed', at)).toHaveLength(0)
  expect(dailyPlan(state, course, at, zone, false)).toMatchObject({ kind: 'review_wait', lessonId: lesson.id })
  expect(dailyPlan(state, course, nextDay, zone, false)).toMatchObject({ kind: 'pedagogy', phase: 'delayed', lessonId: lesson.id })
  state = finishPedagogy(state, course, lesson, 'delayed', sampleAnswers(phaseTasks(state, lesson, 'delayed', nextDay)), nextDay)
  expect(masteryFor(state, lesson).status).toBe('retained')
  expect(dailyPlan(state, course, nextDay, zone, false).kind).toBe('complete')
})
