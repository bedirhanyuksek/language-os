import Dexie, { type IndexableType, type Table } from 'dexie'
import { z } from 'zod'
import { catalog, legacyCatalog } from '../content/catalog'
import { pedagogyExercises, receptionExercises } from '../content/schema'
import { diagnosticTasks } from '../domain/diagnostic'
import { gradeVocabularyRecall } from '../domain/pedagogy'
import { assess } from '../domain/assessment'
import { evidenceSchema } from '../domain/model'
import { validateSpeakingReport, type SpeakingAssessmentRepository } from '../domain/speaking'
import { stateSchema, type LearningState } from '../domain/state'
import { StorageAccessError } from './storage-error'
import { checkWorkspaceMigration, migrationIssues, normalizeWorkspaceState, type MigrationIssue } from './migration'

type StoredState = { key: 'active'; state: LearningState }
type WorkspaceRow = { key: IndexableType; state: unknown }
export type QuarantineNotice = { id?: number; active: boolean; sourceVersion: 1 | 2; targetVersion: 3; issues: MigrationIssue[] }
type QuarantinedWorkspace = QuarantineNotice & { original: WorkspaceRow }

const backupSchema = z.discriminatedUnion('schemaVersion', [
  z.strictObject({ schemaVersion: z.literal(1), state: z.unknown() }),
  z.strictObject({ schemaVersion: z.literal(2), state: stateSchema }),
])

export interface LearningRepository extends SpeakingAssessmentRepository {
  read(): Promise<LearningState | undefined>
  create(state: LearningState): Promise<LearningState>
  update(profileId: string, change: (state: LearningState) => LearningState): Promise<LearningState>
  restore(state: LearningState, expected: LearningState | undefined): Promise<LearningState>
}

export const localLearningOrigin = 'http://127.0.0.1:4173'
const databaseName = 'language-os'
const schemaVersion = 3

class LearningDatabase extends Dexie {
  declare workspace: Table<StoredState, 'active'>
  declare quarantine: Table<QuarantinedWorkspace, number>

  constructor(name: string) {
    super(name)
    const upgradingFromV1 = new WeakSet<IDBTransaction>()
    this.version(1).stores({ workspace: 'key' })
    this.version(2).stores({ workspace: 'key' }).upgrade((transaction) => {
      // Defer v1 validation until quarantine is available in the same native transaction.
      upgradingFromV1.add(transaction.idbtrans)
    })
    this.version(schemaVersion).stores({ workspace: 'key', quarantine: '++id' }).upgrade(async (transaction) => {
      const sourceVersion = upgradingFromV1.has(transaction.idbtrans) ? 1 : 2
      const workspace = transaction.table<WorkspaceRow, IndexableType>('workspace')
      const quarantine = transaction.table<QuarantinedWorkspace, number>('quarantine')
      try {
        for (const row of await workspace.toArray()) {
          const result = checkWorkspaceMigration(row.state)
          if (result.ok) {
            if (result.needsWrite) await workspace.put({ ...row, state: result.state })
            continue
          }
          // The original row and its removal from active use commit together.
          await quarantine.add({
            original: row, active: row.key === 'active', sourceVersion, targetVersion: schemaVersion, issues: result.issues,
          })
          await workspace.delete(row.key)
        }
      } catch (cause) {
        // Rethrowing aborts the upgrade and every write performed by it.
        throw new StorageAccessError('upgrade', cause)
      }
    })
  }
}

export class IndexedLearningRepository implements LearningRepository {
  private readonly database: LearningDatabase

  constructor(name = databaseName) {
    this.database = new LearningDatabase(name)
  }

  private async openDatabase() {
    if (!this.database.isOpen()) {
      try { await this.database.open() } catch (cause) {
        if (cause instanceof StorageAccessError) throw cause
        throw new StorageAccessError('open', cause)
      }
    }
    // Dexie can open a newer native database without running a downgrade.
    if (this.database.backendDB().version > schemaVersion * 10) {
      this.database.close()
      throw new StorageAccessError('open', { name: 'VersionError' })
    }
  }

  async read() {
    await this.openDatabase()
    let row
    try { row = await this.database.workspace.get('active') } catch (cause) {
      throw new StorageAccessError('read', cause)
    }
    if (!row) return undefined
    const result = stateSchema.safeParse(row.state)
    if (!result.success) throw new StorageAccessError('validate', result.error, migrationIssues(result.error, row.state))
    // Keep the stored representation intact, including the ordering of existing backup fields.
    return row.state
  }

