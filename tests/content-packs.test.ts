import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { catalog } from '../src/content/catalog'
import { additionsFor, loadPacks, packedLessons } from '../src/content/curriculum/packs'
import { outcomesFor } from '../src/content/curriculum/inventory'
import { audioMaterials } from '../scripts/curriculum-audio-inventory'
import { planCurriculumTts } from '../scripts/curriculum-tts.mjs'
import pronunciation from '../scripts/curriculum-tts-pronunciation.json'
import { vocabularyIndex } from '../src/content/vocabulary'
import { modelAudio } from '../src/content/teaching'
import { assess } from '../src/domain/assessment'
import { pedagogyExercises } from '../src/content/schema'
import russianFirstWave from '../src/content/packs/ru-mvp2b-first-wave.json'

const normalized = (text: string) => text.normalize('NFC').toLowerCase().trim().replace(/’/g, "'")
  .replace(/[.!?]+$/, '').replace(/\s+/g, ' ')
const wordCount = (text: string) => text.trim().split(/\s+/).length

test('strict pack shape and duplicate bindings fail with source diagnostics', () => {
  const { language, entry } = packedLessons[0]
  const pack = { format: 1, language, lessons: [entry] }
  expect(() => loadPacks({ 'bad.json': { ...pack, unsupported: true } })).toThrow('bad.json')
  expect(() => loadPacks({ 'a.json': pack, 'b.json': pack })).toThrow(/mükerrer/)
})

test('resolves packs published out of order and rejects missing or cyclic prerequisites', () => {
  const { language, entry } = packedLessons[0]
  const root = { ...entry, id: language + '.pack-root', prerequisite: [language + '.legacy'] }
  const child = { ...entry, id: language + '.pack-child', outcome: 'B1.pack-child', level: 'B1', prerequisite: [root.id] }
  const compile = (lessons: unknown[]) => loadPacks({ 'example.json': { format: 1, language, lessons } })
  expect(additionsFor(language, root.prerequisite, compile([child, root])).map(({ id }) => id))
    .toEqual([root.id, child.id])
  expect(() => additionsFor(language, [], compile([child, root]))).toThrow(/pack-root.*legacy/)
  expect(() => additionsFor(language, [], compile([child, { ...root, prerequisite: [child.id] }]))).toThrow(/pack-child.*pack-root/)
})

test('every packed lesson has an inventory binding, stage evidence, source anchors, and playable audio', () => {
  const prompts = new Set<string>()
  const sources = new Set<string>()
  const termSites = new Map<string, string[]>()
  const modelsSeen = new Set<string>()
  for (const { language, entry, lesson } of packedLessons) {
    const course = catalog[language]
    const p = lesson.pedagogy!
    const outcomes = outcomesFor(course).flatMap(({ outcomes }) => outcomes)
    const binding = outcomes.find(({ id }) => id === entry.outcome)
    expect(binding?.activeLesson?.id, entry.id).toBe(entry.id)
    const plannedParent = outcomes.find(({ id }) => id.split('.')[1] === binding?.prerequisite)?.activeLesson
    expect(lesson.prerequisites, entry.id).toContain(plannedParent?.objective.id)
    for (const predecessor of lesson.prerequisites) {
      const prior = course.unit.lessons.find(({ objective }) => objective.id === predecessor)!
      expect(['A1','A2','B1','B2','B2+','C1','C2'].indexOf(prior.objective.level))
        .toBeLessThanOrEqual(['A1','A2','B1','B2','B2+','C1','C2'].indexOf(lesson.objective.level))
    }
    const models = new Set(entry.models.map(({ phrase }) => normalized(phrase)))
    for (const source of [...models, entry.input.text, entry.input.transcript, entry.retry.text, entry.retry.transcript]) {
      const key = normalized(source)
      expect(sources.has(key), entry.id).toBe(false)
      sources.add(key)
    }
    for (const model of models) modelsSeen.add(model)
    const all = [...lesson.concepts.flatMap(({ variants }) => variants), ...pedagogyExercises(p).map(({ exercise }) => exercise)]
    for (const task of all) {
      if (task.kind !== 'fill' && task.kind !== 'short') continue
      expect(new Set(task.accepted.map(normalized)).size, task.id).toBe(task.accepted.length)
      expect(assess(task, '___', language).outcome, task.id).toBe('incorrect')
      for (const answer of task.accepted) {
        expect(assess(task, answer, language).outcome, task.id).toBe('correct')
        const completed = task.prompt.split(':').at(-1)!.replace(/\([^)]*\)/g, '').replace('___', answer)
        expect(models.has(normalized(completed)), task.id).toBe(false)
      }
    }
    for (const task of lesson.concepts.flatMap(({ variants }) => variants).concat(p.checks.flatMap(({ transfer, delayed }) => [...transfer, ...delayed]))) {
      const prompt = `${language}:${normalized(task.prompt)}`
      expect(prompts.has(prompt), task.id).toBe(false)
      prompts.add(prompt)
    }
    for (const [authored, compiled] of [[entry.input, p], [entry.retry, p.receptionRetry!]] as const) {
      for (const [question, task, source] of [
        [authored.reading, compiled.reading.question, authored.text],
        [authored.main, compiled.listening.main, authored.transcript],
        [authored.detail, compiled.listening.detail, authored.transcript],
      ] as const) {
        const [, key, a, b, , quote] = question
        expect(normalized(source), task.id).toContain(normalized(quote))
        expect(assess(task, key, language).outcome, task.id).toBe('correct')
        for (const distractor of [a, b]) expect(assess(task, distractor, language).outcome, task.id).toBe('incorrect')
      }
    }
    expect(normalized(entry.input.text), entry.id).not.toBe(normalized(entry.retry.text))
    expect(normalized(entry.input.transcript), entry.id).not.toBe(normalized(entry.retry.transcript))
    for (const { term } of entry.receptive) expect(normalized(entry.input.text), entry.id).toContain(normalized(term))
    expect(new Set(lesson.vocabulary.map(({ term }) => normalized(term))).size).toBe(lesson.vocabulary.length)
    for (const { term, example, use, recall } of [entry.word, ...entry.additionalWords]) {
      expect(normalized(recall[1]), entry.id).toBe(normalized(term))
      expect(normalized(use), entry.id).not.toBe(normalized(example))
      const key = `${language}:${normalized(term)}`
      termSites.set(key, [...(termSites.get(key) ?? []), entry.id])
    }
    expect(assess(lesson.production, entry.writing.sample, language).outcome).toBe('review_required')
    if (['B2','B2+','C1','C2'].includes(entry.level)) {
      expect(wordCount(entry.input.text), entry.id).toBeGreaterThanOrEqual(95)
      expect(wordCount(entry.input.transcript), entry.id).toBeGreaterThanOrEqual(65)
      expect(wordCount(entry.writing.sample), entry.id).toBeGreaterThanOrEqual(85)
    }
    const clips = [
      [p.listening.audio, entry.input.transcript],
      [p.receptionRetry!.listening.audio, entry.retry.transcript],
      ...p.vocabulary.map(({ audio }, index) => [audio, lesson.vocabulary[index].example] as const),
      ...entry.models.map(({ phrase }, index) => [modelAudio(lesson.id, index, language, lesson.teaching?.audioMode), phrase] as const),
    ] as const
    for (const [audio, phrase] of clips) {
      const device = Boolean(entry.audioMode)
      expect(audio?.kind, lesson.id).toBe(device ? 'synthesis' : 'recording')
      if (device && audio?.kind === 'synthesis') {
        expect(audio.locale.split('-')[0]).toBe(language)
      }
      if (audio?.kind === 'recording') {
        const options = ['-b', '1', '-v', { en: 'en-us', ru: 'ru', es: 'es' }[language], '-s', language === 'en' ? '153' : '140']
        const hash = createHash('sha256').update(JSON.stringify([options, phrase])).digest('hex')
        expect(readFileSync(`src/content${audio.src}`).includes(hash), audio.src).toBe(true)
      }
    }
  }
  if (process.env.npm_lifecycle_event === 'curriculum:report') {
    console.log(JSON.stringify({ packLessons: packedLessons.length,
      packedAssessedForms: prompts.size, packedSourcesAndModels: sources.size, distinctModels: modelsSeen.size,
      repeatedActiveTargets: [...termSites].filter(([, lessons]) => lessons.length > 1),
      packedGenres: packedLessons.map(({ entry }) => ({ id: entry.id, genres: entry.genres,
        words: [wordCount(entry.input.text), wordCount(entry.input.transcript), wordCount(entry.writing.sample)] })),
    }))
  }
})

