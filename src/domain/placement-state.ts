import { z } from 'zod'
import { answerSchema, dateSchema, idSchema, levelSchema } from './model'

export const responseStatus = z.enum(['answered', 'unknown', 'skipped', 'unavailable', 'practiced'])
export const placementSampleSchema = z.strictObject({
  itemId: idSchema,
  at: dateSchema,
  elapsedSeconds: z.number().int().min(0).max(3600).optional(),
  stage: z.enum(['mini', 'followup']),
  status: responseStatus,
  answer: answerSchema.optional(),
  result: z.enum(['correct', 'incorrect', 'review_required']).optional(),
  mode: z.enum(['text', 'audio', 'transcript', 'none']),
  timing: z.enum(['before_teaching', 'after_teaching']),
}).refine((sample) => sample.status === 'answered'
  ? Boolean(sample.answer && sample.result && sample.mode !== 'none')
  : !sample.answer && !sample.result && sample.mode === 'none')

export const placementTrackSchema = z.strictObject({
  bankVersion: z.literal(1),
  policy: z.literal('adaptive-v1').optional(),
  route: z.enum(['en-start', 'en-b1', 'en-advanced', 'ru-start', 'ru-a2', 'es-start', 'es-medium']),
  origin: z.enum(['new', 'existing']),
  startedAt: dateSchema,
  targetAtStart: levelSchema,
  finishedAt: dateSchema.optional(),
  completedAt: dateSchema.optional(),
  samples: z.array(placementSampleSchema),
}).refine(({ samples }) => new Set(samples.map(({ itemId }) => itemId)).size === samples.length)

export type PlacementTrack = z.infer<typeof placementTrackSchema>
export type PlacementSample = z.infer<typeof placementSampleSchema>
export type PlacementResponse = z.infer<typeof responseStatus>
