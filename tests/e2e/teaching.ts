import { expect, test, type Page } from '@playwright/test'
import type { Course, Lesson } from '../../src/content/schema'
import { wordsPrepared } from '../../src/domain/instruction'
import { phaseTasks } from '../../src/domain/pedagogy'
import { dailyPlan } from '../../src/domain/progress'
import type { LearningState } from '../../src/domain/state'

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

export async function clearPlannedReviews(page: Page, course: Course) {
  for (let batch = 0; batch < 5; batch++) {
    const state = await storedLearning(page)
    const now = await page.evaluate(() => new Date().toISOString())
    const plan = dailyPlan(state, course, now, 'Europe/Istanbul')
    if (plan.kind !== 'review') return
    await page.getByRole('button', { name: 'Kelimeleri tekrar et', exact: true }).click()
    for (const id of plan.cardIds) {
      const recall = course.unit.lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? []).find(({ cardId }) => cardId === id)!.recall
      if (recall.kind !== 'short' && recall.kind !== 'fill') throw new Error('Expected a recall field')
      await page.getByRole('textbox', { name: 'Hatırladığın ifade' }).fill(recall.accepted[0])
      await page.getByRole('button', { name: 'Yanıtı karşılaştır' }).click()
      await page.getByRole('button', { name: 'Tekrarı kaydet' }).click()
    }
    await expect(page.getByText('Kelime tekrarları kaydedildi.')).toBeVisible()
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
