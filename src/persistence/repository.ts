import Dexie, { type IndexableType, type Table } from 'dexie'
import { z } from 'zod'
import { catalog, legacyCatalog } from '../content/catalog'
import { pedagogyExercises, receptionExercises } from '../content/schema'
import { diagnosticTasks } from '../domain/diagnostic'
import { gradeVocabularyRecall } from '../domain/pedagogy'
import { validPlacementTrack } from '../domain/adaptive-placement'
import { assess } from '../domain/assessment'
import { evidenceSchema, type Language } from '../domain/model'
import { validateSpeakingReport, type SpeakingAssessmentRepository } from '../domain/speaking'
import { studyKey, type StudyDefinition, type StudyDraft, type StudyPatch } from '../domain/study-session'
import { stateSchema, type LearningState } from '../domain/state'
import { StorageAccessError } from './storage-error'
import { checkWorkspaceMigration, migrationIssues, normalizeWorkspaceState, type MigrationIssue } from './migration'

type WorkspaceKey = 'active' | Language
type StoredState = { key: WorkspaceKey; state: LearningState }
type WorkspaceRow = { key: IndexableType; state: unknown }
export type QuarantineNotice = { id?: number; active: boolean; sourceVersion: 1 | 2; targetVersion: 3; issues: MigrationIssue[] }
type QuarantinedWorkspace = QuarantineNotice & { original: WorkspaceRow }

const backupSchema = z.discriminatedUnion('schemaVersion', [
  z.strictObject({ schemaVersion: z.literal(1), state: z.unknown() }),
  z.strictObject({ schemaVersion: z.literal(2), state: stateSchema }),
  z.strictObject({ schemaVersion: z.literal(3), state: stateSchema }),
  z.strictObject({ schemaVersion: z.literal(4), state: stateSchema }),
])

export interface LearningRepository extends SpeakingAssessmentRepository {
  read(): Promise<LearningState | undefined>
  create(state: LearningState): Promise<LearningState>
  update(profileId: string, change: (state: LearningState) => LearningState): Promise<LearningState>
  restore(state: LearningState, expected: LearningState | undefined): Promise<LearningState>
}

export const localLearningOrigin = 'http://127.0.0.1:4173'
const databaseName = 'language-os'
const schemaVersion = 5

class LearningDatabase extends Dexie {
  declare workspace: Table<StoredState, WorkspaceKey>
  declare quarantine: Table<QuarantinedWorkspace, number>

