import { z } from 'zod'
import { goalSchema, idSchema, languageSchema, levelSchema } from '../domain/model'

import { exerciseSchema, line } from './exercise-schema'
import { pedagogySchema, type Pedagogy } from './pedagogy-schema'
import { teachingSchema } from './teaching'
export { exerciseSchema } from './exercise-schema'

const conceptSchema = z.strictObject({
  id: idSchema, label: line, variants: z.array(exerciseSchema).min(2),
}).refine(({ variants }) => variants.every((item) => item.kind !== 'open' && item.skill === variants[0].skill))

const vocabularySchema = z.strictObject({
  id: idSchema, term: line, meaning: line, example: line, context: line, partOfSpeech: line, grammar: line,
  pronunciation: line.optional(),
})

export const lessonSchema = z.strictObject({
  id: idSchema, title: line, objective: z.strictObject({ id: idSchema, description: line, level: levelSchema }),
  prerequisites: z.array(idSchema), minutes: z.number().int().positive(), goals: z.array(goalSchema).min(1),
  pedagogy: pedagogySchema.optional(),
  teaching: teachingSchema.optional(),
  recall: line, explanation: z.array(line).min(1),
  examples: z.array(z.strictObject({ correct: line, incorrect: line, note: line })).min(1),
  concepts: z.array(conceptSchema).min(2),
  production: exerciseSchema.refine((item) => item.kind === 'open'),
  vocabulary: z.array(vocabularySchema).min(1),
  speaking: z.strictObject({ scenario: line, grammar: line, goals: z.array(line).min(1), rubric: z.array(line).min(1),
    context: z.enum(['daily_conversation', 'job_interviews', 'workplace', 'technical',
      'presentations', 'discussion', 'listening_interaction', 'professional_writing']) }).optional(),
})

