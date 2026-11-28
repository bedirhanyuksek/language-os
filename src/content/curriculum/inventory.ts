import type { Language } from '../../domain/model'
import type { Course } from '../schema'
import { packedLessons } from './packs'

type Band = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
type Outcome = [id: string, task: string, prerequisite: string, lesson?: string]

// The denominator is the authored planning inventory, not a count of CEFR descriptors.
const inventory: Record<Language, Record<Band, Outcome[]>> = {
  es: {
    A1: [
      ['saludos', 'Selam ver, kendini tanıt ve ad sor', '', 'es.saludos'],
      ['ser-estar', 'Kimlik, durum ve konumu ayır', 'saludos', 'es.ser-estar'],
      ['numeros', 'Sayı ve fiyat sor ve söyle', 'ser-estar', 'es.numeros'],
      ['familia', 'Aileni iyelik ve yaşla tanıt', 'numeros', 'es.familia'],
      ['rutina', 'Düzenli şimdiki zamanla rutin anlat', 'familia', 'es.rutina'],
      ['cafe', 'Kafede kibarca sipariş ver', 'rutina', 'es.cafe'],
    ],
    A2: [
      ['direcciones', 'Konum sor ve basit yol tarifi ver', 'cafe', 'es.direcciones'],
      ['gustos', 'Gustar ile beğenini söyle ve sor', 'direcciones', 'es.gustos'],
      ['perfect', 'Bugüne bağlı geçmiş işleri perfecto ile anlat', 'gustos', 'es.perfect'],
    ],
    B1: [], B2: [], C1: [], C2: [],
  },
  en: {
    A1: [
      ['identity', 'Tanış, ad ve şehir sor', '', 'en.identity'], ['cafe', 'Menüden sipariş ver ve fiyat sor', 'identity', 'en.cafe'],
      ['station', 'Saat ve peronu doğrula', 'cafe', 'en.station'], ['home', 'Evini ve eşyaların yerini tarif et', 'identity', 'en.home'],
      ['routine', 'Rutinini saat ve sıklıkla anlat', 'station'], ['family', 'Aileyi iyelik, yaş ve sayıyla tanıt', 'identity'],
      ['shopping', 'Beden, renk ve miktar iste', 'cafe'], ['repair', 'Yavaşlatma, tekrar ve heceleme iste', 'identity'],
    ],
    A2: [
      ['change', 'Gecikme nedeniyle rezervasyon değiştir', 'station', 'en.rebook'], ['detour', 'Kapanan yol için alternatif tarif ver', 'change', 'en.detour'],
      ['temporary', 'Alışkanlıkla geçici durumu ayır', 'identity', 'en.routine'], ['health', 'Belirti ve başlangıç zamanı bildir', 'station', 'en.symptoms'],
      ['appointment', 'Randevu seç, koşulları doğrula', 'health', 'en.appointment'], ['housing', 'Ev ilanlarını ve masrafları karşılaştır', 'home'],
      ['past', 'Geçmiş bir günü düzensiz fiillerle anlat', 'change'], ['social', 'Davet, kabul, ret ve alternatif plan', 'station', 'en.invite'],
      ['instructions', 'Kısa talimatı takip et ve yeniden aktar', 'detour'],
    ],
    B1: [
      ['experience', 'Deneyimi zaman ayrıntısıyla anlat', 'past', 'en.experience'], ['sequence', 'Önceki ve sonraki olayları sırala', 'experience', 'en.sequence'],
      ['update', 'İş güncellemesi ve takip adımı ver', 'sequence', 'en.update'], ['opinion', 'Önerini gerekçelendir', 'update', 'en.opinion'],
      ['incident', 'Aksaklığı arka plan ve sonuçla anlat', 'update', 'en.incident'], ['clarify', 'Belirsiz talimatı soruyla netleştir', 'opinion', 'en.clarify'],
      ['story', 'İş dışı bağlantılı anlatıyı yeniden kur', 'incident', 'en.story'], ['news', 'Bir haberin ana hatlarını aktar', 'sequence'],
      ['interaction', 'Tanıdık konuda konuşma sırasını ve takibi sürdür', 'clarify'],
    ],
    B2: [
      ['tradeoff', 'Seçenekleri koşul ve sakıncayla tart', 'opinion', 'en.tradeoff'], ['conditional', 'Koşullu öneri ve vazgeçme ölçütü ver', 'tradeoff', 'en.conditional'],
      ['report', 'Tanık anlatısını kayıtla karşılaştır', 'incident', 'en.report'], ['uncertainty', 'Çelişen açıklamaları kesinlik derecesiyle tart', 'clarify', 'en.uncertainty'],
      ['newsviews', 'Uzun görüş yazılarında iddia ve olguyu ayır', 'news'], ['negotiation', 'Çok taraflı müzakereyi sürdür', 'tradeoff'],
      ['genres', 'Resmî yazı ve değerlendirme metni üret', 'report'], ['accents', 'Doğal konuşmada tutumu ve söz sırasını izle', 'interaction'],
    ],
    C1: [
      ['synthesis', 'İki kaynaktan ölçülü sonuç çıkar', 'conditional', 'en.synthesis'], ['rebuttal', 'Karşı savı kabul et ve iddianı sınırla', 'synthesis', 'en.rebuttal'],
      ['brief', 'Kararı farklı kitlelere uyarlayarak aktar', 'rebuttal', 'en.brief'], ['evidence', 'Yöntem ve belirsizliği karşılaştırarak karar notu yaz', 'uncertainty', 'en.evidence'],
      ['lecture', 'Uzun sunumda ima, geçiş ve yaklaşımı izle', 'accents'], ['register', 'Tür ve muhataba göre üslubu sürekli değiştir', 'brief'],
      ['academic', 'Birden çok uzun metinden kaynaklı sav kur', 'evidence', 'en.seminar'], ['fluency', 'Hazırlıksız, hassas müzakerede karşılık ver', 'negotiation'],
    ],
    C2: [
      ['implication', 'Örtük eleştiriyi arabuluculuk notuna dönüştür', 'brief', 'en.implication'], ['specialist', 'Uzmanlık alanları arasında sözlü aracılık yap', 'academic', 'en.mediation'],
      ['humour', 'Mizah, gönderme ve aksanla değişen imayı çöz', 'lecture'], ['literary', 'Edebî üslup ve anlatıcı tutumunu yorumla', 'register'],
      ['nuance', 'Karmaşık anlaşmazlığı ince anlam ayrımıyla yönet', 'fluency'], ['reformulate', 'Uzun kaynak dosyasını farklı türlere dönüştür', 'evidence'],
    ],
  },
  ru: {
    A1: [
      ['script', 'Kiril harf ve seslerini eşleştir', '', 'ru.cyrillic'], ['intro', 'Kibarca tanış ve ad sor', 'script', 'ru.intro'],
      ['roles', 'Kişiyi mesleğiyle tanıt', 'intro', 'ru.roles'], ['city', 'Yaşanan şehri sor ve söyle', 'roles', 'ru.city'],
      ['order', 'Kafede sipariş ver ve fiyatı sor', 'city', 'ru.order'], ['family', 'Aileyi iyelik ve sahiplikle tanıt', 'roles', 'ru.family'],
      ['numbers', 'Sayı, saat, ücret ve iletişim numarası ver', 'intro'], ['home', 'Ev ve eşyaların konumunu tarif et', 'city', 'ru.home'],
      ['repair', 'Tekrar, yavaşlatma ve yazım iste', 'intro'],
    ],
    A2: [
      ['meeting', 'Buluşma gününü ve saatini değiştir', 'order', 'ru.meeting'], ['directions', 'Yön ve konumu ayırarak yol tarif et', 'city', 'ru.directions'],
      ['past', 'Geçmişteki işi kişi, cinsiyet ve zamanla anlat', 'family', 'ru.weekend'], ['quantity', 'Miktar ve ölçüyle alışveriş yap', 'order', 'ru.quantity'],
      ['doctor', 'Belirti, süre ve randevu bilgisi bildir', 'meeting'], ['housing', 'Konut, ulaşım ve masrafları karşılaştır', 'directions', 'ru.housing'],
      ['instructions', 'Günlük talimatı okuyup başka birine aktar', 'directions'], ['future', 'Gelecek planını ve süreyi anlat', 'meeting'],
    ],
    B1: [
      ['service', 'Aksaklığı bildir ve koşullu çözüm iste', 'meeting', 'ru.service'], ['routes', 'Tek yön ve düzenli hareketi ayır', 'directions', 'ru.routes'],
      ['aspect', 'Yolculukta süreç, sonuç ve hareket önekini ayır', 'routes', 'ru.aspect'], ['aspect-work', 'Açık iş ile bitmiş işi görünüşle ayır', 'past', 'ru.progress'],
      ['account', 'Bağlantılı olay anlat ve sorulara yanıt ver', 'past'], ['opinion', 'Görüşünü gerekçe ve örnekle savun', 'service', 'ru.opinion'],
      ['news', 'Günlük haberden ana olay ve sonucu çıkar', 'account'], ['relative', 'Kişi ve nesneyi ilgi tümcesiyle betimle', 'aspect-work'],
    ],
    B2: [
      ['complaint', 'Gerekçeli resmî talep ve çözüm öner', 'service', 'ru.complaint'], ['handover', 'Açık ve bitmiş işleri kanıtla devret', 'aspect-work', 'ru.handover'],
      ['debate', 'Uzun karşılıklı tartışmada görüş savun', 'opinion', 'ru.debate'], ['reports', 'Birden çok raporun kanıt ve varsayımını ayır', 'news'],
      ['written', 'Resmî yazı, rapor ve görüş yazısı arasında geçiş yap', 'complaint'], ['participle', 'Uzun metinde ortaç ve sıkıştırılmış yan tümceyi aç', 'relative'],
      ['natural', 'Doğal hızda birden çok konuşmacıyı izle', 'account'],
    ],
    C1: [
      ['synthesis', 'Rapor ve görüşmelerden sınırlı öneri çıkar', 'complaint', 'ru.synthesis'], ['register', 'Kurumsal kararı farklı kitlelere uyarla', 'synthesis', 'ru.register'],
      ['specialist', 'Mesleki kaynakları ve örtük varsayımları değerlendir', 'reports'], ['negotiation', 'Kayıt düzeyini değiştirerek müzakere et', 'debate'],
      ['lecture', 'Uzun sunumda gönderim ve örtük tutumu izle', 'natural'], ['genres', 'Akademik ve kamusal türlerde kaynaklı sentez yaz', 'written'],
    ],
    C2: [
      ['implication', 'Örtük itirazı tarafsız tutanağa geçir', 'register', 'ru.implication'], ['literary', 'Edebî ses, ironi ve çağrışımı çöz', 'genres'],
      ['accent', 'Hızlı ve aksanı değişen uzman tartışmasını izle', 'lecture'], ['mediation', 'Uzmanlık alanları arasında esnek aracılık yap', 'specialist'],
      ['nuance', 'Beklenmedik itirazı nüansla ve akıcı biçimde çöz', 'negotiation'], ['reformulate', 'Çok kaynaklı savı farklı kitlelere yeniden kur', 'genres'],
    ],
  },
}

