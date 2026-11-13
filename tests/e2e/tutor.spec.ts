import { expect, test, type Page } from '@playwright/test'
import { catalog } from '../../src/content/catalog'

const course = catalog.en
const lesson = course.unit.lessons[0]
const draft = 'I joined the team last year.'
const feedback = { task: 'feedback', grammar: 'Simple Past burada doğru.', vocabulary: 'Uygun.',
  naturalness: 'Doğal.', suitability: 'Tarih doğru verilmiş. Tarihsiz bir deneyim de ekleyebilirsin.', corrections: [] }

async function startLesson(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
  for (const { exercise } of course.placement) {
    const group = page.locator(`fieldset[id="${exercise.id}"]`)
    if (exercise.kind === 'open') await group.getByRole('textbox').fill(exercise.sample)
    else if (exercise.kind === 'single') {
      const option = exercise.id === 'en.placement.1' ? 'have led' : exercise.accepted
      await group.getByRole('radio', { name: option, exact: true }).check()
    } else if (exercise.kind === 'fill' || exercise.kind === 'short') await group.getByRole('textbox').fill(exercise.accepted[0])
    else throw new Error('Unexpected placement exercise type')
  }
  await page.getByRole('button', { name: 'Beceri profilimi gör' }).click()
  await page.getByRole('button', { name: 'Günlük planı aç' }).click()
  await page.getByRole('button', { name: 'Derse başla' }).click()
}

async function submitLesson(page: Page, tasks: typeof lesson.concepts[number]['variants'], wrong = false) {
  for (const [index, exercise] of tasks.entries()) {
    const group = page.locator(`fieldset[id="${exercise.id}"]`)
    if (exercise.kind === 'single') await group.getByRole('radio', {
      name: wrong && index === 0 ? exercise.options.find((item) => item !== exercise.accepted)! : exercise.accepted, exact: true,
    }).check()
    else if (exercise.kind === 'open') await group.getByRole('textbox').fill(draft)
    else if (exercise.kind === 'fill' || exercise.kind === 'short') await group.getByRole('textbox').fill(wrong && index === 0 ? 'have lead' : exercise.accepted[0])
    else throw new Error('Unexpected lesson exercise type')
  }
  await page.getByRole('button', { name: 'Yanıtları değerlendir' }).click()
}

test('coaching follows the explanation and saved draft, with approval per request', async ({ page }) => {
  const requests: unknown[] = []
  await page.route('**/local-tutor/*', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: {
      status: 'connected', models: [], blocked: false, csrf: 'fixture',
    } })
    const body = route.request().postDataJSON()
    requests.push(body)
    return route.fulfill({ json: { result: body.request.task === 'feedback' ? feedback : {
      task: 'explanation', text: 'Bitmiş zamanı söylediğinde Simple Past kullan.',
    } } })
  })
  await startLesson(page)
  await expect(page.getByLabel('AI görevi')).toHaveCount(0)
  await expect(page.getByLabel('Model', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Başka şekilde açıkla', exact: true }).click()
  await page.getByRole('button', { name: 'Şimdi değil' }).click()
  expect(requests).toHaveLength(0)
  await page.getByText('Bu konu hakkında sor', { exact: true }).click()
  await page.getByLabel('Sorun', { exact: true }).fill('Simple Past ile farkı ne?')
  await page.getByRole('button', { name: 'Soruyu hazırla' }).click()
  await page.getByRole('button', { name: 'Onayla ve gönder' }).click()
  await expect(page.getByText('Bitmiş zamanı söylediğinde Simple Past kullan.')).toBeVisible()
  await submitLesson(page, [...lesson.concepts.map(({ variants }) => variants[0]), lesson.production])
  await expect(page.getByText('2 / 2 kesin yanıt doğru')).toBeVisible()
  expect(requests).toHaveLength(1)
  await page.getByRole('button', { name: 'Yanıtım hakkında geri bildirim al' }).click()
  await page.getByRole('button', { name: 'Onayla ve gönder' }).click()
  await expect(page.getByText(feedback.grammar)).toBeVisible()
  await expect(page.getByText('İnceleme bekliyor', { exact: true })).toBeVisible()
  expect(requests).toMatchObject([
    { allowPlanOrCredits: true, request: { task: 'explanation', question: 'Simple Past ile farkı ne?' } },
    { allowPlanOrCredits: true, request: { task: 'feedback', sentence: draft, exerciseId: lesson.production.id } },
  ])
  expect(requests.every((request) => !Object.hasOwn(request as object, 'model'))).toBe(true)
  await page.getByRole('button', { name: 'Günlük plana dön' }).click()
  await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
  await expect(page.getByRole('heading', { name: 'Yeni bağlamda üretim' })).toBeVisible()
  await submitLesson(page, lesson.pedagogy!.checks.map(({ transfer }) => transfer[0]))
  await expect(page.getByText('Doğru', { exact: true })).toHaveCount(2)
  expect(requests).toHaveLength(2)
})

for (const failure of ['quota', 'invalid', 'practice'] as const) {
  test(`a repeated error offers help, and ${failure} leaves local practice available`, async ({ page }) => {
    let requests = 0
    await page.route('**/local-tutor/*', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ json: {
        status: 'connected', models: [], blocked: false, csrf: 'fixture',
      } })
      requests++
      expect(route.request().postDataJSON().request).toMatchObject({ task: 'practice', conceptId: lesson.concepts[0].id })
      if (failure === 'practice') return route.fulfill({ json: { result: {
        task: 'practice', prompt: 'Tell me about a workshop you have led.', sample: 'I have led a workshop in English.',
        explanation: 'Tarih vermeden bir deneyimi anlat.',
      } } })
      return failure === 'quota' ? route.fulfill({ status: 429, json: { error: 'Kullanım sınırına ulaşıldı.' } }) :
        route.fulfill({ json: { result: { task: 'feedback', grammar: 'unrelated' } } })
    })
    await startLesson(page)
    await submitLesson(page, [...lesson.concepts.map(({ variants }) => variants[0]), lesson.production], true)
    await expect(page.getByRole('button', { name: 'Bu hatayı farklı bir örnekle çalış' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Günlük plana dön' }).click()
    await page.getByRole('button', { name: 'Pratiğe başla' }).click()
    await submitLesson(page, [lesson.concepts[0].variants[1]], true)
    await page.getByRole('button', { name: 'Bu hatayı farklı bir örnekle çalış' }).click()
    expect(requests).toBe(0)
    await page.getByRole('button', { name: 'Onayla ve gönder' }).click()
    if (failure === 'practice') {
      await page.getByLabel('Pratik yanıtın').fill('I have led an evening workshop.')
      await page.getByRole('button', { name: 'Örnekle karşılaştır' }).click()
      await expect(page.getByText('Tarih vermeden bir deneyimi anlat.')).toBeVisible()
    } else await expect(page.getByRole('alert')).toContainText(failure === 'quota' ? 'Kullanım sınırına' : 'doğrulanamadı')
    await page.getByRole('button', { name: 'Günlük plana dön' }).click()
    await expect(page.getByRole('button', { name: 'Pratiğe başla' })).toBeVisible()
  })
}
