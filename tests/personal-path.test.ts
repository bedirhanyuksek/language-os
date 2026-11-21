import { teachWords } from './teaching-fixture'
import { expect, test } from 'vitest'
import { catalog, publishCourse } from '../src/content/catalog'
import { vocabularyEvidence } from '../src/content/curriculum/language-audit'
import { packedLessons } from '../src/content/curriculum/packs'
import type { Course, Exercise } from '../src/content/schema'
import { assess, mapPlacement } from '../src/domain/assessment'
import { nextDiagnostic } from '../src/domain/diagnostic'
import type { Answer } from '../src/domain/model'
import { phaseTasks } from '../src/domain/pedagogy'
import { dailyMinutes, dailyPlan, finishDiagnostic, finishLesson, finishPedagogy, finishPlacement, finishTypedReview,
  lessonTasks, masteryFor } from '../src/domain/progress'
import { initialState, type LearningState } from '../src/domain/state'
import { exportBackup, parseBackup } from '../src/persistence/repository'

const at = '2026-11-13T10:00:00.000Z'
const zone = 'Europe/Istanbul'
const day = 86_400_000
const answer = (exercise: Exercise): Answer => exercise.kind === 'open' ? exercise.sample :
  exercise.kind === 'fill' || exercise.kind === 'short' ? exercise.accepted[0] : exercise.accepted
const answers = (tasks: { exercise: Exercise }[]) => Object.fromEntries(tasks.map(({ exercise }) => [exercise.id, answer(exercise)]))

function start(course: Course, minutes: number, overrides: Record<string, Answer> = {}) {
  return finishPlacement(initialState({
    id: 'acdc92e4-faae-4d28-8b32-d58e488ed68d', language: course.language,
    estimate: 'B1', target: 'C1', minutes, goals: ['professional'], days: [1, 2, 3, 4, 5],
  }), course, { ...answers(course.placement), ...overrides }, at)
}

