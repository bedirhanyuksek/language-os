import { expect, test, type Page } from '@playwright/test'
import { assessmentBank } from '../../src/content/assessment/bank'
import type { LearningState } from '../../src/domain/state'
import { catalog } from './catalog-fixture'

test.setTimeout(75_000)

const item = (id: string) => assessmentBank.find((entry) => entry.id === id)!
const field = (page: Page, id: string) => page.locator(`fieldset[id="${id}"]`)
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const skill = (page: Page, name: string) => page.getByRole('heading', { name, exact: true }).first().locator('..')
const fixedDay = (page: Page, day: number) => page.clock.setFixedTime(new Date(`2026-11-${12 + day}T10:00:00Z`))

async function onboard(page: Page, language: 'en' | 'ru', estimate: string, target: string, minutes: number) {
  await fixedDay(page, 1)
  await page.goto('/')
  await page.getByRole('radio', { name: language === 'ru' ? /Rusça/ : /İngilizce/ }).check()
  await page.getByLabel('Tahmini seviyen').selectOption(estimate)
  await page.getByLabel('Hedef seviyen').selectOption(target)
  await page.getByLabel('Günlük süre (dk)').fill(String(minutes))
  await button(page, 'Başlangıç taramasına geç').click()
  await expect(page.getByRole('heading', { name: 'Başlangıç taraması' })).toBeVisible()
  return performance.now()
}

async function choose(page: Page, id: string, correct = true) {
  const exercise = item(id).exercise
  if (exercise?.kind !== 'single') throw new Error('Expected a single-choice item')
  await field(page, id).getByRole('radio', {
    name: correct ? exercise.accepted : exercise.options.find((option) => option !== exercise.accepted),
    exact: true,
  }).check()
  await button(page, 'Yanıtı kaydet').click()
}

async function playAudio(page: Page) {
  const audio = page.getByLabel('Değerlendirme sesini dinle')
  await expect(audio).toBeVisible()
  const duration = await audio.evaluate(async (node) => {
    const media = node as HTMLMediaElement
    const ended = new Promise<void>((resolve) => media.addEventListener('ended', () => resolve(), { once: true }))
    await media.play()
    await ended
    return media.duration
  })
  expect(duration).toBeGreaterThan(2)
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

async function firstLesson(page: Page, language: 'en' | 'ru', lessonId: string, since: number) {
  const lesson = catalog[language].unit.lessons.find(({ id }) => id === lessonId)!
  expect((await stored(page)).attempts).toEqual([])
  await button(page, 'Günlük planı aç').click()
  await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible()
  await button(page, 'Derse başla').click()
  await expect(page.getByText(lesson.teaching!.models[0].phrase, { exact: true }).first()).toBeVisible()
  console.log(`Assessment to ${lessonId} first model (${test.info().project.name}): ${((performance.now() - since) / 1000).toFixed(1)}s`)
}

async function followup(page: Page) {
  await button(page, 'Ek değerlendirmeyi aç').click()
  await expect(page.getByRole('heading', { name: 'Ek değerlendirme', exact: true })).toBeVisible()
}

test('Russian A1 with no Cyrillic evidence resumes an unfinished sample and receives Cyrillic teaching', async ({ page }) => {
  const since = await onboard(page, 'ru', 'A1', 'A1', 15)
  const draft = field(page, 'ru.assess.a1.r1').getByRole('radio', { name: 'КАССА', exact: true })
  await draft.check()
  await expect(page.getByText('Taslak bu cihazda kaydedildi.', { exact: true })).toBeVisible()
  await button(page, 'Daha sonra devam et').click()
  await button(page, 'Devam et').click()
  await expect(draft).toBeChecked()
  await page.reload()
  await expect(draft).toBeChecked()
  expect((await stored(page)).placementTrack?.samples).toEqual([])
  await button(page, 'Bilmiyorum').click()
  await expect(field(page, 'ru.assess.a1.g1')).toBeVisible()
  await button(page, 'Şimdilik geç').click()
  await expect(page.getByLabel('Değerlendirme sesini dinle')).toBeVisible()
  await button(page, 'Ses erişilemiyor').click()
  await expect(skill(page, 'Okuma')).toContainText('Bilmiyorum')
  await expect(skill(page, 'Dil bilgisi')).toContainText('Ertelendi')
  await expect(skill(page, 'Dinleme')).toContainText('Ses erişilemedi')
  await expect(skill(page, 'Konuşma')).toContainText('Henüz ölçülmedi')
  await firstLesson(page, 'ru', 'ru.cyrillic', since)
  await fixedDay(page, 2)
  await page.reload()
  await followup(page)
  await expect(field(page, 'ru.assess.a1.r2')).toBeVisible()
})

test.describe('media loaded without the installed cache', () => {
  test.use({ serviceWorkers: 'block' })

  test('Russian A1 corrupted local recording stays unavailable and transcript remains a separate evidence path', async ({ page, context }) => {
    await context.route('**/ru.assess.a1.l1-*.mp3', (route) => route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.from('corrupted local recording'),
    }))
    await onboard(page, 'ru', 'A1', 'A1', 15)
    await button(page, 'Bilmiyorum').click()
    await expect(field(page, 'ru.assess.a1.g1')).toBeVisible()
    await button(page, 'Şimdilik geç').click()
    await expect(page.getByLabel('Değerlendirme sesini dinle')).toBeVisible()

    await page.getByLabel('Değerlendirme sesini dinle').evaluate(async (node) => {
      const media = node as HTMLMediaElement
      media.muted = true
      await media.play().catch(() => undefined)
    })
    await expect(page.getByText('Ses kaydı açılamadı.', { exact: true })).toBeVisible()
    expect((await stored(page)).placementTrack!.samples.some(({ itemId }) => itemId === 'ru.assess.a1.l1')).toBe(false)

    await button(page, 'Metinle çalış').click()
    await expect(page.getByText(item('ru.assess.a1.l1').transcript!, { exact: true })).toBeVisible()
    await choose(page, 'ru.assess.a1.l1')
    await expect.poll(async () => (await stored(page)).placementTrack!.samples
      .find(({ itemId }) => itemId === 'ru.assess.a1.l1')).toMatchObject({
      status: 'answered', mode: 'transcript', result: 'correct',
    })
  })
})

