import { z } from 'zod'
import ttsCandidates from './pilot-audio-candidates.json' with { type: 'json' }
import type { ListeningActivity } from './pedagogy-schema'

export const pilotAudioManifestVersion = 2

// Pilot listening task IDs are reserved until the tasks are authored in Package 3.
export const pilotAudioSlots = {
  'pilot.en.b1.audio.control': {
    language: 'en', level: 'B1', lessonId: 'en.update', purpose: 'listening',
    taskIds: ['pilot.en.b1.listen.control'], referenceExerciseIds: ['en.update.listen.main', 'en.update.listen.detail'],
    roles: ['A1-updater'], brief: 'Work update covering current status and tomorrow’s retest.',
  },
  'pilot.en.b1.audio.dialogue.a': {
    language: 'en', level: 'B1', lessonId: 'en.update', purpose: 'listening',
    taskIds: ['pilot.en.b1.listen.a'], referenceExerciseIds: [],
    parallelId: 'pilot.en.b1.audio.dialogue.b',
    roles: ['A1-updater', 'A2-tester'], brief: 'Payment issue, tomorrow’s test, and the second speaker’s responsibility.',
  },
  'pilot.en.b1.audio.dialogue.b': {
    language: 'en', level: 'B1', lessonId: 'en.update', purpose: 'listening',
    taskIds: ['pilot.en.b1.listen.b'], referenceExerciseIds: [],
    parallelId: 'pilot.en.b1.audio.dialogue.a',
    roles: ['B1-sender', 'B2-colleague'], brief: 'New form, Friday delivery, and the first speaker’s responsibility.',
  },
  'pilot.en.b1.audio.model': {
    language: 'en', level: 'B1', lessonId: 'en.experience', purpose: 'model',
    taskIds: ['pilot.en.b1.speak.a', 'pilot.en.b1.speak.b'], referenceExerciseIds: [],
    roles: ['A1-updater'], brief: 'I’ve led a workshop. We sent it last Tuesday. Ask for feedback.',
  },
  'pilot.ru.a1.audio.control': {
    language: 'ru', level: 'A1', lessonId: 'ru.cyrillic', purpose: 'listening',
    taskIds: ['pilot.ru.a1.decode.a'], referenceExerciseIds: ['ru.cyrillic.listen.detail'],
    parallelId: 'pilot.ru.a1.audio.decode.b',
    roles: ['A1-registrar'], brief: 'Distinguish initial sounds in names such as Нина, Роман and Соня.',
  },
  'pilot.ru.a1.audio.decode.b': {
    language: 'ru', level: 'A1', lessonId: 'ru.cyrillic', purpose: 'listening',
    taskIds: ['pilot.ru.a1.decode.b'], referenceExerciseIds: [],
    parallelId: 'pilot.ru.a1.audio.control',
    roles: ['B1-registrar'], brief: 'Delayed decoding with a new voice and names such as Ника, Роза and Саша.',
  },
  'pilot.ru.a1.audio.dialogue.a': {
    language: 'ru', level: 'A1', lessonId: 'ru.intro', purpose: 'listening',
    taskIds: ['pilot.ru.a1.listen.a'], referenceExerciseIds: ['ru.intro.listen.main', 'ru.intro.listen.detail'],
    parallelId: 'pilot.ru.a1.audio.dialogue.b',
    roles: ['A1-registrar', 'A2-learner'], brief: 'Nina and Roman introduce themselves at a course desk and confirm Roman’s name.',
  },
  'pilot.ru.a1.audio.dialogue.b': {
    language: 'ru', level: 'A1', lessonId: 'ru.intro', purpose: 'listening',
    taskIds: ['pilot.ru.a1.listen.b'], referenceExerciseIds: ['ru.intro.retry.listen.main', 'ru.intro.retry.listen.detail'],
    parallelId: 'pilot.ru.a1.audio.dialogue.a',
    roles: ['B1-registrar', 'B2-guest'], brief: 'Sergei and Natalya introduce themselves at an event and confirm Sergei’s name.',
  },
  'pilot.ru.a1.audio.model': {
    language: 'ru', level: 'A1', lessonId: 'ru.intro', purpose: 'model',
    taskIds: ['pilot.ru.a1.speak.a', 'pilot.ru.a1.speak.b'], referenceExerciseIds: [],
    roles: ['A1-registrar'], brief: 'Здравствуйте. Меня зовут. Как вас зовут? Метро́.',
  },
} as const

