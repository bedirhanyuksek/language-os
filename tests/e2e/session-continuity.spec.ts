import { teachVocabulary, clearPlannedReviews, reviewPlannedBatch } from './teaching'
import { expect, test, type Page } from '@playwright/test'
import { catalog } from './catalog-fixture'
import { restoreLegacy } from './legacy-profile'
import type { Course, Exercise } from '../../src/content/schema'
import type { Answer } from '../../src/domain/model'
import { phaseTasks } from '../../src/domain/pedagogy'
import { dailyMinutes, dailyPlan, finishLesson, finishPedagogy, finishPlacement, finishTypedReview, lessonTasks } from '../../src/domain/progress'
import { initialState, type LearningState } from '../../src/domain/state'
import { exportBackup } from '../../src/persistence/repository'

test('a Russian placement draft survives reload and the next local day without counting an attempt', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-13T10:00:00Z'))
  await page.goto('/')
  await restoreLegacy(page, catalog.ru, { target: 'A1', minutes: 15 }, null)
  const field = page.locator('fieldset[id="ru.placement.5"]').getByRole('textbox')
  await field.fill('Меня зовут Анна.')
  await page.clock.setFixedTime(new Date('2026-11-14T10:00:00Z'))
  await page.reload()
  await expect(field).toHaveValue('Меня зовут Анна.', { timeout: 3000 })
  await expect(page.getByRole('button', { name: 'Beceri profili', exact: true })).toHaveCount(0)
})

const firstDay = '2026-11-13T10:00:00.000Z'
const nextDay = '2026-11-14T10:01:00.000Z'
const zone = 'Europe/Istanbul'
const field = (page: Page, id: string) => page.locator(`fieldset[id="${id}"]`)
const answer = (exercise: Exercise): Answer => exercise.kind === 'open' ? exercise.sample :
  exercise.kind === 'short' || exercise.kind === 'fill' ? exercise.accepted[0] : exercise.accepted
const answers = (items: { exercise: Exercise }[]) => Object.fromEntries(items.map(({ exercise }) => [exercise.id, answer(exercise)]))

async function fill(page: Page, exercise: Exercise, value = answer(exercise)) {
  const group = field(page, exercise.id)
  if (exercise.kind === 'single') await group.getByRole('radio', { name: String(value), exact: true }).check()
  else if (exercise.kind === 'matching') {
    for (const [i, prompt] of exercise.prompts.entries()) await group.getByRole('combobox', { name: prompt }).selectOption(value[i])
  } else if (exercise.kind === 'word_order' || exercise.kind === 'sentence_order') {
    for (const token of value) await group.getByRole('button', { name: token, exact: true }).click()
  } else if (exercise.kind === 'multiple') {
    for (const token of value) await group.getByRole('checkbox', { name: token, exact: true }).check()
  } else await group.getByRole('textbox').fill(String(value))
}

async function stored(page: Page): Promise<LearningState> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('language-os')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('workspace', 'readonly')
      const read = tx.objectStore('workspace').get('active')
      tx.oncomplete = () => { db.close(); resolve(read.result.state) }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
}

async function saved(page: Page) {
  await expect(page.getByText('Taslak bu cihazda kaydedildi.', { exact: true })).toBeVisible()
}

async function toPlan(page: Page) {
  await page.getByRole('button', { name: 'Günlük plana dön' }).click()
}

async function openExamples(page: Page, lesson: Course['unit']['lessons'][number]) {
  await page.getByRole('button', { name: 'Derse başla' }).click()
  await page.screenshot({ path: test.info().outputPath(`grammar-${lesson.id}.png`), fullPage: true })
  for (const [index, item] of lesson.teaching!.models.entries()) {
    await expect(page.getByText(item.phrase, { exact: true }).first()).toBeVisible()
    if (index === lesson.teaching!.models.length - 1) await page.screenshot({ path: test.info().outputPath(`grammar-contrast-${lesson.id}.png`), fullPage: true })
    await page.getByRole('button', { name: index + 1 === lesson.teaching!.models.length ? 'Rehberli pratiğe geç' : 'Sonraki örnek' }).click()
  }
}

