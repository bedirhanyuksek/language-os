import type { Course } from '../content/schema'
import type { StudyPlan } from './model'
import { dailyMinutes, dailyPlan, dueCards, lessonTasks } from './progress'
import type { LearningState } from './state'
import { phaseTasks } from './pedagogy'
import { wordsPrepared } from './instruction'
import { vocabularyBatchLimit, vocabularyLoad, vocabularyMinutes } from './vocabulary-load'

export function activityLabel(task: StudyPlan) {
  if (task.kind === 'pedagogy') return { foundation: 'Ön koşul onarımı',
    vocabulary: task.vocabularyCardIds ? `Kelime edinimi · ${task.vocabularyCardIds.length} ifade` : 'Kelime edinimi',
    reading: 'Okuma pratiği', listening: 'Dinleme pratiği', transfer: 'Yeni bağlamda kontrollü kullanım',
    delayed: 'Gecikmeli kontrol', revision: 'Yazıyı gözden geçirme' }[task.phase]
  return { lesson: 'Yeni konu ve rehberli pratik', practice: 'Uygulama', speaking: 'Konuşma fırsatı', review: 'Vadesi gelen tekrar',
    rest: 'Dinlenme', budget: 'Sonraki çalışma günü', complete: 'Yayımlanan rota sonu', assessment_gap: 'Yeni örnek bekleniyor', out_of_scope: 'İçerik açığı' }[task.kind]
}

// A forecast describes dependencies. It never answers a question or writes learner evidence.
export function followingStep(course: Course, task: StudyPlan) {
  if (task.kind === 'review') return 'Seçili tekrarlar bitince öğretim ve beceri çalışması için kalan plan yeniden hesaplanır.'
  if (!('lessonId' in task)) return task.reason
  const lesson = course.unit.lessons.find(({ id }) => id === task.lessonId)!
  if (task.kind === 'lesson' || task.kind === 'practice') return 'Yanıtına göre önce eksik yapı onarımı veya gerekli kelime edinimi, ardından kendi mesajın açılır.'
  if (task.kind === 'pedagogy') {
    if (task.phase === 'vocabulary') return 'Gerekli ifadelerle çalıştıktan sonra kendi mesajını yaz; hatırlamadığın ifadeler destek olarak gösterilir.'
    if (task.phase === 'transfer') return 'Yeni bağlam denemesinden sonra okuma ve dinleme; hata varsa farklı örnekle onarım.'
    if (task.phase === 'reading') return 'Uygun dinleme, yazıyı gözden geçirme ve vadesi gelen kontrol.'
    if (task.phase === 'delayed') return 'Yeni kanıta göre sıradaki uygun kazanım veya hedefli onarım.'
  }
  return lesson.teaching?.bridge ?? lesson.recall
}

export function dailyProgram(state: LearningState, course: Course, now: string, timeZone: string) {
  const current = dailyPlan(state, course, now, timeZone)
  const learning = current.kind === 'review' ? dailyPlan(state, course, now, timeZone, false) : undefined
  const used = dailyMinutes(state, now, timeZone)
  const remaining = Math.max(0, state.profile.minutes - used)
  const vocabulary = vocabularyLoad(state, course, now, timeZone, remaining)
  const sequence = [current]
  if (learning && 'minutes' in learning && current.kind === 'review' && current.minutes + learning.minutes <= remaining) sequence.push(learning)
  const alternatives: StudyPlan[] = []
  if (learning && 'minutes' in learning && learning.minutes <= remaining) alternatives.push(learning)
  if (current.kind === 'pedagogy' && (current.phase === 'reading' || current.phase === 'listening')) {
    const lesson = course.unit.lessons.find(({ id }) => id === current.lessonId)!
    const other = current.phase === 'reading' ? 'listening' : 'reading'
    if (phaseTasks(state, lesson, other, now).length) {
      const minutes = other === 'reading' ? 2 : 3
      if (minutes <= remaining) alternatives.push({ ...current, phase: other, minutes,
        reason: 'Aynı kazanım için erişilebilir diğer alımlama becerisini önce çalışabilirsin.' })
    }
  }
  const focus = sequence.at(-1)!
  const conditional: { label: string; minutes: number; dependency: string }[] = []
  const owner = 'lessonId' in focus ? course.unit.lessons.find(({ id }) => id === focus.lessonId) : undefined
  let reserved = sequence.reduce((sum, item) => sum + ('minutes' in item ? item.minutes : 0), 0)
  if (owner && 'minutes' in focus) {
    const blocks = [
      ...(!wordsPrepared(state, owner) && vocabulary.availableNew > 0 && !(focus.kind === 'pedagogy' && focus.phase === 'vocabulary')
        ? [{ label: 'Gerekli kelime ve kalıpları öğrenme', minutes: vocabularyMinutes(Math.min(vocabulary.availableNew,
          owner.vocabulary.filter((card) => !card.supplemental).length, vocabularyBatchLimit)), dependency: 'Rehberli yapı pratiği yeterli olduğunda' }] : []),
      ...(!state.attempts.some(({ exerciseId }) => exerciseId === owner.production.id) &&
        !(focus.kind === 'practice' && lessonTasks(state, owner).every(({ exercise }) => exercise.kind === 'open'))
        ? [{ label: 'Yeni bağlamda kendi mesajın', minutes: 3, dependency: 'Yapı ve kelime ön çalışması tamamlandığında' }] : []),
      ...(phaseTasks(state, owner, 'transfer', now).length && !(focus.kind === 'pedagogy' && focus.phase === 'transfer')
        ? [{ label: 'Farklı durumda kontrollü kullanım', minutes: 4, dependency: 'Gerekli öğretim ve ilk mesajdan sonra' }] : []),
      ...(['reading', 'listening'] as const).flatMap((phase) => {
        if ((focus.kind === 'pedagogy' && focus.phase === phase) || !phaseTasks(state, owner, phase, now).length) return []
        return [{ label: phase === 'reading' ? 'Okuma kaynağıyla uygulama' : 'Dinleme kaynağıyla uygulama',
          minutes: phase === 'reading' ? 2 : 3, dependency: 'Ön çalışma yeterli olduğunda; hata varsa önce onarım' }]
      }),
    ]
    for (const block of blocks) {
      if (reserved + block.minutes > remaining) break
      conditional.push(block)
      reserved += block.minutes
    }
  }
  const due = dueCards(state, now).length
  return { current, sequence, conditional, alternatives, used, remaining, due,
    deferred: due - (current.kind === 'review' ? current.cardIds.length : 0),
    scheduled: reserved,
    next: followingStep(course, learning && sequence.includes(learning) ? learning : current) }
}