type PilotMediaId = keyof typeof pilotAudioSlots
const text = z.string().trim().min(1)
const version = z.number().int().positive()
const ms = z.number().int().nonnegative()
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const recordingMetadata = {
  version,
  scenarioVersion: version,
  src: z.string(),
  source: z.url({ protocol: /^https$/ }),
  license: text,
  attribution: text,
  sha256,
  durationMs: ms.positive(),
  transcriptVersion: version,
  speakers: z.record(text, text),
  transcript: z.array(z.strictObject({ role: text, startMs: ms, endMs: ms, text })).min(1),
}
const syntheticMetadata = {
  ...recordingMetadata,
  sourceKind: z.literal('synthetic_tts'),
  model: z.strictObject({
    id: z.enum(['kokoro-82m-onnx', 'silero-v5-cis-base']),
    version: text,
    weightsSha256: sha256,
  }),
}
const distributionChecks = z.strictObject({
  commercial: z.boolean(), offline: z.boolean(), publicRepository: z.boolean(), permissionRef: text.optional(),
}).refine(({ commercial, offline, publicRepository, permissionRef }) =>
  !(commercial || offline || publicRepository) || Boolean(permissionRef))
const pendingQuality = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('awaiting_human_review') }),
  z.strictObject({ status: z.literal('user_accepted'), reviewer: z.literal('user'), reviewRef: text }),
])
const approvedQuality = z.strictObject({ status: z.literal('approved'), reviewer: z.enum(['user', 'expert']), reviewRef: text })
const pilotRecording = z.union([
  z.strictObject({ status: z.literal('pending') }),
  z.strictObject({
    ...recordingMetadata, status: z.literal('ready'), sourceKind: z.literal('human'),
    recordingMethod: text, permissionRef: text, offlineRedistribution: z.literal(true), reviewRef: text,
  }),
  z.strictObject({
    ...syntheticMetadata, status: z.literal('pending'),
    distribution: distributionChecks,
    quality: pendingQuality,
  }),
  z.strictObject({
    ...syntheticMetadata, status: z.literal('ready'),
    distribution: z.strictObject({
      commercial: z.literal(true), offline: z.literal(true), publicRepository: z.literal(true), permissionRef: text,
    }),
    quality: approvedQuality,
  }),
])

const ttsVoices = {
  en: { model: 'kokoro-82m-onnx', voices: ['af_heart', 'am_michael'] },
  ru: { model: 'silero-v5-cis-base', voices: ['ru_aigul', 'ru_alexandr'] },
}

type PilotRecording = z.infer<typeof pilotRecording>
export type PilotAudioManifest = Record<PilotMediaId, PilotRecording>
const mediaIds = Object.keys(pilotAudioSlots) as PilotMediaId[]

