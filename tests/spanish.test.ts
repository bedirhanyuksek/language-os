import 'fake-indexeddb/auto'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { catalog, publishCourse } from '../src/content/catalog'
import { curriculumCoverage } from '../src/content/curriculum/coverage'
import { measureCurriculum } from '../src/content/curriculum/inventory'
import { author, type Module } from '../src/content/continuity'
import spanish from '../src/content/es.json'
import { pedagogyExercises, receptionExercises, type Exercise } from '../src/content/schema'
import { modelAudio } from '../src/content/teaching'
import { assess } from '../src/domain/assessment'
import { nextDiagnostic } from '../src/domain/diagnostic'
import type { Answer, Language } from '../src/domain/model'
import { canAccelerate, phaseTasks } from '../src/domain/pedagogy'
import { dailyPlan, finishLesson, finishPedagogy, finishPlacement, lessonTasks } from '../src/domain/progress'
import { buildSpeakingPrompt, parseSpeakingReport, speakingFocus } from '../src/domain/speaking'
import { initialState } from '../src/domain/state'
import { buildTutorRequest, tutorInput } from '../src/domain/tutor'
import { SpanishPlacement } from '../src/features/SpanishPlacement'
import { IndexedLearningRepository, exportBackup, parseBackup } from '../src/persistence/repository'

const course = catalog.es
const at = '2026-11-20T10:00:00.000Z'
const firstWaveIds = ['es.ficha-contacto', 'es.recado-telefono', 'es.horario-diario', 'es.horario-servicio', 'es.turno-mostrador',
  'es.visita-pasada', 'es.gestion-pasada', 'es.orden-incidente', 'es.retraso-servicio', 'es.cita-servicio']
const answer = (exercise: Exercise): Answer => exercise.kind === 'open' ? exercise.sample :
  exercise.kind === 'fill' || exercise.kind === 'short' ? exercise.accepted[0] : exercise.accepted
const answers = (tasks: { exercise: Exercise }[]) => Object.fromEntries(tasks.map(({ exercise }) => [exercise.id, answer(exercise)]))
function start(language: Language = 'es') {
  return initialState({ id: 'c1288d67-673e-436f-a554-c5fe6e8c81dc', language,
    estimate: 'A1', target: 'A2', minutes: 60, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6] })
}

test('Spanish preserves its starter sequence and links the bridge to three B1 lessons', () => {
  expect(course.unit.lessons.filter(({ id }) => !firstWaveIds.includes(id)).map(({ id }) => id)).toEqual([
    'es.saludos', 'es.ser-estar', 'es.numeros', 'es.familia', 'es.rutina', 'es.cafe', 'es.direcciones', 'es.gustos', 'es.perfect',
    'es.repetir', 'es.cambiar-plan', 'es.pasado-cerrado', 'es.connected-account', 'es.cambio-con-motivo', 'es.pregunta-seguimiento',
  ])
  expect(curriculumCoverage(course).map(({ lessons }) => lessons.length)).toEqual([12, 10, 3, 0, 0, 0])
  const measured = measureCurriculum(course)
  expect(measured.map(({ playable }) => playable)).toEqual([12, 10, 3, 0, 0, 0])
  expect(measured.find(({ band }) => band === 'B1')).toMatchObject({ reading: 6, scriptPractice: 6, listening: 0 })
  const originalLessons = course.unit.lessons.filter(({ id }) => !firstWaveIds.includes(id))
  for (const [index, lesson] of originalLessons.entries()) {
    const addedPrerequisites: Record<string, string> = {
      'es.repetir': 'es.saludos.objective', 'es.cambiar-plan': 'es.perfect.objective',
    }
    const parent = addedPrerequisites[lesson.id] ?? originalLessons[index - 1]?.objective.id
    expect(lesson.prerequisites).toEqual(lesson.id === 'es.connected-account'
      ? ['es.cambiar-plan.objective', 'es.pasado-cerrado.objective'] : parent ? [parent] : [])
    expect(lesson.pedagogy?.revision?.kind).toBe('open')
    expect(lesson.speaking?.context).toBe(lesson.objective.level === 'B1' ? 'discussion' : 'daily_conversation')
  }
})

