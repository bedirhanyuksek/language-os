import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { isLoopbackAddress, readLocalPilotAudioReviewAsset, rejectPublicPilotAudioAssets, validatePilotAudioAssets } from '../scripts/validate-pilot-audio'
import { catalog } from '../src/content/catalog'
import { parsePilotAudioManifest, pilotAudioManifest, pilotAudioReviewSamplesForLesson, pilotAudioSlots, pilotModelForLesson } from '../src/content/pilot-audio'
import { receptionExercises } from '../src/content/schema'

const pending = Object.fromEntries(Object.keys(pilotAudioSlots).map((mediaId) => [mediaId, { status: 'pending' }]))
const id = 'pilot.en.b1.audio.model'
const file = `${id}.v1.mp3`
const digest = createHash('sha256').update('checksum fixture').digest('hex')
// Content-free bytes exercise the checksum gate. No fixture enters the application manifest.
const bytes = Buffer.from('checksum fixture')
const humanRecording = {
  status: 'ready', sourceKind: 'human', version: 1, scenarioVersion: 1, recordingMethod: 'test fixture',
  src: `/audio/${file}`, source: 'https://example.test/fixture', license: 'test license',
  permissionRef: 'test permission', offlineRedistribution: true, attribution: 'test credit',
  reviewRef: 'test review', sha256: digest, durationMs: 1000,
  transcriptVersion: 1, speakers: { 'A1-updater': 'test-speaker' },
  transcript: [{ role: 'A1-updater', startMs: 0, endMs: 1000, text: 'fixture' }],
}

function syntheticRecording(mediaId: keyof typeof pilotAudioSlots, options: {
  status?: 'pending' | 'ready';
  voices?: Record<string, string>;
  distribution?: { commercial: boolean; offline: boolean; publicRepository: boolean; permissionRef?: string };
  quality?: { status: 'awaiting_human_review' } | { status: 'user_accepted'; reviewer: 'user'; reviewRef: string } |
    { status: 'approved'; reviewer: 'user' | 'expert'; reviewRef: string };
  model?: { id: string; version: string; weightsSha256: string };
} = {}) {
  const slot = pilotAudioSlots[mediaId]
  const voices = options.voices ?? Object.fromEntries(slot.roles.map((role) => [
    role,
    slot.language === 'en'
      ? (role === 'A1-updater' || role === 'B2-colleague' ? 'af_heart' : 'am_michael')
      : (role === 'A1-registrar' || role === 'B2-guest' ? 'ru_aigul' : 'ru_alexandr'),
  ]))
  const status = options.status ?? 'ready'
  const common = {
    status,
    sourceKind: 'synthetic_tts',
    version: 1,
    scenarioVersion: 1,
    src: `/audio/${mediaId}.v1.mp3`,
    source: 'https://models.example.test/model-card',
    license: 'test model license',
    attribution: 'test model attribution',
    sha256: digest,
    durationMs: Math.max(1000, slot.roles.length * 1100),
    transcriptVersion: 1,
    speakers: voices,
    transcript: slot.roles.map((role, index) => ({
      role, startMs: index * 1100, endMs: index * 1100 + 1000, text: 'fixture',
    })),
    model: options.model ?? {
      id: slot.language === 'en' ? 'kokoro-82m-onnx' : 'silero-v5-cis-base',
      version: 'test-version',
      weightsSha256: digest,
    },
  }
  return status === 'pending'
    ? { ...common, distribution: options.distribution ?? { commercial: false, offline: false, publicRepository: false },
        quality: options.quality ?? { status: 'awaiting_human_review' as const } }
    : { ...common, distribution: options.distribution ?? {
        commercial: true, offline: true, publicRepository: true, permissionRef: 'test rights review',
      }, quality: options.quality ?? { status: 'approved' as const, reviewer: 'expert' as const, reviewRef: 'test expert review' } }
}

test('binds all nine media slots to the intended lessons and existing reference questions', () => {
  expect(Object.keys(pilotAudioSlots)).toHaveLength(9)
  const taskIds = new Set<string>()
  for (const [id, slot] of Object.entries(pilotAudioSlots)) {
    const lesson = catalog[slot.language].unit.lessons.find(({ id }) => id === slot.lessonId)
    expect(lesson?.objective.level, id).toBe(slot.level)
    if ('parallelId' in slot) expect(pilotAudioSlots[slot.parallelId]).toMatchObject({
      parallelId: id, language: slot.language, purpose: slot.purpose,
    })
    const exerciseIds = lesson?.pedagogy ? receptionExercises(lesson.pedagogy).map(({ id }) => id) : []
    for (const reference of slot.referenceExerciseIds) expect(exerciseIds, id).toContain(reference)
    for (const task of slot.taskIds) {
      expect(taskIds.has(task), id).toBe(false)
      taskIds.add(task)
    }
  }
  for (const [id, slot] of Object.entries(pilotAudioSlots)) {
    if (slot.purpose !== 'model') continue
    const record = pilotAudioManifest[id as keyof typeof pilotAudioSlots]
    const model = pilotModelForLesson(slot.lessonId)
    if (record.status === 'pending') expect(model).toBeUndefined()
    else expect(model?.audio).toMatchObject({ src: record.src, synthetic: record.sourceKind === 'synthetic_tts' })
  }
})

