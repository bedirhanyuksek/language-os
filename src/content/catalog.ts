import en from './en.json' with { type: 'json' }
import ru from './ru.json' with { type: 'json' }
import enPedagogy from './en-pedagogy.json' with { type: 'json' }
import ruPedagogy from './ru-pedagogy.json' with { type: 'json' }
import enExperience from './en-experience.json' with { type: 'json' }
import ruExperience from './ru-experience.json' with { type: 'json' }
import { courseSchema, type Course } from './schema'
import type { Language } from '../domain/model'

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
}

function extend(language: Language, extension: typeof enExperience | typeof ruExperience) {
  const course = baselineCatalog[language]
  const lessons = course.unit.lessons.map((lesson) => {
    const patch = extension.patches.find(({ lessonId }) => lessonId === lesson.id)
    if (!patch) throw new Error(`Ders eki eksik: ${lesson.id}`)
    return { ...lesson, pedagogy: { ...lesson.pedagogy, receptionRetry: patch.receptionRetry, revision: patch.revision, diagnostic: (extension.diagnostics as Record<string, unknown>)[lesson.id] } }
  })
  return publishCourse({ ...course, unit: { ...course.unit, lessons: [...lessons, ...extension.lessons.map((lesson) => ({ ...lesson, pedagogy: { ...lesson.pedagogy,
    diagnostic: (extension.diagnostics as Record<string, unknown>)[lesson.id] } }))] } })
}

export const catalog: Record<Language, Course> = {
  en: extend('en', enExperience),
  ru: extend('ru', ruExperience),
}
