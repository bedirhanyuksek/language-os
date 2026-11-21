import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { isLocalTutorAvailable, mobileTutorNotice } from '../runtime'
import type { Lesson } from '../content/schema'
import type { LearningState } from '../domain/state'
import { buildTutorRequest, validateTutorResponse, type TutorProvider, type TutorRequest, type TutorResponse } from '../domain/tutor'

const usage = 'https://chatgpt.com/settings/usage'
const connectionSchema = z.object({
  status: z.enum(['disconnected', 'pending', 'connected', 'plan_required', 'reauthorize']),
  models: z.array(z.object({ id: z.string(), name: z.string() })),
  notice: z.string().optional(), csrf: z.string().optional(), blocked: z.boolean(),
})
type Connection = z.infer<typeof connectionSchema>
const labels: Record<Connection['status'], string> = {
  disconnected: 'ChatGPT hesabı bağlı değil.', pending: 'ChatGPT yetkilendirmesi bekleniyor.',
  connected: 'ChatGPT hesabı bağlı.', plan_required: 'Hesap bağlı. ChatGPT planı kullanım izni gerekiyor.',
  reauthorize: 'ChatGPT bağlantısını yeniden yetkilendir.',
}

class LocalTutorError extends Error {
  constructor(message: string, readonly status?: Connection) { super(message) }
}

async function local(path: string, csrf?: string, body: object = {}, signal?: AbortSignal) {
  if (!isLocalTutorAvailable()) throw new LocalTutorError(mobileTutorNotice)
  const response = await fetch('/local-tutor/' + path, {
    method: csrf ? 'POST' : 'GET', cache: 'no-store', signal, credentials: 'same-origin',
    headers: csrf ? { 'X-Language-OS-CSRF': csrf, 'Content-Type': 'application/json' } : { 'X-Language-OS': '1' },
    body: csrf ? JSON.stringify(body) : undefined,
  })
  const data: unknown = await response.json()
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(data)
    const state = connectionSchema.safeParse(data)
    throw new LocalTutorError(error.success ? error.data.error : 'Yerel AI öğretmen servisine erişilemiyor.',
      state.success ? state.data : undefined)
  }
  return data
}

function useConnection(enabled = true) {
  const [connection, setConnection] = useState<Connection>()
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    if (!enabled || !isLocalTutorAvailable()) return
    const controller = new AbortController()
    void local('status', undefined, {}, controller.signal).then((data) => {
      setConnection(connectionSchema.parse(data))
    }).catch(() => { if (!controller.signal.aborted) setUnavailable(true) })
    return () => controller.abort()
  }, [enabled])
  async function call(path: string, body?: object, signal?: AbortSignal) {
    if (!connection?.csrf) throw new Error('Yerel bağlantı yenilenmeli. Sayfayı tekrar aç.')
    try {
      const data = await local(path, connection.csrf, body, signal)
      if (path !== 'suggest') setConnection({ ...connectionSchema.parse(data), csrf: connection.csrf })
      return data
    } catch (cause) {
      if (cause instanceof LocalTutorError && cause.status) setConnection({ ...cause.status, csrf: connection.csrf })
      throw cause
    }
  }
  return { connection, unavailable, call }
}

export function TutorUnavailableNote() {
  return <p>{mobileTutorNotice}</p>
}

export function TutorSettings() {
  return isLocalTutorAvailable() ? <LocalTutorSettings /> :
    <section className="surface section"><TutorUnavailableNote /></section>
}

