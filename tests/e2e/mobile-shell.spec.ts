import { expect, test, type Page } from '@playwright/test'
import { catalog } from './catalog-fixture'

test.use({ viewport: { width: 360, height: 800 } })

async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
}

test('native shell hides OAuth and AI without requests or a service worker at 360px', async ({ page }) => {
  const tutorRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/local-tutor/')) tutorRequests.push(request.url())
  })
  await page.addInitScript(() => {
    // Capacitor detects Android through this bridge, even on a loopback origin.
    Reflect.set(window, 'androidBridge', {})
    Object.defineProperty(navigator.serviceWorker, 'register', { value: () => {
      Reflect.set(window, 'registeredServiceWorker', true)
      return Promise.resolve()
    } })
  })
  await page.goto('/')
  await page.getByRole('radio', { name: /İngilizce/ }).check()
  await page.getByLabel('Tahmini seviyen').selectOption('B1')
  await page.getByLabel('Hedef seviyen').selectOption('C1')
  await expect(page.getByRole('button', { name: 'Başlangıç taramasına geç' })).toBeVisible()
  await fitsViewport(page)
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click()
  await expect(page.getByText('ChatGPT bağlantısı mobil uygulamada henüz yok.', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ChatGPT bağlantısı', exact: true })).toHaveCount(0)
  await fitsViewport(page)
  await page.getByRole('button', { name: 'Language OS', exact: true }).click()
  await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
  await expect(page.locator('fieldset[id="en.assess.b1.g1"]')).toBeVisible()
  await page.getByRole('button', { name: 'Öğretime geç', exact: true }).click()
  await page.getByRole('button', { name: 'Günlük planı aç' }).click()
  await expect(page.getByRole('heading', { name: catalog.en.unit.lessons.find(({ id }) => id === 'en.experience')!.title, exact: true })).toBeVisible()
  await fitsViewport(page)
  await page.getByRole('button', { name: 'Derse başla' }).click()
  await expect(page.getByText('ChatGPT bağlantısı mobil uygulamada henüz yok.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Başka şekilde açıkla', exact: true })).toHaveCount(0)
  await fitsViewport(page)
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click()
  await expect(page.getByText('ChatGPT bağlantısı mobil uygulamada henüz yok.', { exact: false })).toBeVisible()
  await fitsViewport(page)
  expect(tutorRequests).toEqual([])
  expect(await page.evaluate(() => Reflect.get(window, 'registeredServiceWorker'))).toBeUndefined()
})
