import type { Language, LearningGoal, PedagogyPhase, Skill } from '../domain/model'

export const languageLabels: Record<Language, string> = { en: 'İngilizce', ru: 'Rusça', es: 'İspanyolca' }
export const languageMarks: Record<Language, string> = { en: 'Aa', ru: 'Яя', es: 'Ññ' }
export const goalLabels: Record<LearningGoal, string> = {
  general: 'Genel dil becerisi', professional: 'Profesyonel iletişim', exam: 'Sınav hazırlığı',
}
export const skillLabels: Record<Skill, string> = {
  grammar: 'Dil bilgisi', vocabulary: 'Kelime', reading: 'Okuma',
  listening: 'Dinleme', writing: 'Yazma', speaking: 'Konuşma',
}
export const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

export const phaseLabels: Record<PedagogyPhase, string> = {
  revision: 'Yazıyı geliştir', foundation: 'Ön koşul pratiği', transfer: 'Yeni bağlamda üretim', reading: 'Okuma',
  listening: 'Dinleme', vocabulary: 'Kelimeleri öğren', delayed: 'Gecikmeli kazanım kontrolü',
}
