import { z } from 'zod'
import { idSchema, languageSchema, levelSchema } from '../domain/model'
import { exerciseSchema } from './exercise-schema'

const text = z.string().trim().min(1).max(2000)
export const controlledExercise = exerciseSchema.refine((item) =>
  ['fill', 'short', 'word_order', 'sentence_order'].includes(item.kind), 'Üretim görevi kesin bir açık yanıt veya sıralama istemeli.')

const audioSchema = z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('synthesis'), locale: z.enum(['en-US', 'ru-RU', 'es-ES']), rate: z.number().min(0.5).max(1.2) }),
      z.strictObject({ kind: z.literal('recording'), src: z.string().regex(/^\/audio\/[\w.-]+$/),
        license: text, source: z.url({ protocol: /^https$/ }), locale: text, synthetic: z.boolean().optional() }),
    ])

const reading = z.strictObject({ text, question: exerciseSchema.refine((item) => item.kind === 'single' && item.skill === 'reading') })
const listening = z.strictObject({
  preparation: text, transcript: text, audio: audioSchema,
  main: exerciseSchema.refine((item) => item.kind === 'single' && item.skill === 'listening'),
  detail: exerciseSchema.refine((item) => item.kind === 'single' && item.skill === 'listening'),
})

export const pedagogySchema = z.strictObject({
  language: languageSchema,
  target: levelSchema,
  version: z.literal(2),
  quality: z.enum(['draft', 'automated_checked', 'awaiting_review', 'reviewed']),
  sources: z.array(z.url({ protocol: /^https$/ })).min(1),
  sections: z.array(z.strictObject({ title: text, explanation: text, example: text })).min(2),
  rubric: z.array(z.strictObject({ criterion: text, example: text })).min(2),
  checks: z.array(z.strictObject({
    conceptId: idSchema,
    misconception: text,
    incorrectExample: text,
    correctExample: text,
    correction: text,
    transfer: z.array(controlledExercise).min(2),
    delayed: z.array(controlledExercise).min(2),
    foundation: z.strictObject({
      conceptId: idSchema,
      exercise: controlledExercise,
      errorAnswers: z.array(text).min(1),
    }).optional(),
  })).min(2),
  reviewAfterHours: z.number().int().min(24).max(168),
  reading, listening,
  diagnostic: z.strictObject({ reading, listening: listening.omit({ main: true }) }).optional(),
  receptionRetry: z.strictObject({
    reading: reading.extend({ coaching: text }),
    listening: listening.extend({ mainCoaching: text, detailCoaching: text }),
  }).optional(),
  revision: exerciseSchema.refine((item) => item.kind === 'open' && item.skill === 'writing').optional(),
  vocabulary: z.array(z.strictObject({
    cardId: idSchema,
    collocations: z.array(text).min(1),
    pronunciation: text,
    audio: audioSchema.optional(),
    recognize: exerciseSchema.refine((item) => item.kind === 'single' && item.skill === 'vocabulary'),
    recall: controlledExercise.refine((item) => item.skill === 'vocabulary'),
    use: exerciseSchema.refine((item) => item.kind === 'open' && item.skill === 'vocabulary'),
  })).min(1),
})
export type Pedagogy = z.infer<typeof pedagogySchema>
export type ListeningActivity = Pedagogy['listening']
