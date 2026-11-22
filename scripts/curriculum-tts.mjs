import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import models from './curriculum-tts-models.json' with { type: 'json' }

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const plain = (text) => text.normalize('NFC').replace(/\u0301|\+/gu, '').replace(/\s+/gu, ' ').trim()
const vowels = /[аеёиоуыэюя]/giu
const statusFile = 'curriculum-tts-report.json'

function validateRussian(input) {
  if (input.includes('\u0301')) throw new Error('Silero girdisinde vurgu işaretini ünlüden önce + ile yaz.')
  for (const word of input.match(/[а-яё+]+/giu) ?? []) {
    const count = (word.match(vowels) ?? []).length
    const marks = (word.match(/\+/g) ?? []).length
    if ((marks && (marks !== 1 || !/\+[аеёиоуыэюя]/iu.test(word))) ||
        (!marks && count > 1 && !/ё/iu.test(word))) {
      throw new Error(`Rusça vurgu eksik veya geçersiz: ${word}`)
    }
  }
}

function turns(text) {
  return text.split(/(?:^|\n)\s*[—–]\s+/u).filter((turn) => turn.trim()).map((turn) => turn.trim())
}

export function planCurriculumTts(materials, overrides = {}, { spanishVersion = 'local-engine', encoderVersion = 'mp3-24k-64k-v1' } = {}) {
  const ids = new Set()
  return materials.map((material) => {
    const { id, language, text } = material
    if (!/^(en|ru|es)\.[a-z0-9.-]+$/.test(id) || id.startsWith('pilot.') ||
        !id.startsWith(language + '.') || ids.has(id) || !String(text ?? '').trim()) {
      throw new Error(`Geçersiz veya tekrarlı TTS malzemesi: ${id}`)
    }
    ids.add(id)
    const model = language === 'es' ? { ...models.es, version: spanishVersion } : models[language]
    const job = { ...material, model }
    try {
      const sourceTurns = turns(text)
      const configured = overrides[id]
      const segments = configured ?? sourceTurns.map((line, index) => ({
        role: sourceTurns.length === 1 ? 'narrator' : `speaker-${index % 2 + 1}`,
        voice: model.voices[index % 2], text: line,
        input: line.replace(/([аеёиоуыэюя])\u0301/giu, '+$1'),
      }))
      if (!Array.isArray(segments) || !segments.length ||
          plain(segments.map((part) => part.text ?? '').join(' ')) !== plain(sourceTurns.join(' '))) {
        throw new Error('Transkript ve replik metni eşleşmiyor.')
      }
      const voicesByRole = new Map()
      const rolesByVoice = new Map()
      job.segments = segments.map(({ role, voice, text: line, input = line }) => {
        if (typeof role !== 'string' || !role.trim() || !model.voices.includes(voice) || !plain(line) ||
            (voicesByRole.has(role) && voicesByRole.get(role) !== voice) ||
            (rolesByVoice.has(voice) && rolesByVoice.get(voice) !== role)) {
          throw new Error('Konuşmacı rolü veya ses eşlemesi geçersiz.')
        }
        if (plain(input) !== plain(line)) throw new Error('Telaffuz girdisi replik metninden farklı.')
        if (language === 'ru') validateRussian(input)
        voicesByRole.set(role, voice)
        rolesByVoice.set(voice, role)
        return { role, voice, text: line, input }
      })
      if (sourceTurns.length > 1 && voicesByRole.size < 2) throw new Error('Diyalog en az iki ayrı ses gerektirir.')
      const { id: modelId, version, weights, runtime } = model
      job.productionId = sha(JSON.stringify([1, encoderVersion, language, modelId, version, weights, runtime, job.segments]))
    } catch (cause) {
      job.blocked = cause instanceof Error ? cause.message : String(cause)
    }
    return job
  })
}

function errorText(cause) {
  return cause.stderr?.toString().trim().slice(-850) || cause.message || String(cause)
}

export function runCurriculumTts(jobs, { outputDirectory, synthesize, synthesizeBatch, encode, inspect }) {
  mkdirSync(outputDirectory, { recursive: true })
  const status = join(outputDirectory, statusFile)
  const lock = join(outputDirectory, '.tts-lock')
  mkdirSync(lock)
  let staging
  try {
    const previous = existsSync(status) ? JSON.parse(readFileSync(status, 'utf8')).items : []
    const records = new Map(previous.filter((item) => item.artifact).map((item) => [item.id, item]))
    staging = mkdtempSync(join(outputDirectory, '.tts-work-'))
    const pending = []
    const items = jobs.map((job, index) => {
      const old = records.get(job.id)
      if (job.blocked) return { ...job, status: 'blocked' }
      if (old?.productionId === job.productionId && old.artifact.file === artifactFile(job, old.artifact.sha256) &&
          /^[a-f0-9]{64}$/.test(old.artifact.sha256)) {
        const path = join(outputDirectory, old.artifact.file)
        if (existsSync(path) && sha(readFileSync(path)) === old.artifact.sha256) return { ...old, ...job, status: 'unchanged' }
      }
      const item = { ...job, status: 'failed' }
      pending.push({ job, item, wavPath: join(staging, `${index}.wav`), mp3Path: join(staging, `${index}.mp3`) })
      return item
    })
    const errors = synthesizeBatch && pending.length ? synthesizeBatch(pending) : {}
    for (const { job, item, wavPath, mp3Path } of pending) {
      try {
        if (errors[job.id]) throw new Error(errors[job.id])
        if (!synthesizeBatch) synthesize(job, wavPath)
        encode(wavPath, mp3Path)
        const qc = inspect(mp3Path, job)
        const sha256 = sha(readFileSync(mp3Path))
        const file = artifactFile(job, sha256)
        renameSync(mp3Path, join(outputDirectory, file))
        Object.assign(item, { status: 'generated', artifact: { file, sha256 }, qc,
          quality: 'pending_human_review',
          distribution: { commercial: false, offline: false, publicRepository: false } })
      } catch (cause) {
        item.error = errorText(cause)
      }
    }
    const updates = new Map(items.map((item) => [item.id, item]))
    const report = { format: 1, items: [...previous.filter(({ id }) => !updates.has(id)), ...items] }
    const reportPath = join(staging, statusFile)
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
    renameSync(reportPath, status)
    return { items }
  } finally {
    try {
      if (staging) rmSync(staging, { recursive: true, force: true })
    } finally {
      rmSync(lock, { recursive: true, force: true })
    }
  }
}

function artifactFile(job, checksum) {
  return `${job.productionId}.${checksum}.mp3`
}
