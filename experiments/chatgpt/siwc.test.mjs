import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { URLSearchParams } from 'node:url'
import { ReadableStream } from 'node:stream/web'
import { TextEncoder } from 'node:util'
import { generateKeyPair, SignJWT } from 'jose'
import { authorization, completedText, hasPlanPermission, parseCallback, verifyIdentity } from './siwc.mjs'

test('authorization uses the documented loopback URI, S256, nonce and plan scopes', () => {
  const host = 'urn:uuid:72752ef8-871a-4a80-8299-ccfeec0dc4e1'
  const flow = authorization(host, 49152)
  const query = flow.url.searchParams
  assert.equal(flow.url.origin, 'https://auth.openai.com')
  assert.equal(query.get('client_id'), 'dynamic_agent_client')
  assert.equal(query.get('redirect_uri'), 'http://127.0.0.1:49152/auth/callback')
  assert.equal(query.get('ext_agent_host_id'), host)
  assert.equal(query.get('code_challenge_method'), 'S256')
  assert.equal(query.get('code_challenge'), createHash('sha256').update(flow.verifier).digest('base64url'))
  assert.equal(query.get('state'), flow.state)
  assert.equal(query.get('nonce'), flow.nonce)
  assert.match(query.get('scope'), /chatgpt\.tokens\.use\.direct/)
  assert.notEqual(authorization(host, 49152).state, flow.state)
})

test('callback rejects altered state, duplicate keys, missing issued IDs and denied consent', () => {
  const parse = (query) => parseCallback(new URLSearchParams(query), 'expected')
  assert.equal(parse('state=changed&code=x&client_id=oaiapp_test'), null)
  assert.equal(parse('state=expected&state=expected&code=x&client_id=oaiapp_test'), null)
  assert.deepEqual(parse('state=expected&code=x'), { denied: true })
  assert.deepEqual(parse('state=expected&error=access_denied'), { denied: true })
  assert.deepEqual(parse('state=expected&code=x&client_id=oaiapp_test'), { code: 'x', clientId: 'oaiapp_test' })
})

test('local signed token fixture verifies signature, audience, issuer, expiry and nonce', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const issue = (issuer, expiry) => new SignJWT({ nonce: 'expected' }).setProtectedHeader({ alg: 'RS256' })
    .setSubject('local-test').setAudience('oaiapp_test').setIssuer(issuer).setIssuedAt().setExpirationTime(expiry).sign(privateKey)
  const token = await issue('https://auth.openai.com', '2m')
  await verifyIdentity(token, 'oaiapp_test', 'expected', publicKey)
  await assert.rejects(verifyIdentity(token, 'oaiapp_other', 'expected', publicKey))
  await assert.rejects(verifyIdentity(token, 'oaiapp_test', 'other', publicKey))
  const other = await generateKeyPair('RS256')
  await assert.rejects(verifyIdentity(token, 'oaiapp_test', 'expected', other.publicKey))
  await assert.rejects(verifyIdentity(await issue('https://example.org', '2m'), 'oaiapp_test', 'expected', publicKey))
  await assert.rejects(verifyIdentity(await issue('https://auth.openai.com', 1), 'oaiapp_test', 'expected', publicKey))
  assert.equal(hasPlanPermission({ scope: 'openid profile', access_token: 'test' }), false)
  assert.equal(hasPlanPermission({ scope: 'chatgpt.tokens.use.direct' }), false)
  assert.equal(hasPlanPermission({ scope: 'openid chatgpt.tokens.use.direct', access_token: 'test' }), true)
})

test('SSE parser requires completed inference and handles chunk boundaries and failures', async () => {
  const body = (chunks) => new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
      controller.close()
    },
  })
  const delta = 'data: {"type":"response.output_text.delta","delta":"LANGUAGE_OS_OK"}'
  const completed = 'data: {"type":"response.completed"}'
  assert.equal(await completedText(body([delta.slice(0, 11), delta.slice(11) + '\r\n\r', '\n' + completed + '\n\n'])), 'LANGUAGE_OS_OK')
  await assert.rejects(completedText(body([delta + '\n\n'])), /response.completed/)
  await assert.rejects(completedText(body(['data: {"type":"response.failed","response":{"error":{"code":"subscription_sharing_usage_limit_exceeded"}}}\n\n'])), /usage_limit_exceeded/)
})
