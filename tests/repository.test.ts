import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { IDBObjectStore } from 'fake-indexeddb'
import { catalog, legacyCatalog } from '../src/content/catalog'
import type { Answer } from '../src/domain/model'
import { finishPlacement } from '../src/domain/progress'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IndexedLearningRepository, exportBackup, parseBackup } from '../src/persistence/repository'
import reportV1 from './fixtures/speaking-valid.json'
import reportV2 from './fixtures/speaking-coach.json'
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
  it('switches and restores languages without sharing preferences or losing either history', async () => {
    const at = '2026-11-13T10:00:00.000Z'
    const placement = (language: 'en' | 'ru') => Object.fromEntries(catalog[language].placement.map(({ exercise }) =>
      [exercise.id, exercise.kind === 'open' ? exercise.sample :
        exercise.kind === 'fill' || exercise.kind === 'short' ? exercise.accepted[0] : exercise.accepted]))
    const russian = finishPlacement(state, catalog.ru, placement('ru'), at)
    await repository.create(russian)
    const en = initialState({ ...state.profile, id: 'a305fe5e-2213-45cd-b469-6c56330ef04f',
      language: 'en', target: 'C1', minutes: 15 })
    await expect(repository.switchLanguage(state.profile.id, 'en')).resolves.toBeUndefined()
    await expect(repository.switchLanguage(state.profile.id, 'en', en)).resolves.toEqual(en)
    await expect(repository.update(state.profile.id, (current) => current)).rejects.toThrow(/değişti/)
    const changed = await repository.update(en.profile.id, (current) => finishPlacement(
      { ...current, profile: { ...current.profile, minutes: 30 } }, catalog.en, placement('en'), at))
    await expect(repository.switchLanguage(en.profile.id, 'ru')).resolves.toEqual(russian)
    repository.close()
    await expect(repository.read()).resolves.toEqual(russian)
    await expect(repository.switchLanguage(state.profile.id, 'en')).resolves.toEqual(changed)
    const russianBackup = { ...russian, profile: { ...state.profile, minutes: 45 } }
    await expect(repository.restore(russianBackup, changed)).resolves.toEqual(russianBackup)
    await expect(repository.switchLanguage(state.profile.id, 'en')).resolves.toEqual(changed)
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

describe('storage diagnostics preserve existing records', () => {
  it('opens a v1 database that already contains a current record without replacing its history', async () => {
    const legacy = new Dexie(name)
    legacy.version(1).stores({ workspace: 'key' })
    const saved = { ...state, skippedListening: ['ru.intro'] }
    await legacy.table('workspace').put({ key: 'active', state: saved })
    legacy.close()
    expect(await repository.read()).toEqual(saved)
  })

  it('fills either missing v2 history independently and keeps the history already present', async () => {
    const old = new Dexie(name)
    old.version(1).stores({ workspace: 'key' })
    const course = legacyCatalog.ru
    const answers = Object.fromEntries(course.placement.map(({ exercise }) => [
      exercise.id, exercise.kind === 'open' ? exercise.sample : exercise.kind === 'fill' ? exercise.accepted[0] : exercise.accepted,
    ])) as Record<string, Answer>
    const placed = finishPlacement(state, course, answers, '2026-11-13T10:00:00.000Z')
    const { reviewHistory: missing, ...partial } = { ...placed, skippedListening: ['ru.intro'] }
    expect(missing).toEqual([])
    await old.table('workspace').put({ key: 'active', state: partial })
    old.close()
    const migrated = await repository.openWorkspace()
    expect(migrated.state).toEqual({ ...partial, reviewHistory: [] })
    expect(migrated.quarantine).toEqual([])
    expect(parseBackup(JSON.stringify({ schemaVersion: 1, state: partial }))).toEqual(migrated.state)
  })

  it('quarantines a bad row without blocking the valid active record or exposing its values', async () => {
    const old = new Dexie(name)
    old.version(1).stores({ workspace: 'key' })
    const original = { key: 'secondary', state: { ...state, attempts: [{
      contentVersion: 2, id: 'fixture', context: 'lesson', conceptId: 'fixture', exerciseId: 'fixture',
      answer: 'private learner sentence', at: '2026-11-13T10:00:00.000Z',
      evidence: { observation: 'recognition', skill: 'grammar', source: 'deterministic', outcome: 'incorrect', confidence: 99 },
    }] } }
    await old.table('workspace').bulkPut([original, { key: 'active', state }])
    old.close()
    const snapshot = await repository.openWorkspace()
    expect(snapshot.state).toEqual(state)
    expect(snapshot.quarantine).toMatchObject([{ active: false, sourceVersion: 1, targetVersion: 3, issues: [{
      path: 'state.attempts.0.evidence.confidence', recordType: 'Alıştırma denemesi', contentVersion: 2, code: 'invalid_value',
    }] }])
    expect(JSON.stringify(snapshot.quarantine)).not.toContain('private learner sentence')
    const inspection = new Dexie(name)
    try {
      await inspection.open()
      expect((await inspection.table('quarantine').toArray())[0].original).toEqual(original)
      expect(await inspection.table('workspace').get('secondary')).toBeUndefined()
    } finally {
      inspection.close()
    }
    repository.close()
    repository = new IndexedLearningRepository(name)
    expect((await repository.openWorkspace()).quarantine).toHaveLength(1)
  })

  it('preserves an invalid active v2 record separately and can open with no active profile', async () => {
    const old = new Dexie(name)
    old.version(2).stores({ workspace: 'key' })
    const original = { key: 'active', state: { ...state, placementAt: 1 } }
    await old.table('workspace').put(original)
    old.close()
    expect(await repository.openWorkspace()).toMatchObject({ state: undefined,
      quarantine: [{ active: true, sourceVersion: 2, issues: [{ path: 'state.placementAt', code: 'invalid_type' }] }],
    })
    await repository.create(state)
    const db = new Dexie(name)
    try {
      await db.open()
      expect((await db.table('quarantine').toArray())[0].original).toEqual(original)
      expect(await repository.read()).toEqual(state)
    } finally {
      db.close()
    }
  })

  it.each([reportV1, reportV2])('preserves speaking report v$schemaVersion and diagnoses a damaged field without exposing quotes', async (report) => {
    const old = new Dexie(name)
    old.version(2).stores({ workspace: 'key' })
    const assessment = { report, importedAt: '2026-11-13T10:00:00.000Z', attemptCountAtImport: 0, source: 'external_report' }
    const active = { ...state, speakingAssessments: [assessment] }
    const damaged = { ...assessment, report: { ...report, confidence: 99 } }
    await old.table('workspace').bulkPut([
      { key: 'active', state: active },
      { key: 'damaged', state: { ...state, speakingAssessments: [damaged] } },
    ])
    old.close()
    const snapshot = await repository.openWorkspace()
    expect(snapshot.state).toEqual(active)
    expect(snapshot.quarantine).toMatchObject([{ sourceVersion: 2, issues: [{
      recordType: 'Konuşma raporu', reportVersion: report.schemaVersion, path: 'state.speakingAssessments.0.report.confidence', code: 'invalid_value',
    }] }])
    expect(JSON.stringify(snapshot.quarantine)).not.toContain('last May')
  })

  it('rolls back all migration writes when the quarantine store cannot be written', async () => {
    const old = new Dexie(name)
    old.version(1).stores({ workspace: 'key' })
    const original = { key: 'broken', state: { ...state, profile: null } }
    const partial = { key: 'active', state: { ...state, skippedListening: undefined } }
    await old.table('workspace').bulkPut([original, partial])
    old.close()
    const add = IDBObjectStore.prototype.add
    const fault = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === 'quarantine') throw new DOMException('simulated storage failure', 'QuotaExceededError')
      return add.apply(this, args)
    })
    try {
      await expect(repository.openWorkspace()).rejects.toMatchObject({ operation: 'upgrade' })
    } finally {
      fault.mockRestore()
    }
    const inspection = new Dexie(name)
    try {
      await inspection.open()
      expect(inspection.backendDB().version).toBe(10)
      expect(await inspection.table('workspace').get('active')).toEqual(partial)
      expect(await inspection.table('workspace').get('broken')).toEqual(original)
      expect(inspection.tables.map(({ name }) => name)).toEqual(['workspace'])
    } finally {
      inspection.close()
    }
  })

  it('distinguishes an invalid record from a newer database', async () => {
    const db = new Dexie(name)
    db.version(3).stores({ workspace: 'key', quarantine: '++id' })
    try {
      await db.table('workspace').put({ key: 'active', state: { ...state, placementAt: 1 } })
      await expect(repository.read()).rejects.toMatchObject({ operation: 'validate', cause: { name: 'ZodError' } })
      expect(await db.table('workspace').get('active')).toMatchObject({ state: { placementAt: 1 } })
    } finally {
      db.close()
    }
    repository.close()
    const newer = new Dexie(name)
    newer.version(4).stores({ workspace: 'key', quarantine: '++id' })
    try {
      await newer.open()
      repository = new IndexedLearningRepository(name)
      await expect(repository.read()).rejects.toMatchObject({ operation: 'open', cause: { name: 'VersionError' } })
    } finally {
      newer.close()
    }
  })
})