function LocalTutorSettings() {
  const { connection, unavailable, call } = useConnection()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function run(path: string) {
    setError('')
    setBusy(true)
    try {
      const data = await call(path)
      if (path === 'connect') {
        const url = new URL(z.object({ authorizationUrl: z.url() }).parse(data).authorizationUrl)
        if (url.origin !== 'https://auth.openai.com' || url.pathname !== '/api/accounts/authorize') throw new Error('Yetkilendirme adresi geçersiz.')
        window.location.assign(url.href)
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Bağlantı işlemi tamamlanamadı.') }
    finally { setBusy(false) }
  }
  return <section className="surface section">
    <h2>ChatGPT bağlantısı</h2>
    {unavailable && <p>Hesap bağlantısını kullanmak için Language OS’u <code>npm start</code> ile aç.</p>}
    {!unavailable && !connection && <p>Bağlantı durumu okunuyor…</p>}
    {connection && <>
      <p role="status">{labels[connection.status]} {connection.notice === labels[connection.status] ? '' : connection.notice}</p>
      <p>Uygun hesaplarda AI öğretmen ChatGPT planını kullanır. Kullanım hakkını ve kredi ayarlarını ChatGPT’de yönetebilirsin.</p>
      <p><a href={usage} target="_blank" rel="noreferrer">ChatGPT kullanımını yönet</a></p>
      {connection.models.length > 0 && <p>Erişilebilir modeller: {connection.models.map(({ name }) => name).join(', ')}</p>}
      <div className="button-row">
        {connection.status !== 'pending' && <button className="secondary" disabled={busy} onClick={() => void run('connect')}>
          {connection.status === 'disconnected' ? 'Continue with ChatGPT' : 'Yeniden yetkilendir'}
        </button>}
        {connection.status === 'pending' && <button className="secondary" disabled={busy} onClick={() => void run('cancel')}>Yetkilendirmeyi iptal et</button>}
        {connection.status === 'connected' && <button className="secondary" disabled={busy} onClick={() => void run('check')}>Bağlantıyı kontrol et</button>}
        {connection.status !== 'disconnected' && connection.status !== 'pending' && <button className="link-button" disabled={busy}
          onClick={() => void run('disconnect')}>Bağlantıyı kaldır</button>}
      </div>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>
}

export function LessonHelp({ state, lesson }: { state: LearningState; lesson: Lesson }) {
  const [question, setQuestion] = useState('')
  const [help, setHelp] = useState<{ label: string; request: TutorRequest }>()
  if (!isLocalTutorAvailable()) return <div className="lesson-coaching"><TutorUnavailableNote /></div>
  return <div className="lesson-coaching">
    <div className="button-row">
      <button type="button" className="link-button" onClick={() => setHelp({
        label: 'Başka şekilde açıkla', request: buildTutorRequest(state, lesson, 'explanation'),
      })}>Başka şekilde açıkla</button>
      <button type="button" className="link-button" onClick={() => setHelp({
        label: 'Bir örnek daha', request: buildTutorRequest(state, lesson, 'examples'),
      })}>Bir örnek daha</button>
    </div>
    <details><summary>Bu konu hakkında sor</summary>
      <form onSubmit={(event) => {
        event.preventDefault()
        if (question.trim()) setHelp({ label: 'Soruma yanıt al', request: buildTutorRequest(state, lesson, 'explanation', undefined, { question }) })
      }}>
        <label>Sorun <input maxLength={300} value={question} onChange={(event) => setQuestion(event.target.value)}
          placeholder="Simple Past ile farkı ne?" required /></label>
        <button type="submit" className="secondary" disabled={!question.trim()}>Soruyu hazırla</button>
      </form>
    </details>
    {help && <InlineCoaching key={JSON.stringify(help.request)} {...help} initiallyOpen onDismiss={() => setHelp(undefined)} />}
  </div>
}

export function InlineCoaching({ label, request, initiallyOpen = false, onDismiss }: {
  label: string; request: TutorRequest; initiallyOpen?: boolean; onDismiss?: () => void
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const { connection, unavailable, call } = useConnection(open)
  const [answer, setAnswer] = useState<TutorResponse>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [practice, setPractice] = useState('')
  const [compared, setCompared] = useState(false)
  const pending = useRef<AbortController>(null)
  useEffect(() => () => pending.current?.abort(), [])

  async function run() {
    if (pending.current || connection?.status !== 'connected' || connection.blocked) return
    const controller = new AbortController()
    pending.current = controller
    const provider: TutorProvider = {
      async suggest(request, signal) {
        const data = z.object({ result: z.unknown() }).parse(await call('suggest',
          { request, allowPlanOrCredits: true }, signal))
        return validateTutorResponse(data.result, request)
      },
    }
    setBusy(true)
    setError('')
    try { setAnswer(await provider.suggest(request, controller.signal)) }
    catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof LocalTutorError ? cause.message : 'Öğretmen yanıtı doğrulanamadı. Yerel çalışmaya devam edebilirsin.')
    } finally {
      pending.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  if (!isLocalTutorAvailable()) return <div className="lesson-coaching"><TutorUnavailableNote /></div>
  if (!open) return <button type="button" className="link-button" onClick={() => setOpen(true)}>{label}</button>
  return <section className="lesson-coaching" aria-label={label}>
    {request.question && <p><strong>Sorun</strong> {request.question}</p>}
    {!connection && !unavailable && <p role="status">Öğretmen bağlantısı kontrol ediliyor…</p>}
    {(unavailable || (connection && connection.status !== 'connected')) &&
      <p>Bu yardım için Ayarlar’da ChatGPT hesabını bağlayabilirsin. Yerel çalışmaya devam edebilirsin.</p>}
    {connection?.blocked && <p>Kullanım sınırına ulaşıldı. <a href={usage} target="_blank" rel="noreferrer">Kullanımı yönet</a></p>}
    {connection?.status === 'connected' && !connection.blocked && !answer && <>
      <p>{request.sentence ? 'Bu yanıtın ve ders bağlamı' : request.question ? 'Sorun ve ders bağlamı' : 'Ders bağlamı'} ChatGPT’ye gönderilir. Bu tek istek plan kotanı ve hesabında açıksa ücretli kredilerini kullanabilir.</p>
      <div className="button-row">
        <button type="button" className="secondary" disabled={busy} onClick={() => void run()}>
          {busy ? 'Öğretmen yanıtı bekleniyor…' : 'Onayla ve gönder'}
        </button>
        <button type="button" className="link-button" disabled={busy} onClick={() => onDismiss ? onDismiss() : setOpen(false)}>Şimdi değil</button>
      </div>
    </>}
    {error && <p role="alert">{error}</p>}
    {answer && <div aria-label="Öğretmen geri bildirimi">
      {answer.task === 'explanation' && <p>{answer.text}</p>}
      {answer.task === 'examples' && <ul>{answer.examples.map(({ example, note }, index) =>
        <li key={index}><span lang={request.language}>{example}</span> · {note}</li>)}</ul>}
      {answer.task === 'feedback' && <>
        <dl><dt>Dil bilgisi</dt><dd>{answer.grammar}</dd><dt>Sözcük seçimi</dt><dd>{answer.vocabulary}</dd>
          <dt>Doğallık</dt><dd>{answer.naturalness}</dd><dt>Göreve uygunluk</dt><dd>{answer.suitability}</dd></dl>
        {answer.corrections.map(({ quote, correction, explanation }, index) => <p key={index}>
          <span lang={request.language}>{quote} → {correction}</span> · {explanation}</p>)}
        <p>Önerileri bir sonraki yazı düzenlemesinde dene.</p>
      </>}
      {answer.task === 'practice' && <>
        <p>{answer.prompt}</p>
        <label>Pratik yanıtın<textarea value={practice} maxLength={2000} onChange={(event) => setPractice(event.target.value)} /></label>
        <button type="button" className="secondary" disabled={!practice.trim()} onClick={() => setCompared(true)}>Örnekle karşılaştır</button>
        {compared && <><p lang={request.language}>{answer.sample}</p><p>{answer.explanation}</p></>}
        <p>Bu prova puanlanmaz. Günlük plandaki sonraki çalışma kayıtlı alıştırmalarla devam eder.</p>
      </>}
    </div>}
  </section>
}
