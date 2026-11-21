import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import { russianAlphabetIds } from '../src/content/curriculum/russian-alphabet'
import { assess } from '../src/domain/assessment'
import { canAccelerate, phaseTasks } from '../src/domain/pedagogy'
import { dailyPlan, finishLesson, finishPedagogy, finishPlacement, isUnlocked, lessonTasks, masteryFor } from '../src/domain/progress'
import { initialState } from '../src/domain/state'
import { parseBackup, exportBackup } from '../src/persistence/repository'
import { sampleAnswers, teachWords } from './teaching-fixture'

const course = catalog.ru
const alphabet = course.unit.lessons.slice(0, 5)
const at = '2026-11-16T10:00:00.000Z'
const tomorrow = '2026-11-17T10:00:00.000Z'
const initial = () => initialState({
  id: '6044f6d6-13a2-454c-b088-ffb5436fcbe0', language: 'ru', estimate: 'A1', target: 'A1',
  minutes: 180, days: [0, 1, 2, 3, 4, 5, 6], goals: ['general'],
})

test('all 33 letters are taught in five ordered groups before introductions', () => {
  expect(alphabet.map(({ id }) => id)).toEqual(russianAlphabetIds)
  const groups = ['АКМОТЕ', 'ВНРСУХ', 'БГДЗИЙЛПФ', 'ЖЦЧШЩ', 'ЯЁЮЭЫЬЪ']
  expect(new Set(groups.join('')).size).toBe(33)
  for (const [index, lesson] of alphabet.entries()) {
    const explanation = lesson.teaching!.models.map(({ explanation }) => explanation).join(' ')
    for (const letter of groups[index]) expect(explanation, lesson.id).toContain(letter)
    expect(lesson.prerequisites).toEqual(index ? [alphabet[index - 1].objective.id] : [])
    expect(lesson.teaching!.approach).toBe('decoding')
    expect(lesson.pedagogy!.reading.text).not.toBe(lesson.pedagogy!.receptionRetry!.reading.text)
  }
  expect(course.unit.lessons[5].id).toBe('ru.intro')
  expect(course.unit.lessons[5].prerequisites).toEqual([alphabet[4].objective.id])
  expect(alphabet[4].explanation.join(' ')).toContain('Vurgu işareti ayrı bir harf değildir')
})

test('a reader uses paired placement evidence and short transfer checks throughout the unit', () => {
  let state = finishPlacement(initial(), course, sampleAnswers(course.placement), at)
  for (const [index, lesson] of alphabet.entries()) {
    expect(isUnlocked(state, course, lesson)).toBe(true)
    expect(canAccelerate(state, course, lesson)).toBe(true)
    expect(dailyPlan(state, course, at, 'Europe/Istanbul', false)).toMatchObject({ kind: 'pedagogy', lessonId: lesson.id, phase: 'vocabulary' })
    if (index < alphabet.length - 1) expect(isUnlocked(state, course, alphabet[index + 1])).toBe(false)
    state = teachWords(state, course, lesson, at)
    expect(phaseTasks(state, lesson, 'transfer', at)).toHaveLength(2)
    state = finishPedagogy(state, course, lesson, 'transfer', sampleAnswers(phaseTasks(state, lesson, 'transfer', at)), at)
    expect(masteryFor(state, lesson).status).toBe('ready')
    expect(lessonTasks(state, lesson).map(({ exercise }) => exercise.kind)).toEqual(['open'])
    state = finishLesson(state, course, lesson, sampleAnswers(lessonTasks(state, lesson)), at)
    for (const phase of ['reading', 'listening', 'revision'] as const) {
      state = finishPedagogy(state, course, lesson, phase, sampleAnswers(phaseTasks(state, lesson, phase, at)), at,
        phase === 'listening' ? 'played' : undefined)
    }
    state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
  }
  expect(state.attempts.filter(({ context, lessonId }) => context === 'lesson' && alphabet.some(({ id }) => id === lessonId))
    .every(({ evidence }) => evidence.observation === 'free_production')).toBe(true)
  expect(isUnlocked(state, course, course.unit.lessons[5])).toBe(true)
  for (const lesson of alphabet) {
    state = finishPedagogy(state, course, lesson, 'delayed', sampleAnswers(phaseTasks(state, lesson, 'delayed', tomorrow)), tomorrow)
    expect(masteryFor(state, lesson).status).toBe('retained')
  }
  expect(parseBackup(exportBackup(state))).toEqual(state)
})

test('recognition alone cannot bypass teaching and an untaught unit cannot unlock introductions', () => {
  const production = course.placement.filter(({ diagnosticConceptId, exercise }) =>
    diagnosticConceptId?.startsWith('ru.cyrillic') && exercise.kind !== 'single')
  const state = finishPlacement(initial(), course, { ...sampleAnswers(course.placement),
    ...Object.fromEntries(production.map(({ exercise }) => [exercise.id, 'Bilmiyorum'])) }, at)
  for (const lesson of alphabet) expect(canAccelerate(state, course, lesson)).toBe(false)
  expect(dailyPlan(state, course, at, 'Europe/Istanbul')).toMatchObject({ kind: 'lesson', lessonId: 'ru.cyrillic' })
  expect(isUnlocked(state, course, course.unit.lessons[5])).toBe(false)
  expect(() => finishLesson(state, course, course.unit.lessons[5], {}, at)).toThrow(/ön koşul/)
})

test('alphabet answer keys, real vocabulary and recording text agree', () => {
  const clips = JSON.parse(execFileSync(process.execPath, ['scripts/curriculum-audio.mjs', '--list', 'ru-experience.json'], { encoding: 'utf8' })) as
    { file: string; text: string; options: string[] }[]
  expect(clips).toHaveLength(31)
  expect(new Set(clips.map(({ file }) => file)).size).toBe(31)
  for (const { file, text, options } of clips) {
    const hash = createHash('sha256').update(JSON.stringify([options, text])).digest('hex')
    const bytes = readFileSync(`src/content/audio/${file}`)
    expect(bytes.includes(hash), file).toBe(true)
    expect(bytes.length, file).toBeGreaterThan(3500)
  }
  for (const lesson of alphabet) {
    for (const { variants } of lesson.concepts) {
      for (const exercise of variants) {
        if (exercise.kind === 'single') {
          for (const option of exercise.options) expect(assess(exercise, option, 'ru').outcome).toBe(option === exercise.accepted ? 'correct' : 'incorrect')
        } else if (exercise.kind === 'fill') {
          expect(assess(exercise, exercise.accepted[0], 'ru').outcome).toBe('correct')
          expect(assess(exercise, 'Bilmiyorum', 'ru').outcome).toBe('incorrect')
        }
      }
    }
  }
})
