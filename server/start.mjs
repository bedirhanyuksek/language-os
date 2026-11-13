import { spawn } from 'node:child_process'
import console from 'node:console'
import { createServer } from 'node:net'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { preview } from 'vite'

const host = '127.0.0.1'
const port = 4173

export function verifyPortAvailable(checkPort = port) {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', (error) => {
      reject(error.code === 'EADDRINUSE' ? new Error(
        `Port ${checkPort} kullanımda. Language OS zaten açıksa http://${host}:${checkPort}/ adresini kullan. ` +
        'Yeniden başlatmak için önce Language OS’u çalıştıran terminalde Ctrl+C kullan. Başka bir uygulama portu kullanıyorsa o uygulamayı kontrol et.',
        { cause: error },
      ) : error)
    })
    probe.listen(checkPort, host, () => probe.close((error) => error ? reject(error) : resolve()))
  })
}

async function build() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'build'], { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error('Üretim derlemesi tamamlanamadı.')))
  })
}

async function start() {
  await verifyPortAvailable()
  await build()
  const server = await preview({
    configFile: 'server/local.config.ts',
    configLoader: 'runner',
    preview: { host, port, strictPort: true },
  })
  server.printUrls()
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  start().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Language OS başlatılamadı.')
    process.exitCode = 1
  })
}
