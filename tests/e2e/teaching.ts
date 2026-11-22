import { expect, test, type Page } from '@playwright/test'
import type { Course, Lesson } from '../../src/content/schema'
import { wordsPrepared } from '../../src/domain/instruction'
import { phaseTasks } from '../../src/domain/pedagogy'
import { dailyPlan } from '../../src/domain/progress'
import type { LearningState } from '../../src/domain/state'
import { vocabularyIndex } from '../../src/content/vocabulary'

export async function storedLearning(page: Page): Promise<LearningState> {
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

async function performReviewPlan(page: Page, course: Course, cardIds: string[]) {
  await page.getByRole('button', { name: 'Kelimeleri tekrar et', exact: true }).click()
  for (const [index, id] of cardIds.entries()) {
    const entry = vocabularyIndex(course).get(id)
    const recall = entry?.learning?.recall
    if (!entry || !recall || (recall.kind !== 'short' && recall.kind !== 'fill')) {
      throw new Error(`Planlanan tekrar kartında yazılı hatırlama görevi yok: ${id} (${index + 1}/${cardIds.length}).`)
    }
    const answer = recall.accepted[0]
    if (!answer?.trim()) throw new Error(`Planlanan tekrar yanıtı boş: ${id} (${recall.id}).`)
    const prompt = `Tekrar kartı ${index + 1}/${cardIds.length} · ${id} · ${recall.id}`
    await expect(page.getByText(recall.prompt, { exact: true }), prompt).toBeVisible()
    const field = page.getByRole('textbox', { name: 'Hatırladığın ifade' })
    await field.fill(answer)
    await expect(field, `${prompt} · beklenen cevap alana yazılmadı`).toHaveValue(answer)
    const compare = page.getByRole('button', { name: 'Yanıtı karşılaştır' })
    await expect(compare, `${prompt} · cevap alanı dolu olmasına rağmen karşılaştırma açılamadı`).toBeEnabled()
    await compare.click()
    await page.getByRole('button', { name: 'Tekrarı kaydet' }).click()
  }
  await expect(page.getByText('Kelime tekrarları kaydedildi.')).toBeVisible()
  return true
}

export async function reviewPlannedBatch(page: Page, course: Course, at?: string) {
  const state = await storedLearning(page)
  const now = at ?? await page.evaluate(() => new Date().toISOString())
  const plan = dailyPlan(state, course, now, 'Europe/Istanbul')
  if (plan.kind !== 'review') return false
  return performReviewPlan(page, course, plan.cardIds)
}

export async function clearPlannedReviews(page: Page, course: Course) {
  const seenDueSets = new Set<string>()
  while (true) {
    const state = await storedLearning(page)
    const now = await page.evaluate(() => new Date().toISOString())
    const plan = dailyPlan(state, course, now, 'Europe/Istanbul')
    if (plan.kind !== 'review') return
    const dueSet = state.reviews.filter(({ dueAt }) => dueAt <= now).map(({ cardId }) => cardId).sort().join('|')
    if (seenDueSets.has(dueSet)) {
      throw new Error(`Tekrar kuyruğu ilerlemedi (${plan.cardIds.length} kart, ${plan.reason}).`)
    }
    seenDueSets.add(dueSet)
    await performReviewPlan(page, course, plan.cardIds)
  }
}

export async function teachVocabulary(page: Page, course: Course, lesson: Lesson) {
  while (!wordsPrepared(await storedLearning(page), lesson)) {
    await clearPlannedReviews(page, course)
    const state = await storedLearning(page)
    const at = await page.evaluate(() => new Date().toISOString())
    const plan = dailyPlan(state, course, at, 'Europe/Istanbul')
    expect(plan).toMatchObject({ kind: 'pedagogy', phase: 'vocabulary', lessonId: lesson.id })
    if (plan.kind !== 'pedagogy') throw new Error('Beklenen kelime grubu planlanmadı.')
    const tasks = phaseTasks(state, lesson, 'vocabulary', at, plan.vocabularyCardIds)
    await page.getByRole('button', { name: 'Çalışmayı aç', exact: true }).click()
    for (const [index, { conceptId, exercise }] of tasks.entries()) {
      if (index % 3 === 0) {
        const card = lesson.vocabulary.find(({ id }) => id === conceptId)!
        await expect(page.getByRole('heading', { name: card.term, exact: true })).toBeVisible()
        await expect(page.getByText(card.example, { exact: true })).toBeVisible()
        await page.screenshot({ path: test.info().outputPath(`word-${card.id}.png`), fullPage: true })
        await page.getByRole('button', { name: 'Kelimeyi çalış', exact: true }).click()
      }
      const group = page.locator(`fieldset[id="${exercise.id}"]`)
      if (exercise.kind === 'single') await group.getByRole('radio', { name: exercise.accepted, exact: true }).check()
      else if (exercise.kind === 'short' || exercise.kind === 'fill') await group.getByRole('textbox').fill(exercise.accepted[0])
      else if (exercise.kind === 'open') await group.getByRole('textbox').fill(exercise.sample)
      else throw new Error('Unexpected vocabulary exercise')
      await page.getByRole('button', { name: 'Yanıtı kaydet', exact: true }).click()
    }
    await expect(page.getByRole('heading', { name: 'Çalışma sonucu', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Günlük plana dön', exact: true }).click()
  }
  await clearPlannedReviews(page, course)
}