test.each([5, 15, 30, 60])('%i minute plan advances while overdue cards compete for time', (minutes) => {
  for (const course of Object.values(catalog)) {
    let state = start(course, minutes)
    state = { ...state, profile: { ...state.profile, days: [0, 1, 2, 3, 4, 5, 6], target: 'C1' } }
    const recallById = new Map(course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? [])
      .map(({ cardId, recall }) => [cardId, recall]))
    const overdue = '2026-11-12T10:00:00.000Z'
    const backlog = [...recallById.keys()].slice(-65).map((cardId) => ({
      cardId, step: 0, dueAt: overdue, introducedAt: overdue, lastAt: overdue, lastResult: 'again' as const,
    }))
    state = { ...state, reviews: backlog }
    let constrainedBatches = 0
    let previousNonReview = true
    let speakingOffers = 0
    const totals = { review: 0, instruction: 0, skills: 0, vocabulary: 0, delayed: 0 }
    const days = minutes === 5 ? 28 : 14
    for (let elapsed = 0; elapsed < days; elapsed++) {
      const now = new Date(Date.parse(at) + elapsed * day).toISOString()
      let nonReview = 0
      for (let block = 0; block < minutes; block++) {
        const plan = dailyPlan(state, course, now, zone)
        if (!('minutes' in plan)) break
        expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(minutes)
        if (plan.kind === 'review') {
          totals.review += plan.minutes
          for (const id of plan.cardIds) {
            const response = backlog.slice(0, 8).some(({ cardId }) => cardId === id)
              ? '___' : String(answer(recallById.get(id)!))
            state = finishTypedReview(state, course, id, response, now)
          }
          continue
        }
        const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
        if (plan.kind === 'speaking') {
          speakingOffers++
          state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
          continue
        }
        nonReview += plan.minutes
        if (plan.kind === 'pedagogy') {
          const tasks = phaseTasks(state, lesson, plan.phase, now)
          if (plan.phase === 'vocabulary') {
            totals.vocabulary += plan.minutes
            const batch = new Set(tasks.map(({ conceptId }) => conceptId))
            if (state.reviews.filter(({ lastResult }) => lastResult !== 'remembered').length >= minutes) {
              expect(batch.size).toBe(1)
              constrainedBatches++
            }
            expect(tasks).toHaveLength(batch.size * 3)
          } else if (plan.phase === 'delayed') totals.delayed += plan.minutes
          else totals.skills += plan.minutes
          state = finishPedagogy(state, course, lesson, plan.phase, answers(tasks), now, plan.phase === 'listening' ? 'played' : undefined)
        } else {
          const tasks = lessonTasks(state, lesson)
          totals[tasks.some(({ exercise }) => exercise.kind === 'open') ? 'skills' : 'instruction'] += plan.minutes
          state = finishLesson(state, course, lesson, answers(tasks), now)
        }
      }
      expect(nonReview > 0 || (minutes === 5 && previousNonReview), `${course.language}, gün ${elapsed + 1}`).toBe(true)
      previousNonReview = nonReview > 0
    }
    expect(totals.review).toBeGreaterThan(0)
    expect(totals.instruction).toBeGreaterThan(0)
    expect(totals.skills).toBeGreaterThan(0)
    expect(totals.vocabulary).toBeGreaterThan(0)
    if (minutes === 5) expect(constrainedBatches).toBeGreaterThan(0)
    const wrong = backlog[0].cardId
    expect(state.reviewHistory.some(({ cardId, result }) => cardId === wrong && result === 'again')).toBe(true)
    expect(vocabularyEvidence(course, state).find(({ term }) =>
      course.unit.lessons.flatMap(({ vocabulary }) => vocabulary).some((card) => card.id === wrong && card.term === term))?.delayedRecall).toBe(false)
    for (const original of backlog.filter(({ cardId }) => !state.reviewHistory.some((entry) => entry.cardId === cardId))) {
      expect(state.reviews.find(({ cardId }) => cardId === original.cardId)).toEqual(original)
    }
    for (const lesson of course.unit.lessons.filter(({ objective }) => objective.level === 'C2')) {
      expect(masteryFor(state, lesson).status).toBe('not_assessed')
    }
    expect(parseBackup(exportBackup(state))).toEqual(state)
    if (process.env.npm_lifecycle_event === 'curriculum:report') {
      console.log(JSON.stringify({ balance: course.language, minutes, days, constrainedBatches, speakingOffers, ...totals }))
    }
  }
})

