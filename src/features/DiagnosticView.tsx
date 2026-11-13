import { useState } from 'react'
import type { Course } from '../content/schema'
import { nextDiagnostic } from '../domain/diagnostic'
import type { Answer } from '../domain/model'
import type { LearningState } from '../domain/state'
import { AudioPlayer } from './AudioPlayer'
import { ExerciseForm } from './ExerciseForm'

export function DiagnosticView({ state, course, busy, submit, back }: {
  state: LearningState; course: Course; busy: boolean; back: () => void
  submit: (exerciseId: string, answer: Answer, played: boolean) => Promise<boolean>
}) {
  const item = nextDiagnostic(course, state)
  const [played, setPlayed] = useState(false)
  if (!item) return null
  return <>
    <header className="page-heading"><div><h1>Tanılamaya devam et</h1>
      <p>{item.label} için kısa bir örnek. Yanıtın yerelde saklanır.</p></div></header>
    <button className="link-button" onClick={back} disabled={busy}>Daha sonra devam et</button>
    {item.passage && <p className="surface" lang={course.language}>{item.passage}</p>}
    {item.audio && <div className="surface">
      <p>Önce kaydı dinle. Soru ses tamamlandığında açılır.</p>
      <AudioPlayer audio={item.audio.audio} text={item.audio.transcript} label="Tanılama kaydını dinle" onEnd={() => setPlayed(true)} />
    </div>}
    {(!item.audio || played) && <section className="section"><ExerciseForm
      tasks={[{ exercise: item.exercise, conceptId: item.lesson.objective.id, label: item.label }]}
      language={course.language} busy={busy} submitLabel="Örneği kaydet"
      onSubmit={(answers) => submit(item.exercise.id, answers[item.exercise.id], played)} /></section>}
  </>
}
