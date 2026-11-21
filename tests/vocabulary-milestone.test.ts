import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import { validateVocabularySenses, vocabularyIndex } from '../src/content/vocabulary'
import vocabularyPilot from '../src/content/vocabulary-pilot.json'
import { vocabularyLoad } from '../src/domain/vocabulary-load'
import { initialState } from '../src/domain/state'
import { vocabularyEvidence } from '../src/content/curriculum/language-audit'
import { phaseTasks } from '../src/domain/pedagogy'
import { dailyPlan, finishLesson, finishPedagogy, finishPlacement, finishTypedReview, isUnlocked, lessonTasks } from '../src/domain/progress'
import { exportBackup, parseBackup } from '../src/persistence/repository'
import { sampleAnswers, teachWords } from './teaching-fixture'
import { studyDraftSchema } from '../src/domain/study-session'


const now = '2026-11-21T10:00:00.000Z'
const zone = 'Europe/Istanbul'

test('English pilot tracks the same lemma as distinct A1/A2 senses while retaining card IDs', () => {
  const course = catalog.en
  const index = vocabularyIndex(course)
  const money = index.get('en.cafe.word.2')!
  const modify = index.get('en.rebook.word.1')!

  expect(money).toMatchObject({ senseId: 'en.change.money', sense: { band: 'A1', lemma: 'change' } })
  expect(modify).toMatchObject({ senseId: 'en.change.modify', sense: { band: 'A2', lemma: 'change' } })
  expect(money.card.id).toBe('en.cafe.word.2')
  expect(modify.card.id).toBe('en.rebook.word.1')
  expect(index.get(course.unit.lessons[0].vocabulary[0].id)?.senseId).toMatch(/^legacy:/)
})

test('sense validation rejects duplicate identities, duplicate meanings, and broken lesson links', () => {
  const courses = { en: catalog.en, ru: catalog.ru, es: catalog.es }
  const entries = vocabularyPilot as unknown as Record<string, unknown>[]
  expect(() => validateVocabularySenses([entries[0], entries[0]], courses)).toThrow(/Tekrarlanan/)
  expect(() => validateVocabularySenses([
    entries[0], { ...entries[1], id: 'en.change.other', lemma: entries[0].lemma,
      partOfSpeech: entries[0].partOfSpeech, meaning: entries[0].meaning },
  ], courses)).toThrow(/Tekrarlanan/)
  expect(() => validateVocabularySenses([
    { ...entries[0], links: [{ ...((entries[0].links as Record<string, unknown>[])[0]), lessonId: 'en.missing' }] },
  ], courses)).toThrow(/bağlantı/)
})

test('vocabulary load scales new-item capacity down with due review pressure and less remaining time', () => {
  const course = catalog.en
  const base = initialState({ id: 'a8d66e50-f948-45b6-b4ca-4e3efc743cc5', language: 'en', estimate: 'A1', target: 'A2',
    minutes: 30, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6] })
  const clear = vocabularyLoad(base, course, now, zone, 8)
  const debt = { ...base, reviews: Array.from({ length: 8 }, (_, i) => ({
    cardId: `en.review.${i}`, step: 0, dueAt: now, introducedAt: now,
  })) }
  const loaded = vocabularyLoad(debt, course, now, zone, 8)
  const shortDay = vocabularyLoad(base, course, now, zone, 5)

  expect(clear.availableNew).toBeGreaterThan(loaded.availableNew)
  expect(shortDay.availableNew).toBeLessThan(clear.availableNew)
  expect(shortDay.availableNew).toBeLessThanOrEqual(3)
  expect(clear.introducedToday).toBe(0)
})

test('seeing a vocabulary task alone does not create learning evidence or a review schedule', () => {
  const state = initialState({ id: 'a8d66e50-f948-45b6-b4ca-4e3efc743cc5', language: 'en', estimate: 'A1', target: 'A2',
    minutes: 15, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6] })
  expect(state.attempts).toEqual([])
  expect(state.reviews).toEqual([])
  expect(vocabularyLoad(state, catalog.en, now, zone, 10).introducedToday).toBe(0)
})

