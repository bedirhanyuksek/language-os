import { z } from 'zod'

export const languageSchema = z.enum(['en', 'ru'])
export const levelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'B2+', 'C1', 'C2'])
export const skillSchema = z.enum(['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking'])
export const goalSchema = z.enum(['general', 'professional', 'exam'])
export const confidenceSchema = z.enum(['low', 'medium', 'high'])
export const observationSchema = z.enum(['recognition', 'controlled_production', 'free_production', 'retention', 'speaking_application', 'speaking_independent'])
export const idSchema = z.string().min(1).max(160)
export const dateSchema = z.iso.datetime()
export type Language = z.infer<typeof languageSchema>
export type CEFRLevel = z.infer<typeof levelSchema>
export type Skill = z.infer<typeof skillSchema>
export type LearningGoal = z.infer<typeof goalSchema>

export const profileSchema = z.strictObject({
  id: z.uuid(), language: languageSchema, estimate: levelSchema, target: levelSchema,
  minutes: z.number().int().min(5).max(180),
  goals: z.array(goalSchema).min(1).refine((values) => new Set(values).size === values.length),
  days: z.array(z.number().int().min(0).max(6)).min(1).refine((values) => new Set(values).size === values.length),
})

export const answerSchema = z.union([z.string().trim().min(1).max(2000), z.array(z.string().min(1).max(300)).min(1).max(20)])
export type Answer = z.infer<typeof answerSchema>
export const evidenceSchema = z.strictObject({
  observation: observationSchema, skill: skillSchema,
  source: z.enum(['deterministic', 'learner_text', 'self_review', 'external_report']),
  outcome: z.enum(['correct', 'incorrect', 'review_required', 'observed']),
  confidence: confidenceSchema,
})
export type AssessmentEvidence = z.infer<typeof evidenceSchema>

export const attemptSchema = z.strictObject({
  id: idSchema, contentVersion: z.union([z.literal(1), z.literal(2)]),
  context: z.enum(['placement', 'lesson', 'transfer', 'foundation', 'reading', 'listening', 'vocabulary', 'delayed', 'revision', 'diagnostic' ]), lessonId: idSchema.optional(),
  conceptId: idSchema, exerciseId: idSchema, answer: answerSchema,
  at: dateSchema, evidence: evidenceSchema,
  study: z.strictObject({ sessionId: z.uuid(), supports: z.array(idSchema), plays: z.number().int().nonnegative() }).optional(),
})
export type ExerciseAttempt = z.infer<typeof attemptSchema>
export type Assessment = {
  skill: Skill
  status: 'not_assessed' | 'review_required' | 'sampled'
  correct: number
  total: number
  confidence: 'low' | null
  evidenceIds: string[]
}
export type SkillMastery = {
  status: 'not_assessed' | 'developing' | 'ready' | 'retained'
  evidenceIds: string[]
  observations: Partial<Record<AssessmentEvidence['observation'], number>>
}
export type ErrorRecord = { id: string; lessonId: string; label: string; example: string }
export type PedagogyPhase = 'foundation' | 'transfer' | 'reading' | 'listening' | 'vocabulary' | 'delayed' | 'revision'
export type StudyPlan =
  | { kind: 'pedagogy'; phase: PedagogyPhase; lessonId: string; minutes: number; reason: string; evidenceId?: string }
  | { kind: 'lesson' | 'practice' | 'speaking'; lessonId: string; minutes: number; reason: string }
  | { kind: 'review'; cardIds: string[]; minutes: number; reason: string }
  | { kind: 'assessment_gap'; lessonId: string; reason: string }
  | { kind: 'rest' | 'complete' | 'budget' | 'out_of_scope'; reason: string }

export type CommunicationContext =
  | 'daily_conversation' | 'job_interviews' | 'workplace' | 'technical'
  | 'presentations' | 'discussion' | 'listening_interaction' | 'professional_writing'

export interface ExamProfile {
  id: string
  language: Language
  version: string
  sections: readonly { skill: Skill; questionTypes: readonly string[]; minutes: number; rubric: string }[]
  officialReferences: readonly string[]
  interpret(evidence: readonly AssessmentEvidence[]): {
    skillGaps: readonly Skill[]
    estimate: { value: string; evidenceIds: readonly string[] } | null
  }
}
