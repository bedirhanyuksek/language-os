import { test, expect } from 'vitest'
import { catalog } from '../src/content/catalog'
import { measureCurriculum, outcomesFor } from '../src/content/curriculum/inventory'
import { languageAudit } from '../src/content/curriculum/language-audit'
import { englishInteraction } from '../src/content/curriculum/interaction-en'
import { englishHealth } from '../src/content/curriculum/health-en'
import { russianNarrative } from '../src/content/curriculum/narrative-ru'
import { pedagogyExercises, receptionExercises } from '../src/content/schema'
import { englishLife } from '../src/content/curriculum/life-en'
import { russianCommunity } from '../src/content/curriculum/community-ru'
import { englishHome } from '../src/content/curriculum/home-en'
import { englishSocial } from '../src/content/curriculum/social-en'
import { russianHome } from '../src/content/curriculum/home-ru'
import { englishSeminar } from '../src/content/curriculum/seminar-en'
import { russianSeminar } from '../src/content/curriculum/seminar-ru'
import { assess } from '../src/domain/assessment'

const newLessons = [...englishHome, ...englishSocial, ...russianHome, ...englishSeminar, ...russianSeminar]
const batches = [...englishInteraction, ...englishHealth, ...russianNarrative, ...englishLife, ...russianCommunity, ...newLessons]
const normalize = (answer: string) => answer.normalize('NFC').toLowerCase().trim().replace(/’/g, "'")
  .replace(/[.?!]+$/, '').trim().replace(/\s+/g, ' ')

test.each(Object.values(catalog))('$language planning graph and playable catalog agree', (course) => {
  const groups = outcomesFor(course)
  const rows = groups.flatMap(({ outcomes }) => outcomes)
  expect(new Set(rows.map(({ id }) => id.split('.')[1])).size).toBe(rows.length)
  const known = new Set<string>()
  const live: string[] = []
  for (const { band, outcomes } of groups) {
    for (const { id, prerequisite, activeLesson, lesson } of outcomes) {
      if (prerequisite) expect(known.has(prerequisite), id).toBe(true)
      known.add(id.split('.')[1])
      if (!lesson) {
        expect(activeLesson).toBeUndefined()
        continue
      }
      expect(activeLesson?.id, id).toBe(lesson)
      expect(activeLesson?.objective.level.replace('+', ''), id).toBe(band)
      live.push(lesson)
    }
  }
  expect(live.sort()).toEqual(course.unit.lessons.map(({ id }) => id).sort())
  expect(groups.reduce((sum, group) => sum + group.baseline, 0)).toBe({ en: 48, ru: 44, es: 9 }[course.language])
  expect(rows).toHaveLength({ en: 77, ru: 70, es: 12 }[course.language])
  for (const { band, grammar, vocabulary } of languageAudit(course)) {
    expect(grammar.length).toBeGreaterThanOrEqual(course.language === 'es' ? (band === 'A1' ? 6 : band === 'A2' ? 3 : 0) : 5)
    expect(vocabulary.targetDomains.length).toBeGreaterThanOrEqual(course.language === 'es' && !['A1', 'A2'].includes(band) ? 0 : 5)
    for (const { taughtBy, encounteredIn } of grammar) {
      for (const id of [...taughtBy, ...encounteredIn]) expect(course.unit.lessons.some((item) => item.id === id), id).toBe(true)
      for (const id of taughtBy) expect(course.unit.lessons.find((item) => item.id === id)!.objective.level.replace('+', ''), id).toBe(band)
    }
  }
  if (process.env.npm_lifecycle_event === 'curriculum:report') {
    console.log(JSON.stringify({ language: course.language, levels: measureCurriculum(course), languageAudit: languageAudit(course) }, null, 2))
  }
})

