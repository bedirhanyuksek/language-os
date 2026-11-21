import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { studyKey, type StudyDefinition, type StudyDraft, type StudyPatch } from '../domain/study-session'
import type { IndexedLearningRepository } from '../persistence/repository'
import { StudyContext, type StudyControls } from './study-session-context'

export function StudySession({ profileId, definition, cursor, repository, queue, onStored, children }: {
  profileId: string
  definition: StudyDefinition
  cursor: string
  repository: IndexedLearningRepository
  queue: RefObject<Promise<void>>
  onStored: (profileId: string, draft: StudyDraft) => void
  children: (session: StudyControls) => ReactNode
}) {
  const [draft, setDraft] = useState<StudyDraft>()
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [error, setError] = useState('')
  const editing = useRef<StudyDraft>(undefined)
  const lastInteraction = useRef(0)
  const elapsedMs = useRef(0)
  const serialized = JSON.stringify(definition)

  useEffect(() => {
    const resetInteraction = () => { lastInteraction.current = performance.now() }
    document.addEventListener('visibilitychange', resetInteraction)
    return () => document.removeEventListener('visibilitychange', resetInteraction)
  }, [])

  useEffect(() => {
    let mounted = true
    const opening = queue.current.then(() => repository.openStudy(profileId, JSON.parse(serialized), cursor, new Date().toISOString()))
    queue.current = opening.then(() => {}, () => {})
    void opening.then((saved) => {
      if (!mounted) return
      editing.current = saved
      lastInteraction.current = performance.now()
      elapsedMs.current = saved.elapsedSeconds * 1000
      setDraft(saved)
      onStored(profileId, saved)
    }).catch((cause: unknown) => {
      if (mounted) setError(cause instanceof Error ? cause.message : 'Çalışma oturumu açılamadı.')
    })
    return () => { mounted = false }
  }, [profileId, serialized, cursor, repository, queue, onStored])

  function snapshot() {
    const current = editing.current!
    // Time is observed only between visible interactions. Sleep and long idle periods are excluded.
    const delta = document.visibilityState === 'visible' ? performance.now() - lastInteraction.current : 0
    return { ...current, elapsedSeconds: Math.floor((elapsedMs.current + (delta > 60_000 ? 0 : delta)) / 1000) }
  }

  function change(patch: StudyPatch) {
    const now = performance.now()
    const delta = now - lastInteraction.current
    if (document.visibilityState === 'visible' && delta <= 60_000) elapsedMs.current += delta
    lastInteraction.current = now
    const current = snapshot()
    const nextPatch: StudyPatch = { ...patch, elapsedSeconds: current.elapsedSeconds }
    if (patch.answers) nextPatch.answers = { ...current.answers, ...patch.answers }
    if (patch.supports) {
      const opened = Object.fromEntries(Object.entries(patch.supports).filter(([key, visible]) =>
        visible && key !== 'audioUnavailable').map(([key]) => [`opened:${key}`, true]))
      nextPatch.supports = { ...current.supports, ...patch.supports, ...opened }
    }
    const next = { ...current, ...nextPatch, revision: current.revision + 1, updatedAt: new Date().toISOString() }
    editing.current = next
    setDraft(next)
    setStatus('saving')
    const write = queue.current.then(() => repository.saveStudy(profileId, current.id, current.revision, nextPatch, next.updatedAt))
    queue.current = write.then(() => {}, () => {})
    void write.then((saved) => {
      const stored = saved.studyDrafts?.find(({ id }) => id === next.id)
      if (stored) onStored(profileId, stored)
      if (editing.current?.revision === next.revision) setStatus('saved')
    }).catch((cause: unknown) => {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Taslak kaydedilemedi.')
    })
  }

  if (!draft || studyKey(draft) !== studyKey(definition)) {
    return error ? <p role="alert" className="notice error">{error}</p> : <p role="status">Çalışma açılıyor…</p>
  }
  const controls = { draft, change, snapshot }
  return <StudyContext.Provider value={controls}>
    {error && <p role="alert" className="notice error">{error}</p>}
    {children(controls)}
    {draft.revision > 0 && status !== 'error' && <small role="status">{status === 'saved' ? 'Taslak bu cihazda kaydedildi.' : 'Taslak kaydediliyor…'}</small>}
  </StudyContext.Provider>
}
