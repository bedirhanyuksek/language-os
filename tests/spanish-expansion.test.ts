import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import { vocabularyIndex } from '../src/content/vocabulary'
import { beginPlacementTrack, finishMiniPlacement, nextPlacementItem, recordPlacementSample } from '../src/domain/adaptive-placement'
import { wordsPrepared } from '../src/domain/instruction'
import { dailyMinutes, dailyPlan, finishLesson, finishPedagogy, finishTypedReview, isUnlocked, lessonTasks, masteryFor } from '../src/domain/progress'
import { phaseTasks } from '../src/domain/pedagogy'
import { initialState } from '../src/domain/state'
import { sampleAnswers } from './teaching-fixture'

const at = '2026-11-20T10:00:00.000Z'
const zone = 'Europe/Istanbul'
const day = 86_400_000
const a1Ids = ['es.ficha-contacto', 'es.recado-telefono', 'es.horario-diario', 'es.horario-servicio', 'es.turno-mostrador']
const a2Ids = ['es.visita-pasada', 'es.gestion-pasada', 'es.orden-incidente', 'es.retraso-servicio', 'es.cita-servicio']
const packIds = [...a1Ids, ...a2Ids]

function start(target: 'A1' | 'A2') {
  return initialState({ id: `c1288d67-673e-436f-a554-c5fe6e8c81d${target === 'A1' ? '1' : '2'}`,
    language: 'es', estimate: 'A1', target, minutes: 20, goals: ['general'], days: [1, 2, 3, 4, 5] })
}

function completeMiniPlacement(target: 'A1' | 'A2') {
  let state = beginPlacementTrack(start(target), at)
  for (let sample = 0; !state.placementAt && sample < 40; sample++) {
    const item = nextPlacementItem(state, at, zone)
    if (!item) {
      state = finishMiniPlacement(state, at)
      break
    }
    const exercise = item.exercise
    state = recordPlacementSample(state, item.id, exercise && !item.transcript
      ? { status: 'answered', answer: sampleAnswers([{ exercise }])[exercise.id] }
      : { status: 'unknown' }, at, zone)
  }
  if (!state.placementAt) throw new Error('Adaptive Spanish mini placement did not finish')
  return state
}

test('Spanish first-wave additions are stable, new, and have separate transfer and delayed materials', () => {
  const lessons = packIds.map((id) => catalog.es.unit.lessons.find((lesson) => lesson.id === id))
  expect(lessons.every(Boolean)).toBe(true)
  const active = lessons.filter((lesson) => lesson !== undefined)
  expect(active.filter(({ objective }) => objective.level === 'A1').map(({ id }) => id)).toEqual(a1Ids)
  expect(active.filter(({ objective }) => objective.level === 'A2').map(({ id }) => id)).toEqual(a2Ids)
  expect(active.reduce((sum, lesson) => sum + lesson.vocabulary.length, 0)).toBe(50)
  const normalize = (term: string) => term.normalize('NFC').trim().toLocaleLowerCase('es').replace(/^(un|una|el|la) /, '')
  const index = vocabularyIndex(catalog.es)
  const known = new Set(catalog.es.unit.lessons.filter(({ id }) => !packIds.includes(id))
    .flatMap(({ vocabulary }) => vocabulary.map(({ term }) => normalize(term))))

  for (const lesson of active) {
    expect(lesson.vocabulary).toHaveLength(5)
    expect(lesson.vocabulary.map(({ id }) => id)).toEqual(Array.from({ length: 5 }, (_, index) => `${lesson.id}.word.${index + 1}`))
    expect(lesson.teaching?.audioMode).toBe('script-practice')
    expect(lesson.pedagogy?.reviewAfterHours).toBeGreaterThanOrEqual(24)
    for (const { id, term } of lesson.vocabulary) {
      const key = normalize(term)
      expect(known.has(key), term).toBe(false)
      known.add(key)
      expect(index.get(id)?.sense?.links[0]).toMatchObject({ cardId: id, objectiveId: lesson.objective.id })
    }
    const prompts = [
      ...lesson.concepts.flatMap(({ variants }) => variants.map(({ prompt }) => prompt)),
      ...lesson.pedagogy!.checks.flatMap(({ transfer, delayed }) => [...transfer, ...delayed].map(({ prompt }) => prompt)),
    ]
    expect(new Set(prompts).size, lesson.id).toBe(prompts.length)
    for (const check of lesson.pedagogy!.checks) {
      expect(check.transfer).toHaveLength(2)
      expect(check.delayed).toHaveLength(2)
      expect(new Set([...check.transfer, ...check.delayed].map(({ id }) => id)).size)
        .toBe(check.transfer.length + check.delayed.length)
    }
  }
})

