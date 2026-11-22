import { audioPackCachePrefix, audioPackMarker, type AudioPack } from '../content/audio-packs'

async function installedCacheNames() {
  const names = (await caches.keys()).filter((name) => name.startsWith(audioPackCachePrefix))
  const installed = await Promise.all(names.map(async (name) => {
    const cache = await caches.open(name)
    const marker = await cache.match(audioPackMarker)
    return marker ? { name, id: await marker.text() } : undefined
  }))
  return installed.flatMap((pack) => pack ? [pack] : [])
}

export async function installedAudioPacks() {
  return new Set((await installedCacheNames()).map(({ id }) => id))
}

export async function downloadAudioPack(pack: AudioPack) {
  if ((await installedAudioPacks()).has(pack.id)) return
  const name = `${audioPackCachePrefix}${pack.id}:${crypto.randomUUID()}`
  const staging = await caches.open(name)
  try {
    for (const clip of pack.clips) {
      const response = await fetch(clip.src, { cache: 'no-store', mode: 'same-origin' })
      if (!response.ok) throw new Error(`Ses paketi dosyası açılamadı: ${clip.src}`)
      const bytes = await response.arrayBuffer()
      const checksum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((byte) => byte.toString(16).padStart(2, '0')).join('')
      if (checksum !== clip.sha256 || bytes.byteLength !== clip.bytes) {
        throw new Error(`Ses paketi bütünlük denetiminden geçmedi: ${clip.src}`)
      }
      await staging.put(clip.src, new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } }))
    }
    await staging.put(audioPackMarker, new Response(pack.id))
  } catch (error) {
    await caches.delete(name)
    throw error
  }
}

export async function removeAudioPack(id: string) {
  const names = (await installedCacheNames()).filter((pack) => pack.id === id)
  await Promise.all(names.map(({ name }) => caches.delete(name)))
}
