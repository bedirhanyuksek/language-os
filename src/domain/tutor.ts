import { z } from 'zod'
import { pedagogyExercises, type Course, type Lesson } from '../content/schema'
import { goalSchema, idSchema, languageSchema, levelSchema } from './model'
import { speakingCorrections } from './speaking'
import type { LearningState } from './state'

const line = z.string().trim().min(1).max(1200)
export const tutorTask = z.enum(['explanation', 'examples', 'feedback', 'practice'])
export const tutorRequest = z.strictObject({
  task: tutorTask,
  language: languageSchema,
  nativeLanguage: z.literal('tr'),
  objectiveId: idSchema,
  difficulty: levelSchema,
  goals: z.array(goalSchema).max(3),
  mistakes: z.array(z.strictObject({ conceptId: idSchema, count: z.number().int().positive().max(9999) })).max(8),
  sentence: z.string().trim().min(1).max(2000).optional(),
  question: z.string().trim().min(1).max(300).optional(),
  exerciseId: idSchema.optional(),
  conceptId: idSchema.optional(),
}).refine(({ task, sentence }) => (task === 'feedback') === Boolean(sentence))
export type TutorRequest = z.infer<typeof tutorRequest>

export const tutorResponse = z.discriminatedUnion('task', [
  z.strictObject({ task: z.literal('explanation'), text: line }),
  z.strictObject({ task: z.literal('examples'), examples: z.array(z.strictObject({ example: line, note: line })).min(1).max(3) }),
  z.strictObject({ task: z.literal('feedback'), grammar: line, vocabulary: line, naturalness: line, suitability: line,
    corrections: z.array(z.strictObject({ quote: line, correction: line, explanation: line })).max(5) }),
  z.strictObject({ task: z.literal('practice'), prompt: line, sample: line, explanation: line }),
])
export type TutorResponse = z.infer<typeof tutorResponse>

export interface TutorProvider {
  suggest(request: TutorRequest, signal?: AbortSignal): Promise<TutorResponse>
}

export function buildTutorRequest(state: LearningState, lesson: Lesson, task: TutorRequest['task'], sentence?: string, context?: Pick<TutorRequest, 'question' | 'exerciseId' | 'conceptId'>): TutorRequest {
  const counts = new Map<string, number>()
  for (const attempt of state.attempts) {
    if (attempt.lessonId === lesson.id && attempt.evidence.outcome === 'incorrect') {
      counts.set(attempt.conceptId, (counts.get(attempt.conceptId) ?? 0) + 1)
    }
  }
  for (const { report } of state.speakingAssessments) {
    if (report.lessonId !== lesson.id) continue
    for (const { conceptId } of speakingCorrections(report)) counts.set(conceptId, (counts.get(conceptId) ?? 0) + 1)
  }
  const mistakes = lesson.concepts.flatMap(({ id }) => counts.has(id) ? [{ conceptId: id, count: Math.min(counts.get(id)!, 9999) }] : [])
  return tutorRequest.parse({ task, language: state.profile.language, nativeLanguage: 'tr',
    objectiveId: lesson.objective.id, difficulty: lesson.objective.level, goals: state.profile.goals,
    mistakes: mistakes.sort((a, b) => b.count - a.count).slice(0, 8), sentence, ...context })
}

const templates: Record<TutorRequest['task'], object> = {
  explanation: { task: 'explanation', text: '' },
  examples: { task: 'examples', examples: [{ example: '', note: '' }] },
  feedback: { task: 'feedback', grammar: '', vocabulary: '', naturalness: '', suitability: '',
    corrections: [{ quote: '', correction: '', explanation: '' }] },
  practice: { task: 'practice', prompt: '', sample: '', explanation: '' },
}

export function tutorInput(request: TutorRequest, course: Course) {
  const lesson = course.unit.lessons.find(({ objective }) => objective.id === request.objectiveId)
  if (!lesson || course.language !== request.language || lesson.objective.level !== request.difficulty ||
    request.mistakes.some(({ conceptId }) => !lesson.concepts.some(({ id }) => id === conceptId))) {
    throw new Error('Ders bağlamı geçersiz.')
  }
  const exercise = request.exerciseId && [
    lesson.production, ...lesson.concepts.flatMap(({ variants }) => variants),
    ...(lesson.pedagogy ? pedagogyExercises(lesson.pedagogy).map(({ exercise }) => exercise) : []),
    ...(lesson.pedagogy?.revision ? [lesson.pedagogy.revision] : []),
  ].find(({ id }) => id === request.exerciseId)
  if ((request.exerciseId && !exercise) ||
    (request.task === 'feedback' && exercise && (exercise.kind !== 'open' || exercise.skill !== 'writing')) ||
    (request.conceptId && !lesson.concepts.some(({ id }) => id === request.conceptId))) {
    throw new Error('Alıştırma bağlamı geçersiz.')
  }
  return {
    task: request.task, output: templates[request.task],
    targetLanguage: request.language, explanationLanguage: request.nativeLanguage, goals: request.goals,
    lesson: lesson.title, objective: lesson.objective.description, lessonDifficulty: lesson.objective.level,
    prerequisites: course.unit.lessons.filter(({ objective }) => lesson.prerequisites.includes(objective.id))
      .map(({ objective }) => objective.description),
    concepts: lesson.concepts.map(({ id, label }) => ({
      label, incorrectAttempts: request.mistakes.find(({ conceptId }) => conceptId === id)?.count ?? 0,
    })),
    vocabulary: lesson.vocabulary.map(({ id, term, meaning }) => ({
      term, meaning, collocations: lesson.pedagogy?.vocabulary.find(({ cardId }) => cardId === id)?.collocations,
    })),
    exercise: exercise ? exercise.prompt : undefined,
    focus: lesson.concepts.find(({ id }) => id === request.conceptId)?.label,
    question: request.question,
    sentence: request.sentence,
  }
}

export function validateTutorResponse(raw: unknown, request: TutorRequest): TutorResponse {
  const result = tutorResponse.parse(raw)
  if (result.task !== request.task || (result.task === 'feedback' && result.corrections.some(({ quote }) =>
    !request.sentence?.includes(quote)))) throw new Error('Yanıt istenen görev veya öğrenci cümlesiyle eşleşmiyor.')
  return result
}
