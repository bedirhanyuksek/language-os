import { teachWords } from './teaching-fixture'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { baselineCatalog, catalog, publishCourse } from '../src/content/catalog'
import { modelAudio } from '../src/content/teaching'
import type { Course, Exercise, Lesson } from '../src/content/schema'
import { bridgeLesson, nextDiagnostic } from '../src/domain/diagnostic'
import { assess, mapPlacement } from '../src/domain/assessment'
import type { Answer, PedagogyPhase } from '../src/domain/model'
import { canAccelerate, phaseTasks } from '../src/domain/pedagogy'
import { dailyPlan, finishDiagnostic, finishLesson, finishPedagogy, finishPlacement, finishTypedReview, lessonTasks, masteryFor } from '../src/domain/progress'
import { initialState, type LearningState } from '../src/domain/state'
import { exportBackup, parseBackup } from '../src/persistence/repository'

const at = '2026-11-13T10:00:00.000Z'
const next = '2026-11-14T10:00:00.000Z'
const later = '2026-11-15T10:00:00.000Z'
const en = catalog.en
const [first, second] = en.unit.lessons

function correct(exercise: Exercise): Answer {
  if (exercise.kind === 'open') return exercise.sample
  if (exercise.kind === 'fill' || exercise.kind === 'short') return exercise.accepted[0]
  return exercise.accepted
}

const answers = (items: { exercise: Exercise }[]) =>
  Object.fromEntries(items.map(({ exercise }) => [exercise.id, correct(exercise)]))

function start(course = en, changes = {}) {
  const state = initialState({
    id: '70cc9225-b0a1-41ef-8172-195d23e455c6', language: course.language, estimate: course.level,
    target: 'B2+', minutes: 180, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6],
  })
  return finishPlacement(state, course, { ...answers(course.placement), ...changes }, at)
}

function runPhase(state: LearningState, lesson: Lesson, phase: PedagogyPhase, date = at, overrides = {}, course: Course = en) {
  return finishPedagogy(state, course, lesson, phase, { ...answers(phaseTasks(state, lesson, phase, date)), ...overrides },
    date, phase === 'listening' ? 'played' : undefined)
}

function write(state: LearningState, lesson = first) {
  state = teachWords(state, en, lesson, at)
  return finishLesson(state, en, lesson, { [lesson.production.id]: correct(lesson.production) }, at)
}

function teachFirst() {
  const state = start(en, { 'en.placement.1': 'have led' })
  const guided = finishLesson(state, en, first, answers(lessonTasks(state, first)), at)
  return runPhase(write(guided), first, 'transfer')
}

function finishInput(state: LearningState, lesson = first) {
  const read = runPhase(state, lesson, 'reading')
  const listen = runPhase(read, lesson, 'listening')
  return runPhase(listen, lesson, 'revision')
}

