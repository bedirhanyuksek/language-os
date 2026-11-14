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
  for (let elapsed = 0; elapsed < 100; elapsed++) {
    const now = new Date(Date.parse(at) + elapsed * day).toISOString()
    for (let count = 0; count < 60; count++) {
      const plan = dailyPlan(state, course, now, zone)
      if (!('minutes' in plan)) break
      expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(minutes)
      if (plan.kind === 'review' || (plan.kind === 'pedagogy' && plan.phase === 'delayed')) reviewMinutes += plan.minutes
      else if (plan.kind !== 'speaking' && !(plan.kind === 'pedagogy' && plan.phase === 'foundation')) {
        const key = plan.kind === 'pedagogy' ? `${plan.lessonId}:${plan.phase}` :
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
        if (lesson.id === 'en.uncertainty' && ['transfer', 'reading', 'delayed'].includes(plan.phase) && !missedPhases.has(plan.phase)) {
          response[tasks[0].exercise.id] = 'Uncertain'
          missedPhases.add(plan.phase)
        }
        state = finishPedagogy(state, course, lesson, plan.phase, response,
          now, plan.phase === 'listening' ? 'played' : undefined)
      } else state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), now)
    }
  }
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
        const key = `${lesson.id}:${plan.kind === 'pedagogy' ? plan.phase : tasks.some(({ exercise }) => exercise.kind === 'open') ? 'draft' : 'instruction'}`
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
  state = finishPedagogy(state, course, lesson, 'transfer', answers(phaseTasks(state, lesson, 'transfer', at)), at)
  state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), at)
  expect(dailyPlan(state, course, at, zone)).toMatchObject({ phase: 'listening', lessonId: lesson.id, evidenceId: expect.any(String) })
})

test('three misses defer the same target while an unrelated unlocked lesson can proceed', () => {
  const course = catalog.en
  const lesson = course.unit.lessons[0]
  const extra = course.unit.lessons.find(({ id }) => id === 'en.opinion')!
  const independent = publishCourse({ ...course, unit: { ...course.unit, lessons: course.unit.lessons.map((item) =>
    item === extra ? { ...item, prerequisites: [] } : item) } })
  let state = start(course, 60, { 'en.diagnostic.2': 'have lead' })
  for (let attempt = 0; attempt < 3; attempt++) {
    const tasks = lessonTasks(state, lesson)
    state = finishLesson(state, course, lesson, { ...answers(tasks), [tasks[0].exercise.id]: 'wrong' }, at)
  }
  expect(dailyPlan(state, independent, at, zone)).toMatchObject({ kind: 'lesson', lessonId: extra.id })
  expect(dailyPlan(state, course, at, zone)).toMatchObject({ kind: 'budget' })
  const monday = '2026-11-16T10:00:00.000Z'
  expect(dailyPlan(state, course, monday, zone)).toMatchObject({ kind: 'practice', lessonId: lesson.id })
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
  for (let elapsed = 0; elapsed < 100; elapsed++) {
    const now = new Date(Date.parse(at) + elapsed * day).toISOString()
    for (let block = 0; block < 30; block++) {
      const plan = dailyPlan(state, course, now, zone)
      if (!('minutes' in plan)) break
      expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(30)
      if (plan.kind === 'review') {
        for (const id of plan.cardIds) {
          const item = course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? []).find(({ cardId }) => cardId === id)!
          state = finishTypedReview(state, course, id, String(answer(item.recall)), now)
        }
        continue
      }
      const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
      if (targets.includes(lesson.id) && !order.includes(lesson.id)) order.push(lesson.id)
      if (plan.kind === 'speaking') state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
      else if (plan.kind === 'pedagogy') state = finishPedagogy(state, course, lesson, plan.phase,
        answers(phaseTasks(state, lesson, plan.phase, now)), now, plan.phase === 'listening' ? 'played' : undefined)
      else state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), now)
    }
  }
  expect(order).toEqual(targets)
  expect(masteryFor(state, course.unit.lessons.find(({ id }) => id === (target === 'C2' ? 'ru.recast' : 'ru.handover'))!).status).toBe('retained')
  expect(state.attempts.some(({ exerciseId }) => exerciseId === 'ru.weekend.writing')).toBe(true)
  expect(masteryFor(state, course.unit.lessons.find(({ id }) => id === 'ru.debate')!).status).toBe('retained')
  const firstAt = (id: string) => state.attempts.findIndex(({ lessonId, context }) => lessonId === id && context === 'lesson')
  expect(firstAt('ru.quantity')).toBeLessThan(firstAt('ru.opinion'))
  expect(firstAt('ru.opinion')).toBeLessThan(firstAt('ru.debate'))
  expect(parseBackup(exportBackup(state))).toEqual(state)
  expect(state.profile.estimate).toBe('A1')
})
