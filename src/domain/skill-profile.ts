import type { Course } from '../content/schema'
import { skillSchema, type Skill, type ExerciseAttempt } from './model'
import type { LearningState } from './state'
import { assessmentItem } from './adaptive-placement'

export type SkillRow = { id: string; at: string; label: string; stage: string; help: string; result: string; compare?: string; family?: string }
const resultLabel = { correct: 'Doğru', incorrect: 'Destek gerekiyor', review_required: 'İnceleme bekliyor', observed: 'Gözlem' }
export function assistance(attempt: ExerciseAttempt) {
  if (!attempt.study) return 'Yardım bilgisi bilinmiyor'
  return attempt.study.supports.filter((name) => name !== 'instruction' && name !== 'wordInstruction').length ? 'Destek kullanıldı' : 'Ek destek açılmadı'
}

export function skillProfile(state: LearningState, course: Course, now: string) {
  return skillSchema.options.map((skill) => {
    const rows: SkillRow[] = state.attempts.filter(({ evidence }) => evidence.skill === skill).map((attempt) => {
      const lesson = course.unit.lessons.find(({ id }) => id === attempt.lessonId)
      const family = lesson?.pedagogy?.checks.find(({ conceptId }) => conceptId === attempt.conceptId)
      const controlled = attempt.evidence.observation === 'controlled_production'
      const stage = attempt.context === 'lesson' ? attempt.evidence.observation === 'free_production' ? 'Yeni metin örneği' :
        controlled ? 'Rehberli kontrollü uygulama' : 'Rehberli tanıma' :
        attempt.context === 'transfer' ? 'Yeni bağlamda kontrollü uygulama' :
        attempt.context === 'delayed' ? 'Gecikmeli kontrollü uygulama' :
        attempt.context === 'vocabulary' ? attempt.evidence.outcome === 'review_required' ? 'Yeni cümle örneği' :
          controlled ? 'Öğretim sonrası hatırlama' : 'Anlam tanıma' :
        attempt.context === 'revision' ? 'Destekli revizyon' :
        attempt.context === 'placement' || attempt.context === 'diagnostic' ? 'Eski başlangıç örneği' :
        skill === 'writing' ? 'Yeni metin örneği' : 'Kaynağa dayalı alımlama'
      const help = assistance(attempt)
      const comparable = family && ['transfer', 'delayed'].includes(attempt.context) && attempt.study && help === 'Ek destek açılmadı'
      return { id: attempt.id, at: attempt.at, label: lesson?.concepts.find(({ id }) => id === attempt.conceptId)?.label ?? lesson?.title ?? 'Başlangıç örneği',
        stage, help, result: resultLabel[attempt.evidence.outcome],
        family: comparable ? JSON.stringify([attempt.contentVersion, attempt.lessonId, attempt.conceptId, attempt.evidence.observation]) : undefined,
        compare: comparable ? attempt.exerciseId : undefined }
    })
    for (const sample of state.placementTrack?.samples ?? []) {
      const item = assessmentItem(sample.itemId)
      if (item?.skill !== skill) continue
      rows.push({ id: sample.itemId, at: sample.at, label: item.focus,
        stage: sample.timing === 'before_teaching' ? 'Öğretim öncesi örnek' : 'Öğretim sonrası örnek',
        help: sample.mode === 'transcript' ? 'Metin yardımıyla' : sample.mode === 'audio' ? 'Sentetik ses örneği' : 'Ek destek açılmadı',
        result: sample.status === 'answered' ? resultLabel[sample.result!] :
          { unknown: 'Bilmiyorum', skipped: 'Ertelendi', unavailable: 'Ses erişilemedi', practiced: 'Puanlanmayan prova' }[sample.status] })
    }
    if (skill === 'vocabulary') for (const review of state.reviewHistory) {
      const card = course.unit.lessons.flatMap(({ vocabulary }) => vocabulary).find(({ id }) => id === review.cardId)
      rows.push({ id: `review-${rows.length}`, at: review.at, label: card?.term ?? 'Kelime tekrarı',
        stage: 'Vadesi gelen hatırlama', help: review.mode === 'typed' ? 'Yazılı hatırlama' : 'Öz bildirim',
        result: review.result === 'remembered' ? 'Hatırlandı' : 'Tekrar gerekiyor' })
    }
    if (skill === 'speaking') for (const { report, importedAt } of state.speakingAssessments) {
      rows.push({ id: report.sessionId, at: importedAt, label: 'Kullanıcı onaylı konuşma raporu', stage: 'Dış rapor',
        help: 'Rapor içindeki yardım koşulları', result: 'Yerel bağımsız ölçüm bekleniyor' })
    }
    rows.sort((a, b) => a.at.localeCompare(b.at))
    const recent = rows.filter(({ at }) => Date.parse(at) <= Date.parse(now) && Date.parse(now) - Date.parse(at) <= 7 * 86_400_000)
    let comparison: { first: SkillRow; latest: SkillRow } | undefined
    for (const latest of [...recent].reverse()) {
      if (!latest.family) continue
      const first = recent.find((row) => row.family === latest.family && row.compare !== latest.compare && row.at < latest.at)
      if (first) { comparison = { first, latest }; break }
    }
    const instruction = course.unit.lessons.filter((lesson) =>
      (skill === 'vocabulary' ? lesson.vocabulary.length > 0 : lesson.concepts.some(({ variants }) => variants[0].skill === skill)) &&
      ((state.studyDrafts ?? []).some((draft) => 'lessonId' in draft.task && draft.task.lessonId === lesson.id &&
        (skill === 'vocabulary' ? draft.supports.wordInstruction : draft.supports.instruction)) ||
       state.attempts.some((attempt) => attempt.lessonId === lesson.id && attempt.evidence.skill === skill &&
        attempt.study?.supports.includes(skill === 'vocabulary' ? 'wordInstruction' : 'instruction'))))
      .map(({ title }) => title)
    const hasMeasured = rows.some(({ result }) => !['Bilmiyorum', 'Ertelendi', 'Ses erişilemedi', 'Puanlanmayan prova', 'Yerel bağımsız ölçüm bekleniyor'].includes(result))
    const next: Record<Skill, string> = {
      grammar: 'Hedef yapıyı farklı bir bağlamda kullan ve zamanı gelince yeni örnekle hatırla.',
      vocabulary: 'Öğretimden sonra ifadeyi kapalı ipucuyla hatırla; yeni cümlede kullanım ayrı incelenir.',
      reading: 'Aynı okuma amacını farklı bir kaynakta kontrol et.',
      listening: 'Farklı bir kayıtta metinsiz ana fikir ve ayrıntı örneği gerekiyor.',
      writing: 'Yeni metin, revizyon ve rubrik incelemesi ayrı tutulur; inceleme bekleyen örnek başarı sayılmaz.',
      speaking: 'İsteğe bağlı konuşma provası veya onaylı Speaking Coach raporu ekleyebilirsin.',
    }
    return { skill, rows, instruction, latest: rows.slice(-3), comparison, measured: hasMeasured, next: next[skill] }
  })
}