test('a true beginner sees Turkish choices, then decoding before Spanish assessment or reading diagnostics', () => {
  const html = renderToStaticMarkup(createElement(SpanishPlacement, { course, busy: false, onSubmit: async () => true }))
  expect(html).toContain('Sıfırdan başla')
  for (const { exercise } of course.placement) expect(html).not.toContain(exercise.prompt)
  const beginner = finishPlacement(start(), course,
    Object.fromEntries(course.placement.map(({ exercise }) => [exercise.id, 'Bilmiyorum'])), at)
  expect(nextDiagnostic(course, beginner)).toBeUndefined()
  expect(dailyPlan(beginner, course, at, 'Europe/Istanbul')).toMatchObject({ kind: 'lesson', lessonId: 'es.saludos' })
  expect(canAccelerate(beginner, course, course.unit.lessons[0])).toBe(false)
  expect(course.unit.lessons[0].teaching?.approach).toBe('decoding')
  expect(course.unit.lessons[0].recall).toContain('Ñ')
  expect(parseBackup(exportBackup(beginner))).toEqual(beginner)
})

test('optional prior-learning samples accept common introductions and require recognition plus production', () => {
  const first = course.unit.lessons[0]
  const placed = finishPlacement(start(), course, answers(course.placement), at)
  expect(canAccelerate(placed, course, first)).toBe(true)
  const name = course.placement.find(({ exercise }) => exercise.id === 'es.placement.name.produce')!.exercise
  for (const variant of ['Me llamo Elif.', 'Soy Elif', 'Mi nombre es Elif', '  YO ME LLAMO ELIF! ']) {
    expect(assess(name, variant, 'es').outcome).toBe('correct')
  }
  expect(assess(name, 'Te llamas Elif', 'es').outcome).toBe('incorrect')
  const weak = finishPlacement(start(), course, { ...answers(course.placement), [name.id]: 'Bilmiyorum' }, at)
  expect(canAccelerate(weak, course, first)).toBe(false)
})

// Keys transcribed from the source details, separately from the authored keys.
test.each([
  ['es.saludos', ['Sara', 'Tanışıyor', 'Diego', 'Carmen', 'Kendini tanıtmak', 'Rosa']],
  ['es.ser-estar', ['Doktor', 'Kimliğini ve bugünkü durumunu', 'Evde', 'Merkezde', 'Kendisini ve yerini tanıtma', 'Okulda']],
  ['es.numeros', ['3', 'Ürün fiyatları', '6', '12', 'İki ürün grubunun fiyatını söylüyor', '15']],
  ['es.familia', ['14', 'Ailesinden', '18', '11', 'Aile üyelerini tanıtıyor', '13']],
  ['es.rutina', ['Öğleden sonra', 'Günlük rutin', 'Gece', 'Öğleden sonra', 'Ortak rutinlerini', 'Evde']],
  ['es.cafe', ['Sütlü ve şekersiz', 'İçecek siparişi veriyor', 'Şekersiz', 'Sütlü çay', 'Hesap', '3']],
  ['es.direcciones', ['Bankanın', 'Müzeye yol tarif etmek', 'Sola', 'Parkın', 'İstasyona giden yolu', 'Hastanenin']],
  ['es.gustos', ['Luis', 'Beğenilerini', 'Kahveyi', 'Kahve', 'Sevdiği ve sevmediği şeyler', 'Yemek yapmak']],
  ['es.perfect', ['Ekmek almamış', 'Bugünkü tamamlanan ve bekleyen işleri', 'Ödev', 'Kütüphanede', 'Bu hafta ve bugün', 'Akşam yemeği hazırlanmamış']],
])('%s source details distinguish correct answers from distractors', (id, keys) => {
  const p = course.unit.lessons.find((lesson) => lesson.id === id)!.pedagogy!
  for (const [index, exercise] of receptionExercises(p).entries()) {
    expect(assess(exercise, keys[index], 'es').outcome, exercise.id).toBe('correct')
    if (exercise.kind === 'single') for (const wrong of exercise.options.filter((option) => option !== keys[index])) {
      expect(assess(exercise, wrong, 'es').outcome, exercise.id).toBe('incorrect')
    }
  }
})

