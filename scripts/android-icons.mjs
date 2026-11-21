import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import console from 'node:console'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { chromium } from '@playwright/test'

const root = new URL('../', import.meta.url)
const res = new URL('android/app/src/main/res/', root)
const check = process.argv.includes('--check')
const svg = await readFile(new URL('public/icon.svg', root), 'utf8')
const css = await readFile(new URL('src/style.css', root), 'utf8')
const paper = css.match(/:root\s*\{[^}]*--paper:\s*(#[\da-f]{6})\s*;/i)?.[1]
const ink = css.match(/:root\s*\{[^}]*--ink:\s*(#[\da-f]{6})\s*;/i)?.[1]
assert.ok(paper && ink, 'src/style.css: --paper ve --ink renkleri bulunamadı.')
const densities = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]
const iconUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

// Read the existing PNG headers before writing anything; preserve every splash variant.
const splashes = []
for (const directory of (await readdir(res)).filter((name) => name.startsWith('drawable')).sort()) {
  const files = await readdir(new URL(`${directory}/`, res))
  if (!files.includes('splash.png')) continue
  const data = await readFile(new URL(`${directory}/splash.png`, res))
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  splashes.push({ directory, width: data.readUInt32BE(16), height: data.readUInt32BE(20) })
}
assert.ok(splashes.length, 'Android açılış görselleri bulunamadı.')

async function output(path, data) {
  const url = new URL(path, res)
  if (check) {
    const existing = await readFile(url)
    // Git may check text out with CRLF on Windows; PNGs must still match byte for byte.
    if (path.endsWith('.xml')) assert.equal(existing.toString('utf8').replace(/\r\n/g, '\n'), data, `${path}: yeniden üretim gerekiyor.`)
    else assert.deepEqual(existing, Buffer.from(data), `${path}: yeniden üretim gerekiyor.`)
  } else await writeFile(url, data)
}

// The full Playwright Chromium also runs headlessly, without the separate headless-shell download.
const browser = await chromium.launch({
  channel: 'chromium',
  executablePath: process.env.ANDROID_ICONS_CHROMIUM_EXECUTABLE || undefined,
})
try {
  const page = await browser.newPage({ deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await page.route('**/*', (route) => route.abort())
  async function render(width, height, artwork, background = 'transparent', round = false) {
    await page.setViewportSize({ width, height })
    await page.setContent(`<!doctype html><style>
      html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}
      main{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        background:${background};border-radius:${round ? '50%' : '0'};overflow:hidden}
      img{display:block;width:${artwork}px;height:${artwork}px;flex:none}
      </style><main><img src="${iconUrl}" alt=""></main>`)
    await page.locator('img').evaluate((img) => img.decode())
    return page.screenshot({ type: 'png', omitBackground: true, animations: 'disabled', scale: 'css' })
  }

  for (const [density, scale] of densities) {
    const size = 48 * scale
    await output(`mipmap-${density}/ic_launcher.png`, await render(size, size, size))
    await output(`mipmap-${density}/ic_launcher_round.png`, await render(size, size, size * 0.78, ink, true))
    // Keep the complete notebook inside the central 66dp square on a transparent 108dp canvas.
    await output(`mipmap-${density}/ic_launcher_foreground.png`, await render(108 * scale, 108 * scale, 66 * scale))
    console.log(`${density}: ${size}×${size} px; adaptive ${108 * scale}×${108 * scale} px`)
  }
  for (const { directory, width, height } of splashes) {
    const scale = densities.find(([density]) => directory.endsWith(`-${density}`))?.[1] ?? 1
    await output(`${directory}/splash.png`, await render(width, height, 96 * scale, paper))
    console.log(`${directory}/splash.png: ${width}×${height} px`)
  }
  await output('values/ic_launcher_background.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${paper}</color>
</resources>
`)
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    const xml = await readFile(new URL(`mipmap-anydpi-v26/${name}.xml`, res), 'utf8')
    assert.match(xml, /<background\s+android:drawable="@color\/ic_launcher_background"\s*\/>/)
    assert.match(xml, /<foreground\s+android:drawable="@mipmap\/ic_launcher_foreground"\s*\/>/)
  }
  console.log(check ? 'Android görselleri güncel.' : `Android görselleri üretildi: ${fileURLToPath(res)}`)
} finally {
  await browser.close()
}
