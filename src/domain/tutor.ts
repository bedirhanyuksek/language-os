import type { Language, Skill } from './model'

export type TutorRequest = {
  language: Language
  objectiveId: string
  skill: Skill
  task: 'explanation' | 'practice' | 'feedback'
  prompt: string
  selectedAnswer?: string
}

export interface TutorProvider {
  suggest(request: TutorRequest, signal: AbortSignal): Promise<{ text: string; source: 'external_suggestion' }>
}