test('Spanish controlled forms preserve accents, variants, unique contexts and open writing evidence', () => {
  for (const lesson of course.unit.lessons) {
    const p = lesson.pedagogy!
    const tasks = [...lesson.concepts.flatMap(({ variants }) => variants), ...pedagogyExercises(p).map(({ exercise }) => exercise)]
    for (const exercise of tasks) {
      if (exercise.kind !== 'fill' && exercise.kind !== 'short') continue
      const keys = exercise.accepted.map((key) => key.normalize('NFC').toLocaleLowerCase('es').trim())
      expect(new Set(keys).size, exercise.id).toBe(keys.length)
      for (const key of exercise.accepted) expect(assess(exercise, key, 'es').outcome, exercise.id).toBe('correct')
      expect(assess(exercise, '___', 'es').outcome, exercise.id).toBe('incorrect')
    }
    for (const check of p.checks) {
      const guided = lesson.concepts.find(({ id }) => id === check.conceptId)!.variants
      expect(new Set([...guided, ...check.transfer, ...check.delayed].map(({ prompt }) => prompt)).size).toBe(6)
    }
    expect(assess(lesson.production, lesson.production.kind === 'open' ? lesson.production.sample : '', 'es').outcome).toBe('review_required')
  }
  const location = course.unit.lessons[1].concepts[1].variants[1]
  expect(assess(location, 'ESTÁ', 'es').outcome).toBe('correct')
  expect(assess(location, 'esta\u0301', 'es').outcome).toBe('correct')
  expect(assess(location, 'es', 'es').outcome).toBe('incorrect')
  expect(assess(location, 'esta', 'es').outcome).toBe('incorrect')
  const years = course.unit.lessons[3].pedagogy!.vocabulary[1].recall
  expect(assess(years, 'años', 'es').outcome).toBe('correct')
  expect(assess(years, 'anos', 'es').outcome).toBe('incorrect')
  const order = course.unit.lessons[5].concepts[0].variants[0]
  for (const variant of ['Quiero', 'Quisiera']) expect(assess(order, variant, 'es').outcome).toBe('correct')
  const recent = course.unit.lessons[8].pedagogy!.checks[1].delayed[0]
  for (const variant of ['Todavía', 'Aún']) expect(assess(recent, variant, 'es').outcome).toBe('correct')
})

test('unavailable Spanish recordings never create listening evidence', () => {
  const lesson = course.unit.lessons[0]
  let state = finishPlacement(start(), course, answers(course.placement), at)
  state = finishLesson(state, course, lesson, answers(lessonTasks(state, lesson)), at)
  state = finishPedagogy(state, course, lesson, 'vocabulary', answers(phaseTasks(state, lesson, 'vocabulary', at)), at)
  state = finishPedagogy(state, course, lesson, 'transfer', answers(phaseTasks(state, lesson, 'transfer', at)), at)
  state = finishPedagogy(state, course, lesson, 'reading', answers(phaseTasks(state, lesson, 'reading', at)), at)
  expect(() => finishPedagogy(state, course, lesson, 'listening', answers(phaseTasks(state, lesson, 'listening', at)), at)).toThrow(/dinle/)
  state = finishPedagogy(state, course, lesson, 'listening', {}, at, 'unavailable')
  expect(state.attempts.some(({ evidence }) => evidence.skill === 'listening')).toBe(false)
  expect(state.skippedListening).toContain(lesson.id)
  expect(parseBackup(exportBackup(state))).toEqual(state)
  const invalid = structuredClone(course)
  invalid.unit.lessons[0].pedagogy!.listening.audio = { kind: 'synthesis', locale: 'ru-RU', rate: .85 }
  expect(() => publishCourse(invalid)).toThrow()
})

test('Spanish profiles, attempts and backups survive switching through both existing languages', async () => {
  const repository = new IndexedLearningRepository('language-os-spanish-test')
  const spanish = finishPlacement(start(), course, answers(course.placement), at)
  try {
    await repository.create(spanish)
    for (const [language, id] of [['en', 'a305fe5e-2213-45cd-b469-6c56330ef04f'], ['ru', '2e145aef-9abf-42b4-98df-e4b3f94cca53']] as const) {
      const other = { ...start(language), profile: { ...start(language).profile, id, minutes: 15 } }
      await repository.switchLanguage(spanish.profile.id, language, other)
      expect(await repository.read()).toEqual(other)
      expect(await repository.switchLanguage(id, 'es')).toEqual(spanish)
      repository.close()
      expect(await repository.read()).toEqual(spanish)
    }
    expect(parseBackup(exportBackup((await repository.read())!))).toEqual(spanish)
  } finally { await repository.delete() }
})

