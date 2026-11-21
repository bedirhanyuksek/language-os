import { vocabularyIndex } from '../content/vocabulary'
import type { Course } from '../content/schema'
import { dayMs } from './review'
import type { LearningState } from './state'

export function vocabularyLoad(state: LearningState, course: Course, now: string, timeZone: string, remaining: number) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short' })
  const today = day.format(new Date(now))
  const index = vocabularyIndex(course)
  const seen = new Set<string>()
  const introducedToday = new Set<string>()
  for (const { context, conceptId, at } of state.attempts) {
    if (context !== 'vocabulary' || at > now) continue
    const senseId = index.get(conceptId)?.senseId
    if (!senseId || seen.has(senseId)) continue
    seen.add(senseId)
    if (day.format(new Date(at)) === today) introducedToday.add(senseId)
  }

  const cutoff = new Date(Date.parse(now) - 14 * dayMs).toISOString()
  const schedules = new Map(state.reviews.map((review) => [review.cardId, review]))
  const recent = new Map<string, 'remembered' | 'again'>()
  for (let indexInHistory = state.reviewHistory.length - 1; indexInHistory >= 0 && recent.size < 12; indexInHistory--) {
    const { cardId, mode, at, result } = state.reviewHistory[indexInHistory]
    const senseId = index.get(cardId)?.senseId
    const schedule = schedules.get(cardId)
    if (mode !== 'typed' || !senseId || recent.has(senseId) || at < cutoff || at > now || !schedule ||
        Date.parse(at) - Date.parse(schedule.introducedAt) < dayMs) continue
    recent.set(senseId, result)
  }
  const recalled = [...recent.values()].filter((result) => result === 'remembered').length
  const due = state.reviews.filter(({ dueAt }) => dueAt <= now)
  const failed = due.filter(({ lastResult }) => lastResult === 'again').length
  const baseline = Math.max(1, Math.floor((state.profile.minutes - 2) / 4))
  const performance = recent.size >= 3 && recalled / recent.size >= 0.8 ? 1
    : recent.size >= 3 && recalled / recent.size < 0.6 ? -1 : 0
  const pressure = due.length + failed
  const allowance = pressure >= Math.max(4, remaining) ? 1
    : pressure >= Math.max(3, Math.ceil(remaining / 2)) ? Math.max(1, Math.floor((baseline + performance) / 2))
      : Math.max(1, baseline + performance)
  // Within a day, reuse the schedule as feedback without ever counting exposure as recall.
  const availableNew = Math.min(Math.max(0, allowance - introducedToday.size), Math.max(0, remaining - 2))
  return { capacity: allowance, availableNew, introducedToday: introducedToday.size, remaining, seen }
}

export type VocabularyLoad = ReturnType<typeof vocabularyLoad>
export const vocabularyBatchLimit = 3

export function vocabularyMinutes(cardCount: number) {
  return 2 + cardCount
}
