import { catalog } from '../src/content/catalog'
import { audioMaterials } from '../scripts/curriculum-audio-inventory'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { planCurriculumTts, runCurriculumTts } from '../scripts/curriculum-tts.mjs'

const roots: string[] = []
const outputDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'language-os-tts-pipeline-'))
  roots.push(directory)
  return directory
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const sampleMaterials = [
  { id: 'en.update.audio-sample', language: 'en', lessonId: 'en.update', kind: 'dialogue',
    text: 'The payment issue is fixed. We will retest it tomorrow.' },
  { id: 'ru.intro.audio-sample', language: 'ru', lessonId: 'ru.intro', kind: 'dialogue',
    text: '— Здравствуйте. Меня зовут Анна.\n— Здравствуйте. Меня зовут Павел. Как вас зовут?' },
  { id: 'ru.intro.stress-sample', language: 'ru', lessonId: 'ru.intro', kind: 'phrase',
    text: 'Метро́ далеко́? Я живу́ здесь.' },
]

const sampleOverrides = {
  'en.update.audio-sample': [
    { role: 'updater', voice: 'af_heart', text: 'The payment issue is fixed. We will retest it tomorrow.', input: 'The payment issue is fixed. We will retest it tomorrow.' },
  ],
  'ru.intro.audio-sample': [
    { role: 'registrar', voice: 'ru_aigul', text: 'Здравствуйте. Меня зовут Анна.', input: 'Здр+авствуйте. Мен+я зов+ут +Анна.' },
    { role: 'visitor', voice: 'ru_alexandr', text: 'Здравствуйте. Меня зовут Павел. Как вас зовут?', input: 'Здр+авствуйте. Мен+я зов+ут П+авел. Как вас зов+ут?' },
  ],
  'ru.intro.stress-sample': [
    { role: 'learner', voice: 'ru_aigul', text: 'Метро́ далеко́? Я живу́ здесь.', input: 'Метр+о далек+о? Я жив+у здесь.' },
  ],
}

function fakeAudio() {
  const synthesize = vi.fn((_job: unknown, wavPath: string) => writeFileSync(wavPath, Buffer.from('fake-wav-audio')))
  const encode = vi.fn((wavPath: string, mp3Path: string) => copyFileSync(wavPath, mp3Path))
  const inspect = vi.fn(() => ({ decoded: true, durationSeconds: 2, silenceRatio: 0 }))
  return { synthesize, encode, inspect }
}

