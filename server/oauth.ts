import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { z } from 'zod'

export const issuer = 'https://auth.openai.com'
export const resource = 'https://api.openai.com/v1'
export const planScope = 'chatgpt.tokens.use.direct'
export const callbackPath = '/auth/callback'
export const secret = () => randomBytes(32).toString('base64url')
export const clientIdSchema = z.string().regex(/^oaiapp_[\w-]{1,150}$/)

export function sameSecret(actual: string | undefined, expected: string) {
  return typeof actual === 'string' && actual.length === expected.length &&
    Buffer.byteLength(actual) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
}

export function authorize(hostId: string, origin: string, clientId?: string) {
  const state = secret()
  const nonce = secret()
  const verifier = secret()
  const redirectUri = origin + callbackPath
  const url = new URL('/api/accounts/authorize', issuer)
  url.search = new URLSearchParams({
    client_id: clientId ?? 'dynamic_agent_client', ext_agent_host_id: hostId,
    response_type: 'code', redirect_uri: redirectUri, resource, state, nonce,
    scope: `openid profile email offline_access resource.invoke ${planScope}`,
    code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    ...(clientId ? { prompt: 'consent' } : { agent_name_hint: 'Language OS' }),
  }).toString()
  return { url, state, nonce, verifier, redirectUri, clientId, deadline: Date.now() + 180_000 }
}

export function callback(params: URLSearchParams, flow: ReturnType<typeof authorize>) {
  if (Date.now() > flow.deadline || params.getAll('state').length !== 1 || !sameSecret(params.get('state') ?? undefined, flow.state)) return
  const code = params.getAll('code')
  const client = params.getAll('client_id')
  if (params.has('error')) return { denied: true as const }
  const clientId = clientIdSchema.safeParse(client[0] ?? flow.clientId)
  if (code.length !== 1 || !code[0] || code[0].length > 4096 || client.length > 1 || !clientId.success ||
    (flow.clientId && flow.clientId !== clientId.data)) return { denied: true as const }
  return { denied: false as const, code: code[0], clientId: clientId.data }
}

const keys = createRemoteJWKSet(new URL('/.well-known/jwks.json', issuer), { timeoutDuration: 5000 })
export async function verifyIdentity(token: string, clientId: string, nonce: string, keySet: JWTVerifyGetKey = keys) {
  const { payload } = await jwtVerify(token, keySet, { issuer, audience: clientId, requiredClaims: ['sub', 'exp', 'iat', 'nonce'] })
  if (payload.nonce !== nonce || !payload.sub) throw new Error('Kimlik doğrulanamadı.')
  return payload.sub
}
