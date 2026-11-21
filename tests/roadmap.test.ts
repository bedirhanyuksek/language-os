import { describe, expect, test } from 'vitest'
import { catalog, legacyCatalog } from '../src/content/catalog'
import type { Course } from '../src/content/schema'
import { dailyPlan, finishLesson, lessonTasks, masteryFor } from '../src/domain/progress'
import { buildRoadmap, estimateRoadmap } from '../src/domain/roadmap'
import { initialState, type LearningState } from '../src/domain/state'
import { sampleAnswers } from './teaching-fixture'

const at = '2026-11-20T10:00:00.000Z'
const zone = 'Europe/Istanbul'
const course: Course = { ...legacyCatalog.es, unit: { ...legacyCatalog.es.unit,
  lessons: legacyCatalog.es.unit.lessons.slice(0, 3).map((lesson) => ({ ...lesson, minutes: 10 })),
} }

function start(active = course): LearningState {
  return { ...initialState({
    id: '3127687c-0f83-4669-b3fa-028d348bf90b', language: active.language, estimate: 'A1', target: 'A2',
    minutes: 5, days: [1, 3, 5], goals: ['general'],
  }), placementAt: at }
}

describe('roadmap lesson state', () => {
  test('distinguishes unlocked, in-progress, completed and locked lessons with existing evidence', () => {
    const [first, second] = course.unit.lessons
    const state = start()
    const initial = buildRoadmap(state, course)
    expect(initial.byId.get(first.id)?.status).toBe('upcoming')
    expect(initial.byId.get(second.id)?.status).toBe('locked')
    expect(initial.byId.get(second.id)?.prerequisiteTitles).toEqual([first.title])
    const attempt = {
      id: 'first-attempt', contentVersion: 1 as const, context: 'lesson' as const, lessonId: first.id,
      conceptId: first.concepts[0].id, exerciseId: first.concepts[0].variants[0].id, answer: 'yanlış', at,
      evidence: { observation: 'controlled_production' as const, skill: 'grammar' as const,
        source: 'deterministic' as const, outcome: 'incorrect' as const, confidence: 'high' as const },
    }
    expect(buildRoadmap({ ...state, attempts: [attempt] }, course).byId.get(first.id)?.status).toBe('in_progress')
    const completed = finishLesson(state, course, first, sampleAnswers(lessonTasks(state, first)), at)
    expect(masteryFor(completed, first).status).toBe('ready')
    const after = buildRoadmap(completed, course)
    expect(after.byId.get(first.id)).toMatchObject({ status: 'completed', remainingMinutes: 0 })
    expect(after.byId.get(second.id)?.status).toBe('upcoming')
    expect(after.current?.id).toBe(second.id)
  })

  test('diagnostic and placement evidence do not imply a lesson has started', () => {
    const state = start()
    const lesson = course.unit.lessons[0]
    const attempt = { id: 'diagnostic', contentVersion: 1 as const, context: 'diagnostic' as const,
      lessonId: lesson.id, conceptId: lesson.objective.id, exerciseId: 'diagnostic.item', answer: 'yanıt', at,
      evidence: { observation: 'recognition' as const, skill: 'grammar' as const, source: 'deterministic' as const,
        outcome: 'correct' as const, confidence: 'low' as const } }
    expect(buildRoadmap({ ...state, attempts: [attempt] }, course).current?.status).toBe('upcoming')
  })

  test('marks the current and next lesson and follows the daily plan focus', () => {
    const initial = buildRoadmap(start(), course)
    expect(initial.current?.id).toBe(course.unit.lessons[0].id)
    expect(initial.next?.id).toBe(course.unit.lessons[1].id)
    const state = { ...start(catalog.en), profile: { ...start(catalog.en).profile, target: 'C1' as const } }
    const plan = dailyPlan(state, catalog.en, at, zone)
    expect('lessonId' in plan).toBe(true)
    if (!('lessonId' in plan)) throw new Error('Fixture must select a lesson')
    const roadmap = buildRoadmap(state, catalog.en, plan.lessonId)
    expect(roadmap.current?.id).toBe(plan.lessonId)
    expect(roadmap.next?.id).not.toBe(roadmap.current?.id)
    expect(roadmap.next?.level).not.toBe('A1')
  })

  test('a completed route has no current or next lesson', () => {
    let state = start()
    for (const lesson of course.unit.lessons) {
      state = finishLesson(state, course, lesson, sampleAnswers(lessonTasks(state, lesson)), at)
    }
    const result = buildRoadmap(state, course)
    expect(result.current).toBeNull()
    expect(result.next).toBeNull()
    expect(result.week.lessonIds).toEqual([])
    expect(result.remainingMinutes).toBe(0)
  })
})

