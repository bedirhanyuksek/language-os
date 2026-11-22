import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { createServer } from 'vite'
import defaults from './curriculum-tts-pronunciation.json' with { type: 'json' }
import { planCurriculumTts, runCurriculumTts } from './curriculum-tts.mjs'

const repo = fileURLToPath(new URL('../', import.meta.url))
const worker = fileURLToPath(new URL('./local-curriculum-tts.py', import.meta.url))
const run = (program, args) => execFileSync(program, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const failure = (error) => error.stderr?.toString().trim().slice(-850) || error.message
const flags = new Set(['--tts', '--audio-report', '--all'])
const options = new Set(['--output', '--ids', '--lessons', '--pronunciation'])
const within = (root, path) => {
  const offset = relative(root, path)
  return offset === '' || (!offset.startsWith('..' + sep) && offset !== '..' && !isAbsolute(offset))
}

function physicalPath(path) {
  return existsSync(path) ? realpathSync(path) : join(physicalPath(dirname(path)), basename(path))
}

function outputPath(value) {
  if (!value) throw new Error('TTS adayları için depo dışında --output dizini belirt.')
  const path = physicalPath(resolve(value))
  const pilotReview = process.env.LANGUAGE_OS_PILOT_AUDIO_REVIEW_DIR
  if (within(realpathSync(repo), path) || (pilotReview && within(physicalPath(resolve(pilotReview)), path))) {
    throw new Error('TTS adayları depo ve mevcut pilot inceleme dizini dışında üretilmelidir.')
  }
  return path
}

function synthesizeBatch(requests) {
  const errors = {}
  const python = requests.filter(({ job }) => job.language !== 'es')
  if (python.length) {
    const scratch = mkdtempSync(join(tmpdir(), 'language-os-tts-jobs-'))
    try {
      const input = join(scratch, 'jobs.json')
      const output = join(scratch, 'failures.json')
      writeFileSync(input, JSON.stringify(python.map(({ job, wavPath }) => ({ job, wavPath }))))
      run(process.env.LANGUAGE_OS_TTS_PYTHON || 'python3', [worker, input, output])
      Object.assign(errors, JSON.parse(readFileSync(output, 'utf8')))
    } catch (error) {
      for (const { job } of python) errors[job.id] = failure(error)
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  }
  for (const { job, wavPath } of requests.filter(({ job }) => job.language === 'es')) {
    try {
      const paths = job.segments.map((segment, index) => {
        const file = job.segments.length === 1 ? wavPath : `${wavPath}.${index}.wav`
        run('espeak-ng', ['-b', '1', '-v', segment.voice, '-s', '140', '-w', file, '--', segment.input])
        return file
      })
      if (paths.length > 1) {
        const filters = paths.map((_, index) => `[${index}:a]aresample=24000${index < paths.length - 1 ? ',apad=pad_dur=0.38' : ''}[s${index}]`)
        const concat = paths.map((_, index) => `[s${index}]`).join('') + `concat=n=${paths.length}:v=0:a=1`
        run('ffmpeg', ['-v', 'error', '-nostdin', '-y', ...paths.flatMap((file) => ['-i', file]),
          '-filter_complex', [...filters, concat].join(';'), wavPath])
      }
    } catch (error) {
      errors[job.id] = failure(error)
    }
  }
  return errors
}

function inspectFormat(path, job) {
  const { streams, format } = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries',
    'stream=codec_name,channels,sample_rate:format=duration', '-of', 'json', path]))
  const duration = Number(format.duration)
  if (streams.length !== 1 || streams[0].codec_name !== 'mp3' || streams[0].channels !== 1 ||
      Number(streams[0].sample_rate) !== 24000 || !Number.isFinite(duration) || duration < .2 ||
      duration > Math.max(5, job.text.split(/\s+/u).length * 3)) {
    throw new Error('MP3 biçimi veya süresi geçersiz.')
  }
  return { duration }
}

