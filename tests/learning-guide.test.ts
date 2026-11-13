import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import type { Course, Exercise } from '../src/content/schema'
import { mapPlacement } from '../src/domain/assessment'
import type { Answer } from '../src/domain/model'
import { phaseTasks } from '../src/domain/pedagogy'
import { dailyPlan, finishLesson, finishPedagogy, finishPlacement, lessonTasks, masteryFor } from '../src/domain/progress'
import { initialState } from '../src/domain/state'

const start = '2026-11-13T10:00:00.000Z'
const tomorrow = '2026-11-14T10:00:00.000Z'

function practiceAnswers(tasks: { exercise: Exercise }[]): Record<string, Answer> {
  return Object.fromEntries(tasks.map(({ exercise }) => {
    if (exercise.kind === 'open') return [exercise.id, exercise.sample]
    if (exercise.kind === 'fill' || exercise.kind === 'short') return [exercise.id, exercise.accepted[0]]
    return [exercise.id, exercise.accepted]
  }))
}

function place(course: Course, answers: Record<string, Answer>) {
  return finishPlacement(initialState({
    id: '9af6d437-9a31-4537-bf02-9d0c87a17052', language: course.language,
    estimate: course.level, target: course.level, minutes: 60, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6],
  }), course, answers, start)
}

test('same goal and estimate lead to different first recommendations from learner evidence', () => {
  const course = catalog.en
  const shared = {
    'en.placement.1': 'led', 'en.placement.2': 'had already sent',
    'en.placement.3': 'a handover', 'en.placement.4': 'On Thursday',
    'en.placement.5': 'I have led a small team.',
    'en.diagnostic.1': 'I have led several sessions.', 'en.diagnostic.2': 'have led',
    'en.diagnostic.3': 'joined',
  }
  const ready = place(course, shared)
  const recognitionOnly = place(course, { ...shared, 'en.diagnostic.2': 'have lead' })
  expect(ready.profile).toEqual(recognitionOnly.profile)
  expect(dailyPlan(ready, course, start, 'Europe/Istanbul')).toMatchObject({
    kind: 'pedagogy', phase: 'transfer', reason: expect.stringContaining('hem tanıma hem üretim'),
  })
  expect(dailyPlan(recognitionOnly, course, start, 'Europe/Istanbul')).toMatchObject({
    kind: 'lesson', lessonId: 'en.experience', reason: expect.stringContaining('taramasında'),
  })
})

test('local practice advances with no account and keeps unsupported evidence out of the skill profile', () => {
  const course = catalog.ru
  const lesson = course.unit.lessons[0]
  const initial = place(course, { ...practiceAnswers(course.placement), 'ru.diagnostic.2': 'я' })
  const guided = finishLesson(initial, course, lesson, practiceAnswers(lessonTasks(initial, lesson)), start)
  const transferred = finishPedagogy(guided, course, lesson, 'transfer', {
    'ru.intro.name.transfer.1': 'Меня', 'ru.intro.polite.transfer.1': 'вас',
  }, start)
  const read = finishPedagogy(transferred, course, lesson, 'reading', { 'ru.intro.reading': 'Pavel' }, start)
  const skipped = finishPedagogy(read, course, lesson, 'listening', {}, start, 'unavailable')
  expect(skipped.attempts).toEqual(read.attempts)
  expect(skipped.speakingAssessments).toEqual([])
  expect(mapPlacement(skipped.attempts)).toEqual(expect.arrayContaining([
    expect.objectContaining({ skill: 'listening', status: 'not_assessed' }),
    expect.objectContaining({ skill: 'speaking', status: 'not_assessed' }),
    expect.objectContaining({ skill: 'writing', status: 'review_required' }),
  ]))
  expect(dailyPlan(skipped, course, start, 'Europe/Istanbul')).toMatchObject({ phase: 'vocabulary' })
  expect(masteryFor(skipped, lesson).status).toBe('ready')
  expect(phaseTasks(skipped, lesson, 'delayed', start)).toEqual([])
  expect(phaseTasks(skipped, lesson, 'delayed', tomorrow).map(({ exercise }) => exercise.id)).toEqual([
    'ru.intro.name.delayed.1', 'ru.intro.polite.delayed.1',
  ])
})
