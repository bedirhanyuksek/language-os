import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { createInterface } from 'node:readline/promises'
import { pathToFileURL, URL, URLSearchParams } from 'node:url'
import { TextDecoderStream } from 'node:stream/web'
import { setTimeout, clearTimeout } from 'node:timers'
import process from 'node:process'
import console from 'node:console'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const { fetch, AbortSignal } = globalThis

const issuer = 'https://auth.openai.com'
const resource = 'https://api.openai.com/v1'
const callbackPath = '/auth/callback'
const planScope = 'chatgpt.tokens.use.direct'
const testText = 'Reply with exactly: LANGUAGE_OS_OK'

class ProbeError extends Error {}

function validateHostId(hostId) {
  if (!/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hostId ?? '')) {
    throw new ProbeError('LO_SIWC_HOST_ID için kalıcı bir urn:uuid:UUIDv4 değeri ver.')
  }
}

export function authorization(hostId, port) {
  validateHostId(hostId)
  const verifier = randomBytes(32).toString('base64url')
  const nonce = randomBytes(32).toString('base64url')
  const state = randomBytes(32).toString('base64url')
  const redirect = `http://127.0.0.1:${port}${callbackPath}`
  const url = new URL('/api/accounts/authorize', issuer)
  url.search = new URLSearchParams({
    client_id: 'dynamic_agent_client', agent_name_hint: 'Language OS', ext_agent_host_id: hostId,
    response_type: 'code', redirect_uri: redirect, resource, state, nonce,
    scope: `openid profile email offline_access resource.invoke ${planScope}`,
    code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  }).toString()
  return { url, verifier, nonce, state, redirect }
}

export function parseCallback(params, state) {
  if (params.getAll('state').length !== 1 || params.get('state') !== state) return null
  if (params.has('error')) return { denied: true }
  const code = params.get('code')
  const clientId = params.get('client_id')
  if (!code || !/^oaiapp_[\w-]+$/.test(clientId ?? '') ||
    params.getAll('code').length !== 1 || params.getAll('client_id').length !== 1) {
    return { denied: true }
  }
  return { code, clientId }
}

export async function verifyIdentity(idToken, clientId, nonce, keySet) {
  const { payload } = await jwtVerify(idToken, keySet, {
    issuer, audience: clientId, requiredClaims: ['sub', 'exp', 'iat', 'nonce'],
  })
  if (payload.nonce !== nonce || !payload.sub) throw new ProbeError('ID token kimliği veya nonce doğrulanamadı.')
}

export function hasPlanPermission(grant) {
  return typeof grant.scope === 'string' && grant.scope.split(/\s+/).includes(planScope) &&
    typeof grant.access_token === 'string' && grant.access_token.length > 0
}

export async function completedText(body) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let output = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      if (buffer.length > 1_000_000) throw new ProbeError('Yanıt olay tamponu sınırı aşıldı.')
      for (;;) {
        const boundary = /\r?\n\r?\n/.exec(buffer)
        if (!boundary) break
        const payload = buffer.slice(0, boundary.index).split(/\r?\n/)
          .filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n')
        buffer = buffer.slice(boundary.index + boundary[0].length)
        if (!payload || payload === '[DONE]') continue
        const event = JSON.parse(payload)
        if (event.type === 'response.completed') return output
        if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') output += event.delta
        if (['response.failed', 'response.incomplete', 'error'].includes(event.type)) {
          const code = event.response?.error?.code ?? event.code
          throw new ProbeError(`Responses tamamlanmadı (${safeId(code) ?? event.type}).`)
        }
        if (output.length > 4096) throw new ProbeError('Deneme metni sınırı aşıldı.')
      }
    }
    throw new ProbeError('Akış response.completed olmadan bitti.')
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

function safeId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value) ? value : undefined
}

async function fetchOpenAI(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(45_000) })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    const code = safeId(detail?.error?.code ?? detail?.error)
    const requestId = safeId(response.headers.get('x-request-id'))
    throw new ProbeError(`OpenAI HTTP ${response.status}${code ? ` (${code})` : ''}${requestId ? ` · istek ${requestId}` : ''}`)
  }
  return response
}

