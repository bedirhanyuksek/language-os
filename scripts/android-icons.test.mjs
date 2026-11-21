import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { test } from 'node:test'
import { fileURLToPath, URL } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'

/* global Image, document */

const root = new URL('../', import.meta.url)
const res = new URL('android/app/src/main/res/', root)

test('committed Android assets reproduce byte for byte', async () => {
  await promisify(execFile)(process.execPath, [fileURLToPath(new URL('scripts/android-icons.mjs', root)), '--check'])
})

test('Android artwork has the expected dimensions, palette, padding and centring', async () => {
  const css = await readFile(new URL('src/style.css', root), 'utf8')
  const rgb = (token) => css.match(new RegExp(`--${token}:\\s*#([\\da-f]{6})`, 'i'))[1].match(/../g).map((v) => parseInt(v, 16))
  const paper = [...rgb('paper'), 255]
  const ink = [...rgb('ink'), 255]
  const red = [...rgb('red'), 255]
  const browser = await chromium.launch({ channel: 'chromium', executablePath: process.env.ANDROID_ICONS_CHROMIUM_EXECUTABLE || undefined })
  try {
    const page = await browser.newPage()
    async function inspect(path, width, height, artwork, kind) {
      const data = await readFile(new URL(path, res))
      const result = await page.evaluate(async ({ base64, artwork, kind }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${base64}`
        await image.decode()
        const { naturalWidth: w, naturalHeight: h } = image
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        const pixels = context.getImageData(0, 0, w, h).data
        const at = (x, y) => Array.from(pixels.slice((Math.floor(y) * w + Math.floor(x)) * 4, (Math.floor(y) * w + Math.floor(x)) * 4 + 4))
        let outside = 0
        if (kind === 'adaptive') {
          const margin = Math.floor((w - artwork) / 2)
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if ((x < margin || x >= w - margin || y < margin || y >= h - margin) && at(x, y)[3]) outside++
          }
        }
        return {
          width: w, height: h, corner: at(0, 0), centre: at(w / 2, (h - artwork) / 2 + artwork * 74 / 128), outside,
          red: at((w - artwork) / 2 + artwork * 30.5 / 128, (h - artwork) / 2 + artwork / 2),
        }
      }, { base64: data.toString('base64'), artwork, kind })
      assert.equal(result.width, width, path)
      assert.equal(result.height, height, path)
      assert.deepEqual(result.centre, ink, `${path}: notebook centre`)
      // At mdpi the spine is narrower than one pixel; antialiasing blends red with ink.
      assert.ok(result.red[0] > 100 && result.red[0] > result.red[1] * 2 && result.red[1] > result.red[2], `${path}: red notebook spine (${red})`)
      if (kind === 'splash') assert.deepEqual(result.corner, paper, `${path}: paper background`)
      else assert.equal(result.corner[3], 0, `${path}: transparent corner`)
      assert.equal(result.outside, 0, `${path}: artwork outside safe zone`)
    }
    for (const [density, size, foreground] of [['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216], ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432]]) {
      await inspect(`mipmap-${density}/ic_launcher.png`, size, size, size, 'legacy')
      await inspect(`mipmap-${density}/ic_launcher_round.png`, size, size, size * 0.78, 'round')
      await inspect(`mipmap-${density}/ic_launcher_foreground.png`, foreground, foreground, foreground * 66 / 108, 'adaptive')
    }
    // Freeze the original splash dimensions so an accidental resize cannot silently pass regeneration.
    for (const [directory, width, height, artwork] of [
      ['drawable', 480, 320, 96],
      ['drawable-land-mdpi', 480, 320, 96], ['drawable-port-mdpi', 320, 480, 96],
      ['drawable-land-hdpi', 800, 480, 144], ['drawable-port-hdpi', 480, 800, 144],
      ['drawable-land-xhdpi', 1280, 720, 192], ['drawable-port-xhdpi', 720, 1280, 192],
      ['drawable-land-xxhdpi', 1600, 960, 288], ['drawable-port-xxhdpi', 960, 1600, 288],
      ['drawable-land-xxxhdpi', 1920, 1280, 384], ['drawable-port-xxxhdpi', 1280, 1920, 384],
    ]) await inspect(`${directory}/splash.png`, width, height, artwork, 'splash')

    const styles = await readFile(new URL('values/styles.xml', res), 'utf8')
    assert.match(styles, /name="windowSplashScreenBackground">@color\/ic_launcher_background</)
    assert.match(styles, /name="windowSplashScreenAnimatedIcon">@mipmap\/ic_launcher_foreground</)
  } finally {
    await browser.close()
  }
})