test('English B1 with stronger listening gets a harder recording and separate form and meaning work', async ({ page, context }) => {
  const since = await onboard(page, 'en', 'B1', 'C1', 30)
  await choose(page, 'en.assess.b1.g1', false)
  await expect(field(page, 'en.assess.b1.v1')).toBeVisible()
  await button(page, 'Bilmiyorum').click()
  await playAudio(page)
  await choose(page, 'en.assess.b1.l1')
  await choose(page, 'en.assess.b1.r1')
  await expect(skill(page, 'Dinleme')).toContainText('Doğru')
  await expect(skill(page, 'Dinleme')).toContainText('Sentetik ses örneği')
  await expect(skill(page, 'Dil bilgisi')).toContainText('Destek gerekiyor')
  await expect(skill(page, 'Kelime')).toContainText('Bilmiyorum')
  await firstLesson(page, 'en', 'en.experience', since)

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await fixedDay(page, 2)
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await followup(page)
  await playAudio(page)
  await choose(page, 'en.assess.b1.l2')
  await followup(page)
  await button(page, 'Metinle çalış').click()
  await expect(field(page, 'en.assess.b1.l3')).toBeVisible()
  await expect(page.getByText('Taslak bu cihazda kaydedildi.', { exact: true })).toBeVisible()
  await page.reload()
  await button(page, 'Devam et').click()
  await expect(page.getByText(item('en.assess.b1.l3').transcript!, { exact: true })).toBeVisible()
  await choose(page, 'en.assess.b1.l3')
  await expect(skill(page, 'Dinleme')).toContainText('Metin yardımıyla')
  await fixedDay(page, 3)
  await page.reload()
  await followup(page)
  await choose(page, 'en.assess.b1.g3')
  await expect(skill(page, 'Dil bilgisi')).toContainText('Öğretim sonrası örnek')
  const samples = (await stored(page)).placementTrack!.samples
  expect(samples.find(({ itemId }) => itemId === 'en.assess.b1.l3')).toMatchObject({ mode: 'transcript', timing: 'before_teaching' })
  expect(new Set(samples.map(({ itemId }) => itemId)).size).toBe(samples.length)
})

test('English C1 aiming at C2 reaches a source lesson, then leaves original writing pending and speaking unmeasured', async ({ page }) => {
  const since = await onboard(page, 'en', 'C1', 'C2', 60)
  await choose(page, 'en.assess.adv.r1')
  await choose(page, 'en.assess.adv.g1')
  await choose(page, 'en.assess.adv.v1')
  await expect(page.getByLabel('Değerlendirme sesini dinle')).toBeVisible()
  await button(page, 'Şimdilik geç').click()
  await expect(skill(page, 'Okuma')).toContainText('Doğru')
  await firstLesson(page, 'en', 'en.evidence', since)

  await fixedDay(page, 2)
  await page.reload()
  await followup(page)
  await choose(page, 'en.assess.adv.r2', false)
  await followup(page)
  await choose(page, 'en.assess.adv.r4')
  await expect(skill(page, 'Okuma')).toContainText('Bağımsız bir metinde nedensellik sınırı')
  await fixedDay(page, 3)
  await page.reload()
  await followup(page)
  await choose(page, 'en.assess.adv.g2')
  await followup(page)
  await field(page, 'en.assess.adv.v2').getByRole('textbox').fill('grain')
  await button(page, 'Yanıtı kaydet').click()
  await expect(skill(page, 'Kelime')).toContainText('Kalıbı bağımsız hatırlama')

  await fixedDay(page, 4)
  await page.reload()
  await followup(page)
  await field(page, 'en.assess.adv.write').getByRole('textbox').fill(
    'I would test the reminder on a second site before expanding it. One library reported fewer late returns, but that change alone cannot tell us whether the reminder caused the decrease.',
  )
  await button(page, 'Yanıtı kaydet').click()
  await expect(skill(page, 'Yazma')).toContainText('İnceleme bekliyor')
  await expect(skill(page, 'Konuşma')).toContainText('Henüz ölçülmedi')
  const state = await stored(page)
  expect(state.attempts).toEqual([])
  expect(state.placementTrack?.samples.some(({ itemId }) => itemId === 'en.assess.adv.r3')).toBe(false)
})