export function parsePilotAudioManifest(input: unknown): PilotAudioManifest {
  const manifest = z.record(z.enum(mediaIds), pilotRecording).parse(input)
  const speakersByRole = new Map<string, string>()
  const rolesBySpeaker = new Map<string, string>()
  for (const id of mediaIds) {
    const recording = manifest[id]
    if (!('sourceKind' in recording)) continue
    const slot = pilotAudioSlots[id]
    const synthetic = recording.sourceKind === 'synthetic_tts'
    const roles = new Set<string>(slot.roles)
    const spoken = new Set(recording.transcript.map(({ role }) => role))
    if (recording.status === 'ready' && synthetic && slot.purpose === 'listening' && recording.quality.reviewer !== 'expert') {
      throw new Error(`Puanlı TTS dinleme kaydı uzman görev incelemesi gerektiriyor: ${id}`)
    }
    if (recording.sourceKind === 'synthetic_tts') {
      const selected = ttsVoices[slot.language]
      const voices = Object.values(recording.speakers)
      if (recording.model.id !== selected.model || new Set(voices).size !== voices.length ||
          voices.some((voice) => !selected.voices.includes(voice))) {
        throw new Error(`Pilot TTS modeli veya sesleri uyuşmuyor: ${id}`)
      }
    }
    for (const [role, speaker] of Object.entries(recording.speakers)) {
      const roleKey = `${recording.sourceKind}:${slot.language}:${role}`
      const speakerKey = `${slot.language}:${speaker}`
      if (!roles.has(role) ||
          (speakersByRole.has(roleKey) && speakersByRole.get(roleKey) !== speaker) ||
          (!synthetic && rolesBySpeaker.has(speakerKey) && rolesBySpeaker.get(speakerKey) !== role)) {
        throw new Error(`Pilot ses konuşmacı rolleri uyuşmuyor: ${id}`)
      }
      speakersByRole.set(roleKey, speaker)
      if (!synthetic) rolesBySpeaker.set(speakerKey, role)
    }
    if (recording.src !== `/audio/${id}.v${recording.version}.mp3` ||
        roles.size !== Object.keys(recording.speakers).length || roles.size !== spoken.size || [...spoken].some((role) => !roles.has(role)) ||
        recording.transcript.some(({ startMs, endMs }, index) =>
          endMs <= startMs || endMs > recording.durationMs ||
          startMs < ((synthetic ? recording.transcript[index - 1]?.endMs : recording.transcript[index - 1]?.startMs) ?? 0))) {
      throw new Error(`Geçersiz pilot ses yolu, konuşmacı veya transkript aralığı: ${id}`)
    }
  }
  return manifest as PilotAudioManifest
}

export const pilotAudioManifest = parsePilotAudioManifest(ttsCandidates)

export function pilotModelForLesson(lessonId: string, manifest = pilotAudioManifest): {
  audio: ListeningActivity['audio']; transcript: string; attribution: string
} | undefined {
  const id = mediaIds.find((id) => pilotAudioSlots[id].lessonId === lessonId && pilotAudioSlots[id].purpose === 'model')
  if (!id) return
  const recording = manifest[id]
  if (recording.status !== 'ready') return
  return {
    audio: { kind: 'recording', src: recording.src, license: recording.license, source: recording.source,
      locale: pilotAudioSlots[id].language === 'en' ? 'en-US' : 'ru-RU', synthetic: recording.sourceKind === 'synthetic_tts' },
    transcript: recording.transcript.map(({ text }) => text).join(' '),
    attribution: recording.attribution,
  }
}

export function pilotAudioReviewSamplesForLesson(lessonId: string, manifest = pilotAudioManifest) {
  return mediaIds.flatMap((id) => {
    const slot = pilotAudioSlots[id]
    const recording = manifest[id]
    if (slot.lessonId !== lessonId || recording.status !== 'pending' ||
        !('quality' in recording) || recording.quality.status !== 'user_accepted') return []
    return [{
      id,
      purpose: slot.purpose,
      roles: slot.roles,
      speakers: recording.speakers,
      audio: {
        kind: 'recording' as const,
        src: recording.src,
        license: recording.license,
        source: recording.source,
        locale: slot.language === 'en' ? 'en-US' : 'ru-RU',
        synthetic: true,
      },
      transcript: recording.transcript.map(({ role, text }) => `${role}: ${text}`).join('\n'),
      attribution: recording.attribution,
      modelVersion: recording.model.version,
    }]
  })
}