// Additive, separately counted audit targets. Existing outcome identifiers remain stable.
const auditTargets: typeof inventory = {
  es: {
    A1: [
      ['repetir', 'Adı tekrarlat ve yazımını kontrol et', 'saludos'],
      ['ficha-contacto', 'Kayıt formuna iletişim bilgisi yaz ve eksik alanı sor', 'numeros'],
      ['recado-telefono', 'Kısa telefon notunda arayanı, alıcıyı ve arama nedenini ayır', 'repetir'],
      ['horario-diario', 'Dönüşlü fiillerle kendi ve başka birinin hazırlık rutinini anlat', 'rutina'],
      ['horario-servicio', 'Açılış, kapanış ve hizmet aralığını öğren ve teyit et', 'numeros'],
      ['turno-mostrador', 'Boş sıra olup olmadığını sor ve doğru hizmet masasını bul', 'horario-servicio'],
    ],
    A2: [['cambiar-plan', 'Bir davete yanıt ver ve yeni zamanı teyit et', 'perfect'],
      ['pasado-cerrado', 'Bitmiş bir günde tamamlanan ve kalan işleri bildir', 'cambiar-plan'],
      ['visita-pasada', 'Bitmiş bir ziyareti ir ve ser ile anlat', 'pasado-cerrado'],
      ['gestion-pasada', 'Geçmiş bir işlemde yaşanan sorunu ve yapılanı aktar', 'visita-pasada'],
      ['orden-incidente', 'Saatli olay kaydını sırala ve geçen süreyi bildir', 'pasado-cerrado'],
      ['retraso-servicio', 'Gecikmenin nedenini, sonucunu ve istenen adımı bildir', 'orden-incidente'],
      ['cita-servicio', 'Bir amaçla randevu al ve önceki randevuyu değiştir', 'cambiar-plan']],
    B1: [
      ['connected-account', 'Bir deneyimi başlangıç, dönüm noktası ve sonuçla anlat', 'pasado-cerrado'],
      ['cambio-con-motivo', 'Beklenmedik değişikliğin nedenini ve sonucunu ayır', 'connected-account'],
      ['pregunta-seguimiento', 'Eksik ayrıntıya takip sorusu sor ve cevabı teyit et', 'cambio-con-motivo'],
    ],
    B2: [], C1: [], C2: [],
  },
  en: {
    A1: [
      ['feelings', 'Gündelik duyguyu veya basit tercihi söyle', 'identity'], ['forms', 'Bir kurs veya etkinlik formunda temel veriyi yaz', 'identity'],
      ['sounds', 'Sayı ve isimleri ayırt et ve anlaşılır söyle', 'station'], ['routine-message', 'Kısa telefon ve mesaj bilgisine karşılık ver', 'repair'],
    ],
    A2: [
      ['relationship', 'Teşekkür, özür ve basit anlaşmazlığa yanıt ver', 'social'], ['culture', 'Misafirlik ve yerel adet hakkında soru sor', 'social', 'en.host'],
      ['education', 'Kurs seçeneklerini ve öğrenme ihtiyaçlarını karşılaştır', 'social'], ['online', 'Çevrim içi grupta basit bir planı uzlaştır', 'social'],
    ],
    B1: [
      ['emotion', 'Bir ilişkide duygu, neden ve beklentiyi incelikle açıkla', 'story'], ['culture-visit', 'Gezide iki kültürel uygulamayı karşılaştır', 'story'],
      ['education-talk', 'Bir öğrenme deneyimini anlat ve geri bildirim iste', 'interaction'], ['creative-response', 'Öykü veya filme kişisel tepkiyi gerekçelendir', 'story'],
      ['lost-property', 'Kayıp eşyanın ayırt edici özelliğini, son görüldüğü yeri ve izleme adımını aktar', 'story'],
      ['repair-request', 'Bir ürün arızasını oluşma koşuluyla bildir ve çözüm sor', 'lost-property'],
      ['intelligibility', 'Durak, sözcük vurgusu ve netleştirmeyle konuşmayı sürdür', 'interaction'],
      ['return-process', 'İade işleminin rutin adımıyla tamamlanan adımı ayır', 'repair-request'],
      ['venue-rules', 'Bir mekânda ziyaret koşulu, izin ve yasağı açıkla', 'clarify'],
      ['access-criteria', 'İki mekânı erişim ve kullanım ölçütleriyle karşılaştır', 'interaction'],
      ['relay-request', 'Rica ve yasağı doğru muhatap ve zamanla aktar', 'update'],
      ['pending-repair', 'Süren sorunu, başlangıcını ve geçen süreyi bildir', 'repair-request'],
    ],
    B2: [
      ['persuade', 'Toplumsal konuda karşı itirazla ikna edici sav kur', 'negotiation'], ['multimedia', 'Haber, fotoğraf, tanıklık ve karşı kanıtı tart', 'story', 'en.media'],
      ['study-discussion', 'Seminerde bulgu, soru ve itirazı yönlendir', 'education-talk'], ['intercultural', 'Kültürel yanlış anlamayı iki bakışla açıkla', 'culture-visit'],
      ['panel-evidence', 'Panelde aynı dönemde değişen koşulları hesaba katarak öneri ver', 'newsviews'],
      ['consumer-terms', 'Bir hizmetin fiyat ve iptal koşullarını farklı kaynaklardan karşılaştır', 'genres'],
      ['prosody', 'Karşıt vurgu ve tonla tutumu ayırt et', 'accents'],
      ['commission-check', 'Yaptırılan işi ve henüz doğrulanmamış sonucu ayır', 'return-process'],
      ['mixed-outcome', 'Bir kararın geçmiş ve şimdiki etkilerini iki zaman yönünde değerlendir', 'tradeoff'],
      ['compact-safety-note', 'Yoğun tesisi duyurusunu farklı gruplar için uygulanabilir talimata dönüştür', 'report'],
      ['project-milestone', 'Gelecek dönüm noktasında bitmiş ve süren işi bağımlılıklarıyla aktar', 'update'],
      ['resolution-letter', 'Bir hizmet anlaşmazlığında geçmiş pişmanlığı ve kabul edilebilir çözümü bildir', 'genres'],
    ],
    C1: [
      ['floor-repair', 'Kesilen sözü ve açık kalan soruyu doğru atıfla gündeme getir', 'academic'],
      ['research-briefing', 'Araştırma sunuşunda dolaylı göstergeyi, çıkarımı ve kapsamı ayır', 'academic'],
      ['fiction', 'Uzun kurmacada anlatıcı tutumu ve bakışı çöz', 'creative-response'], ['academic-audio', 'Akademik konuşmada yöntem ve çıkarıma not al', 'lecture'],
      ['online-debate', 'Yazılı çevrim içi tartışmada görüşleri uzlaştır', 'negotiation'], ['register-speech', 'Aynı savı farklı dinleyicilere akıcıca uyarla', 'brief'],
    ],
    C2: [
      ['sensitive-mediation', 'Kültür ve uzmanlık farkı içeren hassas görüşmeyi yönet', 'specialist'], ['informal-voices', 'Bölgesel ve gündelik hızlı konuşmayı bağlamda yorumla', 'humour'],
      ['creative-style', 'Bir anlatıyı farklı edebî sesle yeniden kur', 'literary'], ['prosodic-nuance', 'Prosodiyle ironi, yakınlık ve mesafeyi ince ayarla', 'nuance'],
    ],
  },
  ru: {
    A1: [
      ['feelings', 'Ruh hâlini ve temel tercihini söyle', 'family'], ['forms', 'Ad, yaş ve iletişim bilgisiyle basit form doldur', 'numbers'],
      ['shift-note', 'Kısa vardiya çizelgesini oku ve yeni gün ile saat aralığını teyit et', 'numbers'],
      ['sound-contrast', 'Sert/yumuşak ünsüzü ve sözcük vurgusunu ayır', 'script'], ['short-message', 'Davet veya adres içeren kısa mesaja cevap ver', 'repair'],
      ['contact-check', 'Kayıttaki iki bilgiyi teyit et ve yanlış olanı düzelt', 'forms'],
      ['routine-clock', 'Düzenli bir günü ve saat istisnasını anlat', 'feelings'],
      ['product-fit', 'Renk ve beden belirterek uygun ürünü iste', 'order'],
      ['market-basket', 'Markette ölçüyle sipariş ver ve birim fiyatı toplamdan ayır', 'product-fit'],
      ['destination-check', 'Bir ziyaretçiye bulunduğun yeri ve varış hedefini bildir', 'city'],
      ['opening-hours', 'Hizmet saatlerinden molaya denk gelmeyen bir ziyaret zamanı seç', 'shift-note'],
    ],
    A2: [
      ['culture', 'Misafirlikte davet, ikram ve basit adetleri konuş', 'meeting'], ['study', 'Kurs saatini, kuralı ve gereksinimi sor', 'instructions'],
      ['relationship', 'Teşekkür et, özür dile, gündelik duyguyu açıkla', 'feelings'], ['online', 'Grup sohbetinde buluşma ayrıntısı ve alternatif öner', 'meeting'],
      ['appointment-change', 'Eski randevuyu iptal et, yeni zamanı al ve teyit et', 'meeting'],
      ['travel-options', 'Yolcuya araç, aktarma ve yürüyüş adımlarını bildir', 'directions'],
      ['with-and-by', 'Eşlik eden kişiyi ve işlem yöntemini belirt', 'travel-options'],
      ['errand-log', 'Tamamlanan işleri sırala ve kalan işi belirt', 'past'],
      ['receipt-repair', 'Fişteki kalem ve miktar hatasını düzelt', 'quantity'],
      ['pickup-handoff', 'Doğru teslim noktasını ve teslim alacak kişiyi teyit et', 'receipt-repair'],
    ],
    B1: [
      ['feelings-story', 'Kişisel hikâyede beklenti ve duygu değişimini anlat', 'account'], ['cultural-visit', 'Bir kültürel deneyimi ziyaretçiye açıkla', 'culture'],
      ['creative', 'Film veya öyküye gerekçeli kişisel tepki ver', 'account'], ['intonation', 'Soru, teyit ve vurguyla yanlış anlamayı onar', 'service'],
      ['community', 'Gündelik toplumsal öneriye iki tarafın ihtiyacıyla yanıt ver', 'opinion'],
    ],
    B2: [
      ['panel-corrections', 'Kayıt ve kişi sayımı ayrı olduğunda kamuya düzeltme yaz', 'reports'],
      ['public-media', 'Haberle yorum arasındaki farkı kaynağına bağla', 'news'], ['seminar', 'Seminerde sav, soru ve örneği birbirine bağla', 'study'],
      ['intercultural', 'Kültürel bir anlaşmazlıkta iki bakışı aktar', 'cultural-visit'], ['speech-voices', 'Farklı konuşmacıların tutumunu tonla ayırt et', 'natural'],
      ['social-persuasion', 'Toplumsal konu için itirazlı ikna konuşması yap', 'debate'],
    ],
    C1: [
      ['fiction', 'Uzun kurmacada anlatıcı bakışı ve üslubu tart', 'creative', 'ru.fiction'], ['research', 'Akademik konuşmadan yöntem ve sınırlılık notu çıkar', 'lecture'],
      ['online-debate', 'Çevrim içi grup tartışmasında görüşleri özetleyip ilerlet', 'negotiation'], ['prosody', 'Üslup ve vurguyu dinleyiciye göre değiştir', 'register'],
    ],
    C2: [
      ['polyphonic-testimony', 'Tanıklık ile editoryal yeniden anlatım arasındaki anlam değişimini göster', 'literary'],
      ['sensitive', 'Hassas kültürlerarası görüşmede esnek aracılık yap', 'mediation'], ['mixed-voices', 'Hızlı bölgesel ve gündelik konuşmayı birlikte yorumla', 'accent'],
      ['creative-style', 'Aynı içeriği farklı edebî üsluplarla işle', 'literary', 'ru.recast'], ['prosodic-nuance', 'İma ve duygusal mesafeyi sesle ayarla', 'nuance'],
    ],
  },
}

