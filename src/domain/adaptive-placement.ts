import { z } from 'zod'
import { assessmentBank, assessmentBankVersion, routeLanguage, type AssessmentItem } from '../content/assessment/bank'
import { assess } from './assessment'
import { answerSchema, levelSchema, skillSchema, type Answer, type CEFRLevel, type Skill } from './model'
import type { PlacementResponse, PlacementSample } from './placement-state'
import type { LearningState, Profile } from './state'

export function beginPlacementTrack(state: LearningState, now: string): LearningState {
  if (state.placementTrack) return state
  const profile = state.profile
  const route = profile.language === 'es' ? (profile.selfEstimateUnknown || profile.estimate === 'A1' || profile.target === 'A1' ? 'es-start' : 'es-medium')
    : profile.language === 'ru' ? (profile.selfEstimateUnknown || profile.estimate === 'A1' || profile.target === 'A1' ? 'ru-start' : 'ru-a2')
    : ['A1', 'A2'].includes(profile.target) || ['A1', 'A2'].includes(profile.estimate) ? 'en-start'
      : profile.selfEstimateUnknown ? 'en-start'
        : ['B2', 'B2+', 'C1', 'C2'].includes(profile.estimate) && ['B2', 'B2+', 'C1', 'C2'].includes(profile.target) ? 'en-advanced' : 'en-b1'
  return { ...state, placementTrack: { bankVersion: assessmentBankVersion, route, startedAt: now, targetAtStart: profile.target,
    policy: 'adaptive-v1', origin: state.placementAt ? 'existing' : 'new', samples: [] } }
}

export function rescreenPlacementTrack(state: LearningState, now: string): LearningState {
  if (!state.placementAt) throw new Error('Bu profil için yeni başlangıç taraması açılamıyor.')
  if ((state.studyDrafts ?? []).some(({ task }) => task.kind === 'assessment')) {
    throw new Error('Önce açık değerlendirme taslağını tamamla veya kapat.')
  }
  const route = state.profile.language === 'es'
    ? (state.profile.selfEstimateUnknown || state.profile.estimate === 'A1' || state.profile.target === 'A1' ? 'es-start' : 'es-medium')
    : state.profile.language === 'ru'
      ? (state.profile.selfEstimateUnknown || state.profile.estimate === 'A1' || state.profile.target === 'A1' ? 'ru-start' : 'ru-a2')
      : state.profile.selfEstimateUnknown || ['A1', 'A2'].includes(state.profile.estimate) || ['A1', 'A2'].includes(state.profile.target)
        ? 'en-start'
        : ['B2', 'B2+', 'C1', 'C2'].includes(state.profile.estimate) && ['B2', 'B2+', 'C1', 'C2'].includes(state.profile.target)
          ? 'en-advanced' : 'en-b1'
  const history = [...(state.placementHistory ?? []), ...(state.placementTrack ? [state.placementTrack] : [])]
  return { ...state, placementHistory: history, placementTrack: {
    bankVersion: assessmentBankVersion, route, startedAt: now, targetAtStart: state.profile.target,
    policy: 'adaptive-v1', origin: 'existing', samples: [],
  } }
}

const MAX_FOLLOWUP_SAMPLES = 6
export const PLACEMENT_ACTIVE_BUDGET_SECONDS = 10 * 60

const items = new Map(assessmentBank.map((item) => [item.id, item]))
export function assessmentItem(id: string) { return items.get(id) }

const postMilestoneItems = new Set([
  'en.assess.start.r2', 'en.assess.start.vr1', 'en.assess.start.gp1', 'en.assess.start.vp1',
  'en.assess.b1.vr1', 'en.assess.b1.gp1', 'en.assess.b1.r3',
  'ru.assess.a1.r2m', 'ru.assess.a1.vr1', 'ru.assess.a1.gp1', 'ru.assess.a1.vp1',
  'ru.assess.a2.r2', 'ru.assess.a2.vr1', 'ru.assess.a2.gp1', 'ru.assess.a2.vp1',
])

