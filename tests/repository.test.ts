import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { legacyCatalog } from '../src/content/catalog'
import type { Answer } from '../src/domain/model'
import { finishPlacement } from '../src/domain/progress'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IndexedLearningRepository, exportBackup, parseBackup } from '../src/persistence/repository'
import { initialState } from '../src/domain/state'

const name = 'language-os-test'
let repository: IndexedLearningRepository
const state = initialState({
  id: '2e145aef-9abf-42b4-98df-e4b3f94cca53', language: 'ru', estimate: 'A1', target: 'B1',
  minutes: 60, goals: ['general'], days: [1, 3, 5],
})

beforeEach(() => { repository = new IndexedLearningRepository(name) })
afterEach(() => repository.delete())

describe('IndexedDB and backup', () => {
  it('reopens data from another connection without an HTTP dependency', async () => {
    await repository.create(state)
    const secondConnection = new IndexedLearningRepository(name)
    try {
      expect(await secondConnection.read()).toEqual(state)
    } finally {
      secondConnection.close()
    }
  })
  it('round trips backups and rejects an unknown version or orphaned data', () => {
    expect(parseBackup(exportBackup(state))).toEqual(state)
    expect(() => parseBackup(exportBackup(state).replace('"schemaVersion": 2', '"schemaVersion": 99'))).toThrow()
    expect(() => parseBackup(exportBackup({ ...state, placementAt: new Date().toISOString() }))).toThrow(/tarama/)
  })
  it('serializes concurrent changes and rejects stale replacement', async () => {
    const current = await repository.create(state)
    await Promise.all([1, 1].map((delta) => repository.update(state.profile.id, (latest) =>
      ({ ...latest, profile: { ...latest.profile, minutes: latest.profile.minutes + delta } }))))
    expect((await repository.read())?.profile.minutes).toBe(62)
    await expect(repository.restore(state, current)).rejects.toThrow(/değişti/)
  })
  it('migrates an actual Dexie v1 row and an exported v1 backup without changing evidence', async () => {
    const course = legacyCatalog.ru
    const answers = Object.fromEntries(course.placement.map(({ exercise }) => [
      exercise.id, exercise.kind === 'open' ? exercise.sample : exercise.kind === 'fill' ? exercise.accepted[0] : exercise.accepted,
    ])) as Record<string, Answer>
    const placed = finishPlacement(state, course, answers, '2026-11-13T10:00:00.000Z')
    const old = { ...placed, reviewHistory: undefined, skippedListening: undefined }
    const legacy = new Dexie(name)
    legacy.version(1).stores({ workspace: 'key' })
    await legacy.table('workspace').put({ key: 'active', state: JSON.parse(JSON.stringify(old)) })
    legacy.close()
    const migrated = await repository.read()
    expect(migrated).toEqual(placed)
    expect(parseBackup(JSON.stringify({ schemaVersion: 1, state: old }))).toEqual(migrated)
    expect(parseBackup(exportBackup(migrated!))).toEqual(migrated)
    const tampered = JSON.parse(exportBackup(migrated!))
    tampered.state.attempts[0].evidence.outcome = 'incorrect'
    expect(() => parseBackup(JSON.stringify(tampered))).toThrow(/eşleşmiyor/)
  })
  it('rolls back a rejected update', async () => {
    await repository.create(state)
    await expect(repository.update(state.profile.id, (latest) =>
      ({ ...latest, profile: { ...latest.profile, minutes: -1 } }))).rejects.toThrow()
    expect(await repository.read()).toEqual(state)
  })
})
