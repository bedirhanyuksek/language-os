import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { Language } from '../domain/model'
import { missingCyrillic } from '../domain/assessment'
import './text-answer.css'

const rows = ['й ц у к е н г ш щ з х ъ', 'ф ы в а п р о л д ж э', 'я ч с м и т ь б ю ё']
const spanishLetters = ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡']
const warning = 'Rusça cevabı Kiril harfleriyle yaz. Klavyende Rusça yoksa Kiril klavyesini aç.'
const maxLength = 2000

export function TextAnswer({ language, value, onChange, label = 'Yanıtın', placeholder, required = false, requireCyrillic = true }: {
  language: Language
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  requireCyrillic?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const warningId = useId()
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [uppercase, setUppercase] = useState(false)
  const invalid = language === 'ru' && requireCyrillic && missingCyrillic(value)

  useLayoutEffect(() => {
    input.current?.setCustomValidity(invalid ? warning : '')
    if (caret.current !== null) {
      input.current?.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [value, invalid])

  function insert(letter: string) {
    const field = input.current
    if (!field) return
    let start = field.selectionStart ?? value.length
    const end = field.selectionEnd ?? start
    if (letter === 'backspace' && start === end) {
      // Remove a complete code point (including pasted non-BMP characters).
      start -= [...value.slice(0, start)].at(-1)?.length ?? 0
    }
    const replacement = letter === 'backspace' ? '' : letter
    const next = value.slice(0, start) + replacement + value.slice(end)
    field.focus()
    if (next.length > maxLength) return
    const position = start + replacement.length
    caret.current = next === value ? null : position
    field.setSelectionRange(position, position)
    onChange(next)
  }

  function key(letter: string, label = letter) {
    return <button type="button" key={letter} aria-label={label} lang={letter.length === 1 && letter !== ' ' ? language : undefined}
      onPointerDown={(event) => event.preventDefault()} onClick={() => insert(letter)}>{label}</button>
  }

  function shift() {
    return <button type="button" aria-label="Büyük harf" aria-pressed={uppercase}
      onPointerDown={(event) => event.preventDefault()} onClick={() => setUppercase(!uppercase)}>⇧ Büyük harf</button>
  }

  return <div className="text-answer">
    <input ref={input} type="text" lang={language} aria-label={label} value={value} maxLength={maxLength}
      placeholder={placeholder} required={required} aria-invalid={invalid || undefined}
      aria-describedby={invalid ? warningId : undefined} onChange={(event) => onChange(event.target.value)} />
    {invalid && <p className="text-answer-warning" id={warningId} aria-live="polite">{warning}</p>}
    {language === 'es' && <div className="spanish-keyboard" role="group" aria-label="İspanyolca özel karakterler">
      <div className="cyrillic-keyboard-row">
        {spanishLetters.map((letter) => key(uppercase ? letter.toUpperCase() : letter))}
        {shift()}
      </div>
    </div>}
    {language === 'ru' && <details className="cyrillic-keyboard" open={keyboardOpen} onToggle={(event) => setKeyboardOpen(event.currentTarget.open)}>
      <summary aria-expanded={keyboardOpen}>Kiril klavyesini {keyboardOpen ? 'kapat' : 'aç'}</summary>
      <div role="group" aria-label="Kiril klavyesi">
        {rows.map((row) => <div className="cyrillic-keyboard-row" key={row}>{row.split(' ').map((letter) => key(uppercase ? letter.toUpperCase() : letter))}</div>)}
        <div className="cyrillic-keyboard-row">{shift()}{key(' ', 'Boşluk')}{key('backspace', 'Geri sil')}</div>
      </div>
    </details>}
  </div>
}