test('requires provenance, explicit redistribution rights, a versioned local path and a matching timed transcript', () => {
  const parse = (override: object) => parsePilotAudioManifest({ ...pending, [id]: { ...humanRecording, ...override } })
  const approved = parse({})
  expect(pilotModelForLesson('en.experience', approved)).toMatchObject({
    audio: { kind: 'recording', src: humanRecording.src, synthetic: false },
    attribution: humanRecording.attribution, transcript: 'fixture',
  })
  expect(pilotModelForLesson('en.update', approved)).toBeUndefined()
  for (const override of [
    { sourceKind: 'tts' }, { permissionRef: '' }, { offlineRedistribution: false }, { reviewRef: '' },
    { src: '/audio/en.experience.mp3' }, { speakers: { other: 'test-speaker' } },
    { transcript: [{ ...humanRecording.transcript[0], endMs: 1001 }] },
    { transcript: [{ ...humanRecording.transcript[0], role: 'other' }] },
  ]) expect(() => parse(override)).toThrow()
  expect(() => parsePilotAudioManifest({ ...pending, [id]: undefined })).toThrow()
})

test('accepts synthetic Kokoro and Silero model metadata without treating pending audio as approved', () => {
  const englishId = 'pilot.en.b1.audio.model'
  const russianId = 'pilot.ru.a1.audio.model'
  const english = syntheticRecording(englishId)
  const russian = syntheticRecording(russianId)
  const parsed = parsePilotAudioManifest({ ...pending, [englishId]: english, [russianId]: russian })

  expect(pilotModelForLesson('en.experience', parsed)).toMatchObject({
    audio: { kind: 'recording', src: english.src, synthetic: true, locale: 'en-US' },
    attribution: english.attribution,
  })
  expect(pilotModelForLesson('ru.intro', parsed)).toMatchObject({
    audio: { kind: 'recording', src: russian.src, synthetic: true, locale: 'ru-RU' },
    attribution: russian.attribution,
  })

  const selectedVoices = Object.fromEntries(Object.keys(pilotAudioSlots).map((mediaId) => [
    mediaId,
    syntheticRecording(mediaId as keyof typeof pilotAudioSlots),
  ]))
  const selectedManifest = parsePilotAudioManifest(selectedVoices)
  expect(Object.values(selectedManifest).filter((record) => record.status === 'ready')).toHaveLength(9)
  for (const [mediaId, slot] of Object.entries(pilotAudioSlots)) {
    const record = selectedManifest[mediaId as keyof typeof pilotAudioSlots]
    expect(record).toMatchObject({
      sourceKind: 'synthetic_tts',
      model: { id: slot.language === 'en' ? 'kokoro-82m-onnx' : 'silero-v5-cis-base' },
    })
  }
  const dialogueId = 'pilot.en.b1.audio.dialogue.a'
  const overlapping = syntheticRecording(dialogueId)
  overlapping.transcript[1] = { ...overlapping.transcript[1], startMs: 900, endMs: 1900 }
  expect(() => parsePilotAudioManifest({ ...selectedVoices, [dialogueId]: overlapping })).toThrow(/Geçersiz pilot ses/)

  const pendingTts = syntheticRecording(englishId, {
    status: 'pending',
    distribution: { commercial: false, offline: false, publicRepository: false },
    quality: { status: 'awaiting_human_review' },
  })
  const pendingManifest = parsePilotAudioManifest({ ...pending, [englishId]: pendingTts })
  expect(pilotModelForLesson('en.experience', pendingManifest)).toBeUndefined()

  expect(Object.values(pilotAudioManifest).filter((record) => record.status === 'pending')).toHaveLength(9)
  expect(Object.values(pilotAudioManifest).filter((record) => record.status === 'ready')).toHaveLength(0)
  for (const record of Object.values(pilotAudioManifest)) {
    expect(record).toMatchObject({
      status: 'pending', quality: { status: 'user_accepted', reviewer: 'user' },
      distribution: { commercial: false, offline: false, publicRepository: false },
    })
  }
  expect(pilotModelForLesson('en.experience')).toBeUndefined()
  const userApprovalCannotReplaceRightsAndExpertReview = syntheticRecording(englishId, {
    status: 'pending',
    distribution: { commercial: true, offline: true, publicRepository: true, permissionRef: 'unresolved-output-rights' },
    quality: { status: 'user_accepted', reviewer: 'user', reviewRef: 'user listening approval' },
  })
  expect(parsePilotAudioManifest({ ...pending, [englishId]: userApprovalCannotReplaceRightsAndExpertReview })[englishId])
    .toMatchObject({ status: 'pending', quality: { status: 'user_accepted', reviewer: 'user' } })

  const rightsReviewedButUnapproved = syntheticRecording(englishId, {
    status: 'pending',
    distribution: { commercial: true, offline: false, publicRepository: false, permissionRef: 'commercial review' },
    quality: { status: 'awaiting_human_review' },
  })
  expect(parsePilotAudioManifest({ ...pending, [englishId]: rightsReviewedButUnapproved })[englishId])
    .toMatchObject({ status: 'pending', distribution: { commercial: true, permissionRef: 'commercial review' } })
})