export const courseSchema = z.strictObject({
  id: idSchema, language: languageSchema, level: levelSchema, version: z.union([z.literal(1), z.literal(2)]),
  source: line, license: z.literal('MIT'), reviewStatus: z.enum(['reviewed', 'draft', 'automated_checked', 'awaiting_review']),
  unit: z.strictObject({ id: idSchema, title: line, lessons: z.array(lessonSchema).min(1) }),
  placement: z.array(z.strictObject({
    exercise: exerciseSchema, objectiveId: idSchema, difficulty: levelSchema, diagnosticConceptId: idSchema.optional(),
  })).min(1),
}).superRefine((course, ctx) => {
  const seen = new Set<string>()
  const register = (id: string) => {
    if (seen.has(id)) ctx.addIssue({ code: 'custom', message: `Tekrarlanan içerik kimliği: ${id}` })
    seen.add(id)
  }
  const objectives = new Set<string>()
  const priorConcepts = new Map<string, string>()
  for (const lesson of course.unit.lessons) {
    if (lesson.prerequisites.some((id) => !objectives.has(id))) {
      ctx.addIssue({ code: 'custom', message: `Ön koşul önce tanımlanmalı: ${lesson.id}` })
    }
    if ((course.version === 2) !== Boolean(lesson.pedagogy)) {
      ctx.addIssue({ code: 'custom', message: 'Ders pedagojisi paket sürümüyle eşleşmeli.' })
    }
    if (lesson.teaching) {
      const cardIds = lesson.teaching.vocabulary.map(({ cardId }) => cardId)
      if (!lesson.pedagogy || cardIds.length !== lesson.vocabulary.length ||
        new Set(cardIds).size !== cardIds.length || lesson.vocabulary.some(({ id }) => !cardIds.includes(id))) {
        ctx.addIssue({ code: 'custom', message: `Öğretim notları kelime kartlarıyla eşleşmeli: ${lesson.id}` })
      }
      if (lesson.concepts.some(({ variants }) => variants.filter(({ kind }) => !['single', 'multiple', 'matching'].includes(kind)).length < 2)) {
        ctx.addIssue({ code: 'custom', message: `En az iki rehberli cümle kurma görevi gerekli: ${lesson.id}` })
      }
    }
    if (lesson.pedagogy) {
      const p = lesson.pedagogy
      const sameIds = (a: string[], b: string[]) =>
        a.length === b.length && new Set(a).size === a.length && a.every((id) => b.includes(id))
      if (p.language !== course.language || p.target !== lesson.objective.level || p.version !== course.version ||
        !sameIds(p.checks.map(({ conceptId }) => conceptId), lesson.concepts.map(({ id }) => id)) ||
        !sameIds(p.vocabulary.map(({ cardId }) => cardId), lesson.vocabulary.map(({ id }) => id)) ||
        !p.listening.audio.locale.toLowerCase().startsWith(course.language + '-') ||
        p.vocabulary.some(({ audio }) => audio && !audio.locale.toLowerCase().startsWith(course.language + '-'))) {
        ctx.addIssue({ code: 'custom', message: `Ders değerlendirme ölçütü veya içerik bağlantısı geçersiz: ${lesson.id}` })
      }
      pedagogyExercises(p).forEach(({ exercise }) => register(exercise.id))
      for (const item of receptionExercises(p)) register(item.id)
      if (p.revision) register(p.revision.id)
      if (p.diagnostic) {
        register(p.diagnostic.reading.question.id)
        register(p.diagnostic.listening.detail.id)
        if (p.diagnostic.reading.text === p.reading.text || p.diagnostic.listening.transcript === p.listening.transcript ||
          !p.diagnostic.listening.audio.locale.toLowerCase().startsWith(course.language + '-')) {
          ctx.addIssue({ code: 'custom', message: 'Tanılama kaynağı ders kaynağından ayrı olmalı.' })
        }
      }
      if (p.receptionRetry && (p.receptionRetry.reading.text === p.reading.text ||
        p.receptionRetry.listening.transcript === p.listening.transcript ||
        !p.receptionRetry.listening.audio.locale.toLowerCase().startsWith(course.language + '-'))) {
        ctx.addIssue({ code: 'custom', message: 'Alımlama tekrarı yeni bir kaynak ve doğru dil gerektirir.' })
      }
      if (new Set([p.listening.main.prompt, p.listening.detail.prompt]).size !== 2 ||
        new Set(p.rubric.map(({ criterion }) => criterion.toLowerCase())).size !== p.rubric.length) {
        ctx.addIssue({ code: 'custom', message: 'Dinleme soruları ve üretim ölçütleri ayrı olmalı.' })
      }
      for (const check of p.checks) {
        const concept = lesson.concepts.find(({ id }) => id === check.conceptId)
        const prior = check.foundation && priorConcepts.get(check.foundation.conceptId)
        const prompts = [...(concept?.variants ?? []), ...check.transfer, ...check.delayed].map(({ prompt }) => prompt.toLowerCase())
        if (new Set(prompts).size !== prompts.length ||
          [...check.transfer, ...check.delayed].some((item) => item.skill !== concept?.variants[0]?.skill) ||
          (check.foundation && (!prior || !lesson.prerequisites.includes(prior) ||
            check.foundation.exercise.kind !== 'fill' ||
            check.foundation.errorAnswers.some((answer) => check.foundation?.exercise.kind === 'fill' &&
              check.foundation.exercise.accepted.some((key) => key.toLowerCase() === answer.toLowerCase()))))) {
          ctx.addIssue({ code: 'custom', message: `Aktarım veya ön koşul görevi geçersiz: ${check.conceptId}` })
        }
      }
    }
    objectives.add(lesson.objective.id)
    for (const id of [lesson.id, lesson.objective.id, lesson.production.id, ...lesson.vocabulary.map((card) => card.id)]) register(id)
    for (const concept of lesson.concepts) {
      register(concept.id)
      priorConcepts.set(concept.id, lesson.objective.id)
      concept.variants.forEach((item) => register(item.id))
    }
  }
  for (const item of course.placement) {
    register(item.exercise.id)
    if (item.diagnosticConceptId && priorConcepts.get(item.diagnosticConceptId) !== item.objectiveId) {
      ctx.addIssue({ code: 'custom', message: 'Tanılama kavramı kazanıma ait olmalı.' })
    }
    if (!objectives.has(item.objectiveId)) ctx.addIssue({ code: 'custom', message: 'Tarama kazanımı bulunamadı.' })
  }
})

export type Course = z.infer<typeof courseSchema>
export type Unit = Course['unit']
export type Lesson = z.infer<typeof lessonSchema>
export type LearningObjective = Lesson['objective']
export type Prerequisite = LearningObjective['id']
export type VocabularyItem = z.infer<typeof vocabularySchema>
export type Exercise = z.infer<typeof exerciseSchema>

export function pedagogyExercises(p: Pedagogy) {
  return [
    ...p.checks.flatMap(({ conceptId, transfer, delayed, foundation }) =>
      [...transfer, ...delayed, ...(foundation ? [foundation.exercise] : [])].map((exercise) => ({ conceptId, exercise }))),
    ...p.vocabulary.flatMap(({ cardId, recognize, recall, use }) =>
      [recognize, recall, use].map((exercise) => ({ conceptId: cardId, exercise }))),
  ]
}

export function receptionExercises(p: Pedagogy) {
  const retry = p.receptionRetry
  return [p.reading.question, p.listening.main, p.listening.detail,
    ...(retry ? [retry.reading.question, retry.listening.main, retry.listening.detail] : [])]
}