describe('adaptive evidence', () => {
  it.each(Object.values(catalog))('requires guided production before an independent $language draft', (course) => {
    const changes = Object.fromEntries(course.placement.filter(({ diagnosticConceptId }) => diagnosticConceptId)
      .map(({ exercise }) => [exercise.id, 'Bilmiyorum']))
    const initial = start(course, changes)
    const plan = dailyPlan(initial, course, at, 'Europe/Istanbul')
    expect(plan.kind).toBe('lesson')
    if (plan.kind !== 'lesson') throw new Error('Expected a lesson')
    const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
    const tasks = lessonTasks(initial, lesson)
    const draft = { [lesson.production.id]: correct(lesson.production) }
    expect(() => finishLesson(initial, course, lesson, { ...answers(tasks), ...draft }, at)).toThrow()
    const firstTask = tasks[0]
    const wrong = { ...answers(tasks), [firstTask.exercise.id]: 'Bilmiyorum' }
    const failed = finishLesson(initial, course, lesson, wrong, at)
    expect(dailyPlan(failed, course, next, 'Europe/Istanbul')).toMatchObject({ kind: 'practice', lessonId: lesson.id })
    expect(() => finishLesson(failed, course, lesson, draft, next)).toThrow()
    expect(() => runPhase(failed, lesson, 'transfer', next, {}, course)).toThrow(/rehberli/)
    const retry = lessonTasks(failed, lesson)
    expect(retry.map(({ exercise }) => exercise.id)).not.toContain(firstTask.exercise.id)
    const failedAgain = finishLesson(failed, course, lesson, { [retry[0].exercise.id]: 'Bilmiyorum' }, next)
    expect(dailyPlan(failedAgain, course, later, 'Europe/Istanbul')).toMatchObject({ kind: 'assessment_gap' })
    expect(lessonTasks(failedAgain, lesson)).toEqual([])
    expect(() => finishLesson(failedAgain, course, lesson, draft, later)).toThrow()
    const guided = finishLesson(failed, course, lesson, answers(retry), later)
    expect(lessonTasks(guided, lesson)).toEqual([])
    const repaired = teachWords(guided, course, lesson, later)
    expect(lessonTasks(repaired, lesson).map(({ exercise }) => exercise.id)).toEqual([lesson.production.id])
    const written = finishLesson(repaired, course, lesson, draft, later)
    expect(written.attempts.at(-1)?.evidence).toMatchObject({ observation: 'free_production', outcome: 'review_required' })
    expect(parseBackup(exportBackup(written))).toEqual(written)
  })

  it.each(Object.values(catalog))('uses recognition plus production to shorten the $language path', (course) => {
    const state = start(course)
    const lesson = course.unit.lessons[0]
    expect(canAccelerate(state, course, lesson)).toBe(true)
    expect(dailyPlan(state, course, at, 'Europe/Istanbul')).toMatchObject({ kind: 'pedagogy', phase: 'vocabulary' })
    const prepared = teachWords(state, course, lesson, at)
    const tested = runPhase(prepared, lesson, 'transfer', at, {}, course)
    expect(lessonTasks(tested, lesson).map(({ exercise }) => exercise.kind)).toEqual(['open'])
    expect(masteryFor(tested, lesson).status).toBe('ready')
  })

  it('does not accelerate on recognition alone and uses a new production example after an error', () => {
    const state = start(en, { 'en.diagnostic.2': 'led' })
    expect(canAccelerate(state, en, first)).toBe(false)
    expect(dailyPlan(state, en, at, 'Europe/Istanbul')).toMatchObject({ kind: 'lesson' })
    const guided = finishLesson(state, en, first, answers(lessonTasks(state, first)), at)
    const retry = runPhase(write(guided), first, 'transfer', at, { 'en.experience.overview.transfer.1': 'have lead' })
    expect(masteryFor(retry, first).status).toBe('developing')
    expect(phaseTasks(retry, first, 'transfer', at).map(({ exercise }) => exercise.id)).toEqual(['en.experience.overview.transfer.2'])
    const saved = runPhase(retry, first, 'transfer')
    expect(saved.attempts.find(({ exerciseId }) => exerciseId === first.production.id)?.evidence.outcome).toBe('review_required')
    expect(masteryFor(saved, first).status).toBe('ready')
  })

  it('routes a mapped previous-tense error to a prerequisite and returns to a new example', () => {
    const state = teachFirst()
    const guided = finishLesson(state, en, second, answers(lessonTasks(state, second)), at)
    const mistaken = runPhase(write(guided, second), second, 'transfer', at, { 'en.sequence.prior.transfer.1': 'have put' })
    expect(dailyPlan(mistaken, en, at, 'Europe/Istanbul', false)).toMatchObject({ phase: 'foundation', reason: expect.stringContaining(first.title) })
    const repaired = runPhase(mistaken, second, 'foundation')
    expect(phaseTasks(repaired, second, 'transfer', at)[0].exercise.id).toBe('en.sequence.prior.transfer.2')
  })

  it('waits 24 hours and uses a different context after a failed delayed check', () => {
    const state = finishInput(teachFirst())
    expect(phaseTasks(state, first, 'delayed', at)).toEqual([])
    const due = phaseTasks(state, first, 'delayed', next)
    expect(due.map(({ exercise }) => exercise.id)).toEqual(['en.experience.overview.delayed.1', 'en.experience.detail.delayed.1'])
    const missed = runPhase(state, first, 'delayed', next, { 'en.experience.detail.delayed.1': 'have left' })
    expect(masteryFor(missed, first).status).toBe('ready')
    expect(phaseTasks(missed, first, 'delayed', next)).toEqual([])
    expect(phaseTasks(missed, first, 'delayed', later).map(({ exercise }) => exercise.id)).toEqual(['en.experience.detail.delayed.2'])
    expect(masteryFor(runPhase(missed, first, 'delayed', later), first).status).toBe('retained')
  })
})

