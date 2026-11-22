import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { audioPackIndexSchema } from '../src/content/audio-packs.ts'

export function validateCurriculumAudioPacks(publicDirectory: string) {
  if (!publicDirectory) return
  const directory = join(publicDirectory, 'audio-packs')
  if (!existsSync(directory)) return
  const index = audioPackIndexSchema.parse(JSON.parse(readFileSync(join(directory, 'index.json'), 'utf8')))
  const approved = new Set(['index.json'])
  for (const { clips } of index.packs) {
    for (const { src, bytes, sha256 } of clips) {
      const relativePath = src.slice('/audio-packs/'.length)
      const file = readFileSync(join(directory, relativePath))
      if (file.length !== bytes || createHash('sha256').update(file).digest('hex') !== sha256) {
        throw new Error(`Ses paketi bütünlük denetiminden geçmedi: ${src}`)
      }
      approved.add(relativePath)
    }
  }
  for (const entry of readdirSync(directory, { withFileTypes: true, recursive: true })) {
    if (entry.isDirectory()) continue
    const path = join(entry.parentPath, entry.name)
    if (!entry.isFile() || !approved.has(path.slice(directory.length + 1))) {
      throw new Error(`Dağıtım onayı olmayan ses paketi dosyası: ${path}`)
    }
  }
}
