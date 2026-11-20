import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import type { Course, Exercise } from '../src/content/schema'
import type { Answer } from '../src/domain/model'
import { vocabularyEvidence } from '../src/content/curriculum/language-audit'
import { phaseTasks } from '../src/domain/pedagogy'
import { scheduleReview } from '../src/domain/review'
import { dailyMinutes, dailyPlan, dueCards, finishLesson, finishPedagogy, finishPlacement,
  finishTypedReview, lessonTasks, masteryFor } from '../src/domain/progress'
import { initialState } from '../src/domain/state'

const start = Date.parse('2026-11-16T10:00:00Z')
const dayLength = 86_400_000
const date = (offset: number) => new Date(start + offset * dayLength).toISOString()
const zone = 'Europe/Istanbul'
const profiles = [
  { name: 'new', seed: 0, overdue: 0 },
  { name: 'regular', seed: 18, overdue: 0 },
  { name: 'light', seed: 12, overdue: 8 },
  { name: 'returning', seed: 65, overdue: 65 },
  { name: 'long-break', seed: 250, overdue: 250 },
  { name: 'frequent-misses', seed: 65, overdue: 65 },
]
const answer = (exercise: Exercise): Answer => exercise.kind === 'open' ? exercise.sample :
  exercise.kind === 'short' || exercise.kind === 'fill' ? exercise.accepted[0] : exercise.accepted
const answers = (tasks: { exercise: Exercise }[]) =>
  Object.fromEntries(tasks.map(({ exercise }) => [exercise.id, answer(exercise)]))

// Extend a dormant branch only in the stress fixture. For a starter course,
// move its final lesson above the target before adding the 250-card backlog.
function stressCourse(course: Course): Course {
  const lesson = course.unit.lessons.find(({ objective, pedagogy }) => objective.level === 'C2' && pedagogy) ?? course.unit.lessons.at(-1)!
  const card = lesson.vocabulary[0]
  const entry = lesson.pedagogy!.vocabulary[0]
  const copies = Array.from({ length: 250 }, (_, index) => {
    const id = `stress-${index}`
    return { card: { ...card, id }, entry: { ...entry, cardId: id } }
  })
  return { ...course, unit: { ...course.unit, lessons: course.unit.lessons.map((item) => item !== lesson ? item :
    { ...lesson, objective: { ...lesson.objective, level: 'C2' }, vocabulary: copies.map(({ card }) => card),
      pedagogy: { ...lesson.pedagogy!, target: 'C2', vocabulary: copies.map(({ entry }) => entry) } }) } }
}

test('failure spacing preserves the failed result and a later correct recall restarts at step one', () => {
  let review = { cardId: 'en.test.word', step: 3, dueAt: date(0), introducedAt: date(-60) }
  for (const [previousMisses, delay] of [600_000, dayLength, 2 * dayLength, 4 * dayLength].entries()) {
    const now = review.dueAt
    review = scheduleReview(review, 'again', now, previousMisses)
    expect(review).toMatchObject({ step: 0, lastResult: 'again', dueAt: new Date(Date.parse(now) + delay).toISOString() })
  }
  const recovered = scheduleReview(review, 'remembered', date(10))
  expect(recovered).toMatchObject({ step: 1, lastResult: 'remembered', dueAt: date(11) })
})

