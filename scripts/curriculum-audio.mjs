import { readFileSync, readdirSync, existsSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

const args = process.argv.slice(2)
const force = args.includes('--force')
const selected = args.filter((arg) => arg !== '--force')
const root = new URL('../src/content/', import.meta.url)
const packs = new URL('packs/', root)
const files = readdirSync(packs).filter((name) => name.endsWith('.json')).sort()
for (const name of selected) {
  if (!files.includes(name)) throw new Error(`Paket bulunamadı: ${name}`)
}
const library = process.env.LANGUAGE_OS_ESPEAK_WASM_DIR
const espeak = library && (await import(pathToFileURL(join(library, 'dist/espeak-ng.js')).href)).default
const wasm = library && readFileSync(join(library, 'dist/espeak-ng.wasm'))
const temp = mkdtempSync(fileURLToPath(new URL('audio/.author-tmp-', root)))
const wav = join(temp, 'speech.wav')
const mp3 = join(temp, 'speech.mp3')
let written = 0
try {
  for (const file of files.filter((name) => !selected.length || selected.includes(name))) {
    const { language, lessons } = JSON.parse(readFileSync(new URL(file, packs), 'utf8'))
    if (!['en', 'ru'].includes(language)) throw new Error(`Geçersiz dil: ${file}`)
    for (const lesson of lessons) {
      if (!/^(en|ru)\.[a-z][a-z0-9-]+$/.test(lesson.id)) throw new Error(`Geçersiz ders kimliği: ${file}`)
      const clips = [
        ...lesson.models.map(({ phrase }, index) => [`model.${index + 1}`, phrase]),
        ['input', lesson.input.transcript], ['retry', lesson.retry.transcript],
        ...[lesson.word, ...lesson.additionalWords].map(({ example }, index) => [`word.${index + 1}`, example]),
      ]
      for (const [key, phrase] of clips) {
        const destination = new URL(`audio/${lesson.id}.${key}.mp3`, root)
        const options = ['-b', '1', '-v', language === 'en' ? 'en-us' : 'ru', '-s', language === 'en' ? '153' : '140']
        const sourceHash = createHash('sha256').update(JSON.stringify([options, phrase])).digest('hex')
        if (!force && existsSync(destination)) {
          if (readFileSync(destination).includes(sourceHash)) continue
        }
        let input
        if (espeak) {
          const engine = await espeak({ wasmBinary: wasm, arguments: [...options, '-w', 'speech.wav', phrase] })
          input = engine.FS.readFile('speech.wav')
        } else {
          execFileSync('espeak-ng', [...options, '-w', wav, '--', phrase])
        }
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input ? 'pipe:0' : wav, '-codec:a', 'libmp3lame',
          '-b:a', '48k', '-metadata', `comment=${sourceHash}`, mp3], { input })
        renameSync(mp3, destination)
        written++
      }
    }
  }
  console.log(`Üretilen sentetik MP3: ${written}`)
} finally {
  rmSync(temp, { recursive: true, force: true })
}
