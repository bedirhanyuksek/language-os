import { z } from 'zod'
import { languageSchema } from '../domain/model.ts'

const text = z.string().trim().min(1)
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
export const audioPackClipPath = /^\/audio-packs\/[a-z0-9-]+-v[1-9][0-9]*\/[a-f0-9]{64}\.mp3$/
export const audioPackCachePrefix = 'language-os:media:'
export const audioPackMarker = '/audio-packs/.installed'

const clip = z.strictObject({
  src: z.string().regex(audioPackClipPath),
  bytes: z.number().int().positive(),
  sha256,
  kind: z.enum(['word', 'example', 'model', 'listening']),
  sourceKind: z.enum(['human', 'synthetic_tts']),
  source: z.url({ protocol: /^https$/ }),
  license: text,
  attribution: text,
  distribution: z.strictObject({
    offline: z.literal(true), commercial: z.literal(true), publicRepository: z.literal(true), permissionRef: text,
  }),
  quality: z.strictObject({ status: z.literal('approved'), reviewer: z.enum(['user', 'expert']), reviewRef: text }),
}).refine(({ kind, quality }) => kind !== 'listening' || quality.reviewer === 'expert')

const pack = z.strictObject({
  id: z.string().regex(/^(en|ru|es)-[a-z0-9-]+-v[1-9][0-9]*$/),
  language: languageSchema,
  label: text,
  clips: z.array(clip).min(1),
}).refine(({ id, language, clips }) => id.startsWith(language + '-') &&
  new Set(clips.map(({ src }) => src)).size === clips.length &&
  clips.every(({ src, sha256 }) => src === `/audio-packs/${id}/${sha256}.mp3`))

export const audioPackIndexSchema = z.strictObject({
  format: z.literal(1),
  packs: z.array(pack),
}).refine(({ packs }) => new Set(packs.map(({ id }) => id)).size === packs.length)

export type AudioPack = z.infer<typeof pack>