function checkAudio(path, job) {
  // FFmpeg reports silence on stderr even when decoding succeeds.
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-xerror', '-i', path,
    '-af', 'silencedetect=noise=-45dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] })
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr.slice(-850))
  const { duration } = inspectFormat(path, job)
  const starts = [...result.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((match) => Number(match[1]))
  const ends = [...result.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((match) => Number(match[1]))
  const silence = starts.map((start, index) => ({ start, end: ends[index] ?? duration }))
  if (silence.reduce((total, { start, end }) => total + end - start, 0) / duration > .75 ||
      silence.some(({ start, end }) => end - start > (start < .02 || end >= duration - .10 ? 1.25 : 2.5))) {
    throw new Error('MP3 uzun sessizlik içeriyor.')
  }
  return { duration: Number(duration.toFixed(3)), silence, transcript: 'input_matched', acousticReview: 'pending_human_review' }
}

export async function curriculumTtsCli(args) {
  const values = new Map()
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]
    if (flags.has(flag)) values.set(flag, true)
    else if (options.has(flag) && args[index + 1] && !args[index + 1].startsWith('--')) values.set(flag, args[++index])
    else throw new Error(`Geçersiz TTS argümanı: ${flag}`)
  }
  const reportOnly = values.has('--audio-report')
  if (!reportOnly && !values.has('--all') && !values.has('--ids') && !values.has('--lessons')) {
    throw new Error('Üretim kapsamını --ids, --lessons veya --all ile seç.')
  }
  const out = reportOnly ? undefined : outputPath(values.get('--output'))
  const server = await createServer({ root: repo, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } })
  try {
    const { materials } = await server.ssrLoadModule('/scripts/curriculum-audio-inventory.ts')
    const ids = values.get('--ids')?.split(',') ?? []
    const lessons = values.get('--lessons')?.split(',') ?? []
    for (const id of ids) if (!materials.some((item) => item.id === id)) throw new Error(`Ses kimliği bulunamadı: ${id}`)
    for (const id of lessons) if (!materials.some((item) => item.lessonId === id)) throw new Error(`Ders bulunamadı: ${id}`)
    const selected = materials.filter((item) => (!ids.length && !lessons.length) || ids.includes(item.id) || lessons.includes(item.lessonId))
    const overrides = values.has('--pronunciation') ? { ...defaults, ...JSON.parse(readFileSync(values.get('--pronunciation'), 'utf8')) } : defaults
    let spanishVersion = 'local-engine'
    try {
      if (!reportOnly && selected.some(({ language }) => language === 'es')) spanishVersion = run('espeak-ng', ['--version']).split('\n')[0]
    } catch {
      spanishVersion = 'unavailable'
    }
    const encoderVersion = reportOnly ? undefined : run('ffmpeg', ['-version']).split('\n')[0]
    const jobs = planCurriculumTts(selected, overrides, { spanishVersion, encoderVersion })
    const rows = jobs.map((job) => ({ ...job, legacy: job.bundledFile
      ? existsSync(join(repo, 'src/content/audio', job.bundledFile)) ? 'available' : 'missing' : 'no_bundled_file' }))
    if (reportOnly) {
      await new Promise((accept, reject) => process.stdout.write(JSON.stringify(rows, null, 2) + '\n',
        (error) => error ? reject(error) : accept()))
      return
    }
    const result = runCurriculumTts(rows, { outputDirectory: out, synthesizeBatch, inspect: checkAudio,
      encode: (wav, mp3) => run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-i', wav,
        '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '64k', mp3]) })
    for (const item of result.items) process.stdout.write(`${item.id}: ${item.status}${item.error || item.blocked ? ' · ' + (item.error ?? item.blocked) : ''}\n`)
    if (result.items.some(({ status }) => status === 'failed' || status === 'blocked')) process.exitCode = 1
  } finally {
    await server.close()
  }
}
