import { z } from 'zod'
import { attemptSchema, dateSchema, idSchema, profileSchema } from './model'
import { studyDraftSchema } from './study-session'
import { placementTrackSchema } from './placement-state'
import { reviewScheduleSchema } from './review'
import { speakingAssessmentSchema, speakingSessionSchema } from './speaking'

const reviewEventSchema = z.strictObject({
  cardId: idSchema, at: dateSchema, result: z.enum(['again', 'remembered']),
  mode: z.enum(['self_review', 'typed']),
  answer: z.string().trim().min(1).max(2000).optional(),
}).refine(({ mode, answer }) => (mode === 'typed') === Boolean(answer))

const activitySchema = z.strictObject({
  id: idSchema, at: dateSchema, minutes: z.number().int().positive(),
  kind: z.enum(['lesson', 'review', 'speaking']), itemId: idSchema,
  elapsedSeconds: z.number().int().nonnegative().optional(),
})

const unique = <T>(items: T[], getId: (item: T) => string) =>
  new Set(items.map(getId)).size === items.length

const stateFields = {
  profile: profileSchema,
  placementAt: dateSchema.nullable(),
  placementTrack: placementTrackSchema.optional(),
  attempts: z.array(attemptSchema),
  reviews: z.array(reviewScheduleSchema),
  reviewHistory: z.array(reviewEventSchema),
  skippedListening: z.array(idSchema),
  speakingSessions: z.array(speakingSessionSchema),
  speakingAssessments: z.array(speakingAssessmentSchema),
  skippedSpeaking: z.array(idSchema),
  activity: z.array(activitySchema),
  studyDrafts: z.array(studyDraftSchema).optional(),
}

export const legacyStateSchema = z.strictObject(stateFields).omit({ reviewHistory: true, skippedListening: true })
export const stateSchema = z.strictObject(stateFields)
  .refine((state) => unique(state.attempts, (item) => item.id), { path: ['attempts'], message: 'Tekrarlanan deneme kimliği.' })
  .refine((state) => unique(state.reviews, (item) => item.cardId), { path: ['reviews'], message: 'Tekrarlanan kelime kartı.' })
  .refine((state) => unique(state.speakingSessions, (item) => item.id), { path: ['speakingSessions'], message: 'Tekrarlanan konuşma oturumu.' })
  .refine((state) => unique(state.speakingAssessments, (item) => item.report.sessionId), { path: ['speakingAssessments'], message: 'Tekrarlanan konuşma raporu.' })
  .refine((state) => unique(state.studyDrafts ?? [], (item) => item.id), { path: ['studyDrafts'], message: 'Tekrarlanan çalışma taslağı.' })
  .refine((state) => unique(state.activity, (item) => item.id), { path: ['activity'], message: 'Tekrarlanan çalışma kaydı.' })

export type LearningState = z.infer<typeof stateSchema>
export type StudySession = LearningState['activity'][number]
export type Profile = LearningState['profile']
export function initialState(profile: Profile): LearningState {
  return { profile, placementAt: null, attempts: [], reviews: [], speakingSessions: [],
    speakingAssessments: [], skippedSpeaking: [], activity: [], reviewHistory: [], skippedListening: [] }
}