test.each([[15, 'C1'], [30, 'C1'], [60, 'C1'], [15, 'C2']] as const)(
  'B1-like learner with %i minutes progresses toward a %s target', (minutes, target) => {
  const course = catalog.en
  let state = start(course, minutes,
    { 'en.diagnostic.2': 'have lead', 'en.placement.3': 'an interview' })
  state = { ...state, profile: { ...state.profile, target } }
  for (const expected of ['reading', 'listening', 'grammar', 'vocabulary']) {
    const sample = nextDiagnostic(course, state)!
    expect(sample.exercise.skill).toBe(expected)
    const response = expected === 'grammar' || expected === 'vocabulary' ? 'I don’t know' : answer(sample.exercise)
    state = finishDiagnostic(state, course, sample.exercise.id, response, at, Boolean(sample.audio))
  }
  expect(nextDiagnostic(course, state)).toBeUndefined()
  expect(parseBackup(exportBackup(state))).toEqual(state)
  expect(mapPlacement(state.attempts)).toEqual(expect.arrayContaining([
    expect.objectContaining({ skill: 'listening', correct: 1, confidence: 'low' }),
    expect.objectContaining({ skill: 'speaking', status: 'not_assessed' }),
  ]))
  expect(dailyPlan(state, course, at, zone)).toMatchObject({ kind: 'lesson', lessonId: 'en.experience' })
  const seen = new Set<string>()
  const newStudy = new Map<string, number>()
  let reviewMinutes = 0
  let missedRecall = false
  const missedPhases = new Set<string>()
  const cultureVocabularyBatches: number[] = []
  let cultureTransferMiss = false
  let cultureRepair = false
  let reachedPublishedEnd = false
  const horizon = target === 'C2' ? 200 : 170
  for (let elapsed = 0; elapsed < horizon && !reachedPublishedEnd; elapsed++) {
    const now = new Date(Date.parse(at) + elapsed * day).toISOString()
    for (let count = 0; count < 60; count++) {
      const plan = dailyPlan(state, course, now, zone)
      if (plan.kind === 'complete') reachedPublishedEnd = true
      if (!('minutes' in plan)) break
      expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(minutes)
      if (plan.kind === 'review' || (plan.kind === 'pedagogy' && plan.phase === 'delayed')) reviewMinutes += plan.minutes
      else if (plan.kind !== 'speaking' && !(plan.kind === 'pedagogy' && plan.phase === 'foundation')) {
        const vocabularyBatch = plan.kind === 'pedagogy' && plan.phase === 'vocabulary'
          ? phaseTasks(state, course.unit.lessons.find(({ id }) => id === plan.lessonId)!, plan.phase, now)[0]?.conceptId : undefined
        const key = plan.kind === 'pedagogy' ? [plan.lessonId, plan.phase, vocabularyBatch].filter(Boolean).join(':') :
          `${plan.lessonId}:${lessonTasks(state, course.unit.lessons.find(({ id }) => id === plan.lessonId)!)
            .some(({ exercise }) => exercise.kind === 'open') ? 'draft' : 'instruction'}`
        if (!newStudy.has(key)) newStudy.set(key, plan.minutes)
      }
      if (plan.kind === 'review') {
        for (const id of plan.cardIds) {
          const item = course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? []).find(({ cardId }) => cardId === id)!
          const isGap = !missedRecall && id === 'en.experience.word.1'
          state = finishTypedReview(state, course, id, isGap ? 'wrong expression' : String(answer(item.recall)), now)
          if (isGap) missedRecall = true
        }
        continue
      }
      const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
      seen.add(lesson.id)
      if (plan.kind === 'speaking') {
        expect(plan.reason).toContain('Henüz konuşma raporun yok')
        seen.add('speaking')
        state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
      } else if (plan.kind === 'pedagogy') {
        const tasks = phaseTasks(state, lesson, plan.phase, now)
        const response = answers(tasks)
        if (lesson.id === 'en.intercultural' && plan.phase === 'transfer' && !cultureTransferMiss) {
          response[tasks[0].exercise.id] = 'mistook'
          cultureTransferMiss = true
        }
        if (lesson.id === 'en.intercultural' && plan.phase === 'foundation') {
          expect(tasks[0].exercise.id).toBe('en.intercultural.form.1.foundation')
          cultureRepair = true
        }
        const cultureVocabulary = lesson.id === 'en.intercultural' && plan.phase === 'vocabulary'
        const cardIds = new Set(tasks.map(({ conceptId }) => conceptId))
        if (cultureVocabulary) {
          expect(state.reviews.some(({ cardId }) => cardIds.has(cardId))).toBe(false)
          expect(tasks).toHaveLength(cardIds.size * 3)
          cultureVocabularyBatches.push(cardIds.size)
        }
        if (lesson.id === 'en.uncertainty' && ['transfer', 'reading', 'delayed'].includes(plan.phase) && !missedPhases.has(plan.phase)) {
          response[tasks[0].exercise.id] = 'Uncertain'
          missedPhases.add(plan.phase)
        }
        state = finishPedagogy(state, course, lesson, plan.phase, response,
          now, plan.phase === 'listening' ? 'played' : undefined)
        if (cultureVocabulary) {
          expect(state.reviews.filter(({ cardId }) => cardId.startsWith('en.intercultural.word.')))
            .toHaveLength(cultureVocabularyBatches.reduce((total, count) => total + count, 0))
        }
      } else state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), now)
    }
  }
  expect(reachedPublishedEnd).toBe(true)
  expect(cultureRepair).toBe(true)
  expect(cultureVocabularyBatches.reduce((sum, size) => sum + size, 0)).toBe(6)
  expect(cultureVocabularyBatches.every((size) => size >= 1 && size <= 3)).toBe(true)
  const cultureUses = state.attempts.filter(({ exerciseId }) => /^en\.intercultural\.word(?:\.\d+)?\.use$/.test(exerciseId))
  expect(cultureUses).toHaveLength(6)
  expect(cultureUses.every(({ evidence }) => evidence.observation === 'free_production' && evidence.outcome === 'review_required')).toBe(true)
  expect(seen.has('en.routine')).toBe(false)
  expect(seen.has('en.identity')).toBe(false)
  expect(seen.has('en.rebuttal')).toBe(true)
  expect(seen.has('en.brief')).toBe(true)
  expect(seen.has('en.station')).toBe(false)
  expect(seen.has('en.evidence')).toBe(true)
  expect(seen.has('en.appointment')).toBe(false)
  const routePack = packedLessons.filter(({ language, entry }) => language === 'en' &&
    ['B1', 'B2', 'B2+', 'C1', ...(target === 'C2' ? ['C2'] : [])].includes(entry.level))
  expect(seen.size).toBe((target === 'C2' ? 20 : 18) + routePack.length)
  for (const { entry } of routePack) expect(seen.has(entry.id), entry.id).toBe(true)
  expect(seen.has('speaking')).toBe(true)
  expect(missedRecall).toBe(true)
  expect([...missedPhases].sort()).toEqual(['delayed', 'reading', 'transfer'])
  expect(state.attempts.some(({ lessonId, context, exerciseId }) =>
    lessonId === 'en.uncertainty' && context === 'reading' && exerciseId.endsWith('.retry.reading'))).toBe(true)
  const end = course.unit.lessons.find(({ id }) => id === (target === 'C2' ? 'en.mediation' : 'en.seminar'))!
  expect(masteryFor(state, end).status).toBe('retained')
  expect(state.profile.estimate).toBe('B1')
  expect(state.speakingAssessments).toHaveLength(0)
  expect(vocabularyEvidence(course, state)).toEqual(expect.arrayContaining([
    expect.objectContaining({ term: 'strike up a conversation', encountered: true, recalled: true, productionSubmitted: true, delayedRecall: true }),
    expect.objectContaining({ term: 'single ticket', encountered: false, productionSubmitted: false, delayedRecall: false }),
  ]))
  const lexical = vocabularyEvidence(course, state)
  expect(lexical.reduce((sum, { failedTypedRecalls }) => sum + failedTypedRecalls, 0)).toBe(1)
  expect(seen.has('en.story') && seen.has('en.media')).toBe(true)
  expect(newStudy.size).toBeGreaterThan(90)
  if (process.env.npm_lifecycle_event === 'curriculum:report') {
    console.log(JSON.stringify({
      target, dailyMinutes: minutes, newLessons: seen.size - 1, firstTimeBlocks: newStudy.size,
      firstTimePlannerMinutes: [...newStudy.values()].reduce((sum, value) => sum + value, 0),
      reviewAndDelayedPlannerMinutes: reviewMinutes,
      introducedCards: state.reviews.length,
      controlledRecall: lexical.filter(({ recalled }) => recalled).length,
      delayedRecall: lexical.filter(({ delayedRecall }) => delayedRecall).length,
      withRecallFailure: lexical.filter(({ failedTypedRecalls }) => failedTypedRecalls > 0).length,
      productionSubmitted: lexical.filter((card) => card.productionSubmitted).length,
      independentUseReported: lexical.filter((card) => card.independentUseReported).length,
      phases: [...new Set([...newStudy.keys()].map((key) => key.split(':')[1]))],
    }))
  }
})