const course = catalog.en
const index = vocabularyIndex(course)
const cafe = index.get('en.cafe.word.2')!.lesson
const rebook = index.get('en.rebook.word.1')!.lesson
const station = index.get('en.station.word.1')!.lesson
const nextDay = '2026-11-22T10:00:00.000Z'

function placedLearner() {
  return finishPlacement(initialState({ id: 'a8d66e50-f948-45b6-b4ca-4e3efc743cc5', language: 'en', estimate: 'A1', target: 'A2',
    minutes: 180, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6] }), course, sampleAnswers(course.placement), now)
}

function throughTransfer(state: ReturnType<typeof placedLearner>, lesson: typeof cafe) {
  let next = finishLesson(state, course, lesson, sampleAnswers(lessonTasks(state, lesson)), now)
  next = teachWords(next, course, lesson, now)
  next = finishLesson(next, course, lesson, sampleAnswers(lessonTasks(next, lesson)), now)
  return finishPedagogy(next, course, lesson, 'transfer', sampleAnswers(phaseTasks(next, lesson, 'transfer', now)), now)
}

test('the published EN A1/A2 sequence saves the two senses separately and preserves the older route', () => {
  let state = throughTransfer(placedLearner(), course.unit.lessons.find(({ id }) => id === 'en.identity')!)
  state = throughTransfer(state, cafe)
  expect(isUnlocked(state, course, station)).toBe(true)
  expect(state.reviews.some(({ cardId }) => cardId === 'en.cafe.word.2')).toBe(false)
  expect(parseBackup(exportBackup(state))).toEqual(state)

  state = finishPedagogy(state, course, cafe, 'reading', sampleAnswers(phaseTasks(state, cafe, 'reading', now)), now)
  state = finishPedagogy(state, course, cafe, 'listening', sampleAnswers(phaseTasks(state, cafe, 'listening', now)), now, 'played')
  const money = ['en.cafe.word.2']
  const moneyTasks = phaseTasks(state, cafe, 'vocabulary', now, money)
  state = finishPedagogy(state, course, cafe, 'vocabulary', sampleAnswers(moneyTasks), now, undefined, now, money)
  const evidence = () => new Map(vocabularyEvidence(course, state).map((row) => [row.senseId, row]))
  expect(evidence().get('en.change.money')).toMatchObject({ recognized: true, recalled: true, productionSubmitted: true,
    independentUseReported: false, delayedRecall: false })
  expect(evidence().get('en.change.modify')).toMatchObject({ encountered: false, recalled: false, delayedRecall: false })

  state = throughTransfer(state, station)
  expect(isUnlocked(state, course, rebook)).toBe(true)
  state = finishLesson(state, course, rebook, sampleAnswers(lessonTasks(state, rebook)), now)
  state = finishTypedReview(state, course, money[0], 'change', nextDay)
  expect(evidence().get('en.change.money')?.delayedRecall).toBe(true)
  const plan = dailyPlan(state, course, nextDay, zone, false)
  expect(plan).toMatchObject({ kind: 'pedagogy', lessonId: rebook.id, phase: 'vocabulary' })
  if (plan.kind !== 'pedagogy' || !plan.vocabularyCardIds) throw new Error('Missing vocabulary scope')
  const planned = phaseTasks(state, rebook, 'vocabulary', nextDay, plan.vocabularyCardIds)
  const before = state
  const draftTask = { kind: 'pedagogy', phase: 'vocabulary', lessonId: rebook.id, vocabularyCardIds: plan.vocabularyCardIds } as const
  const withDraft = { ...state, studyDrafts: [studyDraftSchema.parse({
    id: 'ac2b3991-cd03-43f7-ace6-524169328e0c', reason: 'new_learning', task: draftTask, contentVersion: 2, contentRevision: 'test',
    itemIds: planned.map(({ exercise }) => exercise.id), minutes: plan.minutes, budget: state.profile.minutes,
    openedAt: nextDay, updatedAt: nextDay, revision: 1, step: 1, plays: 0, answers: {}, supports: { wordInstruction: true }, elapsedSeconds: 3,
  })] }
  expect(parseBackup(exportBackup(withDraft))).toEqual(withDraft)
  expect(vocabularyEvidence(course, withDraft).find(({ senseId }) => senseId === 'en.change.modify')?.encountered).toBe(false)
  expect(phaseTasks({ ...state, profile: { ...state.profile, minutes: 5 } }, rebook, 'vocabulary', nextDay, plan.vocabularyCardIds)).toEqual(planned)
  state = finishPedagogy(state, course, rebook, 'vocabulary', sampleAnswers(planned), nextDay, undefined, nextDay, plan.vocabularyCardIds)
  expect(state.activity.at(-1)?.minutes).toBe(plan.minutes)
  expect(state.attempts.length - before.attempts.length).toBe(planned.length)
  expect(evidence().get('en.change.modify')).toMatchObject({ recognized: true, recalled: true, delayedRecall: false })
  expect(parseBackup(exportBackup(state))).toEqual(state)
})