test('Phase 5 adds explicit senses and complete TTS work without packaging unreviewed audio', () => {
  const materials = Object.values(catalog).flatMap(audioMaterials)
  const deviceAudioPacks = packedLessons.filter(({ entry }) => entry.audioMode)
  const second = loadPacks(import.meta.glob('../src/content/packs/*-phase-5-second.json', { eager: true, import: 'default' }))
  expect(second.every(({ entry }) => entry.audioMode === 'script-practice')).toBe(true)
  expect(Object.fromEntries(Object.keys(catalog).map((language) => [language,
    second.filter((item) => item.language === language).map(({ entry }) => entry.level)])))
    .toEqual({ en: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], ru: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], es: ['A2', 'B1', 'B1', 'B1'] })
  const deferredRussianAudio = new Set(russianFirstWave.lessons.filter(({ audioMode }) => audioMode === 'script-practice').map(({ id }) => id))
  const existingAudioMaterials = materials.filter(({ lessonId }) => !deferredRussianAudio.has(lessonId))
  expect(planCurriculumTts(existingAudioMaterials, pronunciation).filter(({ language, blocked }) => language === 'ru' && blocked)
    .length).toBeLessThanOrEqual(438)
  for (const { language, lesson } of deviceAudioPacks) {
    const jobs = planCurriculumTts(materials.filter(({ lessonId }) => lessonId === lesson.id), pronunciation)
    expect(jobs).toHaveLength(4 + lesson.vocabulary.length * 2)
    for (const job of jobs) {
      if (!deferredRussianAudio.has(lesson.id)) expect(job.blocked, job.id).toBeUndefined()
      expect(job.bundledFile, job.id).toBeUndefined()
      expect(existsSync(`src/content/audio/${job.id}.mp3`), job.id).toBe(false)
      if (language === 'ru' && !deferredRussianAudio.has(lesson.id)) {
        expect(pronunciation).toHaveProperty([job.id])
        expect(job.segments?.some(({ input }) => input?.includes('+')), job.id).toBe(true)
      }
    }
    for (const card of lesson.vocabulary) {
      const word = vocabularyIndex(catalog[language]).get(card.id)
      expect(word?.sense?.links[0]).toMatchObject({ cardId: card.id, objectiveId: lesson.objective.id, band: lesson.objective.level })
      expect(jobs.filter(({ senseId }) => senseId === word?.senseId)).toHaveLength(2)
    }
  }
})