test('checks new task keys, genuinely separate contexts, and the advanced source-length floor', () => {
  for (const item of batches) {
    const course = item.id.startsWith('en.') ? catalog.en : catalog.ru
    const lesson = course.unit.lessons.find(({ id }) => id === item.id)!
    const p = lesson.pedagogy!
    const all = [...lesson.concepts.flatMap(({ variants }) => variants), ...pedagogyExercises(p).map(({ exercise }) => exercise), ...receptionExercises(p)]
    for (const exercise of all) {
      if (exercise.kind !== 'fill' && exercise.kind !== 'short') continue
      const keys = exercise.accepted.map(normalize)
      expect(new Set(keys).size, exercise.id).toBe(keys.length)
      for (const key of exercise.accepted) {
        expect(assess(exercise, key, course.language).outcome, exercise.id).toBe('correct')
      }
      expect(assess(exercise, '___', course.language).outcome, exercise.id).toBe('incorrect')
    }
    for (const check of p.checks) {
      for (const exercise of [...check.transfer, ...check.delayed]) {
        if (exercise.kind !== 'fill' && exercise.kind !== 'short') continue
        for (const text of [lesson.production.prompt, ...lesson.teaching!.models.map(({ phrase }) => phrase)]) {
          if (exercise.kind === 'fill') {
            expect(exercise.accepted.some((key) => normalize(exercise.prompt.split(':').at(-1)!
              .replace(/___/, key).replace(/\([^)]*\)/g, '')) === normalize(text)), exercise.id).toBe(false)
          }
        }
      }
    }
  }
  const advanced = catalog.en.unit.lessons.find(({ id }) => id === 'en.evidence')!
  expect(advanced.pedagogy!.reading.text.split(/\s+/).length).toBeGreaterThanOrEqual(150)
  expect(advanced.pedagogy!.listening.transcript.split(/\s+/).length).toBeGreaterThanOrEqual(85)
  expect(advanced.production.sample.split(/\s+/).length).toBeGreaterThanOrEqual(85)
  for (const [course, id] of [[catalog.en, 'en.media'], [catalog.ru, 'ru.debate']] as const) {
    const lesson = course.unit.lessons.find((item) => item.id === id)!
    expect(lesson.pedagogy!.reading.text.split(/\s+/).length).toBeGreaterThanOrEqual(90)
    expect(lesson.pedagogy!.listening.transcript.split(/\s+/).length).toBeGreaterThanOrEqual(60)
    expect(lesson.pedagogy!.listening.audio).toMatchObject({ kind: 'recording', synthetic: true })
  }
  const inference = catalog.en.unit.lessons.find(({ id }) => id === 'en.uncertainty')!
  const possibility = inference.pedagogy!.checks[0].transfer[0]
  expect(assess(possibility, 'could have arrived', 'en').outcome).toBe('correct')
  expect(assess(possibility, 'could arrived', 'en').outcome).toBe('incorrect')
  const exclusion = inference.pedagogy!.checks[1].transfer[0]
  expect(assess(exclusion, "can't have used", 'en').outcome).toBe('correct')
  expect(assess(exclusion, 'may have used', 'en').outcome).toBe('incorrect')
  for (const course of Object.values(catalog).filter(({ unit }) => unit.lessons.some(({ objective }) => objective.level === 'C2'))) {
    const implication = course.unit.lessons.find(({ objective }) => objective.level === 'C2')!
    expect(implication.pedagogy!.reading.text.split(/\s+/).length).toBeGreaterThanOrEqual(105)
    expect(implication.pedagogy!.listening.transcript.split(/\s+/).length).toBeGreaterThanOrEqual(85)
  }
})

test('the new sequences distinguish repair guidance, production, and long source genres', () => {
  const hints = new Set<string>()
  for (const module of newLessons) {
    const course = module.id.startsWith('en.') ? catalog.en : catalog.ru
    const lesson = course.unit.lessons.find(({ id }) => id === module.id)!
    const p = lesson.pedagogy!
    const retry = p.receptionRetry!
    for (const hint of [retry.reading.coaching, retry.listening.mainCoaching, retry.listening.detailCoaching]) {
      expect(hints.has(hint), module.id).toBe(false)
      hints.add(hint)
    }
    expect(lesson.vocabulary).toHaveLength(2)
    expect(assess(lesson.production, module.writing.sample, course.language).outcome).toBe('review_required')
    if (module.level === 'C1' || module.level === 'C2') {
      const words = (source: string) => source.trim().split(/\s+/).length
      expect(words(p.reading.text), module.id).toBeGreaterThanOrEqual(105)
      expect(words(p.listening.transcript), module.id).toBeGreaterThanOrEqual(75)
      expect(words(module.writing.sample), module.id).toBeGreaterThanOrEqual(90)
      expect(p.listening.audio).toMatchObject({ kind: 'recording', synthetic: true })
      expect(lesson.concepts.some(({ variants }) => variants[0].skill === 'reading')).toBe(true)
    }
  }
})
