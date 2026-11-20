import data from '../es.json' with { type: 'json' }
import { author, type Module } from '../continuity'
import { courseSchema, type Course } from '../schema'

// The same authoring format as the EN/RU curriculum batches. The compiled course
// is checked by courseSchema, including every exercise, media and prerequisite.
export const spanishBatch = data.lessons as Module[]
const lessons = spanishBatch.map((item) => author('es', item))
const first = lessons[0]

export const spanishCourse: Course = courseSchema.parse({
  id: 'es.starter', language: 'es', level: 'A1', version: 2,
  source: 'Language OS özgün İspanyolca A1–A2 başlangıç içeriği; otomatik kontrol, uzman ve öğrenci pilotu bekliyor.',
  license: 'MIT', reviewStatus: 'automated_checked',
  unit: { id: 'es.starter.unit', title: 'İspanyolcaya ilk adım · A1–A2', lessons },
  // Optional prior-learning samples. The onboarding beginner choice records
  // “Bilmiyorum” and starts teaching before exposing any Spanish questions.
  placement: [
    { objectiveId: first.objective.id, diagnosticConceptId: first.concepts[0].id, difficulty: 'A1',
      exercise: { id: 'es.placement.greeting.recognize', kind: 'single', skill: 'grammar',
        prompt: 'Sabah karşılaştığın birine hangi selam uygundur?', options: ['Buenos días', 'Buenas noches', 'Hasta mañana'],
        accepted: 'Buenos días', explanation: 'Buenos días sabah selamıdır.' } },
    { objectiveId: first.objective.id, diagnosticConceptId: first.concepts[0].id, difficulty: 'A1',
      exercise: { id: 'es.placement.greeting.produce', kind: 'fill', skill: 'grammar',
        prompt: 'Sabah selamını tamamla: ___ días.', accepted: ['Buenos'], explanation: 'Días ile buenos kullanılır.' } },
    { objectiveId: first.objective.id, diagnosticConceptId: first.concepts[1].id, difficulty: 'A1',
      exercise: { id: 'es.placement.name.recognize', kind: 'single', skill: 'grammar',
        prompt: 'Kendi adını söylemek için hangi cümle kullanılır?', options: ['Me llamo Ana', 'Te llamas Ana', '¿Cómo te llamas?'],
        accepted: 'Me llamo Ana', explanation: 'Me llamo kendi adını, te llamas karşındakinin adını belirtir.' } },
    { objectiveId: first.objective.id, diagnosticConceptId: first.concepts[1].id, difficulty: 'A1',
      exercise: { id: 'es.placement.name.produce', kind: 'short', skill: 'grammar',
        prompt: 'Adının Elif olduğunu tek cümleyle İspanyolca söyle.', accepted: ['Me llamo Elif', 'Yo me llamo Elif', 'Soy Elif', 'Yo soy Elif', 'Mi nombre es Elif'],
        explanation: 'Me llamo Elif yaygın tanışma kalıbıdır. Soy Elif ve mi nombre es Elif de bu bağlamda geçerlidir.' } },
    { objectiveId: lessons[2].objective.id, difficulty: 'A1',
      exercise: { id: 'es.placement.price', kind: 'short', skill: 'vocabulary',
        prompt: '12 € fiyatını İspanyolca yazıyla yaz.', accepted: ['doce euros'], explanation: 'Doce euros on iki avrodur.' } },
    { objectiveId: lessons[8].objective.id, difficulty: 'A2',
      exercise: { id: 'es.placement.perfect', kind: 'fill', skill: 'grammar',
        prompt: 'Özellikle pretérito perfecto kullan: Hoy ___ en casa. (comer, yo)', accepted: ['he comido'],
        explanation: 'Bu biçim sorusunda haber fiilinin he çekimi ve comido ortacı kullanılır.' } },
  ],
})

// No pre-existing Spanish records: provide the v1 contract for the shared
// backup reader while keeping the same stable lesson and exercise identifiers.
export const spanishLegacyCourse: Course = courseSchema.parse({
  ...spanishCourse, version: 1,
  unit: { ...spanishCourse.unit, lessons: lessons.map((lesson) => {
    const legacy = { ...lesson }
    delete legacy.pedagogy
    delete legacy.teaching
    return legacy
  }) },
})