  constructor(name: string) {
    super(name)
    const upgradingFromV1 = new WeakSet<IDBTransaction>()
    this.version(1).stores({ workspace: 'key' })
    this.version(2).stores({ workspace: 'key' }).upgrade((transaction) => {
      // Defer v1 validation until quarantine is available in the same native transaction.
      upgradingFromV1.add(transaction.idbtrans)
    })
    this.version(3).stores({ workspace: 'key', quarantine: '++id' }).upgrade(async (transaction) => {
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
            original: row, active: row.key === 'active', sourceVersion, targetVersion: 3, issues: result.issues,
          })
          await workspace.delete(row.key)
        }
      } catch (cause) {
        // Rethrowing aborts the upgrade and every write performed by it.
        throw new StorageAccessError('upgrade', cause)
      }
    })
    // Existing rows need no rewrite. The native version blocks older clients from writing the new shape.
    this.version(4).stores({ workspace: 'key', quarantine: '++id' })
    this.version(schemaVersion).stores({ workspace: 'key', quarantine: '++id' })
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

  async switchLanguage(expectedId: string, language: Language, create?: LearningState) {
    await this.openDatabase()
    return this.database.transaction('rw', this.database.workspace, async () => {
      const current = await this.read()
      if (!current || current.profile.id !== expectedId) throw new Error('Etkin profil değişti. Sayfayı yeniden yükle.')
      if (current.profile.language === language) return current
      const existing = await this.database.workspace.get(language)
      if (!existing && !create) return undefined
      const next = stateSchema.parse(existing?.state ?? create)
      if (next.profile.language !== language) throw new Error('Dil profili doğrulanamadı.')
      await this.database.workspace.put({ key: current.profile.language, state: current })
      await this.database.workspace.put({ key: 'active', state: next })
      await this.database.workspace.delete(language)
      return next
    })
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
      if (state.profile.id !== current.profile.id || state.profile.language !== current.profile.language) {
        throw new Error('Çalışma profilinin kimliği veya dili değiştirilemez.')
      }
      await this.database.workspace.put({ key: 'active', state })
      return state
    })
  }

  async openStudy(profileId: string, definition: StudyDefinition, cursor: string, now: string) {
    let opened: StudyDraft | undefined
    await this.update(profileId, (state) => {
      if (studyCursor(state) !== cursor) throw new Error('Çalışma planı değişti. Sayfayı yeniden yükle.')
      opened = state.studyDrafts?.find((draft) => studyKey(draft) === studyKey(definition))
      if (opened) return state
      opened = { ...definition, id: crypto.randomUUID(), revision: 0, openedAt: now, updatedAt: now,
        answers: {}, supports: {}, step: 0, plays: 0, elapsedSeconds: 0 }
      return { ...state, studyDrafts: [...(state.studyDrafts ?? []), opened] }
    })
    return opened!
  }

  async saveStudy(profileId: string, id: string, revision: number, patch: StudyPatch, now: string) {
    return this.update(profileId, (state) => {
      const draft = currentStudy(state, id, revision)
      const next = { ...draft, ...patch, revision: revision + 1, updatedAt: now }
      return { ...state, studyDrafts: [...(state.studyDrafts ?? []).filter((item) => item !== draft), next] }
    })
  }

  async completeStudy(profileId: string, id: string, revision: number, elapsedSeconds: number,
    change: (state: LearningState, draft: StudyDraft) => LearningState) {
    return this.update(profileId, (state) => {
      const draft = currentStudy(state, id, revision)
      const next = change(state, draft)
      const activity = next.activity.length > state.activity.length
        ? next.activity.map((item, index) => index === next.activity.length - 1
          ? { ...item, elapsedSeconds: Math.max(draft.elapsedSeconds, elapsedSeconds) } : item)
        : next.activity
      const study = { sessionId: id, plays: draft.plays,
        supports: Object.keys(draft.supports).filter((key) => key.startsWith('opened:')).map((key) => key.slice(7)) }
      const attempts = next.attempts.map((attempt, index) => index < state.attempts.length ? attempt : { ...attempt, study })
      const studyDrafts = (state.studyDrafts ?? []).filter((item) => item.id !== id)
      return { ...next, activity, attempts, studyDrafts }
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
      if (current && current.profile.language !== valid.profile.language) {
        await this.database.workspace.put({ key: current.profile.language, state: current })
      }
      await this.database.workspace.put({ key: 'active', state: valid })
      await this.database.workspace.delete(valid.profile.language)
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

export function studyCursor(state: LearningState) {
  return `${state.attempts.length}:${state.reviewHistory.length}:${state.activity.length}` +
    (state.placementTrack ? `:${state.placementTrack.samples.length}:${state.placementTrack.finishedAt ?? ''}` : '')
}

function currentStudy(state: LearningState, id: string, revision: number) {
  const draft = state.studyDrafts?.find((item) => item.id === id)
  if (!draft) throw new Error('Bu çalışma başka bir sekmede tamamlanmış veya değiştirilmiş. Sayfayı yeniden yükle.')
  if (draft.revision !== revision) throw new Error('Taslak başka bir sekmede değişti. Sayfayı yeniden yükle.')
  return draft
}

export function exportBackup(state: LearningState) {
  const schemaVersion = state.placementTrack ? 4 : state.studyDrafts?.length || state.attempts.some(({ study }) => study) || state.activity.some(({ elapsedSeconds }) => elapsedSeconds !== undefined) ? 3 : 2
  return JSON.stringify({ schemaVersion, state }, null, 2)
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
  if (!validPlacementTrack(state)) throw new Error('Adaptif başlangıç kanıtı geçersiz.')
  if (state.placementAt && state.placementTrack?.origin === 'new' ? placement.length !== 0 :
    state.placementAt ? placement.length !== placementCourse.placement.length ||
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
