import { useState, type FormEvent } from 'react'
import type { Exercise } from '../content/schema'
import { answerSchema, type Answer, type Language } from '../domain/model'
import type { ExerciseTask } from '../domain/progress'
import { TextAnswer } from './TextAnswer'

function ExerciseInput({ exercise, language, answer, change }: {
  exercise: Exercise
  language: Language
  answer: Answer | undefined
  change: (answer: Answer) => void
}) {
  const selection = Array.isArray(answer) ? answer : []
  const text = typeof answer === 'string' ? answer : ''
  switch (exercise.kind) {
    case 'single':
    case 'multiple':
      return <div className="options">
        {exercise.options.map((option) => <label key={option}>
          <input type={exercise.kind === 'single' ? 'radio' : 'checkbox'} name={exercise.id}
            checked={exercise.kind === 'single' ? text === option : selection.includes(option)}
            onChange={(event) => change(exercise.kind === 'single' ? option
              : event.target.checked ? [...selection, option] : selection.filter((value) => value !== option))} />
          <span>{option}</span>
        </label>)}
      </div>
    case 'matching':
      return <div className="matching">{exercise.prompts.map((prompt, index) => <label key={prompt}>
        <span lang={language}>{prompt}</span>
        <select required aria-label={prompt} value={selection[index] ?? ''}
          onChange={(event) => change(exercise.prompts.map((_, slot) => slot === index ? event.target.value : selection[slot] ?? ''))}>
          <option value="">Bir anlam seç</option>
          {exercise.options.map((option) => <option key={option} disabled={selection.includes(option) && selection[index] !== option}>{option}</option>)}
        </select>
      </label>)}</div>
    case 'sentence_order':
    case 'word_order':
      return <div>
        <ol className="order-selected" aria-label="Seçtiğin sıra">{selection.map((option) =>
          <li key={option}><button type="button" className="token" aria-label={`${option} öğesini kaldır`}
            onClick={() => change(selection.filter((value) => value !== option))}>{option} <span aria-hidden>×</span></button></li>)}</ol>
        <div className="tokens">{exercise.options.filter((option) => !selection.includes(option)).map((option) =>
          <button key={option} type="button" lang={language} className="token" onClick={() => change([...selection, option])}>{option}</button>)}</div>
      </div>
    case 'open':
      return <textarea aria-label="Yanıtın" lang={language} rows={4} maxLength={2000}
        placeholder="Cümleni yaz…" value={text} onChange={(event) => change(event.target.value)} />
    default:
      return <TextAnswer language={language} placeholder="Yanıtını yaz…" value={text} onChange={change} />
  }
}

export function ExerciseForm({ tasks, language, busy, onSubmit, placement = false, submitLabel, initialAnswers }: {
  tasks: ExerciseTask[]
  language: Language
  busy: boolean
  onSubmit: (answers: Record<string, Answer>) => Promise<boolean>
  placement?: boolean
  submitLabel?: string
  initialAnswers?: Record<string, Answer>
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(initialAnswers ?? {})
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    const validated: Record<string, Answer> = {}
    for (const { exercise } of tasks) {
      const parsed = answerSchema.safeParse(answers[exercise.id])
      if (!parsed.success || (['sentence_order', 'word_order', 'matching'].includes(exercise.kind) &&
        'options' in exercise && parsed.data.length !== exercise.options.length)) {
        setError('Sonuçları görmek için her soruyu tamamla.')
        document.getElementById(exercise.id)?.querySelector<HTMLElement>('input, textarea, select, button')?.focus()
        return
      }
      validated[exercise.id] = parsed.data
    }
    setError('')
    await onSubmit(validated)
  }
  return <form className="exercise-form" onSubmit={submit}>
    {tasks.map(({ exercise, label }, index) => <fieldset className="exercise" key={exercise.id} id={exercise.id}>
      <legend>{index + 1}. {label}</legend>
      <p className="exercise-prompt">{exercise.prompt}</p>
      <ExerciseInput exercise={exercise} language={language} answer={answers[exercise.id]}
        change={(answer) => setAnswers({ ...answers, [exercise.id]: answer })} />
    </fieldset>)}
    {error && <p className="notice error" role="alert">{error}</p>}
    <button className="primary" disabled={busy}>{submitLabel ?? (placement ? 'Beceri profilimi gör' : 'Yanıtları değerlendir')} <span aria-hidden>→</span></button>
  </form>
}
