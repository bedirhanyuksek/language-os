import { expect, test } from '@playwright/test'

test('protects an old invalid record until reset is confirmed, then opens onboarding and ChatGPT settings', async ({ page }) => {
  await page.route('**/local-tutor/status', (route) => route.fulfill({ json: {
    status: 'disconnected', models: [], blocked: false, csrf: 'fixture',
  } }))
  // Seed only this test's isolated browser context, before the application opens IndexedDB.
  await page.route('**/migration-fixture', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Migration fixture</title>' }))
  await page.goto('/migration-fixture')
  await page.evaluate(async () => {
    const open = (name: string) => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 10)
      request.onupgradeneeded = () => request.result.createObjectStore('workspace', { keyPath: 'key' })
        .put({ key: 'active', state: { profile: null } })
      request.onsuccess = () => { request.result.close(); resolve() }
      request.onerror = () => reject(request.error)
    })
    await open('language-os')
    await open('unrelated-fixture')
    localStorage.setItem('reset-test-sentinel', 'keep')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Önceki profil koruma altında' })).toBeVisible()
  await page.getByText('Geçişin teknik ayrıntıları', { exact: true }).click()
  await expect(page.getByText('state.profile', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Yerel verileri sıfırla' }).click()
  await expect(page.getByRole('heading', { name: 'Yerel veriler silinsin mi?' })).toBeVisible()
  await page.getByRole('button', { name: 'Vazgeç' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Önceki profil koruma altında' })).toBeVisible()
  await page.getByRole('button', { name: 'Yerel verileri sıfırla' }).click()
  await page.getByRole('button', { name: 'Yerel verileri kalıcı olarak sil' }).click()
  await expect(page.getByRole('heading', { name: 'Öğrenme planını kur.' })).toBeVisible()
  expect(await page.evaluate(async () => ({
    unrelated: (await indexedDB.databases()).some(({ name }) => name === 'unrelated-fixture'),
    sentinel: localStorage.getItem('reset-test-sentinel'),
  }))).toEqual({ unrelated: true, sentinel: 'keep' })
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'ChatGPT bağlantısı' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with ChatGPT' })).toBeVisible()
})