test.each(Object.values(catalog))('$language beginner reaches the end of the available A2 route locally', (course) => {
  const misses = Object.fromEntries(course.placement.filter(({ exercise }) => exercise.kind !== 'open')
    .map(({ exercise }) => [exercise.id, 'Bilmiyorum']))
  let state = start(course, 30, misses)
  state = { ...state, profile: { ...state.profile, estimate: 'A1', target: 'A2' } }
  const first = dailyPlan(state, course, at, zone)
  expect(first).toMatchObject({ kind: 'lesson', lessonId: course.language === 'en' ? 'en.identity' : 'ru.cyrillic' })
  const studies = new Map<string, number>()
  let reviewMinutes = 0
  let exhausted = false
  for (let elapsed = 0; elapsed < 90 && !exhausted; elapsed++) {
    const now = new Date(Date.parse(at) + elapsed * day).toISOString()
    for (let block = 0; block < 30; block++) {
      const plan = dailyPlan(state, course, now, zone)
      if (plan.kind === 'complete') exhausted = true
      if (!('minutes' in plan)) break
      expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(30)
      if (plan.kind === 'review') {
        reviewMinutes += plan.minutes
        for (const id of plan.cardIds) {
          const item = course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? []).find(({ cardId }) => cardId === id)!
          state = finishTypedReview(state, course, id, String(answer(item.recall)), now)
        }
        continue
      }
      const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
      if (plan.kind === 'speaking') {
        state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
        continue
      }
      const tasks = plan.kind === 'pedagogy' ? phaseTasks(state, lesson, plan.phase, now) : lessonTasks(state, lesson)
      if (plan.kind === 'pedagogy' && plan.phase === 'delayed') reviewMinutes += plan.minutes
      else {
        const phase = plan.kind === 'pedagogy' ? plan.phase : tasks.some(({ exercise }) => exercise.kind === 'open') ? 'draft' : 'instruction'
        const key = [lesson.id, phase, phase === 'vocabulary' ? tasks[0]?.conceptId : undefined].filter(Boolean).join(':')
        if (!studies.has(key)) studies.set(key, plan.minutes)
      }
      if (plan.kind === 'pedagogy') state = finishPedagogy(state, course, lesson, plan.phase, answers(tasks),
        now, plan.phase === 'listening' ? 'played' : undefined)
      else state = finishLesson(state, course, lesson, answers(tasks), now)
    }
  }
  const reached = new Set(state.attempts.flatMap(({ lessonId }) => lessonId ? [lessonId] : []))
  const phases = [...new Set([...studies.keys()].map((key) => key.split(':')[1]))].sort()
  expect(exhausted).toBe(true)
  const routePack = packedLessons.filter(({ language, entry }) => language === course.language && ['A1', 'A2'].includes(entry.level))
  expect(reached.size).toBe((course.language === 'en' ? 11 : 12) + routePack.length)
  for (const { entry } of routePack) expect(reached.has(entry.id), entry.id).toBe(true)
  expect(reached.has(course.language === 'en' ? 'en.host' : 'ru.housing')).toBe(true)
  expect(phases).toEqual(['draft', 'instruction', 'listening', 'reading', 'revision', 'transfer', 'vocabulary'])
  expect(parseBackup(exportBackup(state))).toEqual(state)
  if (process.env.npm_lifecycle_event === 'curriculum:report') {
    console.log(JSON.stringify({ beginner: course.language, reached: reached.size, blocks: studies.size,
      firstTimePlannerMinutes: [...studies.values()].reduce((sum, value) => sum + value, 0), reviewMinutes,
      introducedCards: state.reviews.length, speakingOffers: state.skippedSpeaking.length, phases }))
  }
})

