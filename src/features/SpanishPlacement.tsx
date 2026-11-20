import { useState } from 'react'
import type { Course } from '../content/schema'
import type { Answer } from '../domain/model'
import { ExerciseForm } from './ExerciseForm'
import { skillLabels } from './labels'

export function SpanishPlacement({ course, busy, onSubmit }: {
  course: Course; busy: boolean; onSubmit: (answers: Record<string, Answer>) => Promise<boolean>
}) {
  const [showQuestions, setShowQuestions] = useState(false)
  if (showQuestions) return <ExerciseForm placement language="es" busy={busy}
    tasks={course.placement.map(({ exercise, objectiveId }) => ({ exercise, conceptId: objectiveId, label: skillLabels[exercise.skill] }))}
    onSubmit={onSubmit} />
  return <section className="surface">
    <h2>İspanyolcaya ilk adım</h2>
    <p>Hiç İspanyolca bilmiyorsan doğrudan harf, ses ve selamlaşma temellerinden başla. Önceden İspanyolca okuman gerekmiyor.</p>
    <p>Bu seçimde sorular “Bilmiyorum” olarak kaydedilir; bir seviye sonucu verilmez. Daha önce çalıştıysan kısa taramayı açabilirsin.</p>
    <div className="button-row">
      <button className="primary" disabled={busy} onClick={() => onSubmit(Object.fromEntries(
        course.placement.map(({ exercise }) => [exercise.id, 'Bilmiyorum']),
      ))}>Sıfırdan başla</button>
      <button className="secondary" disabled={busy} onClick={() => setShowQuestions(true)}>Daha önce çalıştım, taramayı aç</button>
    </div>
  </section>
}
