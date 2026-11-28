import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import type { Lesson } from '../src/content/schema'
import { vocabularyIndex } from '../src/content/vocabulary'
import { beginPlacementTrack, nextPlacementItem, placementEntry, recordPlacementSample } from '../src/domain/adaptive-placement'
import { wordsPrepared } from '../src/domain/instruction'
import { dailyMinutes, dailyPlan, finishLesson, finishPedagogy,
  finishTypedReview, lessonTasks, masteryFor } from '../src/domain/progress'
import { phaseTasks } from '../src/domain/pedagogy'
import { initialState } from '../src/domain/state'
import { sampleAnswers } from './teaching-fixture'

const at = '2026-11-20T10:00:00.000Z'
const zone = 'Europe/Istanbul'
const day = 86_400_000
const b1Ids = ['en.return-process', 'en.venue-rules', 'en.access-criteria', 'en.relay-request', 'en.pending-repair']
const b2Ids = ['en.commission-check', 'en.mixed-outcome', 'en.compact-safety-note', 'en.project-milestone', 'en.resolution-letter']
const packIds = [...b1Ids, ...b2Ids]

test('the first-wave English lessons have stable cards and separate transfer and delayed evidence', () => {
  const course = catalog.en
  const lessons = packIds.map((id) => course.unit.lessons.find((lesson) => lesson.id === id))
  expect(lessons.every(Boolean)).toBe(true)
  const vocabulary = vocabularyIndex(course)
  const normalize = (term: string) => term.normalize('NFC').trim().toLowerCase().replace(/^(a|an|the) /, '')
  const terms = new Set(course.unit.lessons.filter(({ id }) => !packIds.includes(id))
    .flatMap(({ vocabulary }) => vocabulary.map(({ term }) => normalize(term))))
  for (const lesson of lessons as Lesson[]) {
    expect(lesson.vocabulary).toHaveLength(6)
    expect(lesson.vocabulary.map(({ id }) => id)).toEqual(Array.from({ length: 6 }, (_, index) => `${lesson.id}.word.${index + 1}`))
    for (const card of lesson.vocabulary) {
      expect(terms.has(normalize(card.term)), card.term).toBe(false)
      terms.add(normalize(card.term))
      expect(vocabulary.get(card.id)?.sense?.links[0]).toMatchObject({ cardId: card.id, objectiveId: lesson.objective.id })
    }
    expect(lesson.teaching?.audioMode).toBe('script-practice')
    const checks = lesson.pedagogy!.checks
    expect(checks.flatMap(({ transfer }) => transfer)).toHaveLength(4)
    expect(checks.flatMap(({ delayed }) => delayed)).toHaveLength(4)
    const transferIds = checks.flatMap(({ transfer }) => transfer.map(({ id }) => id))
    const delayedIds = checks.flatMap(({ delayed }) => delayed.map(({ id }) => id))
    expect(new Set([...transferIds, ...delayedIds]).size).toBe(8)
    const guidedPrompts = lesson.concepts.flatMap(({ variants }) => variants.map(({ prompt }) => prompt))
    const transferPrompts = checks.flatMap(({ transfer }) => transfer.map(({ prompt }) => prompt))
    const delayedPrompts = checks.flatMap(({ delayed }) => delayed.map(({ prompt }) => prompt))
    expect(new Set([...guidedPrompts, ...transferPrompts, ...delayedPrompts]).size)
      .toBe(guidedPrompts.length + transferPrompts.length + delayedPrompts.length)
    expect(lesson.pedagogy?.listening.main.skill).toBe('listening')
    expect(lesson.pedagogy?.listening.detail.skill).toBe('listening')
  }
})