test('weak listening triggers listening practice without sending a successful reader to the foundation bridge', () => {
  const course = catalog.en
  const placed = start(course, 60)
  const read = nextDiagnostic(course, placed)!
  let state = finishDiagnostic(placed, course, read.exercise.id, answer(read.exercise), at, false)
  const listening = nextDiagnostic(course, state)!
  state = finishDiagnostic(state, course, listening.exercise.id, 'Uncertain', at, true)
  expect(nextDiagnostic(course, state)).toBeUndefined()
  const lesson = course.unit.lessons[0]
  state = teachWords(state, course, lesson, at)
  state = finishPedagogy(state, course, lesson, 'transfer', answers(phaseTasks(state, lesson, 'transfer', at)), at)
  state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), at)
  expect(dailyPlan(state, course, at, zone, false)).toMatchObject({ phase: 'listening', lessonId: lesson.id, evidenceId: expect.any(String) })
})

test('exhausted variants stay closed while an unrelated unlocked lesson can proceed', () => {
  const course = catalog.en
  const lesson = course.unit.lessons[0]
  const extra = course.unit.lessons.find(({ id }) => id === 'en.opinion')!
  const independent = publishCourse({ ...course, unit: { ...course.unit, lessons: course.unit.lessons.map((item) =>
    item === extra ? { ...item, prerequisites: [] } : item) } })
  let state = start(course, 60, { 'en.diagnostic.2': 'have lead' })
  const tried = new Set<string>()
  for (let attempt = 0; attempt < 3; attempt++) {
    const tasks = lessonTasks(state, lesson)
    if (!tasks.length) break
    expect(tried.has(tasks[0].exercise.id)).toBe(false)
    tried.add(tasks[0].exercise.id)
    state = finishLesson(state, course, lesson, { ...answers(tasks), [tasks[0].exercise.id]: 'wrong' }, at)
  }
  expect(tried.size).toBeGreaterThan(1)
  expect(dailyPlan(state, independent, at, zone)).toMatchObject({ kind: 'lesson', lessonId: extra.id })
  expect(dailyPlan(state, course, at, zone)).toMatchObject({ kind: 'assessment_gap' })
  const monday = '2026-11-16T10:00:00.000Z'
  expect(dailyPlan(state, course, monday, zone)).toMatchObject({ kind: 'assessment_gap' })
  expect(masteryFor(state, lesson).status).toBe('developing')
})

