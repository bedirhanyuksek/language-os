import type { Course } from '../schema'
import type { LearningState } from '../../domain/state'
import { dayMs } from '../../domain/review'
import { speakingSuccesses } from '../../domain/speaking'
import { outcomesFor } from './inventory'
import { packedLessons } from './packs'
import { vocabularyIndex } from '../vocabulary'

type Strand = [area: string, taughtBy?: string[], encounteredIn?: string[]]

const grammar: Record<Course['language'], Strand[][]> = {
  es: [
    [['selam ve me llamo/te llamas', ['es.saludos']], ['ser ve estar', ['es.ser-estar']],
      ['sayı, cuesta/cuestan', ['es.numeros']], ['mi/mis ve tener ile yaş', ['es.familia']],
      ['düzenli presente ve no', ['es.rutina']], ['sipariş, con/sin', ['es.cafe']]],
    [['dónde, konum, del ve yön emirleri', ['es.direcciones']], ['gustar ve kişi zamirleri', ['es.gustos']],
      ['haber ve düzenli/düzensiz participio', ['es.perfect']]],
    [], [], [], [],
  ],
  en: [
    [['be, kişi ve temel soru',['en.identity']],['saat, at ve does ile soru',['en.station']],['kibar istek',['en.cafe']],['artikeller ve çoğul'],['sahiplik ve işaret zamirleri'],['there is/are ve konum',['en.home']],['can ve temel olumsuzluk']],
    [['present simple / continuous',['en.routine']],['past simple ve kibar could',['en.rebook']],['for/since ve başlangıç',['en.symptoms']],['need to ve zaman edatı',['en.appointment']],['emir ve yön edatları',['en.detour']],['davet ve kibar rica',['en.invite','en.host']],['karşılaştırma'],['sayılabilirlik ve miktar'],['going to / plan gelecek',[],['en.update']],['fiil + -ing / to dizileri']],
    [['present perfect / geçmiş ayrımı',['en.experience']],['past perfect ve olay sırası',['en.sequence']],['arka plan past continuous',['en.incident']],['gömülü soru ve son tarih',['en.clarify']],['geçmiş bakışla would',['en.story']],['gerekçe ve öneri',['en.opinion']],['ilgi tümceleri'],['edilgen giriş'],['olasılık ve zorunluluk'],['söylemde dolaylı anlatım',[],['en.report']]],
    [['varsayımsal koşul',['en.tradeoff','en.conditional']],['geçmiş çıkarım ve modal perfect',['en.uncertainty']],['aktarılan söz',['en.report']],['iddia atfı ve varsayımsal taviz',['en.media']],['karmaşık edilgen ve causative'],['ilgi/participle clauses'],['karışık koşul ve tutarlı gönderim']],
    [['ölçülü çıkarım ve taviz',['en.synthesis','en.rebuttal']],['koşullu yeniden anlatım',['en.brief']],['söylemde yöntem sınırı',['en.evidence']],['what-cleft',['en.seminar']],['inversion'],['nominalisation ve bilgi yapısı'],['söylemde elipsis ve gönderim'],['akademik atıf, karşı sav ve kiplik']],
    [['derecelendirme ve örtük konum',['en.implication']],['koşul ve karar kapsamını yeniden kurma',['en.mediation']],['üslup değiştiren dizim ve yoğunluk'],['ince kesinlik ve değerlendirme kipliği'],['eliptik gündelik anlatı'],['yaratıcı üslup ve ritim']],
  ],
  ru: [
    [['кириллица, ses ve yazı',['ru.cyrillic']],['kişi, yalın ve hitap',['ru.intro','ru.roles']],['yer ve bulunma hâli',['ru.city','ru.home']],['iyelik ve у меня есть',['ru.family']],['sipariş ve soru',['ru.order']],['cinsiyet ve sıfat uyumu'],['çoğul ve temel sayı çekimi'],['temel olumsuzluk, nesne hâli']],
    [['tamlayan ve yön emirleri',['ru.directions']],['ölçü ve tamlayan',['ru.quantity']],['geçmişte cinsiyet ve sayı',['ru.weekend']],['buluşma ve gelecek planı',['ru.meeting']],['k + yönelme ve karşılaştırma',['ru.housing']],['araç hâli'],['karmaşık sayı ve saat']],
    [['hareket çifti ve önek',['ru.routes','ru.aspect']],['görünüş ve süreç/sonuç',['ru.progress']],['если ve чтобы',['ru.service']],['gerekçe ve örnek bağları',['ru.opinion']],['ilgi tümceleri'],['sıfat/fiil hâl yönetimi'],['yön, araç ve görünüşün birlikte kullanımı']],
    [['kısa edilgen ve durum',['ru.handover']],['resmî talep ve neden',['ru.complaint']],['ortaç ve ulaç'],['koşul ve ödünleme',['ru.debate']],['karşılaştırma çeşitleri'],['söylemde bilgi odağı ve bağdaşıklık'],['görünüşün kip ve olumsuzlukla ilişkisi']],
    [['kaynağa atıf ve karşıtlık',['ru.synthesis']],['resmî koşul ve sadeleştirme',['ru.register']],['algı sahibi için yönelme ve будто',['ru.fiction']],['söz dizimiyle odak'],['parçacık, kiplik ve ihtiyat'],['nominalisation ve edilgen üslup'],['akademik bağlama ve alıntı']],
    [['olumsuz çıkarım ve ima',['ru.implication']],['не столько … сколько ve çıkarım ağırlığı',['ru.recast']],['üsluplar arası sezdirim ve kelime dizimi'],['kayıt düzeyi ve parçacık nüansı'],['edebî ve bölgesel sözdizimi'],['ritim, kesinti ve pragmatik odak']],
  ],
}

