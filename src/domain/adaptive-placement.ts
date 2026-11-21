import { assessmentBank, assessmentBankVersion, routeLanguage, type AssessmentItem } from '../content/assessment/bank'
import { assess } from './assessment'
import { answerSchema, levelSchema, skillSchema, type Answer, type Skill } from './model'
import type { PlacementResponse, PlacementSample } from './placement-state'
import type { LearningState, Profile } from './state'

export function beginPlacementTrack(state: LearningState, now: string): LearningState {
  if (state.placementTrack) return state
  const profile = state.profile
  const route = profile.language === 'ru' ? (profile.estimate === 'A1' || profile.target === 'A1' ? 'ru-start' : 'ru-a2')
    : ['A1', 'A2'].includes(profile.target) || ['A1', 'A2'].includes(profile.estimate) ? 'en-start'
      : ['B2', 'B2+', 'C1', 'C2'].includes(profile.estimate) && ['B2', 'B2+', 'C1', 'C2'].includes(profile.target) ? 'en-advanced' : 'en-b1'
  return { ...state, placementTrack: { bankVersion: assessmentBankVersion, route, startedAt: now, targetAtStart: profile.target,
    origin: state.placementAt ? 'existing' : 'new', samples: [] } }
}

const items = new Map(assessmentBank.map((item) => [item.id, item]))
export function assessmentItem(id: string) { return items.get(id) }

function unused(state: LearningState) {
  const track = state.placementTrack
  return track ? assessmentBank.filter((item) => item.route === track.route &&
    !track.samples.some(({ itemId }) => itemId === item.id)) : []
}

function localDay(at: string, timeZone: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone, dateStyle: 'short' }).format(new Date(at))
}

function workingDay(at: string, timeZone: string, days: Profile['days']) {
  return days.includes(new Date(`${localDay(at, timeZone)}T00:00:00Z`).getUTCDay())
}

type Evidence = { sample: PlacementSample; item: AssessmentItem }
function paired(state: LearningState): Evidence[] {
  return (state.placementTrack?.samples ?? []).flatMap((sample) => {
    const item = items.get(sample.itemId)
    return item ? [{ sample, item }] : []
  })
}

export function independent(sample: PlacementSample) {
  return sample.status === 'answered' && sample.mode !== 'transcript' &&
    (sample.result === 'correct' || sample.result === 'incorrect')
}

function lowerReadingProbe(state: LearningState) {
  const samples = state.placementTrack?.samples ?? []
  return ['en.assess.b1.g1', 'en.assess.b1.v1'].every((id) =>
    samples.some(({ itemId, status }) => itemId === id && status === 'unknown'))
}

function nextMiniItem(state: LearningState, candidates = unused(state)) {
  return candidates.find(({ stage, id }) => stage === 'mini' &&
    (id === 'en.assess.b1.r-foundation' ? lowerReadingProbe(state) : id !== 'en.assess.b1.r1' || !lowerReadingProbe(state)))
}

function earlierAtLevel(evidence: Evidence[], item: AssessmentItem) {
  const matches = evidence.filter((row) => row.item.family === item.family && row.item.band === item.band)
  const latest = matches.at(-1)
  return matches.filter(({ sample }) => sample.timing === latest?.sample.timing)
}