test('checks new reception keys against independently identified source details', () => {
  const keys = {
    'en.conditional': ['Cuma', 'Hizmeti denemek', 'En az 20', 'Kayıt olmak', 'Akşam turu', '12'],
    'en.synthesis': ['Denemeyi tek şubede sürdürecek', 'Genişletmeden önce bir bulguyu araştırmak', 'İadelerin',
      'Şifre kurtarma', 'Gerçek aramalarda hatalar sürüyor', '5'],
    'ru.service': ['Adresi kontrol etmesi', 'Teslimat saatinin doğrulanmasını', 'Beşe kadar',
      'Siparişi mağazadan alacak', 'Sipariş numarasını', 'İkiye kadar'],
  }
  for (const course of Object.values(catalog)) {
    for (const lesson of course.unit.lessons.filter(({ id }) => id in keys)) {
      const p = lesson.pedagogy!
      const retry = p.receptionRetry!
      const exercises = [p.reading.question, p.listening.main, p.listening.detail,
        retry.reading.question, retry.listening.main, retry.listening.detail]
      for (const [index, exercise] of exercises.entries()) {
        expect(assess(exercise, keys[lesson.id as keyof typeof keys][index], course.language).outcome, exercise.id).toBe('correct')
      }
    }
  }
})

test.each(['A1', 'A2'] as const)('%s target starts with a real English lesson and unlocks the linked café task', (target) => {
  const course = catalog.en
  const identity = course.unit.lessons.find(({ id }) => id === 'en.identity')!
  const cafe = course.unit.lessons.find(({ id }) => id === 'en.cafe')!
  const placed = start(course, 60)
  let state: LearningState = { ...placed, profile: { ...placed.profile, target } }
  expect(dailyPlan(state, course, at, zone)).toMatchObject({ kind: 'lesson', lessonId: identity.id })
  expect(() => finishLesson(state, course, cafe, answers(lessonTasks(state, cafe)), at)).toThrow(/ön koşul/)
  state = finishLesson(state, course, identity, answers(lessonTasks(state, identity)), at)
  state = teachWords(state, course, identity, at)
  state = finishLesson(state, course, identity, answers(lessonTasks(state, identity)), at)
  state = finishPedagogy(state, course, identity, 'transfer', answers(phaseTasks(state, identity, 'transfer', at)), at)
  expect(lessonTasks(state, cafe).length).toBeGreaterThan(0)
  expect(() => finishLesson(state, course, cafe, answers(lessonTasks(state, cafe)), at)).not.toThrow()
})

