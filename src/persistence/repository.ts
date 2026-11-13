import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import { catalog, legacyCatalog } from '../content/catalog'
import { pedagogyExercises, receptionExercises } from '../content/schema'
import { diagnosticTasks } from '../domain/diagnostic'
import { gradeVocabularyRecall } from '../domain/pedagogy'
import { assess } from '../domain/assessment'
import { evidenceSchema } from '../domain/model'
import { validateSpeakingReport, type SpeakingAssessmentRepository } from '../domain/speaking'
import { legacyStateSchema, stateSchema, type LearningState } from '../domain/state'

type StoredState = { key: 'active'; state: LearningState }
const backupSchema = z.discriminatedUnion('schemaVersion', [
  z.strictObject({ schemaVersion: z.literal(1), state: legacyStateSchema }),
  z.strictObject({ schemaVersion: z.literal(2), state: stateSchema }),
])

function migrateV1(state: unknown): LearningState {
  return stateSchema.parse({ ...legacyStateSchema.parse(state), reviewHistory: [], skippedListening: [] })
}

export interface LearningRepository extends SpeakingAssessmentRepository {
  read(): Promise<LearningState | undefined>
  create(state: LearningState): Promise<LearningState>
  update(profileId: string, change: (state: LearningState) => LearningState): Promise<LearningState>
  restore(state: LearningState, expected: LearningState | undefined): Promise<LearningState>
}

class LearningDatabase extends Dexie {
  declare workspace: Table<StoredState, 'active'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({ workspace: 'key' })
    this.version(2).stores({ workspace: 'key' }).upgrade((transaction) =>
      transaction.table('workspace').toCollection().modify((row) => {
        row.state = migrateV1(row.state)
      }))
  }
}

export class IndexedLearningRepository implements LearningRepository {
  private readonly database: LearningDatabase

  constructor(name = 'language-os') {
    this.database = new LearningDatabase(name)
  }

  async read() {
    return (await this.database.workspace.get('active'))?.state
  }

  async findSpeakingAssessment(sessionId: string) {
    return (await this.read())?.speakingAssessments.find(({ report }) => report.sessionId === sessionId)
  }

  create(state: LearningState) {
    return this.restore(state, undefined)
  }

  async update(profileId: string, change: (state: LearningState) => LearningState) {
    return this.database.transaction('rw', this.database.workspace, async () => {
      const current = await this.read()
      if (!current || current.profile.id !== profileId) throw new Error('Etkin profil değişti. Sayfayı yeniden yükle.')
      const state = stateSchema.parse(change(current))
      await this.database.workspace.put({ key: 'active', state })
      return state
    })
  }

  async restore(state: LearningState, expected: LearningState | undefined) {
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

  delete() {
    return this.database.delete()
  }
}

export function exportBackup(state: LearningState) {
  return JSON.stringify({ schemaVersion: 2, state }, null, 2)
}

export function parseBackup(raw: string): LearningState {
  const backup = backupSchema.parse(JSON.parse(raw))
  const state = backup.schemaVersion === 1 ? migrateV1(backup.state) : backup.state
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