test.each([15, 20])('%i-minute B1 learner reaches new B1 and B2 lessons without skipping prerequisites', (minutes) => {
  const course = catalog.en
  const newLessons = new Set(packIds)
  let state = beginPlacementTrack(initialState({ id: `ce5d1985-6a73-4f6e-9712-${minutes}0000000000`, language: 'en',
    estimate: 'B1', target: 'B2', minutes, days: [1, 2, 3, 4, 5], goals: ['general'] }), at)
  while (!state.placementAt) {
    const item = nextPlacementItem(state, at, zone)
    if (!item) throw new Error('Expected a placement sample')
    const exercise = item.exercise
    state = recordPlacementSample(state, item.id, exercise && !item.transcript
      ? { status: 'answered', answer: sampleAnswers([{ exercise }])[exercise.id] }
      : { status: item.transcript ? 'unavailable' : 'unknown' }, at, zone)
  }
  expect(placementEntry(state)?.id).toBe('en.experience')
  let firstNewB1: string | undefined
  let firstNewB2: string | undefined
  const milestone = course.unit.lessons.find(({ id }) => id === 'en.project-milestone')!
  let checkedMilestone = false

  for (let elapsed = 0; elapsed < 150 && !checkedMilestone; elapsed++) {
    const now = new Date(Date.parse(at) + elapsed * day).toISOString()
    for (let block = 0; block < 60; block++) {
      const plan = dailyPlan(state, course, now, zone)
      if (!('minutes' in plan)) break
      expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(minutes)

      if (plan.kind === 'review') {
        for (const id of plan.cardIds) {
          const recall = course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? [])
            .find(({ cardId }) => cardId === id)?.recall
          if (recall?.kind !== 'fill' && recall?.kind !== 'short') throw new Error(`No typed English recall task for ${id}`)
          state = finishTypedReview(state, course, id, recall.accepted[0], now)
        }
        continue
      }

      const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
      if (newLessons.has(lesson.id) && plan.kind !== 'speaking') {
        const prerequisites = lesson.prerequisites.map((id) => course.unit.lessons.find((item) => item.objective.id === id)!)
        expect(prerequisites.length).toBeGreaterThan(0)
        for (const prerequisite of prerequisites) {
          const status = masteryFor(state, prerequisite).status
          expect(['ready', 'retained'], `${lesson.id} needs ${prerequisite.id}`).toContain(status)
          expect(wordsPrepared(state, prerequisite), `${lesson.id} needs ${prerequisite.id} vocabulary`).toBe(true)
        }
        if (lesson.objective.level === 'B1') firstNewB1 ??= lesson.id
        if (lesson.objective.level === 'B2') firstNewB2 ??= lesson.id
      }

      if (plan.kind === 'speaking') {
        state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
      } else if (plan.kind === 'pedagogy') {
        const tasks = phaseTasks(state, lesson, plan.phase, now, plan.vocabularyCardIds)
        const answers = sampleAnswers(tasks)
        // The new lessons use script practice and have no validated recordings.
        // finishPedagogy records the listening phase as skipped, never as listening evidence.
        state = finishPedagogy(state, course, lesson, plan.phase, answers, now,
          plan.phase === 'listening' ? 'unavailable' : undefined, now, plan.vocabularyCardIds)
        if (lesson.id === milestone.id && plan.phase === 'delayed') {
          checkedMilestone = true
          break
        }
      } else {
        const tasks = lessonTasks(state, lesson)
        state = finishLesson(state, course, lesson, sampleAnswers(tasks), now)
      }
    }
  }

  expect(firstNewB1).toBeDefined()
  expect(firstNewB2).toBeDefined()
  expect(checkedMilestone).toBe(true)
  expect(masteryFor(state, milestone).status).toBe('retained')
  const transfer = state.attempts.find(({ lessonId, context }) => lessonId === milestone.id && context === 'transfer')!
  const delayed = state.attempts.find(({ lessonId, context }) => lessonId === milestone.id && context === 'delayed')!
  expect(delayed.exerciseId).not.toBe(transfer.exerciseId)
  expect(Date.parse(delayed.at) - Date.parse(transfer.at)).toBeGreaterThanOrEqual(day)
  expect(b1Ids).toContain(firstNewB1)
  expect(b2Ids).toContain(firstNewB2)
  expect(state.attempts.some(({ lessonId, context }) => packIds.includes(lessonId ?? '') && context === 'listening')).toBe(false)
  expect(state.skippedListening.some((id) => packIds.includes(id))).toBe(true)
})
