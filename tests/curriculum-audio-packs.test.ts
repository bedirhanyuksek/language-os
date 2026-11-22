import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { downloadAudioPack, installedAudioPacks, removeAudioPack } from '../src/domain/audio-pack-storage'
import { audioPackIndexSchema } from '../src/content/audio-packs'
import { validateCurriculumAudioPacks } from '../scripts/validate-curriculum-audio-packs'

const roots: string[] = []
const temporaryPublicDirectory = () => {
  const root = mkdtempSync(join(tmpdir(), 'language-os-audio-pack-'))
  roots.push(root)
  return join(root, 'public')
}

afterEach(() => {
  vi.unstubAllGlobals()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixtureClip(overrides: Record<string, unknown> = {}) {
  const bytes = Buffer.from('fixture audio bytes')
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  return {
    clip: {
      src: `/audio-packs/en-core-v1/${sha256}.mp3`, bytes: bytes.length, sha256,
      kind: 'example', sourceKind: 'synthetic_tts',
      source: 'https://example.test/model-and-weights', license: 'MIT', attribution: 'Fixture voice model',
      distribution: { offline: true, commercial: true, publicRepository: true, permissionRef: 'test-fixture-rights' },
      quality: { status: 'approved', reviewer: 'user', reviewRef: 'test-fixture-listening-review' },
      ...overrides,
    },
    bytes,
  }
}

function writeFixture(publicDirectory: string, pack: Record<string, unknown>, bytes?: Buffer) {
  const audioDirectory = join(publicDirectory, 'audio-packs')
  mkdirSync(audioDirectory, { recursive: true })
  writeFileSync(join(audioDirectory, 'index.json'), JSON.stringify({ format: 1, packs: [pack] }))
  if (bytes && Array.isArray(pack.clips)) {
    for (const clip of pack.clips as Array<{ src: string }>) {
      const path = join(audioDirectory, clip.src.slice('/audio-packs/'.length))
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, bytes)
    }
  }
}

function fixturePack(clip: Record<string, unknown>) {
  return { id: 'en-core-v1', language: 'en', label: 'English core', clips: [clip] }
}

describe('curriculum audio pack rights and integrity gates', () => {
  test('accepts approved metadata with verified bytes and a content-addressed same-origin URL', () => {
    const { clip, bytes } = fixtureClip()
    const index = audioPackIndexSchema.parse({ format: 1, packs: [fixturePack(clip)] })
    const publicDirectory = temporaryPublicDirectory()
    writeFixture(publicDirectory, fixturePack(clip), bytes)

    expect(() => validateCurriculumAudioPacks(publicDirectory)).not.toThrow()
    expect(index.packs[0].clips[0].src).toMatch(/^\/audio-packs\/en-core-v1\/[a-f0-9]{64}\.mp3$/)
    expect(index.packs[0].clips[0].src).not.toMatch(/^https?:/)
    expect(index.packs[0].clips[0].src).toContain(index.packs[0].clips[0].sha256)
  })

  test('rejects pending or ungranted distribution rights', () => {
    const { clip } = fixtureClip({ distribution: {
      offline: true, commercial: true, publicRepository: false, permissionRef: 'pending-review',
    } })
    expect(() => audioPackIndexSchema.parse({ format: 1, packs: [fixturePack(clip)] })).toThrow()
  })

  test('requires expert review for listening evidence', () => {
    const { clip } = fixtureClip({ kind: 'listening', quality: {
      status: 'approved', reviewer: 'user', reviewRef: 'self-reviewed-only',
    } })
    expect(() => audioPackIndexSchema.parse({ format: 1, packs: [fixturePack(clip)] })).toThrow()

    const expertClip = { ...clip, quality: { status: 'approved', reviewer: 'expert', reviewRef: 'expert-check' } }
    expect(() => audioPackIndexSchema.parse({ format: 1, packs: [fixturePack(expertClip)] })).not.toThrow()
  })

  test('rejects a source hash and path that do not match the actual file bytes', () => {
    const { clip, bytes } = fixtureClip()
    const publicDirectory = temporaryPublicDirectory()
    writeFixture(publicDirectory, fixturePack(clip), Buffer.from('different bytes'))

    expect(() => validateCurriculumAudioPacks(publicDirectory)).toThrow(/bütünlük denetiminden/)
    expect(bytes.length).toBe(clip.bytes)
  })

  test('rejects unlisted audio files from distribution', () => {
    const { clip, bytes } = fixtureClip()
    const publicDirectory = temporaryPublicDirectory()
    writeFixture(publicDirectory, fixturePack(clip), bytes)
    writeFileSync(join(publicDirectory, 'audio-packs', 'unapproved.mp3'), Buffer.from('unlisted'))

    expect(() => validateCurriculumAudioPacks(publicDirectory)).toThrow(/Dağıtım onayı olmayan/)
  })
})

test('publishes an offline pack only after every download verifies and removes only its own cache', async () => {
  const storage = new Map<string, Map<string, Response>>([['language-os-core-fixture', new Map()]])
  vi.stubGlobal('caches', {
    keys: async () => [...storage.keys()],
    open: async (name: string) => {
      if (!storage.has(name)) storage.set(name, new Map())
      const data = storage.get(name)!
      return {
        match: async (key: string) => data.get(key)?.clone(),
        put: async (key: string, response: Response) => { data.set(key, response) },
      }
    },
    delete: async (name: string) => storage.delete(name),
  })
  const { clip, bytes } = fixtureClip()
  const pack = audioPackIndexSchema.parse({ format: 1, packs: [fixturePack(clip)] }).packs[0]
  const fetchAudio = vi.fn().mockResolvedValueOnce(new Response('broken content'))
    .mockResolvedValueOnce(new Response(bytes.toString('utf8')))
  vi.stubGlobal('fetch', fetchAudio)

  await expect(downloadAudioPack(pack)).rejects.toThrow(/bütünlük/)
  expect([...storage.keys()]).toEqual(['language-os-core-fixture'])
  expect(await installedAudioPacks()).toEqual(new Set())

  await downloadAudioPack(pack)
  expect(await installedAudioPacks()).toEqual(new Set([pack.id]))
  await downloadAudioPack(pack)
  expect(fetchAudio).toHaveBeenCalledTimes(2)
  await removeAudioPack(pack.id)
  expect([...storage.keys()]).toEqual(['language-os-core-fixture'])
})