  async openWorkspace() {
    // Read both stores from a single committed snapshot.
    await this.openDatabase()
    return this.database.transaction('r', this.database.workspace, this.database.quarantine, async () => ({
      state: await this.read(), quarantine: await this.migrationNotices(),
    }))
  }

  private async migrationNotices(): Promise<QuarantineNotice[]> {
    return (await this.database.quarantine.toArray()).map(({ id, active, sourceVersion, targetVersion, issues }) =>
      ({ id, active, sourceVersion, targetVersion, issues }))
  }

  onBlocked(listener: () => void) {
    this.database.on('blocked', listener)
    return () => this.database.on.blocked.unsubscribe(listener)
  }

  async findSpeakingAssessment(sessionId: string) {
    return (await this.read())?.speakingAssessments.find(({ report }) => report.sessionId === sessionId)
  }

  create(state: LearningState) {
    return this.restore(state, undefined)
  }

  async update(profileId: string, change: (state: LearningState) => LearningState) {
    await this.openDatabase()
    return this.database.transaction('rw', this.database.workspace, async () => {
      const current = await this.read()
      if (!current || current.profile.id !== profileId) throw new Error('Etkin profil değişti. Sayfayı yeniden yükle.')
      const state = stateSchema.parse(change(current))
      await this.database.workspace.put({ key: 'active', state })
      return state
    })
  }

  async restore(state: LearningState, expected: LearningState | undefined) {
    await this.openDatabase()
    return this.database.transaction('rw', this.database.workspace, async () => {
      const current = await this.read()
      if (JSON.stringify(current) !== JSON.stringify(expected)) {
        throw new Error('Yerel kayıt değişti. Sayfayı yeniden yükleyip tekrar dene.')
      }
      const valid = stateSchema.parse(state)
      await this.database.workspace.put({ key: 'active', state: valid })
      return valid
    })
  }

  close() {
    this.database.close()
  }

  async resetLocalData(origin: string) {
    if (origin !== localLearningOrigin || this.database.name !== databaseName) {
      throw new Error('Yerel sıfırlama yalnızca Language OS’un sabit adresinde kullanılabilir.')
    }
    // Cancel any pending Dexie open before deleting, including a blocked upgrade.
    this.database.close()
    await this.database.delete()
  }

  delete() {
    return this.database.delete()
  }
}

export function exportBackup(state: LearningState) {
  return JSON.stringify({ schemaVersion: 2, state }, null, 2)
}

