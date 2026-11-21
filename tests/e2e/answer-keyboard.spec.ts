import { expect, test, type Locator, type Page } from '@playwright/test'
import { catalog } from './catalog-fixture'
import { finishPlacement } from '../../src/domain/progress'
import { initialState } from '../../src/domain/state'
import { exportBackup } from '../../src/persistence/repository'

async function openRecall(page: Page, language: 'es' | 'ru') {
  const at = '2026-11-21T10:00:00.000Z'
  const course = catalog[language]
  const card = course.unit.lessons[0].vocabulary[0]
  const profile = {
    id: 'c1288d67-673e-436f-a554-c5fe6e8c81dc', language,
    estimate: 'A1' as const, target: 'A1' as const, minutes: 30,
    goals: ['general' as const], days: [0, 1, 2, 3, 4, 5, 6],
  }
  const answers = Object.fromEntries(course.placement.map(({ exercise }) => [exercise.id,
    exercise.kind === 'open' ? exercise.sample : exercise.kind === 'fill' || exercise.kind === 'short'
      ? exercise.accepted[0] : exercise.accepted]))
  const state = {
    ...finishPlacement(initialState(profile), course, answers, at),
    reviews: [{ cardId: card.id, step: 0, dueAt: at, introducedAt: at }],
  }
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/')
  await page.getByText('Önceden kaydedilmiş bir yedeğin var mı?').click()
  await page.getByLabel('Yedek dosyası').setInputFiles({
    name: 'keyboard-recall.json', mimeType: 'application/json', buffer: Buffer.from(exportBackup(state)),
  })
  await page.getByRole('button', { name: 'Yedeği geri yükle' }).click()
  await page.getByRole('button', { name: 'Kelimeleri tekrar et', exact: true }).click()
  return page.getByRole('textbox', { name: 'Hatırladığın ifade' })
}

async function select(input: Locator, start: number, end = start) {
  await input.focus()
  await input.evaluate((element, range) => {
    (element as HTMLInputElement).setSelectionRange(range.start, range.end)
  }, { start, end })
}

// Exercise real touch events in the mobile project, including focus retention.
async function activate(key: Locator, mobile: boolean) {
  if (mobile) await key.tap()
  else await key.click()
}

test('Spanish keys insert at the caret, replace selections and support uppercase and keyboard access', async ({ page, isMobile }) => {
  const input = await openRecall(page, 'es')
  const keyboard = page.getByRole('group', { name: 'İspanyolca özel karakterler' })
  const key = (name: string) => keyboard.getByRole('button', { name, exact: true })
  await input.fill('Espaa')
  await select(input, 4)
  await activate(key('ñ'), isMobile)
  await expect(input).toHaveValue('España')
  await expect(input).toBeFocused()
  expect(await input.evaluate((element) => (element as HTMLInputElement).selectionStart)).toBe(5)
  await select(input, 0, 6)
  await activate(key('á'), isMobile)
  await expect(input).toHaveValue('á')
  await expect(input).toBeFocused()
  await activate(key('Büyük harf'), isMobile)
  await expect(key('Büyük harf')).toHaveAttribute('aria-pressed', 'true')
  for (const letter of ['Ñ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', '¿', '¡']) {
    await expect(key(letter)).toBeVisible()
    const box = await key(letter).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  await activate(key('Ñ'), isMobile)
  await expect(input).toHaveValue('áÑ')
  await expect(input).toBeFocused()
  await key('Büyük harf').focus()
  await page.keyboard.press('Enter')
  await expect(key('Büyük harf')).toHaveAttribute('aria-pressed', 'false')
  await key('ñ').focus()
  await page.keyboard.press('Space')
  await expect(input).toHaveValue('áÑñ')
  await expect(input).toBeFocused()
  for (const letter of ['á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡']) await activate(key(letter), isMobile)
  await expect(input).toHaveValue('áÑñáéíóúü¿¡')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('Cyrillic toggle switches its label and expanded state with touch and keyboard', async ({ page, isMobile }) => {
  await openRecall(page, 'ru')
  const toggle = page.locator('.cyrillic-keyboard > summary')
  const keyboard = page.getByRole('group', { name: 'Kiril klavyesi', exact: true })
  await expect(toggle).toHaveText('Kiril klavyesini aç')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(keyboard).toBeHidden()
  await activate(toggle, isMobile)
  await expect(toggle).toHaveText('Kiril klavyesini kapat')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(keyboard).toBeVisible()
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveText('Kiril klavyesini aç')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(keyboard).toBeHidden()
})

test('Cyrillic shift inserts uppercase at the caret and preserves lowercase, space and delete', async ({ page, isMobile }) => {
  const input = await openRecall(page, 'ru')
  await activate(page.locator('.cyrillic-keyboard > summary'), isMobile)
  const keyboard = page.getByRole('group', { name: 'Kiril klavyesi', exact: true })
  const key = (name: string) => keyboard.getByRole('button', { name, exact: true })
  await input.fill('Masha')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(await input.evaluate((element) => (element as HTMLInputElement).validity.customError)).toBe(true)
  await input.fill('аша')
  await select(input, 0)
  await activate(key('Büyük harf'), isMobile)
  await expect(input).toBeFocused()
  await expect(key('Büyük harf')).toHaveAttribute('aria-pressed', 'true')
  await activate(key('М'), isMobile)
  await expect(input).toHaveValue('Маша')
  await expect(input).toBeFocused()
  expect(await input.evaluate((element) => (element as HTMLInputElement).validity.customError)).toBe(false)
  await activate(key('Büyük harf'), isMobile)
  await expect(key('Büyük harf')).toHaveAttribute('aria-pressed', 'false')
  await select(input, 4)
  await activate(key('Boşluk'), isMobile)
  await activate(key('я'), isMobile)
  await expect(input).toHaveValue('Маша я')
  await activate(key('Geri sil'), isMobile)
  await expect(input).toHaveValue('Маша ')
  await expect(input).toBeFocused()
})
