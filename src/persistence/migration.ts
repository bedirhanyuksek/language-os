import type { z } from 'zod'
import { stateSchema } from '../domain/state'

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

export function normalizeWorkspaceState(value: unknown) {
  const record = object(value)
  if (!record) return value
  // These two histories were introduced after v1. Missing histories carry no evidence.
  return {
    ...record,
    reviewHistory: record.reviewHistory === undefined ? [] : record.reviewHistory,
    skippedListening: record.skippedListening === undefined ? [] : record.skippedListening,
  }
}

export type MigrationIssue = {
  recordType: string
  path: string
  code: string
  expected?: string
  contentVersion?: 1 | 2
  reportVersion?: 1 | 2
}

const recordTypes: Record<string, string> = {
  profile: 'Öğrenci profili', attempts: 'Alıştırma denemesi', reviews: 'Kelime tekrar planı',
  reviewHistory: 'Kelime tekrar geçmişi', speakingSessions: 'Konuşma oturumu',
  speakingAssessments: 'Konuşma raporu', activity: 'Çalışma geçmişi',
  skippedListening: 'Atlanan dinleme', skippedSpeaking: 'Atlanan konuşma',
}

function knownVersion(value: unknown): 1 | 2 | undefined {
  return value === 1 || value === 2 ? value : undefined
}

export function migrationIssues(error: z.ZodError, value: unknown): MigrationIssue[] {
  const record = object(value)
  return error.issues.slice(0, 20).map((issue) => {
    const [field, index] = issue.path
    const collection = typeof field === 'string' ? record?.[field] : undefined
    const item = Array.isArray(collection) && typeof index === 'number' ? object(collection[index]) : undefined
    const expected = issue.code === 'invalid_type' ? issue.expected : issue.code === 'invalid_format' ? issue.format :
      issue.code === 'too_big' || issue.code === 'too_small' ? issue.origin :
      issue.code === 'invalid_value' ? 'Şemada tanımlı değer' :
      issue.code === 'invalid_union' ? 'Desteklenen veri biçimlerinden biri' : undefined
    return {
      recordType: typeof field === 'string' && Object.hasOwn(recordTypes, field) ? recordTypes[field] : 'Öğrenme kaydı',
      // Zod paths here are fixed schema fields and array indexes. Do not include unknown keys, issue messages or input values.
      path: ['state', ...issue.path].map(String).join('.'),
      code: issue.code,
      expected,
      contentVersion: field === 'attempts' ? knownVersion(item?.contentVersion) : undefined,
      reportVersion: field === 'speakingAssessments' ? knownVersion(object(item?.report)?.schemaVersion) : undefined,
    }
  })
}

export function checkWorkspaceMigration(value: unknown) {
  const normalized = normalizeWorkspaceState(value)
  const result = stateSchema.safeParse(normalized)
  if (!result.success) return { ok: false as const, issues: migrationIssues(result.error, value) }
  const record = object(value)
  return { ok: true as const, state: result.data, needsWrite: record?.reviewHistory === undefined || record.skippedListening === undefined }
}
