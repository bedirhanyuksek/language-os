import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { expect, test, vi } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } from 'jose'
import { catalog } from '../src/content/catalog'
import { buildTutorRequest, validateTutorResponse } from '../src/domain/tutor'
import { initialState } from '../src/domain/state'
import { chatGPTProvider, ChatGPTError, completedText } from '../server/chatgpt'
import { credentialStore } from '../server/credentials'
import { authorize, callback, issuer, planScope, verifyIdentity } from '../server/oauth'
import { localTutor } from '../server/local-tutor'

const lesson = catalog.en.unit.lessons[0]
const state = initialState({ id: '72752ef8-871a-4a80-8299-ccfeec0dc4e1', language: 'en',
  estimate: 'C1', target: 'B2', days: [1], goals: ['professional'], minutes: 30 })
const request = buildTutorRequest(state, lesson, 'feedback', 'I have joined last May.')

test('binds PKCE, callback and verified identity to the same OAuth attempt', async () => {
  const flow = authorize('urn:uuid:test', 'http://127.0.0.1:4173', 'oaiapp_test')
  expect(flow.url.searchParams.get('code_challenge')).toBe(createHash('sha256').update(flow.verifier).digest('base64url'))
  expect(flow.url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:4173/auth/callback')
  expect(callback(new URLSearchParams({ state: flow.state, code: 'one', client_id: 'oaiapp_other' }), flow)).toEqual({ denied: true })
  expect(callback(new URLSearchParams({ state: flow.state, code: 'one' }), flow)).toMatchObject({ clientId: 'oaiapp_test' })
  expect(callback(new URLSearchParams({ state: 'altered', code: 'one' }), flow)).toBeUndefined()
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const keys = createLocalJWKSet({ keys: [await exportJWK(publicKey)] })
  const token = await new SignJWT({ nonce: flow.nonce }).setProtectedHeader({ alg: 'RS256' })
    .setIssuer(issuer).setAudience('oaiapp_test').setSubject('fixture').setIssuedAt().setExpirationTime('1m').sign(privateKey)
  expect(await verifyIdentity(token, 'oaiapp_test', flow.nonce, keys)).toBe('fixture')
  await expect(verifyIdentity(token, 'oaiapp_test', 'wrong', keys)).rejects.toThrow()
})

test('only accepts complete inference and exact learner quotes', async () => {
  const event = (payload: object) => 'data: ' + JSON.stringify(payload) + '\n\n'
  const delta = event({ type: 'response.output_text.delta', delta: 'örnek' })
  await expect(completedText(new Response(delta + event({ type: 'response.completed' })).body!)).resolves.toBe('örnek')
  await expect(completedText(new Response(delta).body!)).rejects.toMatchObject({ code: 'incomplete' })
  await expect(completedText(new Response(event({ type: 'response.failed', response: { error: {
    code: 'subscription_sharing_usage_limit_exceeded',
  } } })).body!)).rejects.toMatchObject({ code: 'subscription_sharing_usage_limit_exceeded' })
  expect(() => validateTutorResponse({ task: 'feedback', grammar: 'Not', vocabulary: 'Not', naturalness: 'Not',
    suitability: 'Not', corrections: [{ quote: 'never said', correction: 'A', explanation: 'B' }] }, request)).toThrow()
})

test('loopback isolates credentials, checks usage permission, and can renew and disconnect', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'los-tutor-'))
  const store = credentialStore(directory)
  const credential = { clientId: 'oaiapp_test', subject: 'fixture-subject', accessToken: 'private-access-fixture',
    refreshToken: 'private-refresh-fixture', expiresAt: Date.now() - 1, scope: planScope }
  const provider = {
    connect: vi.fn<ReturnType<typeof chatGPTProvider>['connect']>().mockResolvedValue(credential),
    refresh: vi.fn<ReturnType<typeof chatGPTProvider>['refresh']>().mockResolvedValue({ ...credential, expiresAt: Date.now() + 3_600_000 }),
    list: vi.fn().mockResolvedValue([{ id: 'test-model', name: 'Test Model' }]),
    respond: vi.fn().mockRejectedValueOnce(new ChatGPTError('subscription_sharing_usage_limit_exceeded')).mockResolvedValue(JSON.stringify({
      task: 'feedback', grammar: 'Past simple kullan.', vocabulary: 'Uygun.', naturalness: 'Zamanı düzelt.', suitability: 'Uygun.',
      corrections: [{ quote: 'have joined', correction: 'joined', explanation: 'Last May bitmiş zamandır.' }],
    })),
    revoke: vi.fn().mockResolvedValue(true),
  }
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address() as { port: number }
    const origin = 'http://127.0.0.1:' + port
    const handler = localTutor(port, store, provider)
    server.on('request', (req, res) => handler(req, res, () => res.writeHead(404).end()))
    const url = (path: string) => origin + '/local-tutor/' + path
    const status = () => fetch(url('status'), { headers: { 'Sec-Fetch-Site': 'same-origin', 'X-Language-OS': '1' } })
    const first = await status()
    const cookie = first.headers.get('set-cookie')!.split(';')[0]
    const bootstrap = await first.json()
    expect(bootstrap.status).toBe('disconnected')
    const post = (path: string, body: object = {}, extra: Record<string, string> = {}) => fetch(url(path), {
      method: 'POST', body: JSON.stringify(body), headers: { Origin: origin, 'Sec-Fetch-Site': 'same-origin',
        'Content-Type': 'application/json', Cookie: cookie, 'X-Language-OS-CSRF': bootstrap.csrf, ...extra },
    })
    expect((await post('connect', {}, { Origin: 'https://untrusted.example' })).status).toBe(403)
    expect((await post('connect', {}, { 'X-Language-OS-CSRF': 'bad' })).status).toBe(403)
    async function start() {
      const response = await post('connect')
      const data = await response.json()
      expect(data.status).toBe('pending')
      return { authorization: new URL(data.authorizationUrl), binding: response.headers.get('set-cookie')!.split(';')[0] }
    }
    async function finish(attempt: Awaited<ReturnType<typeof start>>, params: Record<string, string>, bound = true) {
      const query = new URLSearchParams({ state: attempt.authorization.searchParams.get('state')!, ...params })
      return fetch(origin + '/auth/callback?' + query, {
        redirect: 'manual', headers: bound ? { Cookie: attempt.binding } : {},
      })
    }
    const denied = await start()
    expect((await finish(denied, { error: 'access_denied' })).status).toBe(303)
    expect((await (await status()).json()).status).toBe('disconnected')
    const attempt = await start()
    const params = { code: 'fixture', client_id: credential.clientId }
    expect((await finish(attempt, params, false)).status).toBe(400)
    expect((await finish(attempt, { ...params, state: 'forged' })).status).toBe(400)
    expect((await finish(attempt, params)).headers.get('location')).toBe('/?chatgpt=return')
    expect((await finish(attempt, params)).status).toBe(400)
    const check = await post('check')
    const visible = await check.text()
    expect(visible).toContain('Test Model')
    expect(visible).not.toMatch(/private-access|private-refresh|fixture-subject/)
    expect(provider.refresh).toHaveBeenCalledOnce()
    expect((await post('suggest', { model: 'test-model', request })).status).toBe(400)
    const query = { request, allowPlanOrCredits: true }
    expect((await post('suggest', query)).status).toBe(429)
    expect((await post('suggest', query)).status).toBe(429)
    expect(provider.respond).toHaveBeenCalledOnce()
    await post('check')
    expect(await (await post('suggest', query)).json()).toMatchObject({ result: { grammar: 'Past simple kullan.' } })
    expect(provider.respond.mock.calls[0][1]).toBe('test-model')
    expect(provider.respond.mock.calls[0][2]).toMatchObject({
      targetLanguage: 'en', explanationLanguage: 'tr', objective: lesson.objective.description, sentence: request.sentence,
    })
    expect(JSON.stringify(provider.respond.mock.calls[0][2])).not.toContain(state.profile.id)
    const returning = await start()
    expect(returning.authorization.searchParams.get('client_id')).toBe(credential.clientId)
    expect((await finish(returning, { code: 'returning' })).status).toBe(303)
    expect(await (await post('disconnect')).json()).toMatchObject({ status: 'disconnected' })
    expect(await store.load()).toBeUndefined()
    expect(provider.revoke).toHaveBeenCalledOnce()
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await rm(directory, { recursive: true, force: true })
  }
})

