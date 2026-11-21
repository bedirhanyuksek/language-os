import { expect, test } from '@playwright/test'
import { catalog } from './catalog-fixture'
import { exportBackup } from '../../src/persistence/repository'
import { initialState } from '../../src/domain/state'
import { finishPlacement } from '../../src/domain/progress'
import { storedLearning } from './teaching'

test('Russian typed answer keeps its score and readable glyphs from input through feedback', async ({ page }) => {
  const course = catalog.ru
  const lesson = course.unit.lessons.find(({ id }) => id === 'ru.intro')!
  const card = lesson.vocabulary.find(({ id }) => id === 'ru.intro.word.2')!
  const answer = 'меня зовут'
  const at = '2026-11-21T10:00:00.000Z'
  const profile = { id: 'c1288d67-673e-436f-a554-c5fe6e8c81dc', language: 'ru' as const,
    estimate: 'A1' as const, target: 'A1' as const, minutes: 30, goals: ['general' as const], days: [0, 1, 2, 3, 4, 5, 6] }
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
    name: 'russian-recall.json', mimeType: 'application/json', buffer: Buffer.from(exportBackup(state)),
  })
  await page.getByRole('button', { name: 'Yedeği geri yükle' }).click()
  await expect(page.getByRole('button', { name: 'Kelimeleri tekrar et', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Kelimeleri tekrar et', exact: true }).click()

  const input = page.getByRole('textbox', { name: 'Hatırladığın ifade' })
  await input.fill(answer)
  expect(await input.inputValue()).toBe(answer)
  const inputCodePoints = await input.evaluate((element) => Array.from((element as HTMLInputElement).value, (character) => character.codePointAt(0)))
  const expectedCodePoints = Array.from(card.term, (character) => character.codePointAt(0))
  expect(inputCodePoints).toEqual(expectedCodePoints)
  const inputFont = await input.evaluate((element) => {
    const style = getComputedStyle(element)
    return { family: style.fontFamily, style: style.fontStyle, weight: style.fontWeight }
  })

  await page.getByRole('button', { name: 'Yanıtı karşılaştır' }).click()
  await expect(page.getByText('Doğru hatırladın.', { exact: true })).toBeVisible()
  const feedback = page.locator('p.yours[lang="ru"]')
  await expect(feedback).toHaveText('Yanıtın меня зовут')
  const feedbackFont = await feedback.evaluate((element) => {
    const style = getComputedStyle(element)
    return { family: style.fontFamily, style: style.fontStyle, weight: style.fontWeight }
  })
  expect(feedbackFont).toEqual({ ...inputFont, style: 'normal' })

  await page.getByRole('button', { name: 'Tekrarı kaydet' }).click()
  const saved = await storedLearning(page)
  expect(saved.reviewHistory.at(-1)).toMatchObject({ answer, result: 'remembered', mode: 'typed' })
})