export function nextPlacementItem(state: LearningState, now: string, timeZone: string) {
  const track = state.placementTrack
  if (!track) return
  const candidates = unused(state)
  if (!state.placementAt) return nextMiniItem(state, candidates)
  const day = localDay(now, timeZone)
  if (!workingDay(now, timeZone, state.profile.days) ||
    (track.origin === 'new' && (!track.finishedAt || day <= localDay(track.finishedAt, timeZone)))) return
  const used = track.samples.filter(({ at, stage }) => stage === 'followup' && localDay(at, timeZone) === day).length
  if (used >= (state.profile.minutes <= 5 ? 1 : 2)) return

  const samples = paired(state)
  const evidence = samples.filter(({ sample }) => independent(sample))
  const followups = candidates.filter(({ id }) => id !== 'en.assess.b1.r-foundation' &&
    (id !== 'en.assess.b1.r1' || !lowerReadingProbe(state)))
  return followups.flatMap((item) => {
    const family = evidence.filter((row) => row.item.family === item.family)
    const atLevel = earlierAtLevel(family, item)
    const band = Math.min(...assessmentBank.filter((candidate) => candidate.route === item.route &&
      candidate.family === item.family && candidate.id !== 'en.assess.b1.r-foundation').map((candidate) => levelSchema.options.indexOf(candidate.band)))
    const higher = levelSchema.options.indexOf(item.band) > band
    if (higher) {
      const lower = family.filter((row) => levelSchema.options.indexOf(row.item.band) === band &&
        (row.sample.timing === 'after_teaching') === family.some(({ sample }) => sample.timing === 'after_teaching'))
      return lower.length >= 2 && lower.every(({ sample }) => sample.result === 'correct') ? [{ item, priority: 0 }] : []
    }
    const correct = atLevel.filter(({ sample }) => sample.result === 'correct').length
    if (atLevel.length >= 2 && (correct === 0 || correct === atLevel.length)) return []
    if (atLevel.length >= 2) return [{ item, priority: 1 }]
    if (item.skill === 'writing') return [{ item, priority: 3 }]
    if (item.skill === 'speaking') return [{ item, priority: 6 }]
    if (item.skill === 'listening' && correct) return [{ item, priority: 2 }]
    if (atLevel.length) return [{ item, priority: 3 }]
    if (samples.some((row) => row.item.family === item.family && row.sample.status === 'unknown')) return [{ item, priority: 3 }]
    if (samples.some((row) => row.item.skill === item.skill && row.item.lesson === item.lesson) &&
      (item.skill === 'grammar' || item.skill === 'vocabulary')) return [{ item, priority: 3 }]
    return [{ item, priority: item.stage === 'mini' ? 2 : 4 }]
  }).sort((a, b) => a.priority - b.priority)[0]?.item
}

export function upcomingPlacement(state: LearningState, now: string, timeZone: string) {
  for (let offset = 0; offset <= 7; offset++) {
    const at = new Date(Date.parse(now) + offset * 86_400_000).toISOString()
    const item = nextPlacementItem(state, at, timeZone)
    if (item) return { item, at, today: offset === 0 }
  }
}

export function finishMiniPlacement(state: LearningState, now: string): LearningState {
  if (!state.placementTrack || state.placementTrack.origin !== 'new' || state.placementAt) return state
  return { ...state, placementAt: now, placementTrack: { ...state.placementTrack, finishedAt: now } }
}

type Response = { status: PlacementResponse; answer?: Answer; audioPlayed?: boolean; transcript?: boolean }
function validAnswer(exercise: NonNullable<AssessmentItem['exercise']>, answer: Answer) {
  return typeof answer === 'string' && (exercise.kind !== 'single' || exercise.options.includes(answer))
}

export function recordPlacementSample(state: LearningState, id: string, response: Response, now: string, timeZone: string): LearningState {
  const track = state.placementTrack
  const item = nextPlacementItem(state, now, timeZone)
  if (!track || !item || item.id !== id) throw new Error('Örnek değişti. Günlük planı yeniden aç.')
  const status = response.status
  if ((status === 'unavailable' && !item.transcript) || (status === 'practiced' && item.skill !== 'speaking')) {
    throw new Error('Bu seçenek bu alıştırmaya uygun değil.')
  }
  let scored: Pick<PlacementSample, 'answer' | 'result' | 'mode'> = { mode: 'none' }
  if (status === 'answered') {
    if (!item.exercise || (item.transcript && !response.audioPlayed && !response.transcript)) {
      throw new Error('Önce sesi dinle veya metinli çalışma seçeneğini kullan.')
    }
    const answer = answerSchema.parse(response.answer)
    if (!validAnswer(item.exercise, answer)) throw new Error('Yanıt bu örneğe uygun değil.')
    const result = assess(item.exercise, answer, state.profile.language).outcome
    if (result === 'observed') throw new Error('Değerlendirme sonucu doğrulanamadı.')
    scored = { answer, result, mode: item.transcript ? response.transcript ? 'transcript' : 'audio' : 'text' }
  }
  const practiced = state.attempts.some((attempt) => attempt.lessonId === item.lesson &&
    attempt.evidence.skill === item.skill && attempt.context !== 'placement' && attempt.context !== 'diagnostic')
  const exposed = (state.studyDrafts ?? []).some(({ task }) => 'lessonId' in task && task.lessonId === item.lesson &&
    ((task.kind === 'lesson' && item.skill === 'grammar') ||
      (task.kind === 'pedagogy' && task.phase === item.skill)))
  const timing = practiced || exposed ? 'after_teaching' : 'before_teaching'
  const stage = state.placementAt ? 'followup' : 'mini'
  const next: LearningState = { ...state, placementTrack: { ...track, samples: [...track.samples, { itemId: id, at: now, stage, status, timing, ...scored }] } }
  return stage === 'mini' && !nextMiniItem(next) ? finishMiniPlacement(next, now) : next
}

