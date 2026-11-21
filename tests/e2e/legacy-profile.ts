import type { Page } from '@playwright/test'
import type { Course } from '../../src/content/schema'
import type { Answer } from '../../src/domain/model'
import { finishPlacement } from '../../src/domain/progress'
import { initialState, type Profile } from '../../src/domain/state'
import { exportBackup } from '../../src/persistence/repository'

// Exercise the published legacy route through its public backup entry point.
export async function restoreLegacy(page: Page, course: Course, overrides: Partial<Profile> = {},
  responses: Record<string, Answer> | null = {}, at = '2026-11-13T10:00:00.000Z') {
  const state = initialState({ id: 'fdbb6716-86b7-4024-bba4-63934ccb9276', language: course.language,
    estimate: course.language === 'en' ? 'B1' : 'A1', target: course.language === 'en' ? 'C1' : 'B1',
    minutes: 30, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6], ...overrides })
  const answers = Object.fromEntries(course.placement.map(({ exercise }) => [exercise.id,
    exercise.kind === 'open' ? exercise.sample :
      exercise.kind === 'fill' || exercise.kind === 'short' ? exercise.accepted[0] : exercise.accepted]))
  const restored = responses === null ? state : finishPlacement(state, course, { ...answers, ...responses }, at)
  await page.getByText('Önceden kaydedilmiş bir yedeğin var mı?').click()
  await page.getByLabel('Yedek dosyası').setInputFiles({
    name: 'legacy-profile.json', mimeType: 'application/json', buffer: Buffer.from(exportBackup(restored)),
  })
  await page.getByRole('button', { name: 'Yedeği geri yükle' }).click()
}
