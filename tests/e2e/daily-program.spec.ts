import { expect, test } from '@playwright/test'
import { catalog } from './catalog-fixture'
import { storedLearning } from './teaching'
import { finishPlacement } from '../../src/domain/progress'
import { initialState } from '../../src/domain/state'
import { exportBackup } from '../../src/persistence/repository'
import { sampleAnswers } from '../teaching-fixture'

test('choosing instruction preserves overdue reviews and distinguishes an opened word from learned vocabulary', async ({ page }) => {
  const at = '2026-11-20T10:00:00.000Z'
  const course = catalog.en
  const state = finishPlacement(initialState({
    id: '3320d688-4265-4aba-b198-0ff90807cd31', language: 'en', estimate: 'B1', target: 'C1', minutes: 30,
    goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6],
  }), course, sampleAnswers(course.placement), at)
  const reviews = course.unit.lessons.flatMap(({ vocabulary }) => vocabulary).slice(0, 8).map(({ id }) => ({
    cardId: id, step: 0, dueAt: '2026-11-19T10:00:00.000Z', introducedAt: '2026-11-18T10:00:00.000Z',
  }))
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/')
  await page.getByText('Önceden kaydedilmiş bir yedeğin var mı?').click()
  await page.getByLabel('Yedek dosyası').setInputFiles({ name: 'program.json', mimeType: 'application/json',
    buffer: Buffer.from(exportBackup({ ...state, reviews })),
  })
  await page.getByRole('button', { name: 'Yedeği geri yükle' }).click()
  await expect(page.getByRole('region', { name: 'Günlük çalışma sırası' })).toContainText('Vadesi gelen tekrar')
  await page.getByRole('button', { name: /Kelime edinimi · \d+ ifade ile devam et/ }).click()
  await expect(page.getByRole('heading', { name: 'lead a workshop', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Kelimeyi çalış' }).click()
  await expect(page.getByText('Taslak bu cihazda kaydedildi.', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Devam et', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Yanıtı kaydet', exact: true })).toBeVisible()
  const saved = await storedLearning(page)
  expect(saved.reviews).toEqual(reviews)
  expect(saved.reviewHistory).toEqual([])
  expect(saved.attempts).toEqual(state.attempts)
  await page.getByRole('button', { name: 'Beceri profili', exact: true }).click()
  const vocabulary = page.getByRole('heading', { name: 'Kelime', exact: true }).first().locator('..')
  await expect(vocabulary).toContainText('Öğretim örneğiyle çalışıldı')
  await page.screenshot({ path: test.info().outputPath('instruction-and-debt.png'), fullPage: true })
})
