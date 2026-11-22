import { modelAudio } from '../src/content/teaching'
import { catalog } from '../src/content/catalog'
import type { Course } from '../src/content/schema'
import { vocabularyIndex } from '../src/content/vocabulary'
import { assessmentBank, routeLanguage } from '../src/content/assessment/bank'

export function audioMaterials(course: Course) {
  const materials = []
  for (const lesson of course.unit.lessons) {
    const base = { lessonId: lesson.id, language: course.language, band: lesson.objective.level }
    for (const [index, model] of (lesson.teaching?.models ?? []).entries()) {
      const id = `${lesson.id}.model.${index + 1}`
      const audio = modelAudio(lesson.id, index, course.language, lesson.teaching?.audioMode)
      materials.push({ ...base, kind: 'model', id, text: model.phrase,
        bundledFile: audio.kind === 'recording' ? audio.src.split('/').at(-1) : undefined })
    }
    for (const [name, activity] of [
      ['input', lesson.pedagogy?.listening],
      ['retry', lesson.pedagogy?.receptionRetry?.listening],
      ['diagnostic', lesson.pedagogy?.diagnostic?.listening],
    ] as const) {
      if (!activity) continue
      const id = `${lesson.id}.${name}`
      materials.push({ ...base, kind: 'listening', id, text: activity.transcript,
        bundledFile: activity.audio.kind === 'recording' ? activity.audio.src.split('/').at(-1) : undefined })
    }
    for (const card of lesson.vocabulary) {
      const item = vocabularyIndex(course).get(card.id)
      const senseId = item?.senseId
      const audio = item?.learning?.audio
      materials.push({ ...base, kind: 'word', id: `${card.id}.term`, text: card.term, senseId })
      materials.push({ ...base, kind: 'example', id: `${card.id}.example`, text: card.example, senseId,
        bundledFile: audio?.kind === 'recording' ? audio.src.split('/').at(-1) : undefined })
    }
  }
  return materials
}

export const materials = [
  ...Object.values(catalog).flatMap(audioMaterials),
  ...assessmentBank.flatMap(({ id, route, band, lesson, transcript }) => transcript
    ? [{ id, language: routeLanguage(route), lessonId: lesson, band, kind: 'listening', text: transcript, bundledFile: `${id}.mp3` }]
    : []),
]
