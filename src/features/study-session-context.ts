import { createContext, useContext } from 'react'
import type { StudyDraft, StudyPatch } from '../domain/study-session'

export type StudyControls = {
  draft: StudyDraft
  change: (patch: StudyPatch) => void
  snapshot: () => StudyDraft
}

export const StudyContext = createContext<StudyControls | null>(null)

export function useStudySession() {
  const session = useContext(StudyContext)
  if (!session) throw new Error('Çalışma oturumu açık değil.')
  return session
}
