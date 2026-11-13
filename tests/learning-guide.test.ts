import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import type { Course, Exercise } from '../src/content/schema'
import { mapPlacement } from '../src/domain/assessment'
import type { Answer } from '../src/domain/model'
import coachReport from './fixtures/speaking-coach.json'
import legacyReport from './fixtures/speaking-valid.json'
import { exportBackup, parseBackup } from '../src/persistence/repository'
import { buildSpeakingPrompt, parseSpeakingReport, speakingFocus } from '../src/domain/speaking'
import { phaseTasks } from '../src/domain/pedagogy'
import { beginSpeaking, dailyPlan, finishLesson, finishPedagogy, finishPlacement, finishTypedReview, importReport, lessonTasks, masteryFor } from '../src/domain/progress'
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

const course = catalog.en
const [lesson] = course.unit.lessons
const now = '2026-11-13T11:00:00.000Z'
const zone = 'Europe/Istanbul'

function speakingSetup() {
  const placed = place(course, { ...practiceAnswers(course.placement), 'en.placement.1': 'have led' })
  const guided = finishLesson(placed, course, lesson, practiceAnswers(lessonTasks(placed, lesson)), start)
  const transferred = finishPedagogy(guided, course, lesson, 'transfer', practiceAnswers(phaseTasks(guided, lesson, 'transfer', start)), start)
  const state = beginSpeaking(transferred, lesson, start, coachReport.sessionId)
  return { state, session: state.speakingSessions[0] }
}

test('English coach explains an important error in Turkish and checks the target in a different question', () => {
  const { state, session } = speakingSetup()
  const focus = speakingFocus(state, lesson)
  const prompt = buildSpeakingPrompt(session, lesson, focus)
  expect(prompt).toContain('"explanationLanguage": "tr"')
  expect(prompt).toContain('why the original is wrong')
  expect(prompt).toContain('later with a different question')
  expect(prompt).toContain('without giving the answer')
  expect(prompt).toContain(lesson.objective.description)
  expect(prompt).toContain('Yazılı aktarım gözlendi')
  expect(prompt).toContain('collocations')
  expect(prompt).toContain('not my measured CEFR level')
})

test('only independently produced evidence contributes to the speaking observation count', () => {
  const { state, session } = speakingSetup()
  const report = parseSpeakingReport(JSON.stringify(coachReport), session, lesson)
  const saved = importReport(state, lesson, report, now)
  expect(masteryFor(saved, lesson)).toMatchObject({
    status: 'developing', observations: { speaking_independent: 1 },
    evidenceIds: expect.arrayContaining([`${session.id}.i1`]),
  })
  expect(masteryFor(saved, lesson).evidenceIds).not.toContain(`${session.id}.r1`)
  const disguisedRepeat = {
    ...coachReport,
    observations: [...coachReport.observations, {
      id: 'false-success', kind: 'independent_correct',
      target: coachReport.observations[1].target, quote: 'I joined the team last May',
    }],
  }
  expect(() => parseSpeakingReport(JSON.stringify(disguisedRepeat), session, lesson)).toThrow(/alıntısı tutarsız/)
  expect(() => parseSpeakingReport(JSON.stringify({ ...coachReport, transcriptAvailability: 'unavailable' }), session, lesson)).toThrow()
})

test('confirmed report schedules the mapped collocation and a new grammar check and round-trips without loss', () => {
  const { state, session } = speakingSetup()
  const before = dailyPlan(state, course, now, zone)
  const report = parseSpeakingReport(JSON.stringify(coachReport), session, lesson)
  const saved = importReport(state, lesson, report, now)
  const [{ cardId, recall }] = lesson.pedagogy!.vocabulary
  expect(before.kind).not.toBe('review')
  expect(dailyPlan(saved, course, now, zone)).toMatchObject({ kind: 'review', cardIds: [cardId], reason: expect.stringContaining('Konuşma raporunda') })
  const typed = finishTypedReview(saved, course, cardId, String(practiceAnswers([{ exercise: recall }])[recall.id]), now)
  expect(dailyPlan(typed, course, now, zone)).toMatchObject({ kind: 'pedagogy', lessonId: lesson.id, phase: 'transfer' })
  expect(phaseTasks(typed, lesson, 'transfer', now).map(({ exercise }) => exercise.id)).toEqual([lesson.pedagogy!.checks[1].transfer[1].id])
  expect(parseBackup(exportBackup(typed))).toEqual(typed)
  expect(() => importReport(typed, lesson, report, now)).toThrow(/daha önce kaydedildi/)
  expect(() => parseSpeakingReport(JSON.stringify({ ...coachReport, sessionId: state.profile.id }), session, lesson)).toThrow(/eşleşmiyor/)
})