describe('vocabulary, listening and content checks', () => {
  it('records recognition, failed active recall and unscored use separately', () => {
    const placed = start(en, { 'en.placement.1': 'have led' })
    const state = finishLesson(placed, en, first, answers(lessonTasks(placed, first)), at)
    expect(state.reviews).toHaveLength(0)
    const learned = runPhase(state, first, 'vocabulary', at, { 'en.experience.word.1.recall': 'run a project' })
    const evidence = learned.attempts.filter(({ conceptId }) => conceptId === 'en.experience.word.1').map(({ evidence }) =>
      [evidence.observation, evidence.outcome])
    expect(evidence).toEqual([['recognition', 'correct'], ['controlled_production', 'incorrect'], ['free_production', 'review_required']])
    const reviewed = finishTypedReview(learned, en, first.vocabulary[0].id, 'Lead a workshop!', at)
    expect(reviewed.reviewHistory).toEqual([{ cardId: first.vocabulary[0].id, at, result: 'remembered', mode: 'typed', answer: 'Lead a workshop!' }])
    expect(parseBackup(exportBackup(reviewed))).toEqual(reviewed)
    const bad = JSON.parse(exportBackup(reviewed))
    bad.state.reviewHistory[0].result = 'again'
    expect(() => parseBackup(JSON.stringify(bad))).toThrow()
  })

  it('gates listening on playback and gives transcript-only work no listening evidence', () => {
    const state = runPhase(teachFirst(), first, 'reading')
    const items = phaseTasks(state, first, 'listening', at)
    expect(() => finishPedagogy(state, en, first, 'listening', answers(items), at)).toThrow(/dinle/)
    const skipped = finishPedagogy(state, en, first, 'listening', {}, at, 'unavailable')
    expect(phaseTasks(skipped, first, 'listening', at)).toEqual([])
    expect(skipped.attempts.some(({ evidence }) => evidence.skill === 'listening')).toBe(false)
    const measured = runPhase(state, first, 'listening')
    expect(measured.attempts.filter(({ evidence }) => evidence.skill === 'listening')).toHaveLength(2)
    expect(mapPlacement(measured.attempts).find(({ skill }) => skill === 'listening')?.status).toBe('not_assessed')
  })

  it('cross-checks comprehension keys against a separately specified reading and listening audit', () => {
    const keys = [
      ['en', 0, 'Geçen mayısta', 'Atölye yürütme', 'Geçen nisan', 'last April'],
      ['en', 1, 'Gündemi göndermek', 'Bir toplantı çevresindeki işlerin sırasını', 'Notları paylaştı', 'After the call'],
      ['en', 2, 'Öğrencilerden görüş almak', 'Bir işin durumunu ve sıradaki adımı bildirmek', 'Ödeme sayfasını tekrar deneyecekler', 'test the payment page again'],
      ['ru', 0, 'Pavel', 'Tanışmak', 'Maksim', 'Меня зовут Максим'],
      ['ru', 1, 'Mühendis', 'Kendini ve bir başkasını tanıtıyor', 'Doktor', 'Это Анна. Она врач'],
      ['ru', 2, 'Anna', 'İki kişinin yaşadığı yer', 'Samara', 'Это Ира. Она живёт в Самаре'],
    ] as const
    for (const [language, index, reading, main, detail, audibleClue] of keys) {
      const p = catalog[language].unit.lessons[index].pedagogy!
      expect(p.listening.transcript).toContain(audibleClue)
      for (const [exercise, key] of [[p.reading.question, reading], [p.listening.main, main], [p.listening.detail, detail]] as const) {
        expect(assess(exercise, key, language).outcome).toBe('correct')
        if (exercise.kind === 'single') {
          for (const distractor of exercise.options.filter((value) => value !== key)) {
            expect(assess(exercise, distractor, language).outcome).toBe('incorrect')
          }
        }
      }
    }
  })

  it('checks the new source keys against independently transcribed details', () => {
    const expected = {
      'en.routine': ['Saat onda', 'Yürüyerek', '11', 'Lobide'],
      'en.opinion': ['Daha kısa gündem', 'Beş', 'İlk gündem maddesini', 'Kütüphane'],
      'en.tradeoff': ['Eğitim süresi', 'Daha ucuz', 'İstasyona yakınlık', 'Canlı pratik'],
      'ru.cyrillic': ['Роман', 'Роман', 'Саша', 'Соня'],
      'ru.order': ['Su', '80', '90', '150'],
      'ru.meeting': ['Yarın saat beşte', 'Yedi', 'Cumartesi', 'Metro yakınında'],
      'es.familia': ['14', '18', '11', '13'],
      'es.rutina': ['Öğleden sonra', 'Gece', 'Öğleden sonra', 'Evde'],
      'es.cafe': ['Sütlü ve şekersiz', 'Şekersiz', 'Sütlü çay', '3'],
    }
    for (const course of Object.values(catalog)) {
      for (const lesson of course.unit.lessons.slice(3, 6)) {
        const p = lesson.pedagogy!
        const { reading, listening } = p.receptionRetry!
        const tasks = [p.reading.question, p.listening.detail, reading.question, listening.detail]
        const keys = expected[lesson.id as keyof typeof expected]
        for (const [index, exercise] of tasks.entries()) {
          expect(assess(exercise, keys[index], course.language).outcome, exercise.id).toBe('correct')
        }
      }
    }
    const tradeoff = catalog.en.unit.lessons.find(({ id }) => id === 'en.tradeoff')!
    const exercise = tradeoff.pedagogy!.checks[0].transfer[0]
    expect(assess(exercise, 'Even though', 'en').outcome).toBe('correct')
    expect(assess(exercise, 'Therefore', 'en').outcome).toBe('incorrect')
  })

  it('validates assets, task references, answer choices and rubric', () => {
    for (const course of Object.values(catalog)) {
      for (const lesson of course.unit.lessons) {
        const p = lesson.pedagogy!
        const teaching = lesson.teaching!
        expect(new Set(teaching.models.map(({ phrase }) => phrase)).size).toBe(teaching.models.length)
        expect(teaching.receptive?.every(({ term }) => p.reading.text.toLocaleLowerCase(course.language).includes(term.toLocaleLowerCase(course.language))) ?? true, lesson.id).toBe(true)
        const models = teaching.models.map((_, index) => modelAudio(lesson.id, index, course.language))
        for (const audio of [p.listening.audio, p.receptionRetry?.listening.audio, p.diagnostic?.listening.audio,
          ...p.vocabulary.map((item) => item.audio), ...models]) {
          if (audio?.kind === 'recording') expect(existsSync(`src/content${audio.src}`), audio.src).toBe(true)
        }
      }
    }
    const broken = structuredClone(en)
    const p = broken.unit.lessons[0].pedagogy!
    p.checks[0].conceptId = 'unknown'
    expect(() => publishCourse(broken)).toThrow()
    p.checks[0].conceptId = first.concepts[0].id
    p.rubric[1] = p.rubric[0]
    expect(() => publishCourse(broken)).toThrow()
    const invalid = structuredClone(en)
    const item = invalid.unit.lessons[0].pedagogy!.listening.main
    if (item.kind === 'single') item.options[0] = 'Atölye yürütme.'
    expect(() => publishCourse(invalid)).toThrow()
  })
})