async function onboard(page: Page, course: Course, target: string, minutes: string) {
  await page.clock.setFixedTime(new Date(firstDay))
  await page.goto('/')
  await page.getByRole('radio', { name: course.language === 'ru' ? /Rusça/ : /İngilizce/ }).check()
  await page.getByLabel('Hedef seviyen').selectOption(target)
  await page.getByLabel('Günlük süre (dk)').fill(minutes)
  await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
  for (let sample = 0; sample < (course.language === 'ru' ? 3 : 4); sample++) {
    await page.getByRole('button', { name: 'Bilmiyorum', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Beceri profili', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Günlük planı aç', exact: true }).click()
}

async function submitPractice(page: Page) {
  await page.getByRole('button', { name: 'Yanıtları değerlendir' }).click()
}

async function playAudio(page: Page, label: string) {
  const player = page.locator('audio')
  await expect(player).toHaveAttribute('aria-label', label)
  await player.evaluate(async (element) => {
    const audio = element as HTMLAudioElement
    audio.muted = true
    audio.playbackRate = 4
    await audio.play()
  })
  await expect(player).toHaveJSProperty('ended', true)
}

async function solvePhase(page: Page, course: Course, phase: 'transfer' | 'reading' | 'listening' | 'delayed', now = firstDay) {
  await clearPlannedReviews(page, course)
  const state = await stored(page)
  const proposal = dailyPlan(state, course, now, zone)
  expect(proposal).toMatchObject({ kind: 'pedagogy', phase })
  if (proposal.kind !== 'pedagogy') throw new Error('Beklenen öğrenme aşaması açılmadı.')
  const lesson = course.unit.lessons.find(({ id }) => id === proposal.lessonId)!
  await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
  const items = phaseTasks(state, lesson, phase, now, proposal.vocabularyCardIds)
  for (const [index, { exercise }] of items.entries()) {
    if (phase === 'listening') await playAudio(page, index === 0 ? 'Kaydı dinle' : 'Tekrar dinle')
    await fill(page, exercise)
    if (phase === 'listening' && index === 0 && items.length > 1) await page.getByRole('button', { name: 'Ana fikri kaydet' }).click()
  }
  await submitPractice(page)
  await expect(page.getByRole('heading', { name: 'Çalışma sonucu' })).toBeVisible()
  await toPlan(page)
}

test('Russian A1 at fifteen minutes resumes Kiril repair offline and proceeds to a new introduction', async ({ page, context }) => {
  test.setTimeout(65_000)
  const course = catalog.ru
  const kiril = course.unit.lessons.find(({ id }) => id === 'ru.cyrillic')!
  await onboard(page, course, 'A1', '15')
  await openExamples(page, kiril)
  const guided = lessonTasks(await stored(page), kiril)
  for (const [index, { exercise }] of guided.entries()) await fill(page, exercise, index === 0 ? 'xxx' : answer(exercise))
  await submitPractice(page)
  await toPlan(page)
  await expect(page.getByText(/açıklamalı prova ve yeni soru/)).toBeVisible()
  await page.getByRole('button', { name: 'Pratiğe başla' }).click()
  const retry = lessonTasks(await stored(page), kiril)[0].exercise
  expect(retry.id).not.toBe(guided[0].exercise.id)
  await expect(page.getByRole('heading', { name: 'Hatanı farklı bir örnekle incele' })).toBeVisible()
  await fill(page, retry)
  await saved(page)
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.clock.setFixedTime(new Date(nextDay))
  await page.reload()
  await page.getByRole('button', { name: 'Devam et', exact: true }).click()
  await expect(field(page, retry.id).getByRole('textbox')).toHaveValue(String(answer(retry)))
  await submitPractice(page)
  await toPlan(page)
  await teachVocabulary(page, course, kiril)
  await page.getByRole('button', { name: 'Pratiğe başla' }).click()
  await fill(page, kiril.production, 'Анна. Нина. Метро.')
  await submitPractice(page)
  await toPlan(page)
  const practiceDay = '2026-11-15T10:02:00.000Z'
  await page.clock.setFixedTime(new Date(practiceDay))
  await page.reload()
  await solvePhase(page, course, 'transfer', practiceDay)
  await solvePhase(page, course, 'reading', practiceDay)
  expect((await stored(page)).attempts.find(({ exerciseId }) => exerciseId === retry.id)?.evidence.outcome).toBe('correct')

  const third = '2026-11-16T10:02:00.000Z'
  await page.clock.setFixedTime(new Date(third))
  await page.reload()
  await solvePhase(page, course, 'listening', third)
  const { main, detail } = kiril.pedagogy!.listening
  const listeningAttempts = (await stored(page)).attempts.filter(({ exerciseId }) =>
    exerciseId === main.id || exerciseId === detail.id)
  expect(listeningAttempts.map(({ exerciseId, evidence, study }) => [exerciseId, evidence.outcome, study?.plays])).toEqual([
    [main.id, 'correct', 2],
    [detail.id, 'correct', 2],
  ])
  await reviewPlannedBatch(page, course, third)
  const state = await stored(page)
  const plan = dailyPlan(state, course, third, zone)
  if (plan.kind === 'pedagogy' && plan.phase === 'revision') {
    await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
    await submitPractice(page)
    await toPlan(page)
  }
  const fourth = '2026-11-17T10:03:00.000Z'
  await page.clock.setFixedTime(new Date(fourth))
  await page.reload()
  await reviewPlannedBatch(page, course, fourth)
  await solvePhase(page, course, 'delayed', fourth)
  if ((dailyPlan(await stored(page), course, fourth, zone)).kind === 'speaking') {
    await page.getByRole('button', { name: 'Konuşmayı hazırla' }).click()
    await page.getByRole('button', { name: 'Konuşmayı daha sonra yap' }).click()
  }
  const introduction = course.unit.lessons.find(({ id }) => id === 'ru.intro')!
  await expect(page.getByRole('heading', { name: introduction.title, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Derse başla' }).click()
  await expect(page.getByText(introduction.teaching!.models[0].phrase, { exact: true }).first()).toBeVisible()
})

test('English B1 at thirty minutes saves a retry once, teaches words, and records next-day recall', async ({ page, context }) => {
  test.setTimeout(65_000)
  const course = catalog.en
  const lesson = course.unit.lessons[0]
  await onboard(page, course, 'C1', '30')
  await openExamples(page, lesson)
  const guided = lessonTasks(await stored(page), lesson)
  for (const [index, { exercise }] of guided.entries()) await fill(page, exercise, index === 0 ? 'have lead' : answer(exercise))
  await submitPractice(page)
  await toPlan(page)
  await page.getByRole('button', { name: 'Pratiğe başla' }).click()
  const retry = lessonTasks(await stored(page), lesson)[0].exercise
  expect(retry.id).not.toBe(guided[0].exercise.id)
  await expect(page.getByRole('heading', { name: 'Hatanı farklı bir örnekle incele' })).toBeVisible()
  await fill(page, retry)
  await saved(page)

  const other = await context.newPage()
  await other.clock.setFixedTime(new Date(firstDay))
  await other.goto('/')
  await other.getByRole('button', { name: 'Devam et', exact: true }).click()
  await expect(field(other, retry.id).getByRole('textbox')).toHaveValue(String(answer(retry)))
  await Promise.all([page, other].map((tab) => tab.locator('form.exercise-form').evaluate((node) => {
    const form = node as HTMLFormElement
    form.requestSubmit()
    form.requestSubmit()
  })))
  await expect.poll(async () => {
    const state = await stored(page)
    return state.attempts.filter(({ exerciseId }) => exerciseId === retry.id).length
  }).toBe(1)
  await expect.poll(async () => {
    const state = await stored(page)
    return state.activity.filter(({ itemId }) => itemId === lesson.id).length
  }).toBe(2)
  await expect.poll(async () => Number(await page.getByRole('button', { name: 'Günlük plana dön' }).isVisible()) +
    Number(await other.getByRole('button', { name: 'Günlük plana dön' }).isVisible())).toBe(1)
  const winner = await page.getByRole('button', { name: 'Günlük plana dön' }).isVisible() ? page : other
  const loser = winner === page ? other : page
  await expect(loser.getByRole('alert').filter({ hasText: /başka bir sekmede/ })).toBeVisible()
  await loser.close()
  await toPlan(winner)

  await teachVocabulary(winner, course, lesson)
  await winner.getByRole('button', { name: 'Pratiğe başla' }).click()
  await fill(winner, lesson.production, 'I joined a neighbourhood class last Friday. I have volunteered at a festival before.')
  await submitPractice(winner)
  await expect(winner.getByText('İnceleme bekliyor', { exact: true })).toBeVisible()
  await toPlan(winner)
  await solvePhase(winner, course, 'transfer')
  await solvePhase(winner, course, 'reading')
  await solvePhase(winner, course, 'listening')
  await winner.clock.setFixedTime(new Date(nextDay))
  await winner.reload()
  await reviewPlannedBatch(winner, course, nextDay)
  if ((dailyPlan(await stored(winner), course, nextDay, zone)).kind === 'pedagogy') {
    const remaining = dailyPlan(await stored(winner), course, nextDay, zone)
    if (remaining.kind === 'pedagogy' && remaining.phase === 'revision') {
      await winner.getByRole('button', { name: 'Çalışmayı aç' }).click()
      await submitPractice(winner)
      await toPlan(winner)
    }
  }
  await solvePhase(winner, course, 'delayed', nextDay)
  await winner.getByRole('button', { name: 'Beceri profili', exact: true }).click()
  await winner.screenshot({ path: test.info().outputPath('skill-profile.png'), fullPage: true })
  await winner.getByText('Derslerde toplanan kanıtlar', { exact: true }).click()
  await expect(winner.getByText(/İlk ve gecikmeli denemeyi karşılaştır/).first()).toBeVisible()
  const state = await stored(winner)
  expect(state.reviewHistory.some(({ mode, at }) => mode === 'typed' && at === nextDay)).toBe(true)
  expect(state.attempts.find(({ context }) => context === 'delayed')?.study?.sessionId).toBeTruthy()
})

function advancedHistory() {
  const course = catalog.en
  let state = finishPlacement(initialState({ id: '4d970c7a-b5ef-47e6-bffa-ecad393be689', language: 'en',
    estimate: 'C1', target: 'C2', minutes: 60, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6] }), course,
  answers(course.placement), firstDay)
  const recalls = new Map(course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? []).map((entry) => [entry.cardId, entry.recall]))
  for (let date = 0; date < 75; date++) {
    const now = new Date(Date.parse(firstDay) + date * 86_400_000).toISOString()
    for (let block = 0; block < 65; block++) {
      const plan = dailyPlan(state, course, now, zone)
      if (plan.kind === 'lesson' && plan.lessonId === 'en.reformulate') {
        if (dailyMinutes(state, now, zone) <= 25) return { now, state }
        break
      }
      if (plan.kind === 'review') {
        for (const id of plan.cardIds) state = finishTypedReview(state, course, id, String(answer(recalls.get(id)!)), now)
        continue
      }
      if (!('lessonId' in plan)) break
      const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
      if (plan.kind === 'speaking') state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
      else if (plan.kind === 'pedagogy') state = finishPedagogy(state, course, lesson, plan.phase,
        answers(phaseTasks(state, lesson, plan.phase, now, plan.vocabularyCardIds)), now, plan.phase === 'listening' ? 'played' : undefined, now, plan.vocabularyCardIds)
      else state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), now)
    }
  }
  throw new Error('C1 örneği yayımlanan rotadan ulaşılamadı.')
}