test('actual EN A2 vocabulary plan shortens its selection for due debt or a shorter day', () => {
  const identity = course.unit.lessons.find(({ id }) => id === 'en.identity')!
  let state = throughTransfer(placedLearner(), identity)
  state = throughTransfer(state, cafe)
  state = throughTransfer(state, station)
  state = finishLesson(state, course, rebook, sampleAnswers(lessonTasks(state, rebook)), now)
  const normal = { ...state, profile: { ...state.profile, minutes: 30 } }
  const clear = dailyPlan(normal, course, nextDay, zone, false)
  const cards = [...index.keys()].slice(0, 32)
  const loaded = dailyPlan({ ...normal, reviews: cards.map((cardId) => ({ cardId, dueAt: nextDay, introducedAt: now, step: 0 })) },
    course, nextDay, zone, false)
  const short = dailyPlan({ ...normal, profile: { ...normal.profile, minutes: 5 } }, course, nextDay, zone, false)
  expect(clear).toMatchObject({ kind: 'pedagogy', lessonId: rebook.id, vocabularyCardIds: ['en.rebook.word.1', 'en.rebook.word.2'], minutes: 4 })
  for (const plan of [loaded, short]) {
    expect(plan).toMatchObject({ kind: 'pedagogy', lessonId: rebook.id, vocabularyCardIds: ['en.rebook.word.1'], minutes: 3 })
  }
})

test('the catalog rejects edited assessment keys under the pinned pilot card revision', () => {
  const changed = structuredClone(catalog)
  const lesson = changed.en.unit.lessons.find(({ id }) => id === rebook.id)!
  const recall = lesson.pedagogy?.vocabulary[0].recall
  if (!recall || recall.kind !== 'fill') throw new Error('Expected a recall exercise')
  recall.accepted = ['move a reservation']
  expect(() => validateVocabularySenses(vocabularyPilot, changed)).toThrow(/Sürümlenmemiş/)
})

test('delayed typed recall shifts capacity, with self ratings excluded', () => {
  const base = placedLearner()
  const state = { ...base, profile: { ...base.profile, minutes: 30 } }
  const cardIds = [...index.keys()].slice(0, 3)
  const reviews = cardIds.map((cardId) => ({ cardId, introducedAt: now, dueAt: '2026-12-15T10:00:00.000Z', step: 1 }))
  const history = (result: 'remembered' | 'again', mode: 'typed' | 'self_review') =>
    cardIds.map((cardId) => ({ cardId, result, mode, at: nextDay }))
  const limit = vocabularyLoad(state, course, nextDay, zone, 30).availableNew
  expect(vocabularyLoad({ ...state, reviews, reviewHistory: history('remembered', 'typed') }, course, nextDay, zone, 30).availableNew).toBe(limit + 1)
  expect(vocabularyLoad({ ...state, reviews, reviewHistory: history('again', 'typed') }, course, nextDay, zone, 30).availableNew).toBe(limit - 1)
  expect(vocabularyLoad({ ...state, reviews, reviewHistory: history('remembered', 'self_review') }, course, nextDay, zone, 30).availableNew).toBe(limit)
})
