import { z } from 'zod'
import { dateSchema, idSchema } from './model'

export const dayMs = 86_400_000
export const reviewScheduleSchema = z.strictObject({
  cardId: idSchema, step: z.number().int().min(0).max(4), dueAt: dateSchema, introducedAt: dateSchema,
  lastAt: dateSchema.optional(), lastResult: z.enum(['again', 'remembered']).optional(),
})
export type ReviewSchedule = z.infer<typeof reviewScheduleSchema>

const intervals = [1, 3, 7, 14, 30]

export function scheduleReview(card: ReviewSchedule, result: 'again' | 'remembered', now: string): ReviewSchedule {
  const interval = result === 'again' ? 10 * 60_000 : intervals[card.step] * dayMs
  return {
    ...card, step: result === 'again' ? 0 : Math.min(card.step + 1, intervals.length - 1),
    dueAt: new Date(Date.parse(now) + interval).toISOString(), lastAt: now, lastResult: result,
  }
}