test('advanced English restores a v2 history, keeps the open draft and rubric through budget and language changes', async ({ page }) => {
  test.setTimeout(65_000)
  const course = catalog.en
  const lesson = course.unit.lessons.find(({ id }) => id === 'en.reformulate')!
  const { now, state } = advancedHistory()
  await page.clock.setFixedTime(new Date(now))
  await page.goto('/')
  await page.getByText('Önceden kaydedilmiş bir yedeğin var mı?').click()
  const backup = exportBackup(state)
  expect(JSON.parse(backup).schemaVersion).toBe(2)
  await page.getByLabel('Yedek dosyası').setInputFiles({
    name: 'stage-one-advanced.json', mimeType: 'application/json', buffer: Buffer.from(backup),
  })
  await page.getByRole('button', { name: 'Yedeği geri yükle' }).click()
  await openExamples(page, lesson)
  for (const { exercise } of lessonTasks(await stored(page), lesson)) await fill(page, exercise)
  await submitPractice(page)
  await toPlan(page)
  await teachVocabulary(page, course, lesson)
  await page.getByRole('button', { name: 'Pratiğe başla' }).click()
  const rubric = page.getByText('Yazını kontrol etmek için ölçütler', { exact: true })
  await rubric.click()
  const draft = 'Board: Two archive evenings depend on staffing. Visitor notice: We are preparing two visits. Please wait for booking and access details.'
  await fill(page, lesson.production, draft)
  await saved(page)
  await page.reload()
  await page.getByRole('button', { name: 'Devam et', exact: true }).click()
  await expect(rubric.locator('..')).toHaveAttribute('open', '')
  await expect(field(page, lesson.production.id).getByRole('textbox')).toHaveValue(draft)
  expect((await stored(page)).attempts.some(({ exerciseId }) => exerciseId === lesson.production.id)).toBe(false)

  await page.getByRole('button', { name: 'Ayarlar' }).click()
  await page.getByLabel('Günlük süre (dk)').fill('45')
  await page.getByRole('button', { name: 'Ayarları kaydet' }).click()
  await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible()
  await page.getByLabel('Çalışma dili').selectOption('ru')
  await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
  await field(page, 'ru.assess.a1.r1').getByRole('radio', { name: 'КАССА', exact: true }).check()
  await saved(page)
  await page.getByLabel('Çalışma dili').selectOption('en')
  await page.getByRole('button', { name: 'Devam et', exact: true }).click()
  await expect(field(page, lesson.production.id).getByRole('textbox')).toHaveValue(draft)
  await expect(rubric.locator('..')).toHaveAttribute('open', '')
  await submitPractice(page)
  await toPlan(page)
  expect((await stored(page)).profile.minutes).toBe(45)
  const written = (await stored(page)).attempts.find(({ exerciseId }) => exerciseId === lesson.production.id)
  expect(written).toMatchObject({ evidence: { outcome: 'review_required' }, study: { supports: ['rubric'] } })
  const continuation = new Date(Date.parse(now) + 86_400_000).toISOString()
  await page.clock.setFixedTime(new Date(continuation))
  await page.reload()
  await solvePhase(page, course, 'transfer', continuation)
  const reading = dailyPlan(await stored(page), course, continuation, zone)
  expect(reading).toMatchObject({ kind: 'pedagogy', phase: 'reading', lessonId: lesson.id })
  await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
  await expect(page.getByText(lesson.pedagogy!.reading.text, { exact: true })).toBeVisible()
  await fill(page, lesson.pedagogy!.reading.question)
  await submitPractice(page)
  await expect(page.getByRole('heading', { name: 'Çalışma sonucu' })).toBeVisible()
  expect((await stored(page)).attempts.some(({ lessonId, context }) => lessonId === lesson.id && context === 'reading')).toBe(true)
  await page.getByLabel('Çalışma dili').selectOption('ru')
  await expect(field(page, 'ru.assess.a1.r1').getByRole('radio', { name: 'КАССА', exact: true })).toBeChecked()
})