test('provider uses only documented endpoints and completes the verified model response', async () => {
  const calls: { url: string; options?: RequestInit }[] = []
  const fetcher = vi.fn<typeof fetch>(async (input, options) => {
    const url = String(input)
    calls.push({ url, options })
    if (url.endsWith('/oauth/token')) return Response.json({
      access_token: 'fixture-access', refresh_token: 'fixture-refresh', id_token: 'fixture-identity',
      expires_in: 3600, scope: planScope,
    })
    if (url.endsWith('/models')) return Response.json({ models: [
      { visibility: 'list', slug: 'visible-fixture', display_name: 'Fixture' },
      { visibility: 'hidden', slug: 'hidden-fixture' },
    ] })
    return new Response('data: {"type":"response.output_text.delta","delta":"example"}\n\ndata: {"type":"response.completed"}\n\n')
  })
  const identity = vi.fn().mockResolvedValue('verified-fixture')
  const provider = chatGPTProvider(fetcher, identity)
  const flow = authorize('urn:uuid:fixture', 'http://127.0.0.1:4173')
  const credential = await provider.connect(flow, 'oaiapp_test', 'fixture-code')
  expect(identity).toHaveBeenCalledWith('fixture-identity', 'oaiapp_test', flow.nonce)
  expect(calls[0].url).toBe('https://auth.openai.com/api/accounts/oauth/token')
  expect(Object.fromEntries(calls[0].options?.body as URLSearchParams)).toMatchObject({
    code_verifier: flow.verifier, redirect_uri: flow.redirectUri, client_id: 'oaiapp_test',
    grant_type: 'authorization_code', resource: 'https://api.openai.com/v1',
  })
  expect(await provider.list(credential)).toEqual([{ id: 'visible-fixture', name: 'Fixture' }])
  expect(await provider.respond(credential, 'visible-fixture', { task: 'explanation' })).toBe('example')
  expect(calls.slice(1).map(({ url }) => url)).toEqual(['https://api.openai.com/v1/models', 'https://api.openai.com/v1/responses'])
  expect(calls[2].options?.headers).toMatchObject({ Authorization: 'Bearer fixture-access' })
  expect(JSON.parse(String(calls[2].options?.body))).toMatchObject({
    model: 'visible-fixture', stream: true, store: false, input: [{ role: 'user', content: '{"task":"explanation"}' }],
  })
})
