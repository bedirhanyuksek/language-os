import { describe, expect, it } from 'vitest'
import { legacyCatalog as catalog, publishCourse } from '../src/content/catalog'
import { assess, mapPlacement } from '../src/domain/assessment'
import type { Answer } from '../src/domain/model'
import { beginSpeaking, dailyPlan, finishLesson, finishPlacement, finishReview, importReport, isUnlocked, lessonTasks, masteryFor } from '../src/domain/progress'
import { dayMs, scheduleReview } from '../src/domain/review'
import { initialState, type Profile } from '../src/domain/state'
import { parseSpeakingReport, reportSchema } from '../src/domain/speaking'

const at = '2026-11-13T10:00:00.000Z'
const next = new Date(Date.parse(at) + dayMs).toISOString()
const course = catalog.en
const [first, second] = course.unit.lessons
export const profile: Profile = {
  id: '70cc9225-b0a1-41ef-8172-195d23e455c6', language: 'en', estimate: 'B1', target: 'B2+',
  minutes: 125, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6],
}
const placement = finishPlacement(initialState(profile), course, {
  'en.placement.1': 'have led', 'en.placement.2': 'had already sent', 'en.placement.3': 'a handover',
  'en.placement.4': 'On Thursday', 'en.placement.5': 'I worked at a café last summer.',
}, at)
const answers = Object.fromEntries(lessonTasks(placement, first).map(({ exercise }) =>
  [exercise.id, exercise.kind === 'open' ? exercise.sample : exercise.kind === 'fill' || exercise.kind === 'short'
    ? exercise.accepted[0] : exercise.accepted])) as Record<string, Answer>
const finished = finishLesson(placement, course, first, answers, at)
const plan = (state = finished, date = at) => dailyPlan(state, course, date, 'Europe/Istanbul')

describe('course and assessments', () => {
  it('loads six linked reviewed lessons and rejects unpublished packs', () => {
    expect(Object.values(catalog).flatMap((item) => item.unit.lessons)).toHaveLength(6)
    expect(() => publishCourse({ ...course, reviewStatus: 'draft' })).toThrow()
  })
  it('rejects invalid prerequisite graphs and invalid answers', () => {
    const invalid = structuredClone(course)
    invalid.unit.lessons[0].prerequisites = [second.objective.id]
    expect(() => publishCourse(invalid)).toThrow(/Ön koşul/)
  })
  it('maps a low-confidence profile and preserves unscored production', () => {
    expect(mapPlacement(placement.attempts)).toEqual(expect.arrayContaining([
      expect.objectContaining({ skill: 'grammar', correct: 1, total: 2, confidence: 'low' }),
      expect.objectContaining({ skill: 'listening', status: 'not_assessed', confidence: null }),
      expect.objectContaining({ skill: 'speaking', status: 'not_assessed' }),
      expect.objectContaining({ skill: 'writing', status: 'review_required', total: 0 }),
    ]))
    expect(assess(first.production, 'My original answer.', 'en').outcome).toBe('review_required')
  })
  it('handles ordered, multiple, matching and normalized text inputs', () => {
    const [ru1, ru2] = catalog.ru.unit.lessons
    const matching = ru2.concepts[1].variants[0]
    expect(assess(matching, ['öğrenci', 'doktor', 'mühendis'], 'ru').outcome).toBe('correct')
    expect(assess(matching, ['doktor', 'öğrenci', 'mühendis'], 'ru').outcome).toBe('incorrect')
    expect(assess(ru1.concepts[0].variants[0], '  МЕНЯ! ', 'ru').outcome).toBe('correct')
    const [multiple] = course.unit.lessons[2].concepts[0].variants
    expect(assess(multiple, ['We sent it yesterday.', 'We have finished the draft.'], 'en').outcome).toBe('correct')
    const [order] = second.concepts[1].variants
    expect(assess(order, ['The meeting began.', 'I shared the link.'], 'en').outcome).toBe('incorrect')
  })
})

