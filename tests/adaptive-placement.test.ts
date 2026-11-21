import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { assessmentBank, routeLanguage } from '../src/content/assessment/bank'
import { exerciseSchema } from '../src/content/exercise-schema'
import { catalog } from '../src/content/catalog'
import { beginPlacementTrack, finishMiniPlacement, independent, nextPlacementItem, placementSkills, recordPlacementSample,
  validPlacementTrack } from '../src/domain/adaptive-placement'
import { dailyPlan, finishLesson, finishPlacement, isUnlocked, lessonTasks, masteryFor } from '../src/domain/progress'
import { initialState, type LearningState, type Profile } from '../src/domain/state'
import { exportBackup, parseBackup } from '../src/persistence/repository'

const day1 = '2026-11-13T10:00:00.000Z'
const day2 = '2026-11-14T10:00:00.000Z'
const day3 = '2026-11-15T10:00:00.000Z'
const zone = 'Europe/Istanbul'
const profile = (overrides: Partial<Profile> = {}) => initialState({
  id: 'ebe6a17d-dd03-4c5b-b716-5a9f7065a177', language: 'en', estimate: 'B1', target: 'C1',
  minutes: 30, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6], ...overrides,
})
const offer = (state: LearningState, at = day1) => nextPlacementItem(state, at, zone)!
const record = (state: LearningState, response: Parameters<typeof recordPlacementSample>[2], at = day1) =>
  recordPlacementSample(state, offer(state, at).id, response, at, zone)
const correct = (state: LearningState, at = day1) => {
  const item = offer(state, at)
  const exercise = item.exercise
  if (!exercise || exercise.kind === 'open') throw new Error('Expected scored fixture')
  return record(state, { status: 'answered', answer: exercise.kind === 'short' || exercise.kind === 'fill' ? exercise.accepted[0] : exercise.accepted,
    audioPlayed: Boolean(item.transcript) }, at)
}

test('authored assessment families keep distinct items, compatible exercise schemas and local audio tied to the prompt text', () => {
  expect(new Set(assessmentBank.map(({ id }) => id)).size).toBe(assessmentBank.length)
  const audio = new Set<string>()
  for (const item of assessmentBank) {
    expect(item.id.startsWith(routeLanguage(item.route))).toBe(true)
    expect(catalog[routeLanguage(item.route)].unit.lessons.some(({ id }) => id === item.lesson)).toBe(true)
    if (item.exercise) expect(exerciseSchema.parse(item.exercise).skill).toBe(item.skill)
    if (item.transcript) {
      expect(audio.has(item.transcript)).toBe(false)
      audio.add(item.transcript)
      const language = routeLanguage(item.route)
      const options = ['-b', '1', '-v', language === 'en' ? 'en-us' : 'ru', '-s', language === 'en' ? '150' : '135']
      const digest = createHash('sha256').update(JSON.stringify([options, item.transcript])).digest('hex')
      expect(readFileSync(`src/content/audio/${item.id}.mp3`).includes(digest)).toBe(true)
    }
  }
})

test('Russian script uncertainty selects Kiril and preserves the distinctions between unknown, skipped and unavailable', () => {
  let state = beginPlacementTrack(profile({ language: 'ru', estimate: 'A1', target: 'A1' }), day1)
  const first = offer(state).id
  state = record(state, { status: 'unknown' })
  state = record(state, { status: 'skipped' })
  state = record(state, { status: 'unavailable' })
  expect(state.placementTrack?.samples.map(({ status, result }) => [status, result])).toEqual([
    ['unknown', undefined], ['skipped', undefined], ['unavailable', undefined],
  ])
  expect(state.attempts).toEqual([])
  expect(dailyPlan(state, catalog.ru, day1, zone)).toMatchObject({ kind: 'lesson', lessonId: 'ru.cyrillic' })
  expect(() => recordPlacementSample(state, first, { status: 'unknown' }, day2, zone)).toThrow(/değişti/)
  expect(offer(state, day2).id).not.toBe(first)
  expect(parseBackup(exportBackup(state))).toEqual(state)
})

