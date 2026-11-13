import { createServer } from 'node:net'
import { readFile } from 'node:fs/promises'
import { expect, test } from 'vitest'
// @ts-expect-error The npm launcher is native JavaScript.
import { verifyPortAvailable } from '../server/start.mjs'
import localConfig from '../server/local.config'
import { storageIssue } from '../src/persistence/storage-error'

test('both npm commands use the same launcher and only canonical preview installs the account service', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  expect(pkg.scripts).toMatchObject({ start: 'node server/start.mjs', dev: 'npm start' })
  const plugin = localConfig.plugins[0]
  const installed = new Set<unknown>()
  const preview = { host: '127.0.0.1', port: 4173, strictPort: true }
  const configure = (options: typeof preview) => plugin.configurePreviewServer({
    config: { preview: options }, middlewares: { use: (handler: unknown) => installed.add(handler) },
  } as unknown as Parameters<typeof plugin.configurePreviewServer>[0])
  configure({ ...preview, port: 5173 })
  configure({ ...preview, host: '0.0.0.0' })
  configure({ ...preview, strictPort: false })
  expect(installed.size).toBe(0)
  configure(preview)
  expect(installed.size).toBe(1)
})

test('an occupied port is rejected and its listener stays open', async () => {
  const listener = createServer()
  await new Promise<void>((resolve, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolve))
  const address = listener.address()
  if (!address || typeof address === 'string') throw new Error('Missing test port')
  try {
    await expect(verifyPortAvailable(address.port)).rejects.toThrow(/kullanımda/)
    expect(listener.listening).toBe(true)
  } finally {
    await new Promise<void>((resolve) => listener.close(() => resolve()))
  }
  await expect(verifyPortAvailable(address.port)).resolves.toBeUndefined()
})

test('technical diagnostics identify the operation and browser error without exposing the raw message', () => {
  const failure = { name: 'OpenFailedError', inner: new DOMException('private disk path', 'UnknownError') }
  const issue = storageIssue('open', failure)
  expect(issue).toMatchObject({ operation: 'open', type: 'OpenFailedError', innerType: 'UnknownError' })
  expect(issue.advice).toContain('Chrome’u tamamen kapat')
  expect(JSON.stringify(issue)).not.toContain('private disk path')
})
