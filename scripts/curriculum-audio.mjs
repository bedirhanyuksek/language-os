import { readFileSync, readdirSync, existsSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

const args = process.argv.slice(2)
const force = args.includes('--force')
const list = args.includes('--list')
const selected = args.filter((arg) => !['--force', '--list'].includes(arg))
const root = new URL('../src/content/', import.meta.url)
const packs = new URL('packs/', root)
const files = [...readdirSync(packs).filter((name) => name.endsWith('.json')), 'es.json'].sort()
for (const name of selected) {
  if (!files.includes(name)) throw new Error(`Paket bulunamadı: ${name}`)
}
const voices = { en: ['en-us', '153'], ru: ['ru', '140'], es: ['es', '140'] }
const clips = files.filter((name) => !selected.length || selected.includes(name)).flatMap((file) => {
  const { language, lessons } = JSON.parse(readFileSync(new URL(file, file === 'es.json' ? root : packs), 'utf8'))
  if (!Object.hasOwn(voices, language)) throw new Error(`Geçersiz dil: ${file}`)
  return lessons.flatMap((lesson) => {
    if (!/^(en|ru|es)\.[a-z][a-z0-9-]+$/.test(lesson.id) || !lesson.id.startsWith(language + '.')) {
      throw new Error(`Geçersiz ders kimliği: ${file}`)
    }
    return [
      ...lesson.models.map(({ phrase }, index) => [`model.${index + 1}`, phrase]),
      ['input', lesson.input.transcript], ['retry', lesson.retry.transcript],
      ...[lesson.word, ...(lesson.additionalWords ?? [])].map(({ example }, index) => [`word.${index + 1}`, example]),
    ].map(([key, text]) => ({ file: `${lesson.id}.${key}.mp3`, text,
      options: ['-b', '1', '-v', voices[language][0], '-s', voices[language][1]] }))
  })
})
// Read-only inventory works even when synthesis tools are not installed.
if (list) {
  await new Promise((resolve, reject) => {
    process.stdout.write(JSON.stringify(clips, null, 2) + '\n', (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
  process.exit(0)
}
const library = process.env.LANGUAGE_OS_ESPEAK_WASM_DIR
const espeak = library && (await import(pathToFileURL(join(library, 'dist/espeak-ng.js')).href)).default
const wasm = library && readFileSync(join(library, 'dist/espeak-ng.wasm'))
const temp = mkdtempSync(fileURLToPath(new URL('audio/.author-tmp-', root)))
const wav = join(temp, 'speech.wav')
const mp3 = join(temp, 'speech.mp3')
let written = 0
try {
  for (const { file, text: phrase, options } of clips) {
    const destination = new URL(`audio/${file}`, root)
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
  console.log(`Üretilen sentetik MP3: ${written}`)
} finally {
  rmSync(temp, { recursive: true, force: true })
}
