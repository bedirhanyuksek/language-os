import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import { dailyPlan, finishLesson, finishPedagogy, finishPlacement, lessonTasks } from '../src/domain/progress'
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

test('exhausted guided variants alternate as support and resume on the next scheduled day', () => {
  let state = finishPlacement(empty, course, placement, at)
  const firstTasks = lessonTasks(state, lesson)
  const repeatedConcept = firstTasks[0].conceptId
  const firstId = firstTasks[0].exercise.id
  const firstAnswers = Object.fromEntries(firstTasks.map(({ exercise }) => [exercise.id,
    exercise.id === firstId ? '___' : exercise.kind === 'open' ? exercise.sample :
      exercise.kind === 'fill' || exercise.kind === 'short' ? exercise.accepted[0] : exercise.accepted]))
  state = finishLesson(state, course, lesson, firstAnswers, at)

  const secondTasks = lessonTasks(state, lesson)
  expect(secondTasks).toHaveLength(1)
  expect(secondTasks[0].conceptId).toBe(repeatedConcept)
  expect(secondTasks[0].exercise.id).not.toBe(firstId)
  const secondId = secondTasks[0].exercise.id
  state = finishLesson(state, course, lesson, { [secondId]: '___' }, at)

  const thirdTasks = lessonTasks(state, lesson)
  expect(thirdTasks).toHaveLength(1)
  expect(thirdTasks[0].exercise.id).toBe(firstId)
  state = finishLesson(state, course, lesson, { [firstId]: '___' }, at)
  expect(dailyPlan(state, course, at, 'Europe/Istanbul').kind).toBe('budget')
  expect(() => finishPedagogy(state, course, lesson, 'transfer', {}, at)).toThrow(/rehberli/)

  const nextDay = '2026-11-14T10:00:00.000Z'
  expect(dailyPlan(state, course, nextDay, 'Europe/Istanbul')).toMatchObject({ kind: 'practice', lessonId: lesson.id })
  const fourthTasks = lessonTasks(state, lesson)
  expect(fourthTasks[0].exercise.id).toBe(secondId)
  state = finishLesson(state, course, lesson, { [secondId]: '___' }, nextDay)
  expect(lessonTasks(state, lesson).map(({ exercise }) => exercise.id)).toEqual([firstId])
})
