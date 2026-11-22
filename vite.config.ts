import { createHash } from 'node:crypto'
import { basename, resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { pilotAudioManifest } from './src/content/pilot-audio.ts'
import { isLoopbackAddress, isPilotAudioFile, readLocalPilotAudioReviewAsset, rejectPublicPilotAudioAssets, validatePilotAudioAssets } from './scripts/validate-pilot-audio.ts'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { audioPackCachePrefix, audioPackClipPath, audioPackMarker } from './src/content/audio-packs.ts'
import { validateCurriculumAudioPacks } from './scripts/validate-curriculum-audio-packs.ts'

const pilotAudioDirectory = resolve(import.meta.dirname, 'src/content/audio')
let publicDirectory = ''

export default defineConfig({
  build: { assetsInlineLimit: (file) => isPilotAudioFile(basename(file)) ? false : undefined },
  plugins: [react(), {
    name: 'local-pilot-audio-review',
    apply: 'serve',
    configureServer(server) {
      const enabled = process.env.VITE_PILOT_AUDIO_REVIEW === '1'
      const reviewDirectory = process.env.LANGUAGE_OS_PILOT_AUDIO_REVIEW_DIR
      if (enabled && !reviewDirectory) throw new Error('VITE_PILOT_AUDIO_REVIEW=1 requires LANGUAGE_OS_PILOT_AUDIO_REVIEW_DIR.')
      server.middlewares.use((request, response, next) => {
        let pathname: string
        try {
          pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        } catch {
          next()
          return
        }
        if (!pathname.startsWith('/audio/pilot.')) { next(); return }
        if (!enabled || !reviewDirectory) {
          response.statusCode = 404
          response.setHeader('Cache-Control', 'no-store')
          response.end('Pilot audio preview is disabled.')
          return
        }
        if (!isLoopbackAddress(request.socket.remoteAddress ?? '')) {
          response.statusCode = 403
          response.end('Local pilot audio preview is loopback-only.')
          return
        }
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.setHeader('Allow', 'GET')
          response.end()
          return
        }
        const audio = readLocalPilotAudioReviewAsset(basename(pathname), reviewDirectory)
        if (!audio) {
          response.statusCode = 404
          response.setHeader('Cache-Control', 'no-store')
          response.end('Pilot audio is unavailable or failed its SHA-256 check.')
          return
        }
        response.statusCode = 200
        response.setHeader('Content-Type', 'audio/mpeg')
        response.setHeader('Content-Length', audio.byteLength)
        response.setHeader('Cache-Control', 'no-store, max-age=0')
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.end(audio)
      })
    },
  }, {
    name: 'offline-shell',
    apply: 'build',
    configResolved({ publicDir }) {
      publicDirectory = publicDir
    },
    buildStart() {
      rejectPublicPilotAudioAssets(publicDirectory)
      validateCurriculumAudioPacks(publicDirectory)
    },
    generateBundle(_options, bundle) {
      const approved = validatePilotAudioAssets(pilotAudioDirectory, pilotAudioManifest)
      const emitted = new Set(Object.values(bundle).flatMap((entry) =>
        entry.type === 'asset' ? entry.originalFileNames.map((name) => basename(name)) : []))
      for (const file of approved) {
        if (!emitted.has(file)) this.error(`Pilot ses dosyası çevrimdışı pakette bulunamadı: ${file}`)
      }
      const assets = Object.keys(bundle).map((path) => '/' + path)
      const files = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest', ...assets.filter((path) => path !== '/index.html')]
      const audioIndex = publicDirectory && resolve(publicDirectory, 'audio-packs/index.json')
      const hash = createHash('sha256')
      if (audioIndex && existsSync(audioIndex)) {
        files.push('/audio-packs/index.json')
        hash.update(readFileSync(audioIndex))
      }
      const version = hash.update(JSON.stringify(files)).digest('hex').slice(0, 16)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const cacheName = 'language-os-${version}';
const files = ${JSON.stringify(files)};
const mediaPath = ${audioPackClipPath};
const mediaPrefix = ${JSON.stringify(audioPackCachePrefix)};
const mediaMarker = ${JSON.stringify(audioPackMarker)};
async function installedAudio(path) {
  const pack = path.split('/')[2];
  const names = (await caches.keys()).filter(name => name.startsWith(mediaPrefix + pack + ':'));
  for (const name of names) {
    const cache = await caches.open(name);
    if (!(await cache.match(mediaMarker))) continue;
    const hit = await cache.match(path);
    if (hit) return hit;
  }
}
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files))));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('language-os-') && key !== cacheName).map(key => caches.delete(key))))
));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
    url.pathname === '/auth/callback' || url.pathname.startsWith('/local-tutor/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(cacheName).then(cache => cache.match('/index.html'))));
  } else if (files.includes(url.pathname) || mediaPath.test(url.pathname)) {
    const lookup = mediaPath.test(url.pathname) ? installedAudio(url.pathname)
      : caches.open(cacheName).then(cache => cache.match(url.pathname));
    event.respondWith(lookup.then(async response => {
      if (!response) return fetch(event.request);
      const range = event.request.headers.get('range');
      if (!range) return response;
      const bytes = await response.arrayBuffer();
      const parts = /^bytes=(\\d*)-(\\d*)$/.exec(range);
      const size = bytes.byteLength;
      const start = parts && (parts[1] ? Number(parts[1]) : Math.max(0, size - Number(parts[2])));
      const end = parts && (parts[1] && parts[2] ? Math.min(size - 1, Number(parts[2])) : size - 1);
      if (!parts || start > end || start >= size) {
        return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
      }
      return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
        'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes'
      } });
    }));
  }
});` })
    },
  }],
  // Long learner simulations replay weeks of daily plans; shared CI runners exceed Vitest's 5 s default.
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30_000 },
})