test('uncertain and unmapped observations are preserved without scheduling a lesson or a card', () => {
  const { state, session } = speakingSetup()
  const observations = coachReport.observations.filter(({ id }) => ['u1', 'm1'].includes(id))
  const report = parseSpeakingReport(JSON.stringify({ ...coachReport, observations }), session, lesson)
  const saved = importReport(state, lesson, report, now)
  expect(saved.speakingAssessments[0].report).toEqual(report)
  expect(saved.reviews).toEqual(state.reviews)
  expect(dailyPlan(saved, course, now, zone)).toEqual(dailyPlan(state, course, now, zone))
  expect(masteryFor(saved, lesson).observations.speaking_independent).toBeUndefined()
  const wrongTarget = { ...observations[1], target: { kind: 'concept', id: 'unpublished' } }
  expect(() => parseSpeakingReport(JSON.stringify({ ...coachReport, observations: [wrongTarget] }), session, lesson)).toThrow(/kimliği/)
})

test('older reports retain their original evidence and remain importable and restorable', () => {
  const { state, session } = speakingSetup()
  const report = parseSpeakingReport(JSON.stringify(legacyReport), session, lesson)
  expect(report).toEqual(legacyReport)
  const saved = importReport(state, lesson, report, now)
  expect(parseBackup(exportBackup(saved)).speakingAssessments[0].report).toEqual(legacyReport)
  expect(masteryFor(saved, lesson).observations.speaking_independent).toBeUndefined()
})

test('distinguishes teacher assistance and a later unaided transfer and checks their earlier error links', () => {
  const { state, session } = speakingSetup()
  const error = coachReport.observations[0]
  const assisted = { id: 'a1', kind: 'teacher_assisted', target: error.target, quote: 'I joined last May.', followsErrorId: error.id }
  const transfer = {
    id: 't1', kind: 'transferred', target: error.target, quote: 'I ran my first workshop in 2022.',
    newContext: 'A first teaching experience instead of joining a team.', followsErrorId: error.id,
  }
  const report = parseSpeakingReport(JSON.stringify({ ...coachReport, observations: [error, assisted, transfer] }), session, lesson)
  const saved = importReport(state, lesson, report, now)
  expect(masteryFor(saved, lesson).observations.speaking_independent).toBe(1)
  expect(masteryFor(saved, lesson).status).toBe('developing')
  expect(() => parseSpeakingReport(JSON.stringify({ ...coachReport, observations: [error, { ...transfer, followsErrorId: 'missing' }] }),
    session, lesson)).toThrow(/bağlantısı/)
  const repeatAsObjective = { id: 'duplicate', kind: 'independent_correct',
    target: { kind: 'objective', id: lesson.objective.id }, quote: assisted.quote }
  expect(() => parseSpeakingReport(JSON.stringify({ ...coachReport, observations: [error, assisted, repeatAsObjective] }),
    session, lesson)).toThrow(/alıntısı/)
})

test('prioritizes repeated mapped speaking errors ahead of a single error in transfer', () => {
  const { state, session } = speakingSetup()
  const error = coachReport.observations[0]
  const firstConceptError = { ...error, id: 'first', target: { kind: 'concept', id: lesson.concepts[0].id } }
  const observations = [firstConceptError, error, { ...error, id: 'again', quote: 'I have started the job last April.' }]
  const report = parseSpeakingReport(JSON.stringify({ ...coachReport, observations }), session, lesson)
  const saved = importReport(state, lesson, report, now)
  expect(phaseTasks(saved, lesson, 'transfer', now).map(({ conceptId }) => conceptId))
    .toEqual([lesson.concepts[1].id, lesson.concepts[0].id])
})