test('tutor and speaking contexts use Spanish examples and Turkish explanations', () => {
  const state = finishPlacement(start(), course, answers(course.placement), at)
  const lesson = course.unit.lessons[0]
  expect(tutorInput(buildTutorRequest(state, lesson, 'explanation'), course)).toMatchObject({ targetLanguage: 'es', explanationLanguage: 'tr' })
  const session = { id: '9bb4c89d-b416-4bac-9719-bbe9bff30c2f', language: 'es' as const, lessonId: lesson.id, target: 'A2' as const, createdAt: at }
  const prompt = buildSpeakingPrompt(session, lesson, speakingFocus(state, lesson))
  expect(prompt).toContain('Spanish for es')
  expect(prompt).toContain('"explanationLanguage": "tr"')
  expect(parseSpeakingReport(JSON.stringify({ schemaVersion: 2, sessionId: session.id, language: 'es', lessonId: lesson.id,
    observations: [], confidence: 'low', transcriptAvailability: 'unavailable', completionStatus: 'partial' }), session, lesson).language).toBe('es')
})

test('Spanish uses all 54 recordings in authored order with matching text and source metadata', () => {
  const clips: { file: string; text: string; options: string[] }[] = JSON.parse(execFileSync(process.execPath,
    ['scripts/curriculum-audio.mjs', '--list', 'es.json'], { encoding: 'utf8' }))
  const todo = readFileSync('docs/SPANISH_AUDIO_TODO.md', 'utf8')
  expect(clips).toHaveLength(54)
  expect(new Set(clips.map(({ file }) => file)).size).toBe(54)
  expect(readdirSync('src/content/audio').filter((file) => /^es\..*\.mp3$/.test(file)).sort())
    .toEqual(clips.map(({ file }) => file).sort())
  expect(todo.match(/^\| es\./gm)).toHaveLength(54)
  const authored = course.unit.lessons.filter(({ teaching }) => !teaching?.audioMode).flatMap((lesson) => {
    const p = lesson.pedagogy!
    return [
      ...lesson.teaching!.models.map(({ phrase }, index) => ({ audio: modelAudio(lesson.id, index, 'es'), text: phrase })),
      { audio: p.listening.audio, text: p.listening.transcript },
      { audio: p.receptionRetry!.listening.audio, text: p.receptionRetry!.listening.transcript },
      ...p.vocabulary.map(({ audio }, index) => ({ audio, text: lesson.vocabulary[index].example })),
    ]
  })
  expect(authored).toHaveLength(clips.length)
  for (const [index, { file, text }] of clips.entries()) {
    expect(authored[index]).toEqual({ text, audio: {
      kind: 'recording', src: `/audio/${file}`, locale: 'es-ES', license: 'MIT',
      source: 'https://github.com/espeak-ng/espeak-ng', synthetic: true,
    } })
  }
  for (const { file, text, options } of clips) {
    expect(todo).toContain(`| ${file} | ${text} |`)
    expect(options).toEqual(['-b', '1', '-v', 'es', '-s', '140'])
    const hash = createHash('sha256').update(JSON.stringify([options, text])).digest('hex')
    expect(readFileSync(`src/content/audio/${file}`).includes(hash), file).toBe(true)
  }
})

test('Spanish supplemental vocabulary keeps its own audio override', () => {
  const item = structuredClone(spanish.lessons[0]) as Module
  const supplemental = { ...item.additionalWords![0], supplemental: true as const,
    audio: { kind: 'synthesis' as const, locale: 'es-ES' as const, rate: .85 } }
  item.additionalWords = [supplemental]
  const lesson = author('es', item)
  expect(lesson.pedagogy!.vocabulary[0].audio).toMatchObject({ kind: 'recording', src: '/audio/es.saludos.word.1.mp3' })
  expect(lesson.vocabulary[1].supplemental).toBe(true)
  expect(lesson.pedagogy!.vocabulary[1].audio).toEqual(supplemental.audio)
})
