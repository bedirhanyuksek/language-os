import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import { finishLesson, finishPlacement, lessonTasks } from '../src/domain/progress'
import type { Answer } from '../src/domain/model'
import { initialState } from '../src/domain/state'

const at = '2026-11-13T10:00:00.000Z'
const course = catalog.en
const lesson = course.unit.lessons.find(({ id }) => id === 'en.identity')!
const empty = initialState({ id: 'a9c1e239-13b6-4f01-a788-27c898e21b02', language: 'en',
  estimate: 'A1', target: 'A1', minutes: 15, goals: ['general'], days: [5, 6] })
const placement = Object.fromEntries(course.placement.map(({ exercise }) =>
  [exercise.id, exercise.kind === 'open' ? exercise.sample :
    exercise.kind === 'fill' || exercise.kind === 'short' ? exercise.accepted[0] : exercise.accepted])) as Record<string, Answer>

test('exhausted guided variants stop instead of presenting a used question', () => {
  let state = finishPlacement(empty, course, placement, at)
  const seen = new Set<string>()
  for (let i = 0; i < 6; i++) {
    const tasks = lessonTasks(state, lesson)
    if (!tasks.length) break
    for (const { exercise } of tasks) {
      expect(seen.has(exercise.id), exercise.id).toBe(false)
      seen.add(exercise.id)
    }
    state = finishLesson(state, course, lesson, Object.fromEntries(tasks.map(({ exercise }) => [exercise.id, '___'])), at)
  }
  expect(seen.size).toBeGreaterThan(1)
  expect(lessonTasks(state, lesson)).toEqual([])
})
