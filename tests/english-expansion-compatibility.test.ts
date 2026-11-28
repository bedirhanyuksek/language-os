import { expect, test } from 'vitest'
import firstWave from '../src/content/packs/en-mvp2b-first-wave.json'
import { catalog, createCatalog, legacyCatalog } from '../src/content/catalog'
import { packedLessons } from '../src/content/curriculum/packs'
import { nextPlacementItem, recordPlacementSample, rescreenPlacementTrack } from '../src/domain/adaptive-placement'
import { phaseTasks, receptionTask } from '../src/domain/pedagogy'
import { finishLesson, finishPedagogy, finishPlacement, finishReview, finishTypedReview, isUnlocked, lessonTasks, masteryFor } from '../src/domain/progress'
import { initialState, type Profile } from '../src/domain/state'
import { studyContentRevision, type StudyDraft } from '../src/domain/study-session'
import { exportBackup, parseBackup } from '../src/persistence/repository'
import { sampleAnswers, teachWords } from './teaching-fixture'

const at = '2026-11-16T09:00:00.000Z'
const nextDay = '2026-11-17T09:00:00.000Z'
const profile: Profile = { id: 'c1288d67-673e-436f-a554-c5fe6e8c81dc', language: 'en', estimate: 'B1', target: 'B2',
  minutes: 20, goals: ['general'], days: [1, 2, 3, 4, 5] }

test('the new pack is additive across v1–v5 backups, assessment, reviews and a live draft', () => {
  const additions = new Set(firstWave.lessons.map(({ id }) => id))
  const before = createCatalog(packedLessons.filter(({ entry }) => !additions.has(entry.id))).en
  const after = catalog.en
  expect(after.unit.lessons.filter(({ id }) => !additions.has(id))).toEqual(before.unit.lessons)
  expect(after.placement).toEqual(before.placement)

  const legacy = legacyCatalog.en
  const firstLegacy = legacy.unit.lessons[0]
  let v1 = finishPlacement(initialState(profile), legacy, sampleAnswers(legacy.placement), at)
  v1 = finishLesson(v1, legacy, firstLegacy, sampleAnswers(lessonTasks(v1, firstLegacy)), at)
  v1 = finishReview(v1, firstLegacy.vocabulary[0].id, 'remembered', at)
  const old = parseBackup(JSON.stringify({ schemaVersion: 1, state: { ...v1, reviewHistory: undefined, skippedListening: undefined } }))
  expect(old.attempts).toEqual(v1.attempts)
  expect(old.reviews).toEqual(v1.reviews)

  const [lesson, successor] = before.unit.lessons
  let state = finishPlacement(initialState(profile), before, sampleAnswers(before.placement), at)
  state = finishLesson(state, before, lesson, sampleAnswers(lessonTasks(state, lesson)), at)
  state = teachWords(state, before, lesson, at)
  state = finishLesson(state, before, lesson, sampleAnswers(lessonTasks(state, lesson)), at)
  state = finishPedagogy(state, before, lesson, 'transfer', sampleAnswers(phaseTasks(state, lesson, 'transfer', at)), at)
  const { cardId, recall } = lesson.pedagogy!.vocabulary[0]
  state = finishTypedReview(state, before, cardId, String(sampleAnswers([{ exercise: recall }])[recall.id]), nextDay)
  expect(JSON.parse(exportBackup(state)).schemaVersion).toBe(2)

  const reading = phaseTasks(state, lesson, 'reading', nextDay)
  const draft: StudyDraft = {
    id: '78b455f4-d689-4508-acce-d291449d206d', task: { kind: 'pedagogy', lessonId: lesson.id, phase: 'reading' },
    reason: 'new_assessment', contentVersion: before.version, itemIds: reading.map(({ exercise }) => exercise.id),
    contentRevision: studyContentRevision([reading, receptionTask(state, lesson, 'reading')?.material, lesson.teaching, undefined]),
    minutes: 2, budget: profile.minutes, openedAt: nextDay, updatedAt: nextDay, revision: 1,
    step: 0, plays: 0, answers: sampleAnswers(reading), supports: { glossary: true }, elapsedSeconds: 22,
  }
  const withDraft = { ...state, studyDrafts: [draft] }
  const rescreen = rescreenPlacementTrack(withDraft, nextDay)
  const item = nextPlacementItem(rescreen, nextDay, 'Europe/Istanbul')!
  const exercise = item.exercise!
  const rescanned = recordPlacementSample(rescreen, item.id, { status: 'answered',
    answer: sampleAnswers([{ exercise }])[exercise.id], audioPlayed: Boolean(item.transcript) }, nextDay, 'Europe/Istanbul')
  expect(JSON.parse(exportBackup(withDraft)).schemaVersion).toBe(3)
  expect(JSON.parse(exportBackup(rescanned)).schemaVersion).toBe(5)
  expect(rescanned.placementTrack?.samples[0]).toMatchObject({ itemId: item.id, result: 'correct' })
  const afterLesson = after.unit.lessons.find(({ id }) => id === lesson.id)!
  const afterSuccessor = after.unit.lessons.find(({ id }) => id === successor.id)!
  for (const [schemaVersion, previous] of [[2, state], [3, withDraft], [4, withDraft], [5, rescanned]] as const) {
    const restored = parseBackup(JSON.stringify({ schemaVersion, state: previous }))
    expect(restored).toEqual(previous)
    expect(restored.reviews.find((card) => card.cardId === cardId)?.lastAt).toBe(nextDay)
    expect(masteryFor(restored, afterLesson)).toEqual(masteryFor(previous, lesson))
    expect(isUnlocked(restored, after, afterSuccessor)).toBe(true)
  }
  expect(studyContentRevision([phaseTasks(withDraft, afterLesson, 'reading', nextDay),
    receptionTask(withDraft, afterLesson, 'reading')?.material, afterLesson.teaching, undefined])).toBe(draft.contentRevision)
})