test.each(['B2', 'C2'] as const)('Russian A1 start links movement and aspect to the %s route', (target) => {
  const course = catalog.ru
  const targets = ['ru.directions', 'ru.routes', 'ru.aspect', 'ru.register', 'ru.implication']
    .filter((id) => target === 'C2' || !['ru.register', 'ru.implication'].includes(id))
  let state = start(course, 30)
  state = { ...state, profile: { ...state.profile, estimate: 'A1', target } }
  const order: string[] = []
  const studied = new Set<string>()
  let firstStudyMinutes = 0
  let reviewMinutes = 0
  const firstBlocks = new Set<string>()
  let reachedPublishedEnd = false
  for (let elapsed = 0; elapsed < 150 && !reachedPublishedEnd; elapsed++) {
    const now = new Date(Date.parse(at) + elapsed * day).toISOString()
    for (let block = 0; block < 30; block++) {
      const plan = dailyPlan(state, course, now, zone)
      if (plan.kind === 'complete') reachedPublishedEnd = true
      if (!('minutes' in plan)) break
      expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(30)
      if (plan.kind === 'review') {
        reviewMinutes += plan.minutes
        for (const id of plan.cardIds) {
          const item = course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? []).find(({ cardId }) => cardId === id)!
          state = finishTypedReview(state, course, id, String(answer(item.recall)), now)
        }
        continue
      }
      const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
      if (plan.kind === 'lesson') studied.add(lesson.id)
      if (plan.kind === 'pedagogy' && plan.phase === 'delayed') reviewMinutes += plan.minutes
      else if (plan.kind !== 'speaking') {
        const phase = plan.kind === 'pedagogy' ? plan.phase : plan.kind
        const batch = phase === 'vocabulary' && phaseTasks(state, lesson, phase, now)[0]?.conceptId
        const key = [lesson.id, phase, batch].filter(Boolean).join(':')
        if (!firstBlocks.has(key)) firstStudyMinutes += plan.minutes
        firstBlocks.add(key)
      }
      if (targets.includes(lesson.id) && !order.includes(lesson.id)) order.push(lesson.id)
      if (plan.kind === 'speaking') state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
      else if (plan.kind === 'pedagogy') state = finishPedagogy(state, course, lesson, plan.phase,
        answers(phaseTasks(state, lesson, plan.phase, now)), now, plan.phase === 'listening' ? 'played' : undefined)
      else state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), now)
    }
  }
  expect(order).toEqual(targets)
  expect(reachedPublishedEnd).toBe(true)
  const available = course.unit.lessons.filter(({ objective }) =>
    target === 'C2' || ['A1', 'A2', 'B1', 'B2', 'B2+'].includes(objective.level))
  expect(studied).toEqual(new Set(available.map(({ id }) => id).filter((id) => !['ru.cyrillic', 'ru.intro'].includes(id))))
  const preparationOrder = ['ru.cyrillic', 'ru.intro', ...studied]
  for (const { entry } of packedLessons.filter(({ language, entry }) =>
    language === 'ru' && available.some(({ id }) => id === entry.id))) {
    for (const previous of entry.prerequisite) {
      expect(preparationOrder.indexOf(previous), entry.id).toBeLessThan(preparationOrder.indexOf(entry.id))
    }
  }
  expect(masteryFor(state, course.unit.lessons.find(({ id }) => id === (target === 'C2' ? 'ru.recast' : 'ru.handover'))!).status).toBe('retained')
  expect(state.attempts.some(({ exerciseId }) => exerciseId === 'ru.weekend.writing')).toBe(true)
  expect(masteryFor(state, course.unit.lessons.find(({ id }) => id === 'ru.debate')!).status).toBe('retained')
  const firstAt = (id: string) => state.attempts.findIndex(({ lessonId, context }) => lessonId === id && context === 'lesson')
  expect(firstAt('ru.quantity')).toBeLessThan(firstAt('ru.opinion'))
  expect(firstAt('ru.opinion')).toBeLessThan(firstAt('ru.debate'))
  expect(parseBackup(exportBackup(state))).toEqual(state)
  expect(state.profile.estimate).toBe('A1')
  if (process.env.npm_lifecycle_event === 'curriculum:report') {
    console.log(JSON.stringify({ russianFromA1: target, newLessons: studied.size, introducedCards: state.reviews.length, firstStudyMinutes, reviewMinutes }))
  }
})