test('different strengths get a harder listening sample and a separate grammar conflict sample', () => {
  let state = beginPlacementTrack(profile(), day1)
  state = correct(state)
  state = record(state, { status: 'unknown' })
  state = correct(state)
  state = correct(state)
  expect(dailyPlan(state, catalog.en, day1, zone)).toMatchObject({ kind: 'lesson', lessonId: 'en.experience', reason: expect.stringContaining('iş kalıplarında') })
  expect(nextPlacementItem(state, day1, zone)).toBeUndefined()
  expect(offer(state, day2).id).toBe('en.assess.b1.l2')
  state = correct(state, day2)
  expect(offer(state, day2).id).toBe('en.assess.b1.l3')
  state = correct(state, day2)
  expect(nextPlacementItem(state, day2, zone)).toBeUndefined()
  expect(offer(state, day3).id).toBe('en.assess.b1.g3')
  state = record(state, { status: 'answered', answer: 'I have helped at the exhibition in March.' }, day3)
  expect(offer(state, day3).id).toBe('en.assess.b1.g4')
  expect(offer(structuredClone(state), day3).id).toBe(offer(state, day3).id)
})

test('two explicit unknowns lower the initial reading demand without adding a fifth question', () => {
  let state = beginPlacementTrack(profile(), day1)
  state = record(state, { status: 'unknown' })
  state = record(state, { status: 'unknown' })
  state = correct(state)
  expect(offer(state)).toMatchObject({ band: 'A2', id: 'en.assess.b1.r-foundation' })
  state = correct(state)
  expect(offer(state)).toBeUndefined()
  expect(state.placementTrack?.samples).toHaveLength(4)
})

test('transcript answers stay assisted and cannot qualify an upward listening sample', () => {
  let state = beginPlacementTrack(profile(), day1)
  state = correct(state)
  state = correct(state)
  expect(() => record(state, { status: 'answered', answer: 'To change the collection time' })).toThrow(/dinle/)
  state = record(state, { status: 'answered', answer: 'To change the collection time', transcript: true })
  state = correct(state)
  const listening = placementSkills(state).find(({ skill }) => skill === 'listening')!
  expect(listening.rows[0].sample.mode).toBe('transcript')
  expect(independent(listening.rows[0].sample)).toBe(false)
  expect(offer(state, day2).id).not.toBe('en.assess.b1.l3')
})

test('advanced guided entry leaves prerequisite mastery unchanged, and empty placement falls back to teaching', () => {
  const options = { estimate: 'C1', target: 'C2', minutes: 60 } as const
  let state = beginPlacementTrack(profile(options), day1)
  for (let count = 0; count < 4; count++) state = correct(state)
  const course = catalog.en
  const plan = dailyPlan(state, course, day1, zone)
  expect(plan).toMatchObject({ kind: 'lesson', lessonId: 'en.evidence' })
  const lesson = course.unit.lessons.find(({ id }) => id === 'en.evidence')!
  expect(isUnlocked(state, course, lesson)).toBe(true)
  for (const objective of lesson.prerequisites) {
    expect(masteryFor(state, course.unit.lessons.find((item) => item.objective.id === objective)!).status).toBe('not_assessed')
  }
  expect(lessonTasks(state, lesson).length).toBeGreaterThan(0)
  const observed = finishLesson(state, course, lesson, Object.fromEntries(lessonTasks(state, lesson).map(({ exercise }) =>
    [exercise.id, exercise.kind === 'fill' ? exercise.accepted[0] : 'synthetic response'])), day1)
  expect(observed.attempts.every(({ context }) => context === 'lesson')).toBe(true)
  expect(dailyPlan(finishMiniPlacement(beginPlacementTrack(profile(options), day1), day1), course, day1, zone))
    .toMatchObject({ kind: 'lesson', lessonId: 'en.experience' })
})

test('workdays, early teaching, existing assessment and v4 validation preserve legacy evidence', () => {
  const course = catalog.en
  const input = profile({ days: [5, 0], minutes: 5 })
  const earlier = finishPlacement(input, course, Object.fromEntries(course.placement.map(({ exercise }) =>
    [exercise.id, exercise.kind === 'open' ? exercise.sample :
      exercise.kind === 'short' || exercise.kind === 'fill' ? exercise.accepted[0] : exercise.accepted])), day1)
  expect(parseBackup(exportBackup(earlier))).toEqual(earlier)
  const state = beginPlacementTrack(earlier, day1)
  expect(state.attempts).toEqual(earlier.attempts)
  expect(offer(state).id).toBe('en.assess.b1.g1')
  const answered = correct(state)
  expect(nextPlacementItem(answered, day1, zone)).toBeUndefined()
  expect(nextPlacementItem(answered, day2, zone)).toBeUndefined()
  expect(nextPlacementItem(answered, day3, zone)).toBeTruthy()
  expect(validPlacementTrack({ ...answered, profile: { ...answered.profile, language: 'ru' } })).toBe(false)
  const modified = JSON.parse(exportBackup(answered))
  modified.state.placementTrack.samples[0].result = 'incorrect'
  expect(() => parseBackup(JSON.stringify(modified))).toThrow(/kanıtı/)
})
