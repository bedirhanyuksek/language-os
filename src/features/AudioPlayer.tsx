import { useEffect, useRef, useState } from 'react'
import type { ListeningActivity } from '../content/pedagogy-schema'

const recordings = import.meta.glob<string>('../content/audio/*.mp3', { eager: true, import: 'default', query: '?url' })

export function AudioPlayer({ audio, text, label = 'Dinle', onEnd, onUnavailable }: {
  audio: ListeningActivity['audio']; text: string; label?: string
  onEnd?: () => void; onUnavailable?: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const [message, setMessage] = useState('')
  const [recordingAttempt, setRecordingAttempt] = useState(0)
  const speech = useRef<SpeechSynthesisUtterance | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => {
    window.clearTimeout(timer.current)
    if (speech.current) {
      speech.current.onend = null
      speech.current.onerror = null
      window.speechSynthesis?.cancel()
    }
  }, [])
  function unavailable() {
    window.clearTimeout(timer.current)
    if (speech.current) {
      speech.current.onend = null
      speech.current.onerror = null
      speech.current = null
      window.speechSynthesis?.cancel()
    }
    setPlaying(false)
    setMessage(audio.kind === 'recording' ? 'Ses kaydı açılamadı.' :
      'Bu cihazda uygun yerel ses açılamadı. Ses paketini kontrol edip tekrar deneyebilirsin.')
    onUnavailable?.()
  }
  function play() {
    if (audio.kind !== 'synthesis' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      unavailable()
      return
    }
    const voices = window.speechSynthesis.getVoices().filter((voice) => voice.localService)
    const locale = audio.locale.toLowerCase()
    const voice = voices.find((item) => item.lang.toLowerCase().replace('_', '-') === locale) ??
      voices.find((item) => item.lang.toLowerCase().split(/[-_]/)[0] === locale.split('-')[0])
    if (!voice) { unavailable(); return }
    const utterance = new SpeechSynthesisUtterance(text)
    speech.current = utterance
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = audio.rate
    utterance.onend = () => {
      window.clearTimeout(timer.current)
      speech.current = null
      setPlaying(false)
      setMessage('')
      onEnd?.()
    }
    utterance.onerror = unavailable
    setMessage('')
    setPlaying(true)
    timer.current = window.setTimeout(unavailable, 60_000)
    window.speechSynthesis.speak(utterance)
  }
  if (audio.kind === 'recording') return <>
    <audio key={recordingAttempt} controls preload="none" src={recordings[`../content${audio.src}`] ?? audio.src} onEnded={onEnd} onError={unavailable} aria-label={label} />
    {audio.synthetic && <p><small>Sentetik ses</small></p>}
    {message && <button type="button" className="secondary" onClick={() => {
      setMessage('')
      setRecordingAttempt(recordingAttempt + 1)
    }}>Sesi yeniden yükle</button>}
    {message && <p role="status">{message}</p>}
  </>
  return <>
    <button type="button" className="secondary" disabled={playing} onClick={play}>{playing ? 'Ses çalıyor…' : label}</button>
    {message && <p role="status">{message}</p>}
  </>
}