describe('curriculum TTS planning and incremental generation', () => {
  test('plans representative English and Russian catalog text and retains Russian stress input', () => {
    const jobs = planCurriculumTts(sampleMaterials, sampleOverrides)

    expect(jobs.map(({ id, language, lessonId }) => ({ id, language, lessonId }))).toEqual([
      { id: 'en.update.audio-sample', language: 'en', lessonId: 'en.update' },
      { id: 'ru.intro.audio-sample', language: 'ru', lessonId: 'ru.intro' },
      { id: 'ru.intro.stress-sample', language: 'ru', lessonId: 'ru.intro' },
    ])
    const stressJob = jobs.find(({ id }) => id === 'ru.intro.stress-sample')!
    expect(JSON.stringify(stressJob.segments)).toContain('Метро́ далеко́? Я живу́ здесь.')
    expect(stressJob.segments![0].input).toBe('Метр+о далек+о? Я жив+у здесь.')

    const dialogue = jobs.find(({ id }) => id === 'ru.intro.audio-sample')!
    expect(dialogue.segments).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'registrar', voice: 'ru_aigul', text: 'Здравствуйте. Меня зовут Анна.' }),
      expect.objectContaining({ role: 'visitor', voice: 'ru_alexandr', text: 'Здравствуйте. Меня зовут Павел. Как вас зовут?' }),
    ]))
    expect(dialogue.productionId).toBeTruthy()
    expect(planCurriculumTts(sampleMaterials, sampleOverrides).map(({ productionId }) => productionId))
      .toEqual(jobs.map(({ productionId }) => productionId))
  })

  test('blocks malformed speaker overrides instead of silently producing an unconfigured voice', () => {
    const jobs = planCurriculumTts([sampleMaterials[1]], {
      'ru.intro.audio-sample': [{ role: 'registrar', voice: '', text: 'Здравствуйте. Меня зовут Анна.', input: 'Здр+авствуйте. Мен+я зов+ут +Анна.' },
        { role: 'visitor', voice: 'ru_alexandr', text: 'Здравствуйте. Меня зовут Павел. Как вас зовут?', input: 'Здр+авствуйте. Мен+я зов+ут П+авел. Как вас зов+ут?' }],
    })

    expect(jobs).toHaveLength(1)
    expect(jobs[0].blocked).toBeTruthy()
  })

  test('generates once, then leaves unchanged content untouched on the next run', () => {
    const jobs = planCurriculumTts([sampleMaterials[0]], sampleOverrides)
    const directory = outputDirectory()
    const audio = fakeAudio()

    const first = runCurriculumTts(jobs, { outputDirectory: directory, ...audio })
    expect(first.items[0]).toMatchObject({ status: 'generated', artifact: { sha256: expect.any(String) } })
    const outputFile = join(directory, first.items[0].artifact!.file)
    const originalBytes = readFileSync(outputFile)
    expect(existsSync(outputFile)).toBe(true)

    const second = runCurriculumTts(jobs, { outputDirectory: directory, ...audio })
    expect(second.items[0]).toMatchObject({ status: 'unchanged', artifact: { file: first.items[0].artifact!.file } })
    expect(audio.synthesize).toHaveBeenCalledTimes(1)
    expect(readFileSync(outputFile)).toEqual(originalBytes)
  })

  test('regenerates only the changed job while preserving the other job as unchanged', () => {
    const directory = outputDirectory()
    const audio = fakeAudio()
    const initialJobs = planCurriculumTts(sampleMaterials.slice(0, 2), sampleOverrides)
    runCurriculumTts(initialJobs, { outputDirectory: directory, ...audio })
    audio.synthesize.mockClear()
    const changedMaterial = { ...sampleMaterials[0], text: 'The payment issue is fixed. We will retest the new build tomorrow.' }
    const nextJobs = planCurriculumTts([changedMaterial, sampleMaterials[1]], {
      ...sampleOverrides,
      'en.update.audio-sample': [{ role: 'updater', voice: 'af_heart', text: changedMaterial.text, input: changedMaterial.text }],
    })

    const result = runCurriculumTts(nextJobs, { outputDirectory: directory, ...audio })

    expect(result.items.map(({ status }) => status)).toEqual(['generated', 'unchanged'])
    expect(audio.synthesize).toHaveBeenCalledTimes(1)
  })

  test('re-synthesizes only changed material and repairs a corrupted cached MP3', () => {
    const directory = outputDirectory()
    const audio = fakeAudio()
    const initialJobs = planCurriculumTts(sampleMaterials.slice(0, 2), sampleOverrides)
    const initial = runCurriculumTts(initialJobs, { outputDirectory: directory, ...audio })
    expect(initial.items.map(({ status }) => status)).toEqual(['generated', 'generated'])
    const stableFile = initial.items[0].artifact!.file
    const corruptFile = join(directory, initial.items[1].artifact!.file)
    writeFileSync(corruptFile, 'corrupted-cache')
    audio.synthesize.mockClear()

    const changedMaterials = [
      { ...sampleMaterials[0], text: 'The payment issue is fixed. We will retest the new build tomorrow.' },
      sampleMaterials[1],
    ]
    const nextJobs = planCurriculumTts(changedMaterials, {
      ...sampleOverrides,
      'en.update.audio-sample': [{ role: 'updater', voice: 'af_heart', text: changedMaterials[0].text, input: changedMaterials[0].text }],
    })
    const next = runCurriculumTts(nextJobs, { outputDirectory: directory, ...audio })

    expect(next.items.map(({ status }) => status)).toEqual(['generated', 'generated'])
    expect(audio.synthesize).toHaveBeenCalledTimes(2)
    expect(next.items[0].artifact!.file).not.toBe(stableFile)
    expect(readFileSync(corruptFile, 'utf8')).not.toBe('corrupted-cache')
  })

  test('reports synthesis failure and preserves the previous successful artifact bytes', () => {
    const directory = outputDirectory()
    const audio = fakeAudio()
    const firstJob = planCurriculumTts([sampleMaterials[0]], sampleOverrides)
    const first = runCurriculumTts(firstJob, { outputDirectory: directory, ...audio })
    const previousFile = join(directory, first.items[0].artifact!.file)
    const previousBytes = readFileSync(previousFile)
    const updatedMaterial = { ...sampleMaterials[0], text: 'The payment issue is fixed. We will retest the new build tomorrow.' }
    const changedJob = planCurriculumTts([updatedMaterial], {
      ...sampleOverrides,
      'en.update.audio-sample': [{ role: 'updater', voice: 'af_heart', text: updatedMaterial.text, input: updatedMaterial.text }],
    })

    audio.synthesize.mockImplementation(() => { throw new Error('mock synthesis failure') })
    const failed = runCurriculumTts(changedJob, { outputDirectory: directory, ...audio })

    expect(failed.items[0]).toMatchObject({ status: 'failed' })
    expect(readFileSync(previousFile)).toEqual(previousBytes)
    expect(failed.items[0].error ?? failed.items[0].error).toBeTruthy()
  })
})

test('catalog discovery adds audio requirements for new lesson vocabulary without removing legacy media', () => {
  const course = catalog.en
  const original = course.unit.lessons.find(({ id }) => id === 'en.cafe')!
  const newLesson = { ...original, vocabulary: [...original.vocabulary, {
    ...original.vocabulary[0], id: 'en.cafe.word.fixture', term: 'a coaster', example: 'Please use a coaster.',
  }] }
  const exerciseCourse = { ...course, unit: { ...course.unit, lessons: [newLesson] } }
  const materials = audioMaterials(exerciseCourse)
  expect(materials).toContainEqual(expect.objectContaining({ id: 'en.cafe.input', bundledFile: 'en.cafe.input.mp3' }))
  expect(materials).toContainEqual(expect.objectContaining({ id: 'en.cafe.word.fixture.term', text: 'a coaster' }))
  expect(materials).toContainEqual(expect.objectContaining({ id: 'en.cafe.word.fixture.example', text: 'Please use a coaster.' }))
  const real = audioMaterials(catalog.ru)
  expect(real).toContainEqual(expect.objectContaining({ id: 'ru.intro.input', bundledFile: 'ru.intro.mp3' }))
})
