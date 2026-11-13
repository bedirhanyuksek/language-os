import { randomUUID } from 'node:crypto'
import { chmod, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { clientIdSchema } from './oauth'

export const credentialSchema = z.strictObject({
  clientId: clientIdSchema,
  subject: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.number().positive(),
  scope: z.string(),
})
export type Credential = z.infer<typeof credentialSchema>

export function credentialStore(directory: string) {
  async function inspect() {
    const info = await lstat(directory)
    if (!info.isDirectory() || (process.getuid && info.uid !== process.getuid())) throw new Error('Kimlik dizini güvenli değil.')
    if (process.platform !== 'win32' && (info.mode & 0o077)) await chmod(directory, 0o700)
  }

  async function prepare() {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    await inspect()
  }

  async function read(name: string) {
    try {
      await inspect()
      const path = join(directory, name)
      const info = await lstat(path)
      if (!info.isFile() || info.size > 100_000 || (process.getuid && info.uid !== process.getuid())) throw new Error('Kimlik kaydı geçersiz.')
      if (process.platform !== 'win32' && (info.mode & 0o077)) throw new Error('Kimlik kaydı izinleri güvenli değil.')
      return JSON.parse(await readFile(path, 'utf8')) as unknown
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  async function save(name: string, value: unknown) {
    await prepare()
    const temporary = join(directory, randomUUID() + '.tmp')
    try {
      await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' })
      await rename(temporary, join(directory, name))
    } finally {
      await rm(temporary, { force: true })
    }
  }

  return {
    async hostId() {
      await prepare()
      const old = await read('host.json')
      if (old !== undefined) return z.string().regex(/^urn:uuid:[0-9a-f-]{36}$/i).parse(old)
      const fresh = 'urn:uuid:' + randomUUID()
      await save('host.json', fresh)
      return fresh
    },
    async load() {
      const raw = await read('credentials.json')
      return raw === undefined ? undefined : credentialSchema.parse(raw)
    },
    save: (value: Credential) => save('credentials.json', value),
    async clear() {
      await prepare()
      await rm(join(directory, 'credentials.json'), { force: true })
    },
  }
}