export const vocabularyDomains: Record<Course['language'], string[][]> = {
  es: [
    ['selam ve kimlik', 'aile ve yaş', 'sayı ve fiyat', 'günlük rutin', 'içecek ve sipariş'],
    ['yerler ve yön', 'beğeni ve etkinlik', 'zaman', 'tamamlanan iş', 'henüz yapılmayan iş'],
    [], [], [], [],
  ],
  en: [
    ['kimlik ve yakınlar','ev ve eşyalar','gündelik eylem','sayı, fiyat ve ürün','mekân, saat ve ulaşım','duygu ve beğeni'],
    ['sağlık ve randevu','konut ve masraf','hizmet ve alışveriş','davet ve ilişki','eğitim ve etkinlik','rota ve seyahat'],
    ['kişisel öykü ve duygu','öğrenme ve geri bildirim','iş ve aksaklık','kültür ve ziyaret','haber ve topluluk','sosyal stratejiler'],
    ['kamusal konu ve medya','ikna ve karşı sav','yöntem ve kanıt','meslek ve rapor','kültürlerarası etkileşim','deyim ve eşdizim'],
    ['akademik ölçüm ve belirsizlik','kurum ve kitle','uzmanlık türleri','edebî değerlendirme','müzakere ve tutum'],
    ['edebî ses ve çağrışım','bölgesel ifadeler','çok alanlı uzmanlık','nüans ve pragmatik deyimler','hassas ilişki ve aracılık'],
  ],
  ru: [
    ['ad ve aile','ev ve nesne','sayı, zaman ve para','meslek ve şehir','yiyecek ve sipariş','tercih ve duygu'],
    ['ölçü ve alışveriş','sağlık','konut ve çevre','yön ve yer','geçmiş ve aile','kurs ve davet'],
    ['hareket ve ulaşım','süreç ve sonuç','ilişki ve duygu','medya ve haber','kültürel deneyim','topluluk ve öneri'],
    ['kanıt ve rapor','kurum ve resmî ilişki','tartışma ve ikna','medya ve toplumsal sorun','uzmanlık ve eğitim'],
    ['kaynak ve yöntem','akademik ve kamusal türler','kayıt düzeyi ve söylem','kurmaca ve yorum','kültürlerarası müzakere'],
    ['ince üslup ve çağrışım','uzmanlık alanı ve jargon','ironi ve bölgesel söyleyiş','edebî biçimler','hassas aracılık'],
  ],
}

export function languageAudit(course: Course) {
  return outcomesFor(course).map(({ band, outcomes }, index) => {
    const lessons = outcomes.flatMap(({ activeLesson }) => activeLesson ? [activeLesson] : [])
    const lessonIds = new Set(lessons.map(({ id }) => id))
    const packedStrands: Strand[] = packedLessons.filter(({ entry }) => lessonIds.has(entry.id))
      .flatMap(({ entry }) => entry.grammarStrands.map((area): Strand => [area, [entry.id]]))
    return {
      band,
      grammar: [...grammar[course.language][index], ...packedStrands].map(([area, taughtBy = [], encounteredIn = []]) => ({
        area, status: taughtBy.length ? 'taught' : encounteredIn.length ? 'encountered' : 'open', taughtBy, encounteredIn,
      })),
      vocabulary: {
        targetDomains: vocabularyDomains[course.language][index],
        activePractice: lessons.flatMap(({ id, vocabulary }) => vocabulary.map(({ term }) => ({ lesson: id, term }))),
        recognition: lessons.flatMap(({ id, teaching }) => teaching?.receptive?.map(({ term }) => ({ lesson: id, term })) ?? []),
      },
    }
  })
}

// A free response is an opportunity or a submission; externally reported unaided
// use and delayed deterministic recall are kept separate from it.
export function vocabularyEvidence(course: Course, state: LearningState) {
  const reportedUse = new Set(state.speakingAssessments.flatMap(({ report }) => speakingSuccesses(report))
    .flatMap(({ target }) => target.kind === 'card' ? [target.id] : []))
  const attemptsByCard = new Map<string, LearningState['attempts']>()
  for (const attempt of state.attempts) {
    if (attempt.context !== 'vocabulary') continue
    const items = attemptsByCard.get(attempt.conceptId)
    if (items) items.push(attempt)
    else attemptsByCard.set(attempt.conceptId, [attempt])
  }
  const histories = new Map<string, LearningState['reviewHistory']>()
  for (const review of state.reviewHistory) {
    if (review.mode !== 'typed') continue
    const items = histories.get(review.cardId)
    if (items) items.push(review)
    else histories.set(review.cardId, [review])
  }
  const schedules = new Map(state.reviews.map((card) => [card.cardId, card]))
  return [...vocabularyIndex(course).values()].map(({ card: { id, term }, senseId }) => {
    const attempts = attemptsByCard.get(id) ?? []
    const schedule = schedules.get(id)
    const typedReviews = histories.get(id) ?? []
    return {
      cardId: id,
      senseId,
      term,
      encountered: attempts.length > 0 || Boolean(schedule),
      recognized: attempts.some(({ evidence }) => evidence.observation === 'recognition' && evidence.outcome === 'correct'),
      recalled: attempts.some(({ evidence }) => evidence.observation === 'controlled_production' && evidence.outcome === 'correct'),
      productionSubmitted: attempts.some(({ evidence }) => evidence.observation === 'free_production'),
      independentUseReported: reportedUse.has(id),
      failedTypedRecalls: typedReviews.filter(({ result }) => result === 'again').length,
      delayedRecall: Boolean(schedule && typedReviews.some(({ at, result }) =>
        result === 'remembered' && Date.parse(at) - Date.parse(schedule.introducedAt) >= dayMs)),
    }
  })
}