describe('progress and reviews', () => {
  it('honors prerequisites, initial gaps and observations', () => {
    expect(isUnlocked(placement, course, second)).toBe(false)
    expect(() => finishLesson(placement, course, second, answers, at)).toThrow(/ön koşul/)
    expect(plan(placement)).toMatchObject({ kind: 'lesson', lessonId: first.id, reason: expect.stringContaining('taramasında') })
    expect(masteryFor(finished, first)).toMatchObject({
      status: 'ready', observations: { recognition: 1, controlled_production: 1, free_production: 1 },
    })
    expect(isUnlocked(finished, course, second)).toBe(true)
  })
  it('selects a new example only for a missed concept', () => {
    const failed = finishLesson(placement, course, first, { ...answers, 'en.experience.detail.1': 'have joined' }, at)
    const reviewed = failed.reviews.reduce((state, card) => finishReview(state, card.cardId, 'remembered', at), failed)
    expect(plan(reviewed)).toMatchObject({ kind: 'practice', lessonId: first.id })
    expect(lessonTasks(reviewed, first).map(({ exercise }) => exercise.id)).toEqual(['en.experience.detail.2'])
  })
  it('schedules an actual delayed review and records self-reported retention', () => {
    const initial = finished.reviews[0]
    const retry = scheduleReview(initial, 'again', at)
    expect(retry.dueAt).toBe('2026-11-13T10:10:00.000Z')
    expect(scheduleReview(initial, 'remembered', at).dueAt).toBe(next)
    const reviewed = finished.reviews.reduce((state, card) => finishReview(state, card.cardId, 'remembered', at), finished)
    expect(() => finishReview(reviewed, initial.cardId, 'again', at)).toThrow()
    expect(masteryFor(reviewed, first).observations.retention).toBeUndefined()
    const delayed = reviewed.reviews.reduce((state, card) => finishReview(state, card.cardId, 'remembered', next), reviewed)
    expect(masteryFor(delayed, first)).toMatchObject({ status: 'retained', observations: { retention: 2 } })
  })
  it('shows when the selected target is below the available course', () => {
    expect(plan({ ...placement, profile: { ...profile, target: 'A2' } }).kind).toBe('out_of_scope')
  })
  it('does not advance after a missed day and applies time budget in the learner time zone', () => {
    expect(plan(placement, next)).toEqual(plan(placement))
    expect(plan({ ...placement, profile: { ...profile, days: [6] } }).kind).toBe('rest')
    const late = '2026-11-13T21:15:00.000Z'
    const small = { ...finished, profile: { ...profile, minutes: 5 } }
    expect(plan(small).kind).toBe('budget')
    expect(plan(small, late).kind).toBe('review')
  })
})

describe('speaking import', () => {
  it('validates session identity and evidence and reopens the target concept only', () => {
    const started = beginSpeaking(finished, first, at, '72752ef8-871a-4a80-8299-ccfeec0dc4e1')
    const session = started.speakingSessions[0]
    const data = {
      schemaVersion: 1, sessionId: session.id, lessonId: first.id, language: 'en',
      objectivesAttempted: [first.objective.id],
      observedErrors: [{ conceptId: first.concepts[1].id, description: 'Bitmiş zaman', evidenceId: 'q1' }],
      corrections: [{ text: 'I joined it last May.', evidenceId: 'q1' }],
      vocabularyGaps: [{ cardId: first.vocabulary[0].id, evidenceId: 'q1' }],
      successfulUses: [], suggestedReviews: [], evidence: [{ id: 'q1', quote: 'I have joined it last May.' }],
      confidence: 'medium', transcriptAvailability: 'partial', completionStatus: 'completed',
    }
    expect(reportSchema.safeParse({ ...data, evidence: [] }).success).toBe(false)
    expect(() => parseSpeakingReport(JSON.stringify({ ...data, language: 'ru' }), session, first)).toThrow(/eşleşmiyor/)
    const report = parseSpeakingReport(JSON.stringify(data), session, first)
    const state = importReport(started, first, report, '2026-11-13T11:00:00.000Z')
    expect(() => importReport(state, first, report, next)).toThrow(/önce kaydedildi/)
    expect(isUnlocked(state, course, second)).toBe(false)
    const fixed = finishLesson(state, course, first,
      { 'en.experience.detail.2': 'I led the workshop last year.' }, '2026-11-13T11:00:00.000Z')
    expect(isUnlocked(fixed, course, second)).toBe(true)
    expect(state.reviews[0].dueAt).toBe('2026-11-13T11:00:00.000Z')
    expect(lessonTasks(state, first).map(({ exercise }) => exercise.id)).toEqual(['en.experience.detail.2'])
    expect(mapPlacement(state.attempts).find(({ skill }) => skill === 'speaking')?.status).toBe('not_assessed')
    expect(masteryFor(state, first).observations.speaking_application).toBe(1)
  })
})
