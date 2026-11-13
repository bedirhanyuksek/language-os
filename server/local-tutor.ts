import type { IncomingMessage, ServerResponse } from 'node:http'
import { z } from 'zod'
import { catalog } from '../src/content/catalog'
import { tutorInput, tutorRequest, validateTutorResponse } from '../src/domain/tutor'
import { ChatGPTError, chatGPTProvider, hasPlan } from './chatgpt'
import { credentialStore, type Credential } from './credentials'
import { authorize, callback, callbackPath, sameSecret, secret } from './oauth'

const prefix = '/local-tutor/'
const inference = z.strictObject({ model: z.string().min(1).max(160).optional(), request: tutorRequest, allowPlanOrCredits: z.literal(true) })
type Store = ReturnType<typeof credentialStore>
type Provider = ReturnType<typeof chatGPTProvider>
const notices: Record<string, string> = {
  denied: 'Yetkilendirme tamamlanmadı. Yeniden deneyebilirsin.',
  identity: 'ChatGPT hesabı doğrulanamadı.',
  reauthorize: 'ChatGPT bağlantısını yeniden yetkilendir.',
  plan: 'Hesap bağlı. ChatGPT planı kullanım izni gerekiyor.',
  connection: 'ChatGPT ile bağlantı kurulamadı. Daha sonra yeniden dene.',
  subscription_sharing_user_not_eligible: 'Bu hesap veya çalışma alanı plan kullanımına uygun değil.',
  subscription_sharing_usage_limit_exceeded: 'Kullanım sınırına ulaşıldı. ChatGPT kullanım ayarlarını kontrol et.',
  subscription_sharing_usage_unavailable: 'ChatGPT kullanım hakkı şu anda doğrulanamıyor.',
  subscription_sharing_unsupported_capability: 'Seçilen model bu isteği desteklemiyor. Başka bir model seç.',
  subscription_sharing_route_not_supported: 'Bu hesap için plan üzerinden metin isteği kullanılamıyor.',
  chatpass_v2_scope_not_authorized: 'Hesap bu isteğe izin vermedi. ChatGPT bağlantı izinlerini kontrol et.',
  chatpass_v2_invalid_authorization_context: 'Hesap bu isteğe izin vermedi. ChatGPT bağlantı izinlerini kontrol et.',
  incomplete: 'ChatGPT yanıtı tamamlanmadı.',
  no_models: 'Bu hesapta ders isteği için kullanılabilir model bulunamadı.',
  invalid_result: 'Yanıt doğrulanamadı. Dersine devam edebilir veya tekrar deneyebilirsin.',
  invalid: 'İstek veya ders bağlamı geçersiz.',
  busy: 'Başka bir ChatGPT işlemi sürüyor.',
  remote_revoke: 'Yerel bağlantı kaldırıldı. ChatGPT tarafındaki iptali bağlantı ayarlarından kontrol et.',
}

async function readBody(req: IncomingMessage) {
  let bytes = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > 16_384) throw new ChatGPTError('invalid', 413)
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