async function waitForConsent(hostId) {
  let receive
  const result = new Promise((resolve) => { receive = resolve })
  let flow
  let consumed = false
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
    const redirect = new URL(flow.redirect)
    let callback
    try {
      callback = new URL(request.url, redirect.origin)
    } catch {
      response.writeHead(400).end()
      return
    }
    if (request.method !== 'GET' || request.headers.host !== redirect.host || callback.origin !== redirect.origin ||
      callback.pathname !== callbackPath || consumed) {
      response.writeHead(404).end()
      return
    }
    const parsed = parseCallback(callback.searchParams, flow.state)
    if (!parsed) {
      response.writeHead(400).end('Geçersiz işlem.')
      return
    }
    consumed = true
    response.end('Tarayıcı adımı tamamlandı. Terminale dönebilirsin.')
    receive(parsed)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject).listen(0, '127.0.0.1', resolve)
  })
  let timer
  try {
    flow = authorization(hostId, server.address().port)
    console.log('Bu adresi kendi tarayıcında aç ve seçtiğin hesap için izinleri incele.\n' + flow.url)
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Yetkilendirme zaman aşımına uğradı.')), 180_000)
    })
    const callback = await Promise.race([result, timeout])
    if (callback.denied) throw new ProbeError('Yetkilendirme reddedildi veya eksik döndü.')
    return { ...flow, ...callback }
  } finally {
    clearTimeout(timer)
    server.close()
    server.closeAllConnections()
  }
}

async function run() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new ProbeError('Denemeyi etkileşimli bir terminalden çalıştır.')
  const hostId = process.env.LO_SIWC_HOST_ID
  validateHostId(hostId)
  const { code, clientId, verifier, nonce, redirect } = await waitForConsent(hostId)
  const token = await fetchOpenAI(new URL('/api/accounts/oauth/token', issuer), {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code', client_id: clientId, code, code_verifier: verifier,
      redirect_uri: redirect, resource,
    }),
  }).then((response) => response.json())
  await verifyIdentity(token.id_token, clientId, nonce,
    createRemoteJWKSet(new URL('/.well-known/jwks.json', issuer), { timeoutDuration: 5000 }))
  console.log('Hesap kimliği doğrulandı.')
  if (!hasPlanPermission(token)) throw new ProbeError('Plan izni verilmedi. Metin isteği gönderilmedi.')
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await prompt.question('ChatGPT Usage altında diğer uygulamaların kredi kullanımını kapattıysan ve planından tek metin isteğini onaylıyorsan EVET yaz: ')
    if (answer !== 'EVET') return
  } finally {
    prompt.close()
  }
  const headers = { Authorization: `Bearer ${token.access_token}` }
  const listing = await fetchOpenAI(`${resource}/models`, { headers }).then((response) => response.json())
  const model = listing.models?.find((item) => item.visibility === 'list' && item.slug === process.env.LO_SIWC_MODEL) ??
    (!process.env.LO_SIWC_MODEL ? listing.models?.find((item) => item.visibility === 'list' && item.slug) : undefined)
  if (!model) throw new ProbeError('Seçilen hesapta uygun model bulunamadı.')
  const response = await fetchOpenAI(`${resource}/responses`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model.slug, input: [{ role: 'user', content: testText }], store: false, stream: true }),
  })
  const text = await completedText(response.body)
  if (text.trim() !== 'LANGUAGE_OS_OK') throw new ProbeError('Metin isteği tamamlandı, fakat beklenen LANGUAGE_OS_OK dönmedi.')
  console.log(`Metin isteği tamamlandı · ${model.slug} · LANGUAGE_OS_OK`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    // OAuth URLs, token bodies and JWT details never go into terminal diagnostics.
    console.error(error instanceof ProbeError ? error.message : 'Bağlantı veya kimlik doğrulaması başarısız.')
    process.exitCode = 1
  })
}
