import { createHash } from 'node:crypto'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), {
    name: 'offline-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).map((path) => '/' + path)
      const files = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest', ...assets.filter((path) => path !== '/index.html')]
      const version = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 16)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const cacheName = 'language-os-${version}';
const files = ${JSON.stringify(files)};
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files))));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('language-os-') && key !== cacheName).map(key => caches.delete(key))))
));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(cacheName).then(cache => cache.match('/index.html'))));
  } else if (files.includes(url.pathname)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(url.pathname)).then(async response => {
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
  test: { include: ['tests/**/*.test.ts'] },
})
