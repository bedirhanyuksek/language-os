import { useState, type FormEvent } from 'react'
import { goalSchema, levelSchema, profileSchema, type CEFRLevel, type Language, type LearningGoal } from '../domain/model'
import type { Profile } from '../domain/state'
import { dayLabels, goalLabels, languageLabels } from './labels'

const defaults = {
  en: { estimate: 'B1', target: 'B2+' },
  ru: { estimate: 'A1', target: 'A2' },
} as const

export function ProfileForm({ initial, onSave, busy, fixedLanguage }: {
  initial?: Profile
  onSave: (profile: Profile) => Promise<boolean>
  busy: boolean
  fixedLanguage?: Language
}) {
  const [language, setLanguage] = useState<Language>(initial?.language ?? fixedLanguage ?? 'en')
  const [estimate, setEstimate] = useState<CEFRLevel>(initial?.estimate ?? defaults[language].estimate)
  const [target, setTarget] = useState<CEFRLevel>(initial?.target ?? defaults[language].target)
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30)
  const [days, setDays] = useState(initial?.days ?? [0, 1, 2, 3, 4, 5, 6])
  const [goals, setGoals] = useState<LearningGoal[]>(initial?.goals ?? ['general'])
  const [error, setError] = useState('')

  function changeLanguage(next: Language) {
    setLanguage(next)
    setEstimate(defaults[next].estimate)
    setTarget(defaults[next].target)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = profileSchema.safeParse({ id: initial?.id ?? crypto.randomUUID(), language, estimate, target, minutes, days, goals })
    if (!result.success) {
      setError('En az bir çalışma günü ve hedef seç. Günlük süre 5–180 dakika olabilir.')
      return
    }
    setError('')
    await onSave(result.data)
  }

  return <form onSubmit={submit} className="profile-form">
    {!initial && !fixedLanguage && <fieldset>
      <legend>Hangi dili çalışacaksın?</legend>
      <div className="choice-grid">
        {(['en', 'ru'] as const).map((item) => <label className="language-option" key={item}>
          <input type="radio" name="language" value={item} checked={language === item} onChange={() => changeLanguage(item)} />
          <span className="language-mark" lang={item}>{item === 'en' ? 'Aa' : 'Яя'}</span>
          <span><strong>{languageLabels[item]}</strong><small>{item === 'en' ? 'B1 başlangıç ünitesi' : 'A1 başlangıç ünitesi'}</small></span>
        </label>)}
      </div>
    </fieldset>}
    <div className="field-grid">
      <label>Tahmini seviyen<select value={estimate} onChange={(e) => setEstimate(levelSchema.parse(e.target.value))}>
        {levelSchema.options.map((level) => <option key={level}>{level}</option>)}
      </select></label>
      <label>Hedef seviyen<select value={target} onChange={(e) => setTarget(levelSchema.parse(e.target.value))}>
        {levelSchema.options.map((level) => <option key={level}>{level}</option>)}
      </select></label>
      <label>Günlük süre (dk)<input type="number" required min={5} max={180} value={minutes || ''} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
    </div>
    <fieldset>
      <legend>Çalışma hedeflerin</legend>
      <div className="chips">{goalSchema.options.map((goal) => <label key={goal}>
        <input type="checkbox" checked={goals.includes(goal)}
          onChange={(e) => setGoals(e.target.checked ? [...goals, goal] : goals.filter((value) => value !== goal))} />
        {goalLabels[goal]}
      </label>)}</div>
    </fieldset>
    <fieldset>
      <legend>Çalışma günlerin</legend>
      <div className="chips days">{[1, 2, 3, 4, 5, 6, 0].map((day) => <label key={day}>
        <input type="checkbox" checked={days.includes(day)}
          onChange={(e) => setDays(e.target.checked ? [...days, day] : days.filter((value) => value !== day))} />
        {dayLabels[day]}
      </label>)}</div>
    </fieldset>
    {error && <p role="alert" className="notice error">{error}</p>}
    <button className="primary" disabled={busy}>{initial ? 'Ayarları kaydet' : 'Başlangıç taramasına geç'} <span aria-hidden>→</span></button>
  </form>
}