test.each([5, 15, 30, 60])('%i minute queues stay honest across 42 days', (minutes) => {
  const report = process.env.LANGUAGE_OS_REVIEW_REPORT === '1'
  for (const base of Object.values(catalog)) {
    for (const { name, seed, overdue } of profiles) {
      const course = name === 'long-break' ? stressCourse(base) : base
      const recall = new Map(course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? [])
        .map(({ cardId, recall }) => [cardId, recall]))
      const placement = answers(course.placement)
      const novice = name === 'new'
      if (novice) for (const id of Object.keys(placement)) placement[id] = '___'
      let state = finishPlacement(initialState({
        id: 'acdc92e4-faae-4d28-8b32-d58e488ed68d', language: course.language,
        estimate: novice ? 'A1' : 'B1', target: base.language === 'en' ? 'C1' : 'B2',
        minutes, goals: ['professional'], days: [0, 1, 2, 3, 4, 5, 6],
      }), course, placement, date(-1))
      const pastCards = [...recall.keys()].slice(-seed).filter(() => seed > 0)
      state = { ...state, reviews: pastCards.map((cardId, index) => ({
        cardId, introducedAt: date(-90), dueAt: date(index < overdue ? -1 - index % 45 : index % 9 + 1),
        lastAt: date(-60), step: 2, lastResult: 'remembered',
      })) }
      const persistent = new Set(name === 'frequent-misses' ? pastCards.slice(0, 24) : [])
      let completed = 0
      let learningMinutes = 0
      let lastDue = 0
      let previousFocusedReview = false
      for (let elapsed = 0; elapsed < 42; elapsed++) {
        const now = date(elapsed)
        const originallyDue = new Set(dueCards(state, now))
        const originalRecords = new Map(state.reviews.map((record) => [record.cardId, record]))
        const studied = new Set<string>()
        let review = 0
        let failed = 0
        let instruction = 0
        let skills = 0
        let checks = 0
        let speakingOffers = 0
        for (let block = 0; block < minutes + course.unit.lessons.length; block++) {
          const plan = dailyPlan(state, course, now, zone)
          if (!('minutes' in plan)) break
          expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(minutes)
          if (plan.kind === 'review') {
            for (const id of plan.cardIds) {
              const misses = persistent.has(id) || (++completed + elapsed) % 9 === 0
              state = finishTypedReview(state, course, id, misses ? '___' : String(answer(recall.get(id)!)), now)
              expect(state.reviewHistory.at(-1)?.result).toBe(misses ? 'again' : 'remembered')
              studied.add(id)
              review++
              if (misses) failed++
            }
            continue
          }
          const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
          if (plan.kind === 'speaking') {
            speakingOffers++
            state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
            continue
          }
          if (plan.kind === 'pedagogy') {
            const tasks = phaseTasks(state, lesson, plan.phase, now)
            if (plan.phase === 'vocabulary' || plan.phase === 'foundation') instruction += plan.minutes
            else if (plan.phase === 'delayed') checks += plan.minutes
            else skills += plan.minutes
            state = finishPedagogy(state, course, lesson, plan.phase, answers(tasks), now,
              plan.phase === 'listening' ? 'played' : undefined)
          } else {
            const tasks = lessonTasks(state, lesson)
            if (tasks.some(({ exercise }) => exercise.kind === 'open')) skills += plan.minutes
            else instruction += plan.minutes
            state = finishLesson(state, course, lesson, answers(tasks), now)
          }
        }
        const deferred = [...originallyDue].filter((id) => !studied.has(id))
        const ending = new Map(state.reviews.map((record) => [record.cardId, record]))
        expect(deferred.every((id) => ending.get(id) === originalRecords.get(id))).toBe(true)
        const dueEnd = dueCards(state, now).length
        learningMinutes += instruction + skills
        lastDue = dueEnd
        const focusedReview = minutes === 5 && review === minutes && originallyDue.size >= 10
        expect(focusedReview && previousFocusedReview).toBe(false)
        previousFocusedReview = focusedReview
        const used = dailyMinutes(state, now, zone)
        expect(used).toBe(review + instruction + skills + checks)
        const ready = course.unit.lessons.filter((lesson) =>
          ['ready', 'retained'].includes(masteryFor(state, lesson).status)).length
        if (report) console.log(JSON.stringify({
          language: course.language, profile: name, minutes, day: elapsed + 1, dueStart: originallyDue.size,
          dueEnd, net: dueEnd - originallyDue.size, review, deferred: deferred.length, failed,
          introduced: ending.size - originalRecords.size, unresolved: state.reviews.filter(({ lastResult }) => lastResult === 'again').length,
          instruction, skills, checks, speakingOffers, ready, used,
        }))
      }
      expect(state.attempts.some(({ context }) => context === 'reading' || context === 'listening')).toBe(true)
      if (novice && minutes === 60 && course.language === 'ru') {
        for (const lessonId of ['ru.cultural-visit', 'ru.intercultural']) {
          const contexts = state.attempts.filter((item) => item.lessonId === lessonId).map(({ context }) => context)
          expect(contexts).toEqual(expect.arrayContaining(['lesson', 'vocabulary', 'reading', 'listening', 'transfer', 'delayed']))
          expect(state.skippedSpeaking).toContain(lessonId)
        }
      }
      if (name === 'returning') expect(lastDue).toBeLessThan(minutes === 5 ? 40 : 8)
      if (name === 'frequent-misses') {
        const evidence = vocabularyEvidence(course, state)
        const vocabulary = course.unit.lessons.flatMap((lesson) => lesson.vocabulary)
        const missedEvidence = evidence.filter((_, index) => persistent.has(vocabulary[index].id))
        expect(missedEvidence).toHaveLength(persistent.size)
        expect(missedEvidence.every(({ delayedRecall }) => !delayedRecall)).toBe(true)
        if (minutes === 30) expect(learningMinutes).toBeGreaterThan(Math.min(420, course.unit.lessons.length * 20))
      }
    }
  }
}, 90_000)
