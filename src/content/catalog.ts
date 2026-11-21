import en from './en.json' with { type: 'json' }
import ru from './ru.json' with { type: 'json' }
import enPedagogy from './en-pedagogy.json' with { type: 'json' }
import ruPedagogy from './ru-pedagogy.json' with { type: 'json' }
import enExperience from './en-experience.json' with { type: 'json' }
import ruExperience from './ru-experience.json' with { type: 'json' }
import { courseSchema, type Course } from './schema'
import { englishBatch } from './curriculum/en'
import { russianBatch } from './curriculum/ru'
import { englishTravel } from './curriculum/travel-en'
import { russianMovement } from './curriculum/movement-ru'
import { englishAdvanced } from './curriculum/advanced-en'
import { russianAdvanced } from './curriculum/advanced-ru'
import { englishInteraction } from './curriculum/interaction-en'
import { englishHealth } from './curriculum/health-en'
import { russianNarrative } from './curriculum/narrative-ru'
import { englishLife } from './curriculum/life-en'
import { russianCommunity } from './curriculum/community-ru'
import { englishSocial } from './curriculum/social-en'
import { russianHome } from './curriculum/home-ru'
import { englishSeminar } from './curriculum/seminar-en'
import { russianSeminar } from './curriculum/seminar-ru'
import { englishHome } from './curriculum/home-en'
import { additionsFor, packedLessons } from './curriculum/packs'
import { author, continuity } from './continuity'
import { guidedAlternatives, teaching } from './teaching'
import type { Language } from '../domain/model'
import { spanishCourse, spanishLegacyCourse } from './curriculum/es'
import { registerVocabularySenses } from './vocabulary'
import vocabularyPilot from './vocabulary-pilot.json'

export function publishCourse(data: unknown): Course {
  const course = courseSchema.parse(data)
  if (!['reviewed', 'automated_checked'].includes(course.reviewStatus) ||
    course.unit.lessons.some(({ pedagogy }) => pedagogy && !['reviewed', 'automated_checked'].includes(pedagogy.quality))) {
    throw new Error('İçerik yayın incelemesini tamamlamalı.')
  }
  return course
}

export const legacyCatalog: Record<Language, Course> = {
  en: publishCourse(en),
  ru: publishCourse(ru),
  es: publishCourse(spanishLegacyCourse),
}

function revise(language: Language, overlay: typeof enPedagogy | typeof ruPedagogy) {
  const course = legacyCatalog[language]
  if (overlay.lessons.length !== course.unit.lessons.length ||
    course.unit.lessons.some(({ id }) => overlay.lessons.filter(({ lessonId }) => lessonId === id).length !== 1)) {
    throw new Error('Ders içerik ekleri derslerle bire bir eşleşmeli.')
  }
  return publishCourse({
    ...course, version: 2, reviewStatus: 'automated_checked',
    unit: { ...course.unit, lessons: course.unit.lessons.map((lesson) => ({
      ...lesson, pedagogy: overlay.lessons.find((item) => item.lessonId === lesson.id)?.pedagogy,
    })) },
    placement: [...course.placement.map((item) => language === 'en' && item.exercise.id === 'en.placement.1'
      ? { ...item, diagnosticConceptId: 'en.experience.detail' } : item), ...overlay.placement],
  })
}

export const baselineCatalog: Record<Language, Course> = {
  en: revise('en', enPedagogy),
  ru: revise('ru', ruPedagogy),
  es: publishCourse(spanishCourse),
}

const batch = { en: [...englishBatch, ...englishTravel, ...englishAdvanced, ...englishInteraction, ...englishHealth, ...englishLife, ...englishSocial, ...englishSeminar, ...englishHome], ru: [...russianBatch, ...russianMovement, ...russianAdvanced, ...russianNarrative, ...russianCommunity, ...russianHome, ...russianSeminar] }

function extend(language: 'en' | 'ru', extension: typeof enExperience | typeof ruExperience, packs: typeof packedLessons) {
  const course = baselineCatalog[language]
  const lessons = course.unit.lessons.map((lesson) => {
    const patch = extension.patches.find(({ lessonId }) => lessonId === lesson.id)
    if (!patch) throw new Error(`Ders eki eksik: ${lesson.id}`)
    return { ...lesson, pedagogy: { ...lesson.pedagogy, receptionRetry: patch.receptionRetry, revision: patch.revision, diagnostic: (extension.diagnostics as Record<string, unknown>)[lesson.id] } }
  })
  const added = extension.lessons.map((lesson) => ({ ...lesson, pedagogy: { ...lesson.pedagogy,
    diagnostic: (extension.diagnostics as Record<string, unknown>)[lesson.id] } }))
  const taught = [...lessons, ...added].map((lesson) => {
    const notes = teaching[lesson.id]
    if (!notes) throw new Error(`Ders öğretimi eksik: ${lesson.id}`)
    return { ...lesson, teaching: notes, concepts: lesson.concepts.map((concept) => {
      const alternative = guidedAlternatives[concept.id]
      return alternative ? { ...concept, variants: [...concept.variants, alternative] } : concept
    }) }
  })
  const existing = [...taught, ...continuity[language], ...batch[language].map((item) => author(language, item))]
  return publishCourse({ ...course, unit: { ...course.unit,
    lessons: [...existing, ...additionsFor(language, existing.map(({ id }) => id), packs)] } })
}

export function createCatalog(packs: typeof packedLessons): Record<Language, Course> {
  return { en: extend('en', enExperience, packs), ru: extend('ru', ruExperience, packs),
    es: publishCourse({ ...spanishCourse, unit: { ...spanishCourse.unit,
      lessons: [...spanishCourse.unit.lessons, ...additionsFor('es', spanishCourse.unit.lessons.map(({ id }) => id), packs)] } }) }
}

export const catalog = createCatalog(packedLessons)
registerVocabularySenses(catalog, vocabularyPilot)