describe('Learning Experience v1 learner scenarios', () => {
  it('places a Russian beginner on the Cyrillic route regardless of their self estimate', () => {
    const course = catalog.ru
    const wrong = Object.fromEntries(course.placement.map(({ exercise }) => [
      exercise.id, exercise.kind === 'open' ? 'Не знаю' :
        exercise.kind === 'single' ? exercise.options.find((option) => option !== exercise.accepted) : 'Не знаю',
    ]))
    const beginner = start(course, wrong)
    const overconfident = { ...beginner, profile: { ...beginner.profile, estimate: 'C1' as const } }
    for (const state of [beginner, overconfident]) {
      const bridge = bridgeLesson(course)!
      expect(dailyPlan(state, course, at, 'Europe/Istanbul')).toMatchObject({ kind: 'lesson', lessonId: bridge.id })
      const sample = nextDiagnostic(course, state)!
      expect(sample.lesson.id).toBe(bridge.id)
      const saved = finishDiagnostic(state, course, sample.exercise.id, correct(sample.exercise), at, false)
      const listening = nextDiagnostic(course, saved)!
      expect(listening.audio).toBeDefined()
      expect(() => finishDiagnostic(saved, course, listening.exercise.id, correct(listening.exercise), at, false)).toThrow()
      const finished = finishDiagnostic(saved, course, listening.exercise.id, correct(listening.exercise), next, true)
      expect(nextDiagnostic(course, parseBackup(exportBackup(finished)))).toBeUndefined()
      expect(masteryFor(finished, bridge).status).toBe('not_assessed')
      expect(mapPlacement(finished.attempts).find(({ skill }) => skill === 'listening')).toMatchObject({ total: 1, confidence: 'low' })
    }
  })

  it('restores a pre-expansion v2 course and continues with the new revision', () => {
    const previous = baselineCatalog.en
    const [lesson] = previous.unit.lessons
    const placed = start(previous, { 'en.placement.1': 'have led' })
    let state = finishLesson(placed, previous, lesson, answers(lessonTasks(placed, lesson)), at)
    state = teachWords(state, previous, lesson, at)
    state = finishLesson(state, previous, lesson, answers(lessonTasks(state, lesson)), at)
    for (const phase of ['transfer', 'reading', 'listening'] as const) {
      state = runPhase(state, lesson, phase, at, {}, previous)
    }
    const restored = parseBackup(exportBackup(state))
    expect(restored).toEqual(state)
    state = restored
    for (const { cardId, recall } of lesson.pedagogy!.vocabulary) {
      state = finishTypedReview(state, en, cardId, String(correct(recall)), at)
    }
    expect(dailyPlan(state, en, at, 'Europe/Istanbul')).toMatchObject({ phase: 'revision', lessonId: lesson.id })
  })

  it('adapts reading and only the missed listening detail, without replacing initial evidence', () => {
    const p = first.pedagogy!
    const initial = teachFirst()
    const read = runPhase(initial, first, 'reading', at, { [p.reading.question.id]: 'Gelecek yıl' })
    expect(dailyPlan(read, en, at, 'Europe/Istanbul', false)).toMatchObject({ phase: 'reading', evidenceId: read.attempts.at(-1)?.id })
    expect(phaseTasks(read, first, 'reading', at).map(({ exercise }) => exercise.id)).toEqual([p.receptionRetry!.reading.question.id])
    const repaired = runPhase(read, first, 'reading')
    const heard = runPhase(repaired, first, 'listening', at, { [p.listening.detail.id]: 'Gelecek yıl' })
    const detail = p.receptionRetry!.listening.detail
    expect(phaseTasks(heard, first, 'listening', at).map(({ exercise }) => exercise.id)).toEqual([detail.id])
    const failedAgain = runPhase(heard, first, 'listening', at, { [detail.id]: 'Gelecek yıl' })
    expect(dailyPlan(failedAgain, en, at, 'Europe/Istanbul', false)).toMatchObject({ phase: 'revision' })
    expect(failedAgain.attempts.filter(({ context }) => context === 'listening').map(({ evidence }) => evidence.outcome))
      .toEqual(['correct', 'incorrect', 'incorrect'])
    const revision = runPhase(failedAgain, first, 'revision')
    expect(revision.attempts.at(-1)?.evidence.outcome).toBe('review_required')
    expect(parseBackup(exportBackup(revision))).toEqual(revision)
  })

  it.each(Object.values(catalog))('keeps a five minute $language learner progressing over several weeks with no account', (course) => {
    const placementErrors = Object.fromEntries(course.placement.filter(({ exercise }) => exercise.skill === 'reading')
      .map(({ exercise }) => [exercise.id, 'Bilmiyorum']))
    let state = start(course, placementErrors)
    state = { ...state, profile: { ...state.profile, days: [1, 2, 3, 4, 5], minutes: 5, target: 'C1' } }
    const beginnerOnlyEnglish = new Set(['en.rebook', 'en.detour', 'en.symptoms', 'en.appointment', 'en.invite', 'en.host', 'en.instructions'])
    const route = course.unit.lessons.filter(({ id, objective }) => objective.level !== 'C2' &&
      (course.language !== 'en' || (objective.level !== 'A1' && !beginnerOnlyEnglish.has(id))))
    const learningDays = new Set<string>()
    let routeEnd = false
    for (let day = 0; day < route.length * 36 && !routeEnd; day++) {
      const now = new Date(Date.parse(at) + day * 86_400_000).toISOString()
      for (let block = 0; block < 10; block++) {
        const plan = dailyPlan(state, course, now, 'Europe/Istanbul')
        if (plan.kind === 'complete') {
          routeEnd = route.every((lesson) => masteryFor(state, lesson).status === 'retained')
          break
        }
        if (plan.kind === 'out_of_scope' || plan.kind === 'budget' || plan.kind === 'rest') break
        learningDays.add(now)
        if (plan.kind === 'review') {
          for (const id of plan.cardIds) {
            const recall = course.unit.lessons.flatMap(({ pedagogy }) => pedagogy!.vocabulary).find(({ cardId }) => cardId === id)!.recall
            state = finishTypedReview(state, course, id, String(correct(recall)), now)
          }
          continue
        }
        if (!('lessonId' in plan)) throw new Error('Expected a lesson-backed study plan')
        const lesson = course.unit.lessons.find(({ id }) => id === plan.lessonId)!
        if (plan.kind === 'speaking') state = { ...state, skippedSpeaking: [...state.skippedSpeaking, lesson.id] }
        else if (plan.kind === 'pedagogy') state = runPhase(state, lesson, plan.phase, now, {}, course)
        else state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), now)
      }
      expect(state.activity.filter(({ at }) => at === now).reduce((total, { minutes }) => total + minutes, 0)).toBeLessThanOrEqual(5)
    }
    expect(routeEnd, JSON.stringify({ learningDays: learningDays.size, statuses: course.unit.lessons.map((lesson) => [lesson.id, masteryFor(state, lesson).status]), tail: state.activity.slice(-5), phases: state.attempts.slice(-8).map(({ context, exerciseId }) => [context, exerciseId]) })).toBe(true)
    expect(learningDays.size).toBeGreaterThanOrEqual(40)
    expect(state.speakingAssessments).toHaveLength(0)
    expect(state.attempts.filter(({ context }) => context === 'revision')).toHaveLength(route.length)
  }, 15_000)
})
