import { expect, test } from '@playwright/test'
import { assessmentBank } from '../../src/content/assessment/bank'
import type { LearningState } from '../../src/domain/state'
import { catalog } from './catalog-fixture'
import { teachVocabulary } from './teaching'

const item = (id: string) => assessmentBank.find((entry) => entry.id === id)!

async function stored(page: import('@playwright/test').Page): Promise<LearningState> {
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

async function answerText(page: import('@playwright/test').Page, id: string, answer: string) {
  await page.locator(`fieldset[id="${id}"]`).getByRole('textbox').fill(answer)
  await page.getByRole('button', { name: 'Yanıtı kaydet', exact: true }).click()
  await expect.poll(async () => (await stored(page)).placementTrack?.samples.some(({ itemId }) => itemId === id)).toBe(true)
}

test('Spanish beginner starts with sounds before questions and preserves a separate workspace', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-20T10:00:00Z'))
  await page.goto('/')
  await page.getByRole('radio', { name: /İspanyolca/ }).check()
  await expect(page.getByText('Ññ', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Tahmini seviyen')).toHaveValue('A1')
  await expect(page.getByLabel('Hedef seviyen')).toHaveValue('A2')
  await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
  await expect(page.locator('fieldset[id="es.assess.start.g1"]')).toBeVisible()
  await expect.poll(async () => (await stored(page)).placementTrack?.samples).toEqual([])
  await page.getByRole('button', { name: 'Öğretime geç', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Beceri profili', exact: true })).toBeVisible()
  expect((await stored(page)).placementTrack?.samples).toEqual([])
  await page.getByRole('button', { name: 'Günlük planı aç' }).click()
  await expect(page.getByRole('heading', { name: /Selamlaş ve kendini tanıt/ })).toBeVisible()
  await page.getByRole('button', { name: 'Derse başla' }).click()
  await expect(page.getByRole('heading', { name: 'Harf ile sesi eşleştir' })).toBeVisible()
  await expect(page.locator('blockquote[lang="es"]')).toHaveText('Hola, me llamo Ana.')
  await expect(page.locator('fieldset[id^="es.saludos"]')).toHaveCount(0)
  // Spanish models now play the bundled recording instead of device speech synthesis.
  await expect(page.locator('audio[aria-label="Cümleyi dinle"]')).toHaveAttribute('src', /es\.saludos\.model\.1.*\.mp3$/)
  await page.getByRole('button', { name: 'Sonraki örnek' }).click()
  await page.getByRole('button', { name: 'Rehberli pratiğe geç' }).click()
  for (const [id, response] of [
    ['es.saludos.form.1.guided.1', 'Buenos'], ['es.saludos.form.2.guided.1', 'llamo'],
  ]) await page.locator(`fieldset[id="${id}"]`).getByRole('textbox').fill(response)
  await page.getByRole('button', { name: 'Yanıtları değerlendir' }).click()
  await page.getByRole('button', { name: 'Günlük plana dön' }).click()
  await page.reload()
  await expect(page.getByLabel('Çalışma dili')).toHaveValue('es')
  await expect(page.getByRole('heading', { name: 'Kelimeleri öğren' })).toBeVisible()
  await page.getByLabel('Çalışma dili').selectOption('ru')
  await expect(page.getByRole('heading', { name: 'Rusça çalışma planını kur' })).toBeVisible()
  await page.getByLabel('Tahmini seviyen').selectOption('A1')
  await page.getByLabel('Hedef seviyen').selectOption('A1')
  await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
  await expect(page.locator('fieldset[id="ru.assess.a1.r1"]')).toBeVisible()
  await page.getByLabel('Çalışma dili').selectOption('es')
  await expect(page.getByRole('heading', { name: 'Bugünkü plan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Kelimeleri öğren' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('Spanish adaptive mini placement records independent production and accelerates the first lesson', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: /İspanyolca/ }).check()
  await page.getByLabel('Tahmini seviyen').selectOption('A2')
  await page.getByLabel('Hedef seviyen').selectOption('A2')
  await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
  const grammarItem = item('es.assess.a2.g1')
  const grammar = grammarItem.exercise!
  if (grammar.kind !== 'single') throw new Error('Expected the Spanish grammar item to be single choice')
  await page.locator('fieldset[id="es.assess.a2.g1"]').getByRole('radio', { name: grammar.accepted, exact: true }).check()
  await page.getByRole('button', { name: 'Yanıtı kaydet', exact: true }).click()
  for (let index = 0; index < 8 && !(await page.locator('fieldset[id="es.assess.a2.gp1"]').count()); index++) {
    const prior = await page.locator('main .page-heading .eyebrow').textContent()
    await page.getByRole('button', { name: 'Bilmiyorum', exact: true }).click()
    await expect.poll(() => page.locator('main .page-heading .eyebrow').textContent()).not.toBe(prior)
  }
  await expect(page.locator('fieldset[id="es.assess.a2.gp1"]')).toBeVisible()
  const grammarProduction = item('es.assess.a2.gp1').exercise
  if (grammarProduction?.kind !== 'short') throw new Error('Expected the Spanish grammar production item to be short answer')
  await answerText(page, 'es.assess.a2.gp1', grammarProduction.accepted[0])
  await expect.poll(async () => (await stored(page)).placementTrack?.samples
    .find(({ itemId }) => itemId === 'es.assess.a2.gp1')).toMatchObject({ status: 'answered', timing: 'before_teaching', mode: 'text', result: 'correct' })

  // The mini route includes an explicitly accepted short production variant.
  while (!(await page.locator('fieldset[id="es.assess.a2.vp1"]').count())) {
    const prior = await page.locator('main .page-heading .eyebrow').textContent()
    await page.getByRole('button', { name: 'Bilmiyorum', exact: true }).click()
    await expect.poll(() => page.locator('main .page-heading .eyebrow').textContent()).not.toBe(prior)
  }
  const vocabularyProduction = item('es.assess.a2.vp1').exercise
  if (vocabularyProduction?.kind !== 'short') throw new Error('Expected the Spanish vocabulary production item to be short answer')
  const acceptedVariants = vocabularyProduction.accepted
  expect(acceptedVariants).toContain('acta')
  await answerText(page, 'es.assess.a2.vp1', 'acta')
  await expect.poll(async () => (await stored(page)).placementTrack?.samples
    .find(({ itemId }) => itemId === 'es.assess.a2.vp1')).toMatchObject({ status: 'answered', timing: 'before_teaching', mode: 'text', result: 'correct' })

  for (let index = 0; index < 12 && !(await page.getByRole('heading', { name: 'Beceri profili', exact: true }).count()); index++) {
    const prior = await page.locator('main .page-heading .eyebrow').textContent()
    const unknown = page.getByRole('button', { name: 'Bilmiyorum', exact: true })
    if (await unknown.count()) await unknown.click()
    else await page.getByRole('button', { name: 'Şimdilik geç', exact: true }).click()
    await expect.poll(() => page.locator('main .page-heading .eyebrow').textContent()).not.toBe(prior)
  }
  await expect(page.getByRole('heading', { name: 'Beceri profili', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Günlük planı aç' }).click()
  const lesson = catalog.es.unit.lessons[0]
  await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Derse başla', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Harf ile sesi eşleştir', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sonraki örnek', exact: true }).click()
  await page.getByRole('button', { name: 'Rehberli pratiğe geç', exact: true }).click()
  for (const [id, response] of [
    ['es.saludos.form.1.guided.1', 'Buenos'], ['es.saludos.form.2.guided.1', 'llamo'],
  ]) await page.locator(`fieldset[id="${id}"]`).getByRole('textbox').fill(response)
  await page.getByRole('button', { name: 'Yanıtları değerlendir', exact: true }).click()
  await page.getByRole('button', { name: 'Günlük plana dön', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Kelimeleri öğren', exact: true })).toBeVisible()
  await teachVocabulary(page, catalog.es, lesson)
  await page.getByRole('button', { name: 'Pratiğe başla', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Kendi mesajını yaz', exact: true })).toBeVisible()
  await expect(page.getByText('Bir kurs arkadaşına selam ver, adını söyle ve adını sor.', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Yanıtın' })).toBeVisible()
})
