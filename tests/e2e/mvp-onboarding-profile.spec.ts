import { expect, test, type Page } from '@playwright/test'
import type { LearningState } from '../../src/domain/state'
import { catalog } from './catalog-fixture'

test.setTimeout(60_000)

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const continueUntilPlaced = async (page: Page) => {
  for (let index = 0; index < 12 && !(await stored(page)).placementAt; index++) {
    const previousCount = (await stored(page)).placementTrack?.samples.length ?? 0
    await button(page, 'Bilmiyorum').click()
    await expect.poll(async () => (await stored(page)).placementTrack?.samples.length ?? 0).toBeGreaterThan(previousCount)
  }
  expect((await stored(page)).placementAt).toBeTruthy()
  await expect(page.getByRole('heading', { name: 'Beceri profili', exact: true })).toBeVisible()
}

async function stored(page: Page): Promise<LearningState> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('language-os')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const transaction = db.transaction('workspace', 'readonly')
      const read = transaction.objectStore('workspace').get('active')
      transaction.oncomplete = () => { db.close(); resolve(read.result.state) }
      transaction.onerror = () => { db.close(); reject(transaction.error) }
    }
  }))
}

async function startUnknownEnglishProfile(page: Page) {
  await page.clock.setFixedTime(new Date('2026-11-13T10:00:00Z'))
  await page.goto('/')
  await page.getByRole('radio', { name: /İngilizce/ }).check()
  await page.getByLabel('Seviyemi henüz bilmiyorum').check()
  await page.getByLabel('Hedef seviyen').selectOption('A2')
  await page.getByLabel('Günlük süre (dk)').fill('15')
  await page.getByLabel('Genel dil becerisi').uncheck()
  await page.getByLabel('Profesyonel iletişim').check()
  await page.getByLabel('Okuma', { exact: true }).check()
  await button(page, 'Başlangıç taramasına geç').click()
  await expect(page.getByRole('heading', { name: 'Başlangıç taraması', exact: true })).toBeVisible()
}

test('unknown estimate screening resumes, starts the recommended lesson, and keeps preference edits after reload', async ({ page }) => {
  await startUnknownEnglishProfile(page)
  await button(page, 'Bilmiyorum').click()
  await expect.poll(async () => (await stored(page)).placementTrack?.samples.length ?? 0).toBe(1)
  expect((await stored(page)).placementTrack?.samples[0]).toMatchObject({ itemId: 'en.assess.start.g1', status: 'unknown' })
  await button(page, 'Daha sonra devam et').click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Başlangıç taraması', exact: true })).toBeVisible()
  await expect(page.locator('main fieldset[id="en.assess.start.r1"]')).toBeVisible()
  await continueUntilPlaced(page)

  await expect(page.getByRole('heading', { name: 'Beceri profili', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dinleme', exact: true }).locator('..')).toContainText('Henüz ölçülmedi')
  await expect(page.getByText('Önceliklerin · Okuma', { exact: true })).toBeVisible()
  await expect(page.getByText('Başlangıç örnekleri. Kendi seviye tahminin ölçüm sonucuna katılmaz.', { exact: true })).toBeVisible()
  const evidenceDetails = page.getByText('Gözlenen seviye aralığı ve kaynaklar', { exact: true }).locator('..')
  await evidenceDetails.locator('summary').click()
  await expect(evidenceDetails).toContainText('Tanışmada kişi ve fiil')
  await expect(evidenceDetails).toContainText('Yanıt yok')
  await button(page, 'Bugünkü çalışmaya başla').click()
  const recommendedTitle = catalog.en.unit.lessons.find(({ id }) => id === 'en.identity')!.title
  await expect(page.getByRole('heading', { name: recommendedTitle, exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Beceri profili', exact: true }).click()
  await button(page, 'Hedef ve beceri önceliklerini düzenle').click()
  await page.getByLabel('Hedef seviyen').selectOption('B1')
  await page.getByLabel('Günlük süre (dk)').fill('25')
  await page.getByLabel('Sınav hazırlığı').check()
  await page.getByLabel('Dinleme', { exact: true }).check()
  await button(page, 'Ayarları kaydet').click()
  await expect(page.getByText('Ayarlar kaydedildi.', { exact: true })).toBeVisible()
  await page.reload()
  const state = await stored(page)
  expect(state.profile).toMatchObject({ selfEstimateUnknown: true, target: 'B1', minutes: 25, goals: ['professional', 'exam'], prioritySkills: ['reading', 'listening'] })
  await page.getByRole('button', { name: 'Beceri profili', exact: true }).click()
  await expect(page.getByText('Önceliklerin · Okuma, Dinleme', { exact: true })).toBeVisible()
})

test('rescreening archives answered samples and can return to the existing daily plan', async ({ page }) => {
  await startUnknownEnglishProfile(page)
  await continueUntilPlaced(page)
  const before = await stored(page)
  const oldSamples = before.placementTrack!.samples
  const oldPlacementAt = before.placementAt
  const oldAttempts = before.attempts
  expect(oldSamples.length).toBeGreaterThan(0)
  expect(oldSamples[0]).toMatchObject({ itemId: 'en.assess.start.g1', status: 'unknown' })

  await button(page, 'Başlangıç taramasını yenile').click()
  await expect(page.getByRole('heading', { name: 'Ek değerlendirme', exact: true })).toBeVisible()
  await button(page, 'Daha sonra devam et').click()
  const recommendedTitle = catalog.en.unit.lessons.find(({ id }) => id === 'en.identity')!.title
  await expect(page.getByRole('heading', { name: recommendedTitle, level: 2, exact: true })).toBeVisible()
  const after = await stored(page)
  expect(after.placementAt).toBe(oldPlacementAt)
  expect(after.attempts).toEqual(oldAttempts)
  expect(after.placementHistory?.at(-1)?.samples).toEqual(oldSamples)
  expect(after.placementTrack?.samples).toEqual([])
  expect(after.placementTrack?.origin).toBe('existing')
})