export function outcomesFor(course: Course) {
  return (Object.keys(inventory[course.language]) as Band[]).map((band) => ({
    band, baseline: inventory[course.language][band].length,
    outcomes: [...inventory[course.language][band], ...auditTargets[course.language][band]].map(([id, task, prerequisite, legacyLesson]) => {
      const key = `${band}.${id}`
      const packed = packedLessons.find((item) => item.language === course.language && item.entry.outcome === key)
      if (legacyLesson && packed) throw new Error(`Mevcut hedefin ders bağlantısı değiştirilemez: ${key}`)
      const lesson = legacyLesson ?? packed?.entry.id
      return { id: key, task, prerequisite, lesson, activeLesson: course.unit.lessons.find((item) => item.id === lesson) }
    }),
  }))
}

const wordCount = (value: string) => [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(value)]
  .filter(({ isWordLike }) => isWordLike).length

export function measureCurriculum(course: Course) {
  const distinct = (values: string[]) => new Set(values.map((value) =>
    value.normalize('NFC').toLocaleLowerCase(course.language).trim())).size
  return outcomesFor(course).map(({ band, baseline, outcomes }) => {
    const lessons = outcomes.flatMap(({ activeLesson }) => activeLesson ? [activeLesson] : [])
    const reception = ({ pedagogy }: Course['unit']['lessons'][number]) => pedagogy
      ? [pedagogy, ...(pedagogy.receptionRetry ? [pedagogy.receptionRetry] : [])] : []
    const materials = lessons.flatMap(reception)
    const listeningMaterials = lessons.filter(({ teaching }) => teaching?.audioMode !== 'script-practice').flatMap(reception)
    const activeTerms = lessons.flatMap(({ vocabulary }) => vocabulary.map(({ term }) => term))
    const receptiveTerms = lessons.flatMap(({ teaching }) => teaching?.receptive?.map(({ term }) => term) ?? [])
    const audio = listeningMaterials.map(({ listening }) => listening.audio)
    const concepts = lessons.flatMap((lesson) => lesson.concepts
      .filter(({ variants }) => variants.some(({ skill }) => skill === 'grammar'))
      .map(({ id }) => ({ id, check: lesson.pedagogy?.checks.find(({ conceptId }) => conceptId === id) })))
    const vocabulary = lessons.flatMap(({ pedagogy }) => pedagogy?.vocabulary ?? [])
    return {
      band, baseline, planned: outcomes.length, playable: lessons.length,
      open: outcomes.filter(({ activeLesson }) => !activeLesson).map(({ id, task, prerequisite }) => ({ id, task, prerequisite })),
      active: distinct(activeTerms), receptive: distinct(receptiveTerms),
      reading: materials.length, listening: listeningMaterials.length, scriptPractice: materials.length - listeningMaterials.length,
      syntheticListening: audio.filter((clip) => clip.kind === 'synthesis' || clip.synthetic === true).length,
      readingSourceLengths: materials.map(({ reading }) => wordCount(reading.text)),
      listeningSourceLengths: listeningMaterials.map(({ listening }) => wordCount(listening.transcript)),
      readingWords: Math.max(0, ...materials.map(({ reading }) => wordCount(reading.text))),
      listeningWords: Math.max(0, ...listeningMaterials.map(({ listening }) => wordCount(listening.transcript))),
      writing: lessons.length, speaking: lessons.filter(({ speaking }) => speaking).length,
      revisions: lessons.filter(({ pedagogy }) => pedagogy?.revision).length,
      practiceOpportunities: {
        grammarGuided: concepts.length,
        grammarTransfer: concepts.filter(({ check }) => check?.transfer.length).length,
        grammarDelayed: concepts.filter(({ check }) => check?.delayed.length).length,
        vocabularyControlled: vocabulary.length,
        vocabularyOpenProduction: vocabulary.filter(({ use }) => use.kind === 'open').length,
        vocabularyScheduledReview: vocabulary.length,
      },
    }
  })
}