export function localTutor(port: number, store: Store, provider: Provider = chatGPTProvider()) {
  const host = `127.0.0.1:${port}`
  const origin = `http://${host}`
  const browserSession = secret()
  const csrf = secret()
  let flow: ReturnType<typeof authorize> | undefined
  let credential: Credential | undefined
  let loaded = false
  let busy = false
  let reauthorize = false
  let blocked = false
  let notice: string | undefined
  let available: Awaited<ReturnType<Provider['list']>> = []

  async function load() {
    if (!loaded) {
      credential = await store.load()
      loaded = true
    }
  }

  function state() {
    const status = flow && Date.now() <= flow.deadline ? 'pending' : !credential ? 'disconnected' :
      reauthorize ? 'reauthorize' : hasPlan(credential) ? 'connected' : 'plan_required'
    return { status, models: available, notice, blocked }
  }

  async function access() {
    if (!credential || reauthorize) throw new ChatGPTError('reauthorize', 401)
    if (!hasPlan(credential)) throw new ChatGPTError('plan', 403)
    if (credential.expiresAt <= Date.now() + 30_000) {
      const renewed = await provider.refresh(credential)
      await store.save(renewed)
      credential = renewed
    }
    if (!hasPlan(credential)) throw new ChatGPTError('plan', 403)
    return credential
  }

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const pathname = req.url?.split('?')[0]
    if (!pathname?.startsWith(prefix) && pathname !== callbackPath) return next()
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    const json = (status: number, payload: object) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(payload))
    }
    const redirect = (location: string) => res.writeHead(303, { Location: location }).end()
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== origin)) {
      json(403, { error: 'Yerel adres doğrulanamadı.' })
      return
    }
    const cookies = new Map(req.headers.cookie?.split(';').map((part) => {
      const [name, ...value] = part.trim().split('=')
      return [name, value.join('=')]
    }))
    void handle().catch((error: unknown) => {
      const reason = error instanceof ChatGPTError ? error : new ChatGPTError('connection')
      if (pathname === callbackPath) {
        notice = notices[reason.code] ?? notices.identity
        redirect('/?chatgpt=return')
        return
      }
      if (['invalid_grant', 'reauthorize', 'subscription_sharing_invalid_user'].includes(reason.code) || reason.status === 401) {
        reauthorize = true
        available = []
      }
      if (reason.status === 429 || reason.code === 'subscription_sharing_usage_limit_exceeded') blocked = true
      const message = blocked ? notices.subscription_sharing_usage_limit_exceeded :
        reauthorize && reason.status === 401 ? notices.reauthorize : notices[reason.code] ?? notices.connection
      json(blocked ? 429 : reason.status, { error: message, ...state() })
    })

    async function handle() {
      if (pathname === callbackPath) {
        if (req.method !== 'GET' || !flow || busy || !sameSecret(cookies.get('lo-oauth'), browserSession)) return json(400, { error: notices.denied })
        const pending = flow
        const result = callback(new URL(req.url!, origin).searchParams, pending)
        if (!result) return json(400, { error: notices.denied })
        flow = undefined
        res.setHeader('Set-Cookie', 'lo-oauth=; HttpOnly; SameSite=Lax; Path=/auth/callback; Max-Age=0')
        if (result.denied) {
          notice = notices.denied
          return redirect('/?chatgpt=return')
        }
        busy = true
        try {
          const verified = await provider.connect(pending, result.clientId, result.code)
          if (pending.clientId && verified.subject !== credential?.subject) throw new ChatGPTError('identity')
          await store.save(verified)
          credential = verified
          reauthorize = false
          available = []
          blocked = false
          notice = hasPlan(verified) ? undefined : notices.plan
        } finally {
          busy = false
        }
        return redirect('/?chatgpt=return')
      }

      const sameOrigin = req.headers['sec-fetch-site'] === 'same-origin'
      if (pathname === prefix + 'status' && req.method === 'GET' && sameOrigin && req.headers['x-language-os'] === '1') {
        await load()
        res.setHeader('Set-Cookie', `lo-local=${browserSession}; HttpOnly; SameSite=Strict; Path=/local-tutor`)
        return json(200, { ...state(), csrf })
      }
      const cookie = cookies.get('lo-local')
      if (req.method !== 'POST' || req.headers.origin !== origin || !sameOrigin ||
        !sameSecret(cookie, browserSession) || !sameSecret(String(req.headers['x-language-os-csrf'] ?? ''), csrf) ||
        req.headers['content-type']?.split(';')[0] !== 'application/json') {
        return json(403, { error: 'Yerel istek yetkilendirilmedi.' })
      }
      if (busy) throw new ChatGPTError('busy', 409)
      busy = true
      try {
        await load()
        notice = undefined
        switch (pathname) {
          case prefix + 'connect': {
            const hostId = await store.hostId()
            flow = authorize(hostId, origin, credential?.clientId)
            res.setHeader('Set-Cookie', `lo-oauth=${browserSession}; HttpOnly; SameSite=Lax; Path=/auth/callback; Max-Age=180`)
            return json(200, { ...state(), authorizationUrl: flow.url.href })
          }
          case prefix + 'cancel':
            flow = undefined
            return json(200, state())
          case prefix + 'check':
            available = await provider.list(await access())
            blocked = false
            if (!available.length) notice = 'Bu hesapta seçilebilir model bulunamadı.'
            return json(200, state())
          case prefix + 'disconnect': {
            flow = undefined
            const previous = credential
            await store.clear()
            credential = undefined
            available = []
            reauthorize = false
            blocked = false
            if (previous && !await provider.revoke(previous).catch(() => false)) notice = notices.remote_revoke
            return json(200, state())
          }
          case prefix + 'suggest': {
            if (blocked) throw new ChatGPTError('subscription_sharing_usage_limit_exceeded', 429)
            const body = await readBody(req).catch((error: unknown) => {
              if (error instanceof ChatGPTError) throw error
              throw new ChatGPTError('invalid', 400)
            })
            const parsed = inference.safeParse(body)
            if (!parsed.success) throw new ChatGPTError('invalid', 400)
            const { request, model: selected } = parsed.data
            let input
            try { input = tutorInput(request, catalog[request.language]) } catch { throw new ChatGPTError('invalid', 400) }
            const credential = await access()
            if (!available.length && !selected) available = await provider.list(credential)
            const model = selected ?? available[0]?.id
            if (!model) throw new ChatGPTError('no_models', 422)
            if (!available.some(({ id }) => id === model)) throw new ChatGPTError('invalid', 400)
            const text = await provider.respond(credential, model, input)
            let result
            try { result = validateTutorResponse(JSON.parse(text), request) } catch { throw new ChatGPTError('invalid_result') }
            return json(200, { result })
          }
          default: return json(404, { error: notices.invalid })
        }
      } finally {
        busy = false
      }
    }
  }
}