test.each([
  ['A1', a1Ids],
  ['A2', [...a1Ids, ...a2Ids]],
] as const)('adaptive Spanish %s learner reaches new lessons only after real prerequisite and vocabulary mastery', (target, expectedIds) => {
  const course = catalog.es
  const additions = new Set(packIds)
  const allAdded = new Set(expectedIds)
  let state = completeMiniPlacement(target)
  const entryLessons = course.unit.lessons.filter(({ id }) => additions.has(id))
  for (const lesson of entryLessons) expect(isUnlocked(state, course, lesson), lesson.id).toBe(false)

  if (target === 'A1') {
    expect(course.unit.lessons.filter(({ id }) => a2Ids.includes(id)).map(({ objective }) => objective.level))
      .toEqual(Array.from({ length: a2Ids.length }, () => 'A2'))
  }

  const reached = new Set<string>()
  const completedDelayed = new Set<string>()
  for (let elapsed = 0; elapsed < 180 && completedDelayed.size < expectedIds.length; elapsed++) {
    const now = new Date(Date.parse(at) + elapsed * day).toISOString()
    for (let block = 0; block < 50; block++) {
      const plan = dailyPlan(state, course, now, zone)
      if (!('minutes' in plan)) break
      expect(dailyMinutes(state, now, zone) + plan.minutes).toBeLessThanOrEqual(state.profile.minutes)
      const lesson = 'lessonId' in plan ? course.unit.lessons.find(({ id }) => id === plan.lessonId)! : undefined
      if (lesson && additions.has(lesson.id)) {
        expect(allAdded.has(lesson.id), lesson.id).toBe(true)
        reached.add(lesson.id)
        if (plan.kind !== 'speaking') {
          for (const prerequisiteId of lesson.prerequisites) {
            const prerequisite = course.unit.lessons.find(({ objective }) => objective.id === prerequisiteId)
            expect(prerequisite, `${lesson.id} has a real prerequisite`).toBeDefined()
            expect(['ready', 'retained'], `${lesson.id} requires ${prerequisite!.id} mastery`)
              .toContain(masteryFor(state, prerequisite!).status)
            expect(wordsPrepared(state, prerequisite!), `${lesson.id} requires ${prerequisite!.id} vocabulary`).toBe(true)
          }
        }
      }
      if (plan.kind === 'review') {
        for (const cardId of plan.cardIds) {
          const recall = course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? [])
            .find(({ cardId: id }) => id === cardId)?.recall
          if (recall?.kind !== 'fill' && recall?.kind !== 'short') throw new Error(`No typed Spanish recall task for ${cardId}`)
          state = finishTypedReview(state, course, cardId, recall.accepted[0], now)
        }
      } else if (plan.kind === 'speaking') {
        state = { ...state, skippedSpeaking: [...state.skippedSpeaking, plan.lessonId] }
      } else if (lesson && plan.kind === 'pedagogy') {
        const tasks = phaseTasks(state, lesson, plan.phase, now, plan.vocabularyCardIds)
        if (additions.has(lesson.id) && plan.phase === 'delayed') {
          const transfer = state.attempts.find(({ lessonId, context }) => lessonId === lesson.id && context === 'transfer')!
          expect(tasks.length).toBeGreaterThan(0)
          expect(Date.parse(now) - Date.parse(transfer.at)).toBeGreaterThanOrEqual(day)
          expect(tasks.every(({ exercise }) => !state.attempts.some((attempt) =>
            attempt.lessonId === lesson.id && attempt.context === 'transfer' && attempt.exerciseId === exercise.id))).toBe(true)
        }
        state = finishPedagogy(state, course, lesson, plan.phase, sampleAnswers(tasks), now,
          plan.phase === 'listening' ? 'unavailable' : undefined, now, plan.vocabularyCardIds)
        if (additions.has(lesson.id) && plan.phase === 'delayed') {
          expect(masteryFor(state, lesson).status).toBe('retained')
          completedDelayed.add(lesson.id)
        }
      } else if (lesson) {
        state = finishLesson(state, course, lesson, sampleAnswers(lessonTasks(state, lesson)), now)
      }
    }
  }

  expect([...reached].sort()).toEqual([...expectedIds].sort())
  expect([...completedDelayed].sort()).toEqual([...expectedIds].sort())
  if (target === 'A1') expect([...reached].some((id) => a2Ids.includes(id))).toBe(false)
  expect(state.attempts.some(({ lessonId, context }) => additions.has(lessonId ?? '') && context === 'listening')).toBe(false)
  for (const id of expectedIds) expect(state.skippedListening).toContain(id)
})