describe('roadmap estimates', () => {
  test('uses selected study days and remaining minutes, including a partially fitting lesson', () => {
    const state = start()
    state.activity.push({ id: 'activity', kind: 'lesson', itemId: course.unit.lessons[0].id, at, minutes: 4 })
    const result = buildRoadmap(state, course)
    expect(result.studyDays).toBe(3)
    expect(result.weeklyMinutes).toBe(15)
    expect(result.remainingMinutes).toBe(26)
    expect(result.week).toEqual({ budgetMinutes: 15, lessonIds: [course.unit.lessons[0].id], usedMinutes: 15,
      partial: { lessonId: course.unit.lessons[1].id, minutes: 9 } })
    expect(result.fourWeeks).toMatchObject({ budgetMinutes: 60, usedMinutes: 26, partial: null })
    expect(result.fourWeeks.lessonIds).toHaveLength(3)
    const changed = buildRoadmap({ ...state, profile: { ...state.profile, minutes: 10, days: [1, 5] } }, course)
    expect(changed.weeklyMinutes).toBe(20)
    expect(changed.week.lessonIds).toHaveLength(2)
  })

  test('never skips an oversized lesson, credits reviews or declares unfinished work complete', () => {
    const state = start()
    const id = course.unit.lessons[0].id
    state.activity.push({ id: 'review', kind: 'review', itemId: id, at, minutes: 100 })
    const before = buildRoadmap(state, course)
    expect(before.byId.get(id)?.remainingMinutes).toBe(10)
    expect(estimateRoadmap([...before.byId.values()], 5)).toEqual({ budgetMinutes: 5, lessonIds: [], usedMinutes: 5,
      partial: { lessonId: id, minutes: 5 } })
    expect(estimateRoadmap([...before.byId.values()], 0).partial).toBeNull()
    state.activity.push({ id: 'lesson', kind: 'lesson', itemId: id, at, minutes: 100 })
    expect(buildRoadmap(state, course).byId.get(id)?.remainingMinutes).toBe(1)
  })
})

describe('roadmap catalog hierarchy', () => {
  test.each(['en', 'ru', 'es'] as const)('keeps every %s catalog lesson exactly once without mutating state or content', (language) => {
    const active = catalog[language]
    const state = start(active)
    const original = JSON.stringify({ state, active })
    const result = buildRoadmap(state, active)
    const lessons = result.levels.flatMap(({ topics }) => topics.flatMap(({ lessons }) => lessons))
    expect(lessons.map(({ id }) => id).sort()).toEqual(active.unit.lessons.map(({ id }) => id).sort())
    expect(JSON.stringify({ state, active })).toBe(original)
    expect(result.levels.every((level) => level.topics.flatMap(({ lessons }) => lessons)
      .every((lesson) => lesson.level === level.level))).toBe(true)
  })

  test('retains unpublished levels and topics instead of hiding content gaps', () => {
    const result = buildRoadmap(start(catalog.es), catalog.es)
    expect(result.levels.map(({ level }) => level)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    expect(result.levels.find(({ level }) => level === 'C2')?.published).toBe(0)
    expect(buildRoadmap(start(catalog.ru), catalog.ru).levels
      .some(({ topics }) => topics.some(({ lessons }) => lessons.length === 0))).toBe(true)
  })
})
