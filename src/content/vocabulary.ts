import { z } from 'zod'
import { idSchema, languageSchema, levelSchema } from '../domain/model'
import { studyContentRevision } from '../domain/study-session'
import type { Course } from './schema'

const text = z.string().trim().min(1)
const senseSchema = z.strictObject({
  id: idSchema.regex(/^(en|ru|es)\.[a-z0-9-]+\.[a-z0-9-]+$/),
  language: languageSchema,
  lemma: text,
  partOfSpeech: text,
  forms: z.record(text, text).optional(),
  band: levelSchema,
  meaning: text,
  example: text,
  usage: text,
  revision: z.number().int().positive(),
  change: text,
  links: z.array(z.strictObject({
    cardId: idSchema, lessonId: idSchema, objectiveId: idSchema, band: levelSchema,
    assessmentRevision: z.string().regex(/^[a-f0-9]{1,8}$/),
  })).min(1),
})
export type VocabularySense = z.infer<typeof senseSchema>

export function validateVocabularySenses(input: unknown, courses: Record<Course['language'], Course>) {
  const senses = z.array(senseSchema).parse(input)
  const ids = new Set<string>()
  const meanings = new Set<string>()
  const cards = new Set<string>()
  const catalogs = new Map(Object.values(courses).map((course) =>
    [course.language, new Map(course.unit.lessons.map((lesson) => [lesson.id, lesson]))]))
  for (const sense of senses) {
    const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase(sense.language)
    const meaningKey = JSON.stringify([sense.language, normalize(sense.lemma), normalize(sense.partOfSpeech), normalize(sense.meaning)])
    if (!sense.id.startsWith(sense.language + '.') || ids.has(sense.id) || meanings.has(meaningKey)) {
      throw new Error(`Tekrarlanan veya geçersiz kelime anlamı: ${sense.id}`)
    }
    ids.add(sense.id)
    meanings.add(meaningKey)
    if (!sense.links.some(({ band }) => band === sense.band)) {
      throw new Error(`Kelime hedef bandında ders bulunamadı: ${sense.id}`)
    }
    for (const { cardId, lessonId, objectiveId, band, assessmentRevision } of sense.links) {
      const lesson = catalogs.get(sense.language)?.get(lessonId)
      const card = lesson?.vocabulary.find(({ id }) => id === cardId)
      const learning = lesson?.pedagogy?.vocabulary.find((entry) => entry.cardId === cardId)
      if (cards.has(cardId) || lesson?.objective.id !== objectiveId || lesson.objective.level !== band || !card || !learning) {
        throw new Error(`Geçersiz veya çakışan kelime bağlantısı: ${sense.id} / ${cardId}`)
      }
      // Keep versions of scored cards available for history. A changed answer key needs a new card ID.
      if (assessmentRevision !== studyContentRevision([card.term, card.meaning, learning.recognize, learning.recall, learning.use])) {
        throw new Error(`Sürümlenmemiş kelime alıştırması değişikliği: ${sense.id} / ${cardId}`)
      }
      cards.add(cardId)
    }
  }
  return senses
}

type Entry = {
  lesson: Course['unit']['lessons'][number]
  card: Course['unit']['lessons'][number]['vocabulary'][number]
  learning: NonNullable<Course['unit']['lessons'][number]['pedagogy']>['vocabulary'][number] | undefined
  senseId: string
  sense?: VocabularySense
}
type CourseIndex = { authored: Map<string, VocabularySense>; cards?: Map<string, Entry> }
const indexes = new WeakMap<Course, CourseIndex>()

export function registerVocabularySenses(courses: Record<Course['language'], Course>, input: unknown) {
  const senses = validateVocabularySenses(input, courses)
  for (const course of Object.values(courses)) {
    const authored = new Map(senses.filter(({ language }) => language === course.language)
      .flatMap((sense) => sense.links.map(({ cardId }) => [cardId, sense] as const)))
    indexes.set(course, { authored })
  }
}

export function vocabularyIndex(course: Course): ReadonlyMap<string, Entry> {
  const index: CourseIndex = indexes.get(course) ?? { authored: new Map() }
  if (!index.cards) {
    const cards = new Map<string, Entry>()
    for (const lesson of course.unit.lessons) {
      const learning = new Map(lesson.pedagogy?.vocabulary.map((entry) => [entry.cardId, entry]))
      for (const card of lesson.vocabulary) {
        const sense = index.authored.get(card.id)
        // Preserve the existing card key in attempts, reviews and backups.
        cards.set(card.id, { lesson, card, learning: learning.get(card.id), senseId: sense?.id ?? `legacy:${card.id}`, sense })
      }
    }
    index.cards = cards
    indexes.set(course, index)
  }
  return index.cards
}