test('pins the chosen voice IDs and blocks synthetic TTS readiness without rights, QA and model provenance', () => {
  const parse = (override: object) => parsePilotAudioManifest({
    ...pending, [id]: { ...syntheticRecording(id), ...override },
  })

  expect(parse({})[id]).toMatchObject({
    model: { id: 'kokoro-82m-onnx', version: expect.any(String), weightsSha256: digest },
    speakers: { 'A1-updater': 'af_heart' },
    distribution: { commercial: true, offline: true, publicRepository: true, permissionRef: expect.any(String) },
    quality: { status: 'approved', reviewer: 'expert', reviewRef: expect.any(String) },
  })
  expect(() => parse({ sourceKind: 'human' })).toThrow()
  expect(() => parse({ model: { id: 'kokoro-82m-onnx', version: '', weightsSha256: digest } })).toThrow()
  expect(() => parse({ model: { id: 'kokoro-82m-onnx', version: 'test', weightsSha256: 'invalid' } })).toThrow()
  expect(() => parse({ distribution: { commercial: false, offline: true, publicRepository: true, permissionRef: 'review' } })).toThrow()
  expect(() => parse({ distribution: { commercial: true, offline: true, publicRepository: true } })).toThrow()
  expect(() => parse({ quality: { status: 'approved', reviewRef: 'not enough without an expert reviewer' } })).toThrow()
  expect(() => parse({ quality: { status: 'user_accepted', reviewer: 'user', reviewRef: 'user review' } })).toThrow()
  expect(() => parse({ speakers: { 'A1-updater': 'ru_aigul' } })).toThrow()

  const russian = syntheticRecording('pilot.ru.a1.audio.model')
  expect(russian).toMatchObject({
    sourceKind: 'synthetic_tts', model: { id: 'silero-v5-cis-base' }, speakers: { 'A1-registrar': 'ru_aigul' },
  })

  const modelUserApproved = syntheticRecording(id, {
    quality: { status: 'approved', reviewer: 'user', reviewRef: 'user guide sample acceptance' },
  })
  expect(parsePilotAudioManifest({ ...pending, [id]: modelUserApproved })[id]).toMatchObject({
    status: 'ready', quality: { status: 'approved', reviewer: 'user' },
  })
  const listeningUserApproved = syntheticRecording('pilot.en.b1.audio.dialogue.a', {
    quality: { status: 'approved', reviewer: 'user', reviewRef: 'user guide sample acceptance' },
  })
  expect(() => parsePilotAudioManifest({ ...pending, 'pilot.en.b1.audio.dialogue.a': listeningUserApproved }))
    .toThrow(/uzman görev incelemesi/)
})

test('offers user-accepted candidates only as isolated, unscored local review samples', () => {
  expect(pilotAudioReviewSamplesForLesson('en.update')).toHaveLength(3)
  expect(pilotAudioReviewSamplesForLesson('en.experience')).toHaveLength(1)
  expect(pilotAudioReviewSamplesForLesson('ru.cyrillic')).toHaveLength(2)
  expect(pilotAudioReviewSamplesForLesson('ru.intro')).toHaveLength(3)
  expect(pilotAudioReviewSamplesForLesson('unrelated.lesson')).toEqual([])
  for (const sample of Object.values(pilotAudioSlots).flatMap(({ lessonId }) =>
    pilotAudioReviewSamplesForLesson(lessonId))) {
    expect(sample.audio).toMatchObject({ kind: 'recording', synthetic: true })
    expect(sample.transcript).toContain(': ')
  }
})

