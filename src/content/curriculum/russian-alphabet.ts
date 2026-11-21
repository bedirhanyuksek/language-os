import { lessonSchema, type Course } from '../schema'

export const russianAlphabetIds = [
  'ru.cyrillic', 'ru.cyrillic-false-friends', 'ru.cyrillic-new-shapes',
  'ru.cyrillic-hushing', 'ru.cyrillic-vowels-signs',
] as const

// Keep legacy course snapshots valid; apply the new prerequisite chain at publication.
export function russianAlphabet(course: Course, content: unknown[]) {
  const lessons = content.map((lesson) => lessonSchema.parse(lesson))
  const alphabet = russianAlphabetIds.map((id) => {
    const lesson = lessons.find((lesson) => lesson.id === id)
    if (!lesson) throw new Error(`Alfabe dersi eksik: ${id}`)
    return lesson
  })
  const remaining = lessons.filter(({ id }) => !russianAlphabetIds.some((alphabetId) => alphabetId === id))
    .map((lesson) => lesson.id === 'ru.intro'
      ? { ...lesson, prerequisites: [alphabet.at(-1)!.objective.id] } : lesson)
  const placement = alphabet.flatMap((lesson) => lesson.concepts.flatMap((concept) => {
    const recognition = concept.variants.find(({ kind }) => kind === 'single')
    const production = concept.variants.find(({ kind }) => kind === 'fill' || kind === 'short')
    if (!recognition || !production) throw new Error(`Alfabe kısa kontrolü eksik: ${concept.id}`)
    return [recognition, production].map((exercise, index) => ({
      exercise: { ...exercise, id: `${concept.id}.placement.${index + 1}` },
      objectiveId: lesson.objective.id, diagnosticConceptId: concept.id, difficulty: lesson.objective.level,
    }))
  }))
  return { lessons: [...alphabet, ...remaining], placement: [...course.placement, ...placement] }
}
