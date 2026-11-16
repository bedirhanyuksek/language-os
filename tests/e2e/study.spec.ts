import { expect, test, type Locator, type Page } from '@playwright/test'
import { catalog } from './catalog-fixture'
import coachReport from '../fixtures/speaking-coach.json' with { type: 'json' }
import validReport from '../fixtures/speaking-valid.json' with { type: 'json' }
import invalidReport from '../fixtures/speaking-invalid.json' with { type: 'json' }
import type { Exercise } from '../../src/content/schema'
import { phaseTasks } from '../../src/domain/pedagogy'
import { finishLesson, finishPedagogy, finishPlacement, lessonTasks } from '../../src/domain/progress'
import { initialState } from '../../src/domain/state'
import { exportBackup } from '../../src/persistence/repository'

type TestExercise = { id: string; kind: string; accepted?: string | string[]; sample?: string; prompts?: string[] }

async function fitsViewport(page: Page) {
  await expect(page.locator('main')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function fill(group: Locator, exercise: TestExercise, override?: string) {
  await expect(group).toBeVisible()
  const accepted = override ?? exercise.accepted
  if (exercise.kind === 'open') await group.getByRole('textbox').fill(exercise.sample!)
  else if (exercise.kind === 'single') await group.getByRole('radio', { name: String(accepted), exact: true }).check()
  else if (exercise.kind === 'multiple') {
    for (const item of accepted as string[]) await group.getByRole('checkbox', { name: item, exact: true }).check()
  } else if (exercise.kind === 'matching') {
    for (const [index, prompt] of exercise.prompts!.entries()) await group.getByRole('combobox', { name: prompt }).selectOption(accepted![index])
  } else if (exercise.kind.endsWith('_order')) {
    for (const item of accepted as string[]) await group.getByRole('button', { name: item, exact: true }).click()
  } else await group.getByRole('textbox').fill(Array.isArray(accepted) ? accepted[0] : String(accepted))
}

function task(page: Page, exercise: TestExercise) {
  return page.locator(`fieldset[id="${exercise.id}"]`)
}

async function toPlan(page: Page) {
  await page.getByRole('button', { name: 'Günlük plana dön' }).click()
  await expect(page.getByRole('heading', { name: 'Bugünkü plan' })).toBeVisible()
}

async function submit(page: Page) {
  await page.getByRole('button', { name: 'Yanıtları değerlendir' }).click()
}

test('restoring a partial word lesson opens the next three cards', async ({ page }) => {
  const course = catalog.en
  const lesson = course.unit.lessons.find(({ id }) => id === 'en.intercultural')!
  const date = '2026-11-13T10:00:00.000Z'
  const preparedAnswers = (items: { exercise: Exercise }[]) => Object.fromEntries(items.map(({ exercise }) => [
    exercise.id, exercise.kind === 'open' ? exercise.sample :
      exercise.kind === 'fill' || exercise.kind === 'short' ? exercise.accepted[0] : exercise.accepted,
  ]))
  let state = finishPlacement(initialState({
    id: '50bc1969-350a-47a1-9b76-3036732c74d0', language: 'en', estimate: 'B1',
    target: 'C1', goals: ['general'], days: [5], minutes: 60,
  }), course, preparedAnswers(course.placement), date)
  // Use the normal assessment operations to prepare a backup just after saving the first batch.
  const ready = new Set<string>()
  const prepare = (item: typeof lesson) => {
    if (ready.has(item.id)) return
    for (const prerequisite of item.prerequisites) prepare(course.unit.lessons.find(({ objective }) => objective.id === prerequisite)!)
    for (let block = 0; block < 3; block++) {
      const tasks = lessonTasks(state, item)
      if (!tasks.length) break
      state = finishLesson(state, course, item, preparedAnswers(tasks), date)
    }
    state = finishPedagogy(state, course, item, 'transfer', preparedAnswers(phaseTasks(state, item, 'transfer', date)), date)
    const phases = item.id === lesson.id
      ? ['reading', 'listening', 'vocabulary'] as const
      : ['reading', 'listening', 'vocabulary', 'revision'] as const
    for (const phase of phases) {
      const tasks = phaseTasks(state, item, phase, date)
      if (tasks.length) state = finishPedagogy(state, course, item, phase, preparedAnswers(tasks), date,
        phase === 'listening' ? 'played' : undefined)
    }
    ready.add(item.id)
  }
  prepare(lesson)
  state = {
    ...state,
    activity: [],
    skippedSpeaking: course.unit.lessons.filter(({ id, speaking }) => id !== lesson.id && speaking && ready.has(id))
      .map(({ id }) => id),
    reviews: state.reviews.map((card) => ({ ...card, dueAt: '2026-11-14T10:00:00.000Z' })),
  }
  await page.clock.setFixedTime(new Date(date))
  await page.goto('/')
  await page.getByText('Önceden kaydedilmiş bir yedeğin var mı?').click()
  await page.getByLabel('Yedek dosyası').setInputFiles({
    name: 'partial-vocabulary.json', mimeType: 'application/json', buffer: Buffer.from(exportBackup(state)),
  })
  await page.getByRole('button', { name: 'Yedeği geri yükle' }).click()
  await expect(page.getByRole('heading', { name: 'Bugünkü plan' })).toBeVisible()
  await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
  for (const [index, vocabulary] of lesson.pedagogy!.vocabulary.slice(3).entries()) {
    await expect(page.getByRole('heading', { name: lesson.vocabulary[index + 3].term, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Kelimeyi çalış' }).click()
    for (const exercise of [vocabulary.recognize, vocabulary.recall, vocabulary.use]) {
      await fill(task(page, exercise), exercise)
      await page.getByRole('button', { name: 'Yanıtı kaydet' }).click()
    }
  }
  await expect(page.getByText('İnceleme bekliyor', { exact: true })).toHaveCount(3)
})

async function play(page: Page, label: string) {
  const player = page.locator(`audio[aria-label="${label}"]`)
  await expect(player).toBeVisible()
  // Accelerate real playback while preserving media fetch, decoding and the ended event.
  const duration = await player.evaluate(async (element) => {
    const audio = element as HTMLAudioElement
    audio.muted = true
    audio.playbackRate = 4
    await audio.play()
    const duration = audio.duration
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error(`Audio stalled at ${audio.currentTime}/${duration}, paused=${audio.paused}, state=${audio.readyState}`)), 12_000)
      audio.addEventListener('ended', () => { window.clearTimeout(timer); resolve() }, { once: true })
    })
    return duration
  })
  expect(duration).toBeGreaterThan(2)
}

for (const course of Object.values(catalog)) {
  const lessons = course.unit.lessons.slice(0, course.language === 'en' ? 8 : 7).filter(({ id }) => ![
    'en.routine', 'ru.cyrillic',
  ].includes(id))
  test(`${course.language}: complete unit, real audio, typed vocabulary, delayed transfer`, async ({ page, context }) => {
    test.setTimeout(110_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.clock.setFixedTime(new Date('2026-11-13T10:00:00Z'))
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Öğrenme planını kur.' })).toBeVisible()
    await fitsViewport(page)
    if (course.language === 'ru') await page.getByRole('radio', { name: /Rusça/ }).check()
    await page.getByLabel('Hedef seviyen').selectOption(course.language === 'en' ? 'C1' : 'B1')
    await page.getByLabel('Günlük süre (dk)').fill('180')
    await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
    await expect(page.getByRole('heading', { name: 'Başlangıç taraması' })).toBeVisible()
    await fitsViewport(page)
    for (const { exercise } of course.placement) {
      await fill(task(page, exercise), exercise, exercise.id === 'en.placement.1' ? 'have led' :
        exercise.id === 'ru.diagnostic.2' ? 'Я' : undefined)
    }
    await page.getByRole('button', { name: 'Beceri profilimi gör' }).click()
    await expect(page.getByRole('heading', { name: 'Konuşma', exact: true, level: 2 }).locator('..')).toContainText('Ölçülmedi')
    await page.getByRole('button', { name: 'Günlük planı aç' }).click()
    await expect(page.getByText('Neden bu çalışma?')).toBeVisible()

    async function practicePhase(title: string, exercises: TestExercise[], wrong?: Record<string, string>) {
      await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await fitsViewport(page)
      for (const exercise of exercises) await fill(task(page, exercise), exercise, wrong?.[exercise.id])
      await submit(page)
      await expect(page.getByRole('heading', { name: 'Çalışma sonucu' })).toBeVisible()
      await toPlan(page)
    }

    async function review(recalls: TestExercise[]) {
      await page.getByRole('button', { name: 'Kelimeleri tekrar et' }).click()
      for (const exercise of recalls) {
        await page.getByRole('textbox', { name: 'Hatırladığın ifade' }).fill(exercise.accepted![0])
        await page.getByRole('button', { name: 'Yanıtı karşılaştır' }).click()
        await expect(page.getByText('Doğru hatırladın.')).toBeVisible()
        await page.getByRole('button', { name: 'Tekrarı kaydet' }).click()
      }
      await expect(page.getByRole('heading', { name: 'Bugünkü plan' })).toBeVisible()
    }

    for (const [index, lesson] of lessons.entries()) {
      if (index === 5 && course.language === 'en') {
        // Start the next local study day before the first 24-hour review is due.
        await page.clock.setFixedTime(new Date('2026-11-13T21:01:00Z'))
        await page.getByRole('button', { name: 'Plan', exact: true }).click()
      }
      const p = lesson.pedagogy!
      await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Derse başla' }).click()
      await expect(page.getByRole('heading', { name: 'Bu yapı ne işe yarar?' })).toBeVisible()
      await expect(task(page, lesson.production)).toHaveCount(0)
      if (index === 0) await play(page, 'Cümleyi dinle')
      for (let step = 1; step < lesson.teaching!.models.length; step++) {
        await page.getByRole('button', { name: 'Sonraki örnek' }).click()
      }
      await page.getByRole('button', { name: 'Rehberli pratiğe geç' }).click()
      await fitsViewport(page)
      for (const exercise of lesson.concepts.map(({ variants }) => variants.find(({ kind }) => !['single', 'multiple', 'matching'].includes(kind))!)) {
        await fill(task(page, exercise), exercise)
      }
      await submit(page)
      await expect(page.getByText('2 / 2 kesin yanıt doğru')).toBeVisible()
      await toPlan(page)
      await page.getByRole('button', { name: 'Pratiğe başla' }).click()
      await expect(page.getByRole('heading', { name: 'Yazmadan önce' })).toBeVisible()
      await fill(task(page, lesson.production), lesson.production)
      await submit(page)
      await expect(page.getByText('İnceleme bekliyor', { exact: true })).toBeVisible()
      await toPlan(page)
      const transfers = p.checks.map(({ transfer }) => transfer[0])
      const foundation = p.checks[0].foundation
      if (foundation && course.language === 'en') {
        await practicePhase('Yeni bağlamda üretim', transfers, { [transfers[0].id]: 'have put' })
        await expect(page.getByText(/önceki kazanımda bir eksik/i)).toBeVisible()
        await practicePhase('Ön koşul pratiği', [foundation.exercise])
        await practicePhase('Yeni bağlamda üretim', [p.checks[0].transfer[1]])
      } else await practicePhase('Yeni bağlamda üretim', transfers)
      const readingQuestion = p.reading.question
      if (index === 0 && course.language === 'en' && readingQuestion.kind === 'single') {
        const wrong = readingQuestion.options.find((option) => option !== readingQuestion.accepted)!
        await practicePhase('Okuma', [p.reading.question], { [p.reading.question.id]: wrong })
        await expect(page.getByText(new RegExp(wrong))).toBeVisible()
        await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
        await expect(page.getByRole('heading', { name: 'Farklı bir yolla dene' })).toBeVisible()
        await expect(page.getByText(p.receptionRetry!.reading.text, { exact: true })).toBeVisible()
        await fill(task(page, p.receptionRetry!.reading.question), p.receptionRetry!.reading.question)
        await submit(page)
        await toPlan(page)
      } else await practicePhase('Okuma', [p.reading.question])

      await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
      await expect(page.getByRole('heading', { name: 'Dinleme', exact: true })).toBeVisible()
      await expect(task(page, p.listening.main)).toHaveCount(0)
      await expect(page.getByText(p.listening.transcript, { exact: true })).toHaveCount(0)
      await play(page, 'Kaydı dinle')
      await fill(task(page, p.listening.main), p.listening.main)
      await page.getByRole('button', { name: 'Ana fikri kaydet' }).click()
      await expect(task(page, p.listening.detail)).toHaveCount(0)
      await play(page, 'Tekrar dinle')
      const detailQuestion = p.listening.detail
      const wrongDetail = index === 0 && course.language === 'ru' && detailQuestion.kind === 'single'
        ? detailQuestion.options.find((option) => option !== detailQuestion.accepted) : undefined
      await fill(task(page, p.listening.detail), p.listening.detail, wrongDetail)
      await submit(page)
      await expect(page.getByText(p.listening.transcript, { exact: true })).toBeVisible()
      await fitsViewport(page)
      await toPlan(page)
      if (wrongDetail) {
        const retry = p.receptionRetry!.listening
        await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
        await expect(page.getByText(retry.detailCoaching, { exact: true })).toBeVisible()
        await expect(page.getByText(retry.transcript, { exact: true })).toHaveCount(0)
        await play(page, 'Kaydı dinle')
        await expect(task(page, retry.main)).toHaveCount(0)
        await fill(task(page, retry.detail), retry.detail)
        await submit(page)
        await expect(page.getByText(retry.transcript, { exact: true })).toBeVisible()
        await toPlan(page)
      }

      await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
      for (const [cardIndex, vocab] of p.vocabulary.entries()) {
        await expect(page.getByRole('heading', { name: lesson.vocabulary[cardIndex].term, exact: true })).toBeVisible()
        await expect(page.locator('audio[aria-label="Örneği dinle"]')).toBeVisible()
        await page.getByRole('button', { name: 'Kelimeyi çalış' }).click()
        for (const item of [vocab.recognize, vocab.recall, vocab.use]) {
          await fill(task(page, item), item)
          await page.getByRole('button', { name: 'Yanıtı kaydet' }).click()
        }
      }
      await expect(page.getByText('İnceleme bekliyor', { exact: true })).toHaveCount(p.vocabulary.length)
      await toPlan(page)
      await review(p.vocabulary.map(({ recall }) => recall))
      await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
      await expect(page.getByRole('heading', { name: 'İlk yazın' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Yazını gözden geçir' })).toBeVisible()
      if (lesson.production.kind === 'open') {
        await expect(task(page, p.revision!).getByRole('textbox')).toHaveValue(lesson.production.sample)
      }
      await fill(task(page, p.revision!), p.revision!)
      await submit(page)
      await expect(page.getByText('İnceleme bekliyor', { exact: true })).toBeVisible()
      await toPlan(page)

      if (index === 0 && course.language === 'en') {
        await page.getByRole('button', { name: 'Konuşmayı hazırla' }).click()
        await expect(page.getByRole('link', { name: 'ChatGPT’yi aç' })).toHaveAttribute('href', 'https://chatgpt.com/')
        await page.getByText('Konuşma talimatını görüntüle').click()
        const prompt = page.getByRole('textbox', { name: 'Konuşma talimatı' })
        await expect(prompt).toHaveValue(/"explanationLanguage": "tr"/)
        await expect(prompt).toHaveValue(/"selectionReason"/)
        const sessionId = (await page.locator('.session-id code').textContent())!
        const json = page.getByRole('textbox', { name: 'Konuşma raporu JSON' })
        await json.fill(JSON.stringify({ ...invalidReport, sessionId }))
        await page.getByRole('button', { name: 'Raporu doğrula' }).click()
        await expect(page.getByRole('alert')).toContainText('kanıt')
        await json.fill(JSON.stringify({ ...validReport, sessionId }))
        await page.getByRole('button', { name: 'Raporu doğrula' }).click()
        await expect(page.getByText(/Eski rapor biçimi/)).toBeVisible()
        await json.fill(JSON.stringify({ ...coachReport, sessionId }))
        await page.getByRole('button', { name: 'Raporu doğrula' }).click()
        await expect(page.getByText('I have joined the team last May.', { exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'Raporu onayla ve kaydet' }).click()
        await expect(page.getByRole('status')).toContainText('günlük plan güncellendi')
        await expect(page.getByRole('heading', { name: 'Konuşma raporun' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Bağımsız doğru kullanım' })).toHaveCount(1)
        await expect(page.getByRole('heading', { name: 'Düzeltmeden sonra tekrarlandı' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Yetersiz kanıt' })).toBeVisible()
        await expect(page.getByText(coachReport.observations[0].explanation!)).toBeVisible()
        await expect(page.getByText(/müfredatta eşleşen çalışma bulunmuyor/)).toBeVisible()
        await expect(page.getByText(/Konuşma raporunda.*lead a workshop/)).toBeVisible()
        await toPlan(page)
        await review([p.vocabulary[0].recall])
        await page.getByRole('button', { name: 'Çalışmayı aç' }).click()
        await expect(page.getByRole('heading', { name: 'Yeni bağlamda üretim' })).toBeVisible()
        await page.getByText('Konuşma hatalarını gözden geçir').click()
        await expect(page.getByText(coachReport.observations[0].explanation!)).toBeVisible()
        await fill(task(page, p.checks[1].transfer[1]), p.checks[1].transfer[1])
        await submit(page)
        await toPlan(page)
      }
      else if (lesson.speaking) {
        await page.getByRole('button', { name: 'Konuşmayı hazırla' }).click()
        await expect(page.getByRole('heading', { name: 'Hesap açmadan sesli prova' })).toBeVisible()
        await page.getByRole('button', { name: 'Konuşmayı daha sonra yap' }).click()
      }
      if (index === 0 && course.language === 'ru') {
        await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
        await page.reload()
        await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
        await context.setOffline(true)
        await page.reload()
        await expect(page.getByRole('heading', { name: 'Ne iş yaptığını söyle' })).toBeVisible()
      }
    }
    await expect(page.getByRole('heading', { name: course.language === 'en' ? 'Bir aksaklığın nasıl başladığını anlat' : 'Yol sor ve yön tarif et' })).toBeVisible()
    await page.clock.setFixedTime(new Date(course.language === 'en' ? '2026-11-15T10:01:00Z' : '2026-11-14T10:01:00Z'))
    await page.getByRole('button', { name: 'Plan', exact: true }).click()
    await review(lessons.flatMap(({ pedagogy }) => pedagogy!.vocabulary.map(({ recall }) => recall)))
    for (const { pedagogy } of lessons) await practicePhase('Gecikmeli kazanım kontrolü', pedagogy!.checks.map(({ delayed }) => delayed[0]))
    await expect(page.getByText('Gecikmeli aktarım gözlendi')).toHaveCount(lessons.length)
    await page.getByRole('button', { name: 'Beceri profili' }).click()
    await expect(page.getByRole('heading', { name: 'Dinleme', level: 3 }).locator('..').getByText(course.language === 'en' ? '14 / 14 kesin yanıt doğru' : '12 / 13 kesin yanıt doğru', { exact: true })).toBeVisible()
    await expect(page.getByText(/Tanıma 8 · Aktif hatırlama 8/)).toBeVisible()
    const comparison = page.getByText('İlk ve gecikmeli denemeyi karşılaştır').first()
    await comparison.click()
    await expect(comparison.locator('..')).toContainText('Gecikmeli görev:')
    await fitsViewport(page)
    if (course.language === 'en') {
      await page.getByRole('button', { name: 'Ayarlar' }).click()
      const download = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Yedeği indir' }).click()
      await page.getByRole('button', { name: 'Yedek seç' }).click()
      await page.locator('input[type=file]').setInputFiles(await (await download).path())
      await page.getByRole('button', { name: 'Yedeği geri yükle' }).click()
      await expect(page.getByRole('status')).toContainText('Yedek geri yüklendi')
      await expect(page.getByText('Gecikmeli aktarım gözlendi')).toHaveCount(lessons.length)
      await page.getByText('Kaydedilen konuşma raporları').click()
      await page.getByRole('button', { name: lessons[0].title, exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Konuşma raporun' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Raporu onayla ve kaydet' })).toHaveCount(0)
    }
    expect(errors).toEqual([])
  })
}

test('beginner: reading changes the route and listening diagnosis resumes after reload', async ({ page }) => {
  const course = catalog.ru
  await page.goto('/')
  await page.getByRole('radio', { name: /Rusça/ }).check()
  await page.getByLabel('Tahmini seviyen').selectOption('C1')
  await page.getByRole('button', { name: 'Başlangıç taramasına geç' }).click()
  for (const { exercise } of course.placement) {
    const wrong = exercise.skill === 'reading' && exercise.kind === 'single'
      ? exercise.options.find((option) => option !== exercise.accepted) : undefined
    await fill(task(page, exercise), exercise, wrong)
  }
  await page.getByRole('button', { name: 'Beceri profilimi gör' }).click()
  await page.getByRole('button', { name: 'Günlük planı aç' }).click()
  const bridge = course.unit.lessons.find(({ id }) => id === 'ru.cyrillic')!
  await expect(page.getByRole('heading', { name: bridge.title, exact: true })).toBeVisible()
  const diagnostic = bridge.pedagogy!.diagnostic!
  await page.getByRole('button', { name: 'Tanılamaya devam et' }).click()
  await fill(task(page, diagnostic.reading.question), diagnostic.reading.question)
  await page.getByRole('button', { name: 'Örneği kaydet' }).click()
  await expect(page.getByRole('heading', { name: 'Tanılamaya devam et' })).toBeVisible()
  await page.getByRole('button', { name: 'Daha sonra devam et' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Tanılamaya devam et' }).click()
  await expect(task(page, diagnostic.listening.detail)).toHaveCount(0)
  await expect(page.getByText(diagnostic.listening.transcript, { exact: true })).toHaveCount(0)
  await play(page, 'Tanılama kaydını dinle')
  await fill(task(page, diagnostic.listening.detail), diagnostic.listening.detail)
  await page.getByRole('button', { name: 'Örneği kaydet' }).click()
  await expect(page.getByRole('heading', { name: 'Dinleme', exact: true, level: 2 }).locator('..')).toContainText('1 / 1 doğru · Düşük güven')
  await expect(page.getByRole('heading', { name: 'Konuşma', exact: true, level: 2 }).locator('..')).toContainText('Ölçülmedi')
})
