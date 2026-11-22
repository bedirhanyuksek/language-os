type Material = { id: string; lessonId: string; language: string; text: string; kind: string; senseId?: string; bundledFile?: string }
type Segment = { role: string; voice: string; text: string; input?: string }
type Job = Material & { model: { id: string; version: string }; segments?: Segment[]; productionId?: string; blocked?: string }
type Result = Job & {
  status: 'generated' | 'unchanged' | 'blocked' | 'failed'
  artifact?: { file: string; sha256: string }
  error?: string
}
export function planCurriculumTts(materials: readonly Material[], overrides?: Record<string, Segment[]>,
  options?: { spanishVersion?: string; encoderVersion?: string }): Job[]
export function runCurriculumTts(jobs: Job[], options: {
  outputDirectory: string
  synthesize: (job: Job, wavPath: string) => void
  encode: (wavPath: string, mp3Path: string) => void
  inspect: (mp3Path: string, job: Job) => unknown
}): { items: Result[] }