test('serves local-review MP3 bytes only for user-accepted candidates with a matching SHA-256', () => {
  const directory = mkdtempSync(join(tmpdir(), 'language-os-local-pilot-review-'))
  const sample = syntheticRecording(id, {
    status: 'pending',
    distribution: { commercial: false, offline: false, publicRepository: false },
    quality: { status: 'user_accepted', reviewer: 'user', reviewRef: 'local review fixture' },
  })
  const manifest = parsePilotAudioManifest({ ...pending, [id]: { ...sample, sha256: digest } })
  try {
    expect(readLocalPilotAudioReviewAsset(file, directory, manifest)).toBeUndefined()
    writeFileSync(join(directory, file), bytes)
    expect(readLocalPilotAudioReviewAsset(file, directory, manifest)).toEqual(bytes)
    expect(readLocalPilotAudioReviewAsset('../outside.mp3', directory, manifest)).toBeUndefined()
    const notUserAccepted = parsePilotAudioManifest({ ...pending, [id]: {
      ...sample, sha256: digest, quality: { status: 'awaiting_human_review' },
    } })
    expect(readLocalPilotAudioReviewAsset(file, directory, notUserAccepted)).toBeUndefined()
    writeFileSync(join(directory, file), 'damaged')
    expect(readLocalPilotAudioReviewAsset(file, directory, manifest)).toBeUndefined()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('limits the local preview server to loopback clients', () => {
  expect(isLoopbackAddress('127.0.0.1')).toBe(true)
  expect(isLoopbackAddress('::1')).toBe(true)
  expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true)
  expect(isLoopbackAddress('192.168.1.20')).toBe(false)
  expect(isLoopbackAddress('::ffff:192.168.1.20')).toBe(false)
})

test('verifies local bytes and excludes pending or unidentified pilot files from the bundle', () => {
  const directory = mkdtempSync(join(tmpdir(), 'language-os-pilot-'))
  const manifest = parsePilotAudioManifest({ ...pending, [id]: humanRecording })
  try {
    expect(validatePilotAudioAssets(directory, parsePilotAudioManifest(pending))).toEqual([])
    expect(() => validatePilotAudioAssets(directory, manifest)).toThrow(/okunamadı/)
    writeFileSync(join(directory, file), bytes)
    expect(() => validatePilotAudioAssets(directory, parsePilotAudioManifest(pending))).toThrow(/Onaysız/)
    expect(validatePilotAudioAssets(directory, manifest)).toEqual([file])
    writeFileSync(join(directory, file), 'damaged')
    expect(() => validatePilotAudioAssets(directory, manifest)).toThrow(/SHA-256/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('does not bundle a generated TTS file while its distribution and review are pending', () => {
  const directory = mkdtempSync(join(tmpdir(), 'language-os-pilot-'))
  const pendingTts = syntheticRecording(id, {
    status: 'pending',
    distribution: { commercial: false, offline: false, publicRepository: false },
    quality: { status: 'awaiting_human_review' },
  })
  const manifest = parsePilotAudioManifest({ ...pending, [id]: pendingTts })
  try {
    writeFileSync(join(directory, file), bytes)
    expect(() => validatePilotAudioAssets(directory, manifest)).toThrow(/Onaysız/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('rejects pilot MP3 files anywhere under public, including ready manifest assets', () => {
  const publicDirectory = mkdtempSync(join(tmpdir(), 'language-os-public-'))
  const nestedDirectory = join(publicDirectory, 'audio', 'pilot')
  const readyTts = syntheticRecording(id)
  const manifest = parsePilotAudioManifest({ ...pending, [id]: readyTts })
  try {
    expect(() => rejectPublicPilotAudioAssets(publicDirectory)).not.toThrow()
    writeFileSync(join(publicDirectory, file), bytes)
    expect(() => rejectPublicPilotAudioAssets(publicDirectory)).toThrow(/public/i)
    rmSync(join(publicDirectory, file))
    mkdirSync(nestedDirectory, { recursive: true })
    writeFileSync(join(nestedDirectory, file), bytes)
    expect(() => rejectPublicPilotAudioAssets(publicDirectory)).toThrow(/public/i)
    // Approved source assets belong under src/content/audio and are validated by SHA-256 there.
    expect(manifest[id]).toMatchObject({ status: 'ready', sourceKind: 'synthetic_tts' })
  } finally {
    rmSync(publicDirectory, { recursive: true, force: true })
  }
})
