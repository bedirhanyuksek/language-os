import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { pilotAudioManifest, pilotAudioSlots, type PilotAudioManifest } from '../src/content/pilot-audio.ts'

export function isLoopbackAddress(address: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address.startsWith('::ffff:127.')
}

export function readLocalPilotAudioReviewAsset(filename: string, directory: string,
  manifest: PilotAudioManifest = pilotAudioManifest): Buffer | undefined {
  for (const [id, recording] of Object.entries(manifest)) {
    if (recording.status !== 'pending' || !('quality' in recording) || recording.quality.status !== 'user_accepted' ||
        basename(recording.src) !== filename || !pilotAudioSlots[id as keyof typeof pilotAudioSlots]) continue
    const path = join(directory, basename(recording.src))
    let bytes: Buffer
    try {
      bytes = readFileSync(path)
    } catch {
      return
    }
    if (bytes.length === 0 || createHash('sha256').update(bytes).digest('hex') !== recording.sha256) return
    return bytes
  }
}

export function validatePilotAudioAssets(directory: string, manifest: PilotAudioManifest): string[] {
  const approved = new Set<string>()
  for (const [id, recording] of Object.entries(manifest)) {
    if (recording.status !== 'ready') continue
    const file = basename(recording.src)
    const path = join(directory, file)
    let bytes: Buffer
    try {
      bytes = readFileSync(path)
    } catch (cause) {
      throw new Error(`Pilot ses dosyası okunamadı: ${id} (${file})`, { cause })
    }
    if (bytes.length === 0 || createHash('sha256').update(bytes).digest('hex') !== recording.sha256) {
      throw new Error(`Pilot ses dosyasının SHA-256 doğrulaması başarısız: ${id} (${file})`)
    }
    approved.add(file)
  }
  for (const file of readdirSync(directory)) {
    if (isPilotAudioFile(file) && !approved.has(file)) {
      throw new Error(`Onaysız pilot ses dosyası paketlenemez: ${file}`)
    }
  }
  return [...approved]
}

export function isPilotAudioFile(file: string): boolean {
  return /^pilot\..*\.mp3$/i.test(file)
}

// Vite copies public files verbatim, so even an approved clip must enter via the validated audio glob.
export function rejectPublicPilotAudioAssets(directory: string): void {
  if (!directory) return
  let files: string[]
  try {
    files = readdirSync(directory, { encoding: 'utf8', recursive: true })
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return
    throw cause
  }
  const pilot = files.find((file) => isPilotAudioFile(basename(file)))
  if (pilot) throw new Error(`Pilot ses dosyası public dizinine konamaz: ${pilot}`)
}
