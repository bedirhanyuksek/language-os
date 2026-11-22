import { z } from 'zod'
import { languageSchema, levelSchema } from '../../domain/model'
import { author, type Module } from '../continuity'
import { teachingSchema } from '../teaching'

const line = z.string().trim().min(1).max(1000)
const practice = z.tuple([line, line]).rest(line)
const variants = z.tuple([practice, practice])
const question = z.tuple([line, line, line, line, line])
const sourceQuestion = z.tuple([line, line, line, line, line, line])
const material = z.strictObject({
  text: z.string().trim().min(1).max(2000), reading: sourceQuestion,
  transcript: z.string().trim().min(1).max(2000), preparation: line, main: sourceQuestion, detail: sourceQuestion,
})
const expression = z.strictObject({
  term: line, meaning: line, example: line, usage: line, pronunciation: line,
  collocations: z.array(line).min(2), recognize: question, recall: practice, use: line,
})
const concept = z.strictObject({
  label: line, incorrect: line, correct: line, explanation: line,
  skill: z.enum(['grammar', 'reading']).optional(),
  guided: variants, transfer: variants, delayed: variants,
  foundation: z.strictObject({ conceptId: line, errorAnswers: z.array(line).min(1), practice, explanation: line }).optional(),
})
const lesson = z.strictObject({
  id: z.string().regex(/^(en|ru|es)\.[a-z][a-z0-9-]+$/),
  outcome: z.string().regex(/^(A1|A2|B1|B2|C1|C2)\.[a-z][a-z0-9-]+$/),
  level: levelSchema, prerequisite: z.array(line).min(1), title: line, objective: line,
  audioMode: teachingSchema.shape.audioMode,
  grammarStrands: z.array(line).max(2),
  situation: line, bridge: line,
  models: z.tuple([teachingSchema.shape.models.element, teachingSchema.shape.models.element]),
  concepts: z.tuple([concept, concept]),
  word: expression, additionalWords: z.array(expression).min(1).max(5), receptive: teachingSchema.shape.receptive.unwrap().min(1),
  writing: z.strictObject({ prompt: line, sample: line, revision: line, criteria: z.tuple([line, line]) }),
  input: material, retry: material, readingUse: line, listeningUse: line,
  speaking: line, speakingContext: z.enum(['daily_conversation', 'job_interviews', 'workplace', 'technical',
    'presentations', 'discussion', 'listening_interaction', 'professional_writing']),
  recovery: z.strictObject({ reading: line, main: line, detail: line }),
  approach: teachingSchema.shape.approach, readingPurpose: line,
  genres: z.strictObject({ reading: line, listening: line, writing: line }),
})

const packSchema = z.strictObject({
  format: z.literal(1), language: languageSchema, lessons: z.array(lesson).min(1),
})

function teachingMaterial(item: z.infer<typeof material>): Module['input'] {
  const { reading, main, detail, ...source } = item
  const questionFields = ([prompt, key, a, b, explanation]: typeof reading): Module['input']['reading'] =>
    [prompt, key, a, b, explanation]
  return { ...source, reading: questionFields(reading), main: questionFields(main), detail: questionFields(detail) }
}

export function loadPacks(files: Record<string, unknown>) {
  const outcomes = new Set<string>()
  const ids = new Set<string>()
  return Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).flatMap(([path, data]) => {
    const result = packSchema.safeParse(data)
    if (!result.success) {
      const issues = result.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`)
      throw new Error(`${path}\n${issues.join('\n')}`)
    }
    const { language, lessons } = result.data
    return lessons.map((entry) => {
      const key = `${language}:${entry.outcome}`
      if (!entry.id.startsWith(language + '.') || entry.level.replace('+', '') !== entry.outcome.split('.')[0] ||
        new Set(entry.prerequisite).size !== entry.prerequisite.length ||
        outcomes.has(key) || ids.has(entry.id)) throw new Error(`${path}: tutarsız veya mükerrer ders/hedef ${entry.id}`)
      outcomes.add(key)
      ids.add(entry.id)
      return { language, entry, lesson: author(language, {
        ...entry, input: teachingMaterial(entry.input), retry: teachingMaterial(entry.retry),
      }) }
    })
  })
}

// Literal glob keeps discovery deterministic in both Vite and Vitest builds.
export const packedLessons = loadPacks(import.meta.env
  ? import.meta.glob('../packs/*.json', { eager: true, import: 'default' })
  : {})

export function additionsFor(language: string, existingIds: readonly string[], packs = packedLessons) {
  const ready = new Set(existingIds)
  const pending = packs.filter((item) => item.language === language)
  const sorted = []
  while (pending.length) {
    const index = pending.findIndex(({ entry }) => entry.prerequisite.every((id) => ready.has(id)))
    if (index < 0) throw new Error(`Çözülemeyen ders ön koşulları: ${pending.map(({ entry }) =>
      `${entry.id} → ${entry.prerequisite.filter((id) => !ready.has(id)).join(', ')}`).join('; ')}`)
    const [item] = pending.splice(index, 1)
    if (ready.has(item.entry.id)) throw new Error(`Mükerrer ders: ${item.entry.id}`)
    ready.add(item.entry.id)
    sorted.push(item.lesson)
  }
  return sorted
}
