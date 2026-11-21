import type { Course, Lesson } from '../content/schema'
import { outcomesFor } from '../content/curriculum/inventory'
import { bridgeLesson, isLessonEvidence, needsBridge } from './diagnostic'
import { placementEntry } from './adaptive-placement'
import { levelSchema, type CEFRLevel } from './model'
import { isUnlocked, masteryFor, needsEnglishStarter } from './progress'
import type { LearningState } from './state'

export type RoadmapStatus = 'completed' | 'in_progress' | 'upcoming' | 'locked'
export type RoadmapLesson = {
  id: string
  title: string
  level: CEFRLevel
  status: RoadmapStatus
  remainingMinutes: number
  prerequisiteTitles: string[]
}
export type RoadmapTopic = { id: string; title: string; lessons: RoadmapLesson[] }
export type RoadmapLevel = { level: CEFRLevel; topics: RoadmapTopic[]; published: number; completed: number }
export type RoadmapEstimate = {
  budgetMinutes: number
  lessonIds: string[]
  usedMinutes: number
  partial: { lessonId: string; minutes: number } | null
}

// Keep a long lesson at the front of the queue, even when only part of it fits.
export function estimateRoadmap(lessons: readonly RoadmapLesson[], budgetMinutes: number): RoadmapEstimate {
  const result: RoadmapEstimate = { budgetMinutes, lessonIds: [], usedMinutes: 0, partial: null }
  for (const lesson of lessons) {
    if (lesson.remainingMinutes === 0) continue
    const available = budgetMinutes - result.usedMinutes
    if (available <= 0) break
    if (lesson.remainingMinutes > available) {
      result.partial = { lessonId: lesson.id, minutes: available }
      result.usedMinutes += available
      break
    }
    result.lessonIds.push(lesson.id)
    result.usedMinutes += lesson.remainingMinutes
  }
  return result
}

export function buildRoadmap(state: LearningState, course: Course, focusLessonId?: string) {
  const attempted = new Set(state.attempts.filter(isLessonEvidence).map(({ lessonId }) => lessonId))
  const drafted = new Set((state.studyDrafts ?? []).flatMap(({ task }) => 'lessonId' in task ? [task.lessonId] : []))
  const spent = new Map<string, number>()
  for (const activity of state.activity) {
    if (activity.kind === 'lesson') spent.set(activity.itemId, (spent.get(activity.itemId) ?? 0) + activity.minutes)
  }
  const sources = new Map(course.unit.lessons.map((lesson) => [lesson.objective.id, lesson]))
  const byId = new Map<string, RoadmapLesson>()
  const unlocked = new Set<string>()
  for (const lesson of course.unit.lessons) {
    const mastery = masteryFor(state, lesson).status
    const complete = mastery === 'ready' || mastery === 'retained'
    const accessible = isUnlocked(state, course, lesson)
    if (accessible) unlocked.add(lesson.id)
    const status: RoadmapStatus = complete ? 'completed' : !accessible ? 'locked' :
      mastery === 'developing' || attempted.has(lesson.id) || drafted.has(lesson.id) ? 'in_progress' : 'upcoming'
    byId.set(lesson.id, {
      id: lesson.id, title: lesson.title, level: lesson.objective.level, status,
      // Activity minutes are estimates too; an unfinished lesson always retains work.
      remainingMinutes: complete ? 0 : Math.max(1, lesson.minutes - (spent.get(lesson.id) ?? 0)),
      prerequisiteTitles: lesson.prerequisites.map((id) => sources.get(id)?.title ?? id),
    })
  }

  const levels: RoadmapLevel[] = levelSchema.options
    .filter((level) => level !== 'B2+' || course.unit.lessons.some(({ objective }) => objective.level === level))
    .map((level) => ({ level, topics: [], published: 0, completed: 0 }))
  const levelIndex = new Map(levels.map((level) => [level.level, level]))
  const grouped = new Set<string>()
  for (const { band, outcomes } of outcomesFor(course)) {
    for (const outcome of outcomes) {
      const lesson = outcome.activeLesson && byId.get(outcome.activeLesson.id)
      if (lesson && grouped.has(lesson.id)) continue
      levelIndex.get(lesson?.level ?? band)!.topics.push({
        id: outcome.id, title: outcome.task, lessons: lesson ? [lesson] : [],
      })
      if (lesson) grouped.add(lesson.id)
    }
  }
  // Catalog lessons without a planning-inventory link still belong to their authored unit.
  for (const level of levels) {
    const ungrouped = course.unit.lessons.filter((lesson) => lesson.objective.level === level.level && !grouped.has(lesson.id))
    if (ungrouped.length) level.topics.unshift({ id: course.unit.id, title: course.unit.title,
      lessons: ungrouped.map(({ id }) => byId.get(id)!) })
    const lessons = level.topics.flatMap(({ lessons }) => lessons)
    level.published = lessons.length
    level.completed = lessons.filter(({ status }) => status === 'completed').length
  }

  const bridge = bridgeLesson(course)
  const targetIndex = levelSchema.options.indexOf(state.profile.target)
  const englishStarter = needsEnglishStarter(state)
  const includeBridge = bridge && needsBridge(course, state, bridge)
  const eligible = (lesson: Lesson) => levelSchema.options.indexOf(lesson.objective.level) <= targetIndex &&
    (course.language !== 'en' || lesson.objective.level !== 'A1' || englishStarter) &&
    (lesson !== bridge || includeBridge)
  // CEFR ordering is stable; catalog order within each band preserves authored prerequisites.
  const ordered = levels.flatMap(({ level }) => course.unit.lessons.filter((lesson) =>
    lesson.objective.level === level && eligible(lesson)).map(({ id }) => byId.get(id)!))
  const pending = ordered.filter(({ status }) => status !== 'completed')
  const entry = placementEntry(state)
  const current = (focusLessonId && byId.get(focusLessonId)) ||
    pending.find(({ id, status }) => unlocked.has(id) && status === 'in_progress') ||
    pending.find(({ id }) => id === entry?.id && unlocked.has(id)) ||
    pending.find(({ id }) => unlocked.has(id)) || null
  const following = current ? ordered.slice(ordered.findIndex(({ id }) => id === current.id) + 1)
    .filter(({ status }) => status !== 'completed') : pending
  const remaining = current ? [current, ...following] : pending
  const next = current ? remaining.find(({ id, status }) => id !== current.id && status !== 'completed') ?? null : null
  const studyDays = state.profile.days.length
  const weeklyMinutes = state.profile.minutes * studyDays
  return {
    levels, byId, current, next, studyDays, weeklyMinutes,
    remainingMinutes: remaining.reduce((total, lesson) => total + lesson.remainingMinutes, 0),
    week: estimateRoadmap(remaining, weeklyMinutes),
    fourWeeks: estimateRoadmap(remaining, weeklyMinutes * 4),
  }
}