export function placementEntry(state: LearningState) {
  if (state.placementTrack?.origin !== 'new' || !state.placementAt) return
  const rows = paired(state).filter(({ sample }) => sample.stage === 'mini')
  const correct = (id: string) => rows.some(({ item, sample }) => item.id === id && independent(sample) && sample.result === 'correct')
  const weak = (skill: Skill) => rows.some(({ item, sample }) => item.skill === skill &&
    (sample.result === 'incorrect' || sample.status === 'unknown'))
  switch (state.placementTrack.route) {
    case 'ru-start':
      return correct('ru.assess.a1.r1') ? { id: 'ru.intro', reason: 'Kiril tabelasını ayırt ettin. Tanışmayı rehberli örneklerle çalış.' }
        : { id: 'ru.cyrillic', reason: 'Kiril okuması henüz doğrulanmadı. Tanışmadan önce kısa harf ve ses çalışmasıyla başla.' }
    case 'ru-a2':
      return correct('ru.assess.a2.r1') ? { id: 'ru.intro', reason: 'Kısa mesajdaki eylemi seçtin. Rusça konuşma rotasına tanışma örneğiyle gir.' }
        : { id: 'ru.cyrillic', reason: 'Rusça okuma kanıtı sınırlı. Kısa Kiril çalışmasıyla başla.' }
    case 'en-start': return { id: 'en.identity', reason: 'İlk kısa İngilizce örneklerine göre tanışmayla başla.' }
    case 'en-advanced':
      return correct('en.assess.adv.r1') && correct('en.assess.adv.g1')
        ? { id: ['B2', 'B2+'].includes(state.placementTrack.targetAtStart) ? 'en.uncertainty' : 'en.evidence', guidedEntry: true, reason: 'Kaynak sınırını ve belirsizliği ayırdın. İleri bir kaynak dersine rehberli giriş yap; ön koşullar tamamlanmış sayılmaz.' }
        : { id: 'en.experience', reason: 'İleri kaynak ve kip kanıtı henüz uyuşmuyor. Deneyimi zamanıyla anlatan rehberli bir dersten başla.' }
    default:
      return { id: 'en.experience', reason: weak('grammar') || weak('vocabulary')
        ? 'Zaman ayrımı veya iş kalıplarında destek gerekiyor. Deneyim anlatımından başla; dinlemeyi ayrı örneklerle izle.'
        : 'Deneyim anlatımına kısa rehberli giriş. İlk örnekler yazı ve konuşmayı henüz doğrulamıyor.' }
  }
}

export function placementSkills(state: LearningState) {
  const evidence = paired(state)
  const remaining = unused(state)
  return skillSchema.options.map((skill) => ({
    skill, rows: evidence.filter(({ item }) => item.skill === skill),
    pending: remaining.some((item) => item.skill === skill),
  }))
}

export function validPlacementTrack(state: LearningState) {
  const track = state.placementTrack
  if (!track) return true
  if (routeLanguage(track.route) !== state.profile.language ||
    (track.origin === 'new' && ((track.finishedAt ?? null) !== state.placementAt || state.attempts.some(({ context }) => context === 'placement'))) ||
    (track.origin === 'existing' && (!state.placementAt || track.finishedAt))) return false
  return track.samples.every((sample) => {
    const item = items.get(sample.itemId)
    return item?.route === track.route && sample.at >= track.startedAt &&
      (sample.stage !== 'mini' || (track.origin === 'new' && item.stage === 'mini' && (!track.finishedAt || sample.at <= track.finishedAt))) &&
      (sample.stage !== 'followup' || Boolean(state.placementAt && sample.at >= state.placementAt)) &&
      (sample.status !== 'unavailable' || Boolean(item.transcript)) &&
      (sample.status !== 'practiced' || item.skill === 'speaking') &&
      (sample.status !== 'answered' || Boolean(item.exercise && sample.answer &&
        validAnswer(item.exercise, sample.answer) &&
        (item.transcript ? sample.mode === 'audio' || sample.mode === 'transcript' : sample.mode === 'text') &&
        assess(item.exercise, sample.answer, state.profile.language).outcome === sample.result))
  })
}
