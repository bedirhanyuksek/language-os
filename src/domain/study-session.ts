import { z } from 'zod'
import { dateSchema, idSchema } from './model'

export const phaseMinutes = { foundation: 3, transfer: 4, reading: 2, listening: 3, vocabulary: 5, delayed: 3, revision: 3 } as const

export const studyTaskSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('placement') }),
  z.strictObject({ kind: z.literal('diagnostic') }),
  z.strictObject({ kind: z.literal('assessment'), itemId: idSchema }),
  z.strictObject({ kind: z.literal('lesson'), lessonId: idSchema }),
  z.strictObject({ kind: z.literal('pedagogy'), lessonId: idSchema, phase: z.enum(['foundation', 'transfer', 'reading', 'listening', 'vocabulary', 'delayed', 'revision']) }),
  z.strictObject({ kind: z.literal('review'), cardId: idSchema }),
])

// Draft input can be empty or partially filled. The scored answer schema applies only on submit.
const draftAnswer = z.union([z.string().max(2000), z.array(z.string().max(300)).max(20)])
export const studyDraftSchema = z.strictObject({
  id: z.uuid(),
  reason: z.enum(['new_learning', 'guided_repair', 'new_assessment', 'due_review', 'prerequisite', 'writing_revision']),
  task: studyTaskSchema, contentVersion: z.union([z.literal(1), z.literal(2)]), contentRevision: idSchema,
  itemIds: z.array(idSchema).min(1), minutes: z.number().int().nonnegative(),
  budget: z.number().int().min(5).max(180), openedAt: dateSchema, updatedAt: dateSchema, revision: z.number().int().nonnegative(),
  step: z.number().int().nonnegative(), plays: z.number().int().nonnegative(),
  answers: z.record(idSchema, draftAnswer), supports: z.record(idSchema, z.boolean()),
  elapsedSeconds: z.number().int().nonnegative(),
}).refine(({ itemIds, answers }) => new Set(itemIds).size === itemIds.length &&
  Object.keys(answers).every((id) => itemIds.includes(id)), { path: ['answers'], message: 'Taslak görevle eşleşmiyor.' })

export type StudyDraft = z.infer<typeof studyDraftSchema>
export type StudyTask = z.infer<typeof studyTaskSchema>
export type StudyDefinition = Pick<StudyDraft, 'task' | 'contentVersion' | 'itemIds' | 'minutes' | 'budget' | 'reason' | 'contentRevision'>
export type StudyPatch = Partial<Pick<StudyDraft, 'step' | 'plays' | 'answers' | 'supports' | 'elapsedSeconds'>>

export function studyContentRevision(content: unknown) {
  const serialized = JSON.stringify(content)
  let hash = 2166136261
  for (let index = 0; index < serialized.length; index++) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 16777619)
  }
  return (hash >>> 0).toString(16)
}

export function studyKey({ task, contentVersion, contentRevision, itemIds }: StudyDefinition) {
  const target = task.kind === 'lesson' ? task.lessonId :
    task.kind === 'pedagogy' ? `${task.lessonId}:${task.phase}` : task.kind === 'review' ? task.cardId : task.kind === 'assessment' ? task.itemId : ''
  return JSON.stringify([task.kind, target, contentVersion, contentRevision, itemIds])
}