export function parseBackup(raw: string): LearningState {
  const backup = backupSchema.parse(JSON.parse(raw))
  const state = backup.schemaVersion === 1 ? stateSchema.parse(normalizeWorkspaceState(backup.state)) : backup.state
  const course = catalog[state.profile.language]
  const lessons = course.unit.lessons
  const cards = new Set(lessons.flatMap((lesson) => lesson.vocabulary.map(({ id }) => id)))
  const placement = state.attempts.filter((attempt) => attempt.context === 'placement')
  const placementVersion = placement[0]?.contentVersion
  const placementCourse = placementVersion === 1 ? legacyCatalog[state.profile.language] : course
  if (state.placementAt ? placement.length !== placementCourse.placement.length ||
    placement.some((attempt) => attempt.contentVersion !== placementVersion) ||
    !placementCourse.placement.every(({ exercise }) => placement.some((attempt) => attempt.exerciseId === exercise.id))
    : state.attempts.length || state.reviews.length || state.speakingSessions.length || state.activity.length || state.reviewHistory.length || state.skippedListening.length) {
    throw new Error('Başlangıç taraması kaydı tutarsız.')
  }
  const diagnostics = state.attempts.filter(({ context }) => context === 'diagnostic')
  const expectedDiagnostics = diagnosticTasks(course, state)
  if (diagnostics.some((attempt, index) => attempt.exerciseId !== expectedDiagnostics[index]?.exercise.id)) {
    throw new Error('Tanılama sırası geçersiz.')
  }
  for (const attempt of state.attempts) {
    const source = attempt.contentVersion === 1 ? legacyCatalog[state.profile.language] : course
    const lesson = source.unit.lessons.find(({ id }) => id === attempt.lessonId)
    const p = lesson?.pedagogy
    const matches = ({ conceptId, exercise }: { conceptId: string; exercise: { id: string } }) =>
      conceptId === attempt.conceptId && exercise.id === attempt.exerciseId
    let definition
    if (attempt.context === 'placement' && !attempt.lessonId) {
      definition = source.placement.find(({ objectiveId, exercise }) => matches({ conceptId: objectiveId, exercise }))?.exercise
    } else if (attempt.context === 'diagnostic' && attempt.contentVersion === 2) {
      definition = diagnosticTasks(course, state).find((item) => item.lesson.id === attempt.lessonId &&
        item.lesson.objective.id === attempt.conceptId && item.exercise.id === attempt.exerciseId)?.exercise
    } else if (attempt.context === 'lesson' && lesson) {
      definition = attempt.conceptId === lesson.objective.id ? lesson.production
        : lesson.concepts.find(({ id }) => id === attempt.conceptId)?.variants.find(({ id }) => id === attempt.exerciseId)
    } else if (p && lesson) {
      const checks = p.checks.flatMap(({ conceptId, transfer, delayed, foundation }) => {
        const items = attempt.context === 'transfer' ? transfer : attempt.context === 'delayed' ? delayed
          : attempt.context === 'foundation' && foundation ? [foundation.exercise] : []
        return items.map((exercise) => ({ conceptId, exercise }))
      })
      if ((attempt.context === 'reading' || attempt.context === 'listening') && attempt.conceptId === lesson.objective.id) {
        definition = receptionExercises(p).find(({ id, skill }) => id === attempt.exerciseId && skill === attempt.context)
      } else if (attempt.context === 'revision' && attempt.conceptId === lesson.objective.id) {
        definition = p.revision
      } else if (attempt.context === 'vocabulary') {
        definition = pedagogyExercises(p).filter(({ conceptId }) => p.vocabulary.some(({ cardId }) => cardId === conceptId))
          .find(matches)?.exercise
      } else definition = checks.find(matches)?.exercise
    }
    if (!definition || definition.id !== attempt.exerciseId ||
      JSON.stringify(attempt.evidence) !== JSON.stringify(evidenceSchema.parse(assess(definition, attempt.answer, state.profile.language)))) {
      throw new Error('Alıştırma kaydı içerik veya değerlendirme kurallarıyla eşleşmiyor.')
    }
  }
  if (state.activity.some(({ kind, itemId }) =>
    kind === 'lesson' ? !lessons.some(({ id }) => id === itemId) :
      kind === 'review' ? !cards.has(itemId) : !state.speakingSessions.some(({ id }) => id === itemId))) {
    throw new Error('Çalışma geçmişinde bilinmeyen bir kayıt var.')
  }
  if (new Set(state.skippedListening).size !== state.skippedListening.length ||
    state.skippedListening.some((id) => !lessons.some((lesson) => lesson.id === id && lesson.pedagogy) ||
      state.attempts.some(({ context, lessonId, evidence }) => context === 'listening' && lessonId === id && evidence.outcome === 'correct') &&
        !state.attempts.some(({ context, lessonId, evidence }) => context === 'listening' && lessonId === id && evidence.outcome === 'incorrect')) ||
    state.reviewHistory.some(({ cardId, at, result, mode, answer }) => {
      const schedule = state.reviews.find((card) => card.cardId === cardId)
      const recall = lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? []).find((item) => item.cardId === cardId)?.recall
      return !schedule || at < schedule.introducedAt || (mode === 'typed' &&
        (!recall || !answer || gradeVocabularyRecall(recall, answer, course.language) !== result))
    }) ||
    state.reviews.some(({ cardId }) => !cards.has(cardId)) ||
    state.skippedSpeaking.some((id) => !lessons.some((lesson) => lesson.id === id && lesson.speaking)) ||
    new Set(state.speakingSessions.map(({ lessonId }) => lessonId)).size !== state.speakingSessions.length) {
    throw new Error('Yedekte bilinmeyen veya yinelenen içerik var.')
  }
  for (const session of state.speakingSessions) {
    if (session.language !== course.language || !lessons.some(({ id, speaking }) => id === session.lessonId && speaking)) {
      throw new Error('Konuşma oturumu müfredatla eşleşmiyor.')
    }
  }
  for (const { report, attemptCountAtImport } of state.speakingAssessments) {
    const session = state.speakingSessions.find(({ id }) => id === report.sessionId)
    const lesson = lessons.find(({ id }) => id === report.lessonId)
    if (!session || !lesson || attemptCountAtImport > state.attempts.length) {
      throw new Error('Raporun oturum veya deneme kaydı tutarsız.')
    }
    validateSpeakingReport(report, session, lesson)
  }
  return state
}