export function neighboringRoutes(route: string) {
  const neighbors: Record<string, string[]> = {
    'en-start': ['en-b1'], 'en-b1': ['en-start', 'en-advanced'], 'en-advanced': ['en-b1'],
    'ru-start': ['ru-a2'], 'ru-a2': ['ru-start'], 'es-start': ['es-medium'], 'es-medium': ['es-start'],
  }
  return neighbors[route] ?? []
}

export function placementRouteAllowed(track: NonNullable<LearningState['placementTrack']>, item: AssessmentItem, language: LearningState['profile']['language']) {
  return item.route === track.route || (track.policy === 'adaptive-v1' && routeLanguage(item.route) === language &&
    neighboringRoutes(track.route).includes(item.route))
}

function unused(state: LearningState, includeNeighbors = false) {
  const track = state.placementTrack
  const routes = track ? [track.route, ...(includeNeighbors && track.policy === 'adaptive-v1' ? neighboringRoutes(track.route) : [])] : []
  return track ? assessmentBank.filter((item) => routes.includes(item.route) &&
    (track.policy === 'adaptive-v1' || !postMilestoneItems.has(item.id)) &&
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
  const track = state.placementTrack
  const pairs: Record<string, [string, string]> = {
    'en-start': ['en.assess.start.g1', 'en.assess.start.gp1'],
    'en-b1': ['en.assess.b1.g1', 'en.assess.b1.gp1'],
    'ru-start': ['ru.assess.a1.g1', 'ru.assess.a1.gp1'],
    'ru-a2': ['ru.assess.a2.g1', 'ru.assess.a2.gp1'],
    'es-start': ['es.assess.start.g1', 'es.assess.start.gp1'],
    'es-medium': ['es.assess.a2.g1', 'es.assess.a2.gp1'],
  }
  if (track?.policy === 'adaptive-v1' && !track.samples.some(({ itemId }) => items.get(itemId)?.route !== track.route)) {
    const pair = pairs[track.route]
    const samples = new Map(track.samples.map((sample) => [sample.itemId, sample]))
    if (pair && pair.every((id) => samples.has(id))) {
      const strong = pair.every((id) => independent(samples.get(id)!) && samples.get(id)?.result === 'correct')
      const base = Math.min(...assessmentBank.filter((item) => item.route === track.route && item.stage === 'mini' && item.skill === 'grammar')
        .map((item) => levelSchema.options.indexOf(item.band)))
      const neighbor = unused(state, true).find((item) => item.route !== track.route && item.stage === 'mini' &&
        item.skill === 'grammar' && (strong
          ? levelSchema.options.indexOf(item.band) > base
          : levelSchema.options.indexOf(item.band) < base))
      if (neighbor) return neighbor
    }
    if (pair && pair.every((id) => samples.has(id)) && pair.some((id) => !independent(samples.get(id)!) || samples.get(id)?.result !== 'correct')) {
      const base = Math.min(...assessmentBank.filter((item) => item.route === track.route && item.stage === 'mini' && item.skill === 'grammar')
        .map((item) => levelSchema.options.indexOf(item.band)))
      const easier = unused(state, true).find((item) => item.route !== track.route && item.stage === 'mini' && item.skill === 'grammar' &&
        levelSchema.options.indexOf(item.band) < base)
      if (easier) return easier
    }
  }
  if (lowerReadingProbe(state)) {
    const hasFirstListening = state.placementTrack?.samples.some(({ itemId }) => itemId === 'en.assess.b1.l1')
    const early = candidates.find(({ id }) => id === (hasFirstListening ? 'en.assess.b1.r-foundation' : 'en.assess.b1.l1'))
    if (early) return early
  }
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
  if (!track || track.completedAt) return
  if (!state.placementAt) return nextMiniItem(state, unused(state))
  const candidates = unused(state, true)
  const day = localDay(now, timeZone)
  if (!workingDay(now, timeZone, state.profile.days) ||
    (track.origin === 'new' && (!track.finishedAt || day <= localDay(track.finishedAt, timeZone)))) return
  const used = track.samples.filter(({ at, stage }) => stage === 'followup' && localDay(at, timeZone) === day).length
  if (used >= 2 || track.samples.filter(({ stage }) => stage === 'followup').length >= MAX_FOLLOWUP_SAMPLES) return

  const allSamples = paired(state)
  const evidence = allSamples.filter(({ sample }) => independent(sample))
  const routeBase = (skill: Skill) => Math.min(...assessmentBank.filter((candidate) => candidate.route === track.route && candidate.stage === 'mini' && candidate.skill === skill)
    .map((candidate) => levelSchema.options.indexOf(candidate.band)))
  const trackSamples = (skill: Skill, band: number) => allSamples.filter(({ item, sample }) => item.skill === skill &&
    levelSchema.options.indexOf(item.band) === band && sample.timing === 'before_teaching')
  const followups = candidates.filter(({ id }) => id !== 'en.assess.b1.r-foundation' &&
    (id !== 'en.assess.b1.r1' || !lowerReadingProbe(state)))
  return followups.flatMap((item) => {
    if (item.route !== track.route) {
      const base = routeBase(item.skill)
      const bandIndex = levelSchema.options.indexOf(item.band)
      const baseEvidence = trackSamples(item.skill, base)
      const alreadySampledAtBand = allSamples.some(({ item: seen }) => seen.route === item.route && seen.skill === item.skill && seen.band === item.band)
      if (alreadySampledAtBand) return []
      if (bandIndex > base) {
        const readingPair = item.skill === 'reading' && new Set(baseEvidence.filter(({ sample }) => sample.result === 'correct').map(({ item: seen }) => seen.id)).size >= 2
        const productionPair = ['grammar', 'vocabulary'].includes(item.skill) &&
          baseEvidence.some(({ item: seen, sample }) => seen.exercise?.kind === 'single' && sample.result === 'correct') &&
          baseEvidence.some(({ item: seen, sample }) => ['short', 'fill'].includes(seen.exercise?.kind ?? '') && sample.result === 'correct')
        return readingPair || productionPair ? [{ item, priority: 0 }] : []
      }
      const weakerEvidence = baseEvidence.some(({ sample }) => sample.result === 'incorrect' || sample.status === 'unknown')
      return weakerEvidence ? [{ item, priority: 0 }] : []
    }
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
    if (allSamples.some((row) => row.item.family === item.family && row.sample.status === 'unknown')) return [{ item, priority: 3 }]
    if (allSamples.some((row) => row.item.skill === item.skill && row.item.lesson === item.lesson) &&
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

type Response = { status: PlacementResponse; answer?: Answer; audioPlayed?: boolean; transcript?: boolean; elapsedSeconds?: number }
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
  const timing: PlacementSample['timing'] = practiced || exposed ? 'after_teaching' : 'before_teaching'
  const stage: PlacementSample['stage'] = state.placementAt ? 'followup' : 'mini'
  const elapsedSeconds = response.elapsedSeconds === undefined ? undefined : z.number().int().min(0).max(3600).parse(response.elapsedSeconds)
  const updatedTrack = { ...track, samples: [...track.samples, { itemId: id, at: now, stage, status, timing, elapsedSeconds, ...scored }] }
  const next: LearningState = { ...state, placementTrack: updatedTrack }
  const activeSeconds = updatedTrack.samples.reduce((total, sample) => total + (sample.elapsedSeconds ?? 0), 0)
  if (activeSeconds >= PLACEMENT_ACTIVE_BUDGET_SECONDS) {
    const atEnd = stage === 'mini' ? finishMiniPlacement(next, now) : next
    return finishPlacementTrack(atEnd, now)
  }
  if (stage === 'mini' && !nextMiniItem(next)) return finishMiniPlacement(next, now)
  if (stage === 'followup' && (updatedTrack.samples.filter(({ stage: itemStage }) => itemStage === 'followup').length >= MAX_FOLLOWUP_SAMPLES ||
    !upcomingPlacement(next, now, timeZone))) return finishPlacementTrack(next, now)
  return next
}

export function finishPlacementTrack(state: LearningState, now: string): LearningState {
  const track = state.placementTrack
  if (!track || track.completedAt) return state
  return { ...state, placementTrack: { ...track, completedAt: now } }
}

export function placementEntry(state: LearningState) {
  if (!state.placementAt) return
  const isCompleted = (track: NonNullable<LearningState['placementTrack']>) => Boolean(track.completedAt || (track.origin === 'new' && track.finishedAt))
  const hasIndependentEvidence = (track: NonNullable<LearningState['placementTrack']>) => track.samples.some(independent)
  const usable = (track: NonNullable<LearningState['placementTrack']>) => track.origin === 'new' ? track.samples.length > 0 : hasIndependentEvidence(track)
  const routeTrack = state.placementTrack && isCompleted(state.placementTrack) && usable(state.placementTrack)
    ? state.placementTrack
    : [...(state.placementHistory ?? [])].reverse().find((track) => isCompleted(track) && usable(track))
  if (!routeTrack) return
  const rows = paired({ ...state, placementTrack: routeTrack }).filter(({ sample }) =>
    routeTrack.origin === 'new' ? sample.stage === 'mini' || sample.stage === 'followup' : sample.stage === 'followup')
  const correct = (id: string) => rows.some(({ item, sample }) => item.id === id && independent(sample) && sample.result === 'correct')
  const weak = (skill: Skill) => rows.some(({ item, sample }) => item.skill === skill &&
    (sample.result === 'incorrect' || sample.status === 'unknown'))
  const skillReady = (skill: Skill) => {
    const evidence = rows.filter(({ item, sample }) => item.skill === skill && independent(sample))
    if (skill === 'reading') return new Set(evidence.filter(({ sample }) => sample.result === 'correct').map(({ item }) => item.id)).size >= 2
    const recognition = evidence.some(({ item, sample }) => item.exercise?.kind === 'single' && sample.result === 'correct')
    const production = evidence.some(({ item, sample }) => ['short', 'fill'].includes(item.exercise?.kind ?? '') && sample.result === 'correct')
    return recognition && production
  }
  const coreReady = skillReady('reading') && skillReady('grammar') && skillReady('vocabulary')
  const harderSkills = new Set(rows.filter(({ item, sample }) => item.route !== routeTrack.route && independent(sample) && sample.result === 'correct')
    .map(({ item }) => item.skill))
  const harderCoreReady = ['grammar', 'vocabulary', 'reading'].filter((skill) => harderSkills.has(skill as Skill)).length >= 2
  const starterReason = 'Bağımsız örnekler henüz tanışma rotasını değiştirecek kadar uyuşmuyor. Temel derslerle başla.'
  switch (routeTrack.route) {
    case 'ru-start':
      return coreReady || correct('ru.assess.a1.r1') ? { id: 'ru.intro', reason: 'Kiril tabelasını ve kısa cümle yapılarını örneklerle gösterdin. Tanışmayı rehberli çalış.' }
        : { id: 'ru.cyrillic', reason: 'Kiril okuması henüz doğrulanmadı. Tanışmadan önce kısa harf ve ses çalışmasıyla başla.' }
    case 'ru-a2':
      return weak('grammar') || weak('vocabulary') || weak('reading')
        ? { id: 'ru.cyrillic', reason: 'Bağımsız Kiril ve dil örnekleri uyuşmuyor. Kısa temel çalışmayla başla.' }
        : { id: 'ru.intro', reason: 'Kısa metin ve cümle görevleri başlangıç rotasına giriş için tutarlı.' }
    case 'es-start': return coreReady && harderCoreReady
      ? { id: 'es.perfect', reason: 'Tanıma, hatırlama ve iki okuma örneği aynı başlangıç bandında tutarlı. Bugüne bağlı geçmiş dersine geç.' }
      : { id: 'es.saludos', reason: starterReason }
    case 'es-medium': return weak('grammar') || weak('vocabulary') || weak('reading')
      ? { id: 'es.saludos', reason: 'Örnekler geçmiş zaman veya okuma desteği gerektiğini gösterdi. Selamlaşma ve temel yapıdan başla.' }
      : { id: 'es.perfect', reason: 'İspanyolca geçmiş zaman örneklerine göre bugüne bağlı geçmiş dersinden başla.' }
    case 'en-start': return coreReady && harderCoreReady
      ? { id: 'en.experience', reason: 'Tanıma, hatırlama ve iki okuma örneği aynı başlangıç bandında tutarlı. Deneyim anlatımına geç.' }
      : { id: 'en.identity', reason: starterReason }
    case 'en-advanced':
      return correct('en.assess.adv.r1') && correct('en.assess.adv.g1')
        ? { id: ['B2', 'B2+'].includes(routeTrack.targetAtStart) ? 'en.uncertainty' : 'en.evidence', guidedEntry: true, reason: 'Kaynak sınırını ve belirsizliği ayırdın. İleri bir kaynak dersine rehberli giriş yap; ön koşullar tamamlanmış sayılmaz.' }
        : { id: 'en.experience', reason: 'İleri kaynak ve kip kanıtı henüz uyuşmuyor. Deneyimi zamanıyla anlatan rehberli bir dersten başla.' }
    default:
      return { id: weak('grammar') || weak('vocabulary') || weak('reading') ? 'en.identity' : 'en.experience', reason: weak('grammar') || weak('vocabulary') || weak('reading')
        ? 'Zaman ayrımı, iş kalıpları veya okuma örneklerinde destek gerekiyor. Temel derslerden başla; dinlemeyi ayrı örneklerle izle.'
        : 'Deneyim anlatımına kısa rehberli giriş. İlk örnekler yazı ve konuşmayı henüz doğrulamıyor.' }
  }
}

export type ProfileEvidenceUpdate = {
  id: string
  at: string
  skill: Skill
  label: string
  outcome: string
  observation: string
  source: string
}

export function placementProfileEvidence(state: LearningState): {
  proposal: CEFRLevel | null
  profiles: { skill: Skill; band: CEFRLevel | null; confidence: 'low' | 'medium' | null; asOf: string | null; evidenceIds: string[] }[]
  evidenceIds: string[]
  updates: ProfileEvidenceUpdate[]
} {
  const runs = [...(state.placementHistory ?? []), ...(state.placementTrack ? [state.placementTrack] : [])]
  const complete = (run: NonNullable<LearningState['placementTrack']>) => Boolean(run.completedAt || (run.origin === 'new' && run.finishedAt))
  const latestRun = runs.filter((run) => complete(run) && run.samples.some(independent)).at(-1)
  const allSamples = runs.flatMap((run) => run.samples.flatMap((sample) => {
    const item = items.get(sample.itemId)
    if (!item?.exercise) return []
    return [{ run, sample, item, id: `${run.startedAt}:${sample.itemId}` }]
  }))
  const latestSamples = latestRun ? allSamples.filter(({ run, sample }) => run.startedAt === latestRun.startedAt && independent(sample)) : []
  const profiles = skillSchema.options.map((skill) => {
    const qualified = levelSchema.options.flatMap((band) => {
      const rows = latestSamples.filter(({ item }) => item.skill === skill && item.band === band)
      if (!rows.length || rows.some(({ sample }) => sample.result !== 'correct')) return []
      const enough = skill === 'reading'
        ? new Set(rows.map(({ item }) => item.id)).size >= 2
        : ['grammar', 'vocabulary'].includes(skill) &&
          rows.some(({ item }) => item.exercise?.kind === 'single') &&
          rows.some(({ item }) => ['short', 'fill'].includes(item.exercise?.kind ?? ''))
      return enough ? [{ band, rows }] : []
    })
    const best = qualified.at(-1)
    const evidence = best?.rows ?? []
    return { skill, band: best?.band ?? null, confidence: best ? evidence.length >= 3 ? 'medium' as const : 'low' as const : null,
      asOf: evidence.map(({ sample }) => sample.at).sort().at(-1) ?? null,
      evidenceIds: evidence.map(({ id }) => id) }
  })
  const core = profiles.filter(({ skill }) => ['reading', 'grammar', 'vocabulary'].includes(skill))
  const proposal = core.every(({ band }) => band !== null)
    ? core.map(({ band }) => levelSchema.options.indexOf(band!)).sort((a, b) => a - b).map((index) => levelSchema.options[index])[0]
    : null
  const evidenceIds = proposal ? core.flatMap(({ evidenceIds: ids }) => ids) : []
  const updates: ProfileEvidenceUpdate[] = allSamples.map(({ item, sample, id }) => ({
    id, at: sample.at, skill: item.skill, label: item.focus, outcome: sample.result ?? sample.status,
    observation: item.exercise?.kind === 'single' ? 'recognition' : item.exercise?.kind === 'open' ? 'free_production' : 'controlled_production',
    source: sample.mode === 'transcript' ? 'transcript_assisted' : sample.mode === 'audio' ? 'audio_sample' :
      sample.mode === 'text' ? 'independent_adaptive_sample' : sample.status === 'practiced' ? 'unscored_practice' : 'no_answer',
  }))
  for (const attempt of state.attempts.filter(({ context }) => context === 'transfer' || context === 'delayed')) {
    if (attempt.study?.supports.some((support) => support !== 'instruction' && support !== 'wordInstruction')) continue
    updates.push({ id: attempt.id, at: attempt.at, skill: attempt.evidence.skill, label: attempt.conceptId,
      outcome: attempt.evidence.outcome, observation: attempt.evidence.observation,
      source: attempt.study ? 'independent_daily_transfer' : 'support_source_unknown' })
  }
  return { proposal, profiles, evidenceIds, updates: updates.sort((a, b) => a.at.localeCompare(b.at)) }
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
    (track.origin === 'existing' && (!state.placementAt || (track.finishedAt && track.finishedAt < track.startedAt))) ||
    (track.completedAt && track.completedAt < track.startedAt)) return false
  const activeSeconds = track.samples.reduce((total, sample) => total + (sample.elapsedSeconds ?? 0), 0)
  if (activeSeconds >= PLACEMENT_ACTIVE_BUDGET_SECONDS && !track.completedAt) return false
  return track.samples.every((sample) => {
    const item = items.get(sample.itemId)
    const routeAllowed = item && placementRouteAllowed(track, item, state.profile.language)
    if (!routeAllowed || !item) return false
    return sample.at >= track.startedAt &&
      (sample.stage !== 'mini' || (track.origin === 'new' && item.stage === 'mini' && (!track.finishedAt || sample.at <= track.finishedAt))) &&
      (sample.stage !== 'followup' || Boolean(state.placementAt && sample.at >= state.placementAt)) &&
      (!track.completedAt || sample.at <= track.completedAt) &&
      (sample.status !== 'unavailable' || Boolean(item.transcript)) &&
      (sample.status !== 'practiced' || item.skill === 'speaking') &&
      (sample.status !== 'answered' || Boolean(item.exercise && sample.answer &&
        validAnswer(item.exercise, sample.answer) &&
        (item.transcript ? sample.mode === 'audio' || sample.mode === 'transcript' : sample.mode === 'text') &&
        assess(item.exercise, sample.answer, state.profile.language).outcome === sample.result))
  })
}
