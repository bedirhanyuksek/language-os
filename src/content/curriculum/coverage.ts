import type { CEFRLevel, Language } from '../../domain/model'
import type { Course } from '../schema'

const bands = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
type Band = typeof bands[number]
type Strand = {
  function: string
  grammar: string
  vocabulary: string
  reading: string
  listening: string
  writing: string
  speaking: string
  pronunciation: string
  check: string
}
const goals: Record<Language, Record<Band, Strand>> = {
  es: {
    A1: { function: 'Selamlaş, kendini ve aileyi tanıt, rutin ve fiyat anlat, kafede sipariş ver, adı tekrarlat',
      grammar: 'me llamo, ser/estar, sayılar, mi/mis, tener, düzenli presente, con/sin',
      vocabulary: 'selam, kişi, aile, sayı ve fiyat, rutin, içecek', reading: 'kısa tanışma, fiyat listesi ve sipariş',
      listening: 'açık ad, fiyat ve tercih; yerel cihaz sesi gerekir', writing: 'kısa profil ve sipariş',
      speaking: 'tanış, günlük rutin ve sipariş konuş', pronunciation: 'beş ünlü, sessiz h, ñ, yazılı vurgu ve soru işaretleri',
      check: 'Yeni kişi ve fiyatlarla bağımsız görev; en az 24 saat sonra farklı bağlam' },
    A2: { function: 'Yol sor ve tarif et, beğenilerini ve bugün yapılan işleri anlat, buluşma saatini değiştir ve bitmiş günde yapılanları bildir',
      grammar: 'dónde/estar, del, yön kalıpları, gusta/gustan, haber + participio',
      vocabulary: 'yerler ve yön, beğeni ve etkinlik, hoy/ya/todavía no', reading: 'kısa yol tarifi ve kişisel not',
      listening: 'dönüş, tercih ve tamamlanan iş; yerel cihaz sesi gerekir', writing: 'yön tarifi, beğeni ve bugünkü işler',
      speaking: 'tarifi düzelt, ortak tercih seç, yapılan işi sor', pronunciation: 'dónde, música, todavía ve fiil vurgusu',
      check: 'Yeni rota ve etkinlikte aktarım; gecikmeli farklı kişi ve zaman' },
    B1: { function: 'Geçmiş bir deneyimi sırayla anlat, değişikliğin nedenini açıkla ve ayrıntıyı teyit et',
      grammar: 'indefinido, al principio/después/al final, porque/por eso, soru sözcükleri',
      vocabulary: 'görev, etkinlik değişikliği, neden ve teyit', reading: 'olay anlatısı ve kısa duyuru',
      listening: 'diyalog metni çalışması; incelenmiş ses kaydı bekliyor', writing: 'bağlantılı deneyim ve teyit mesajı',
      speaking: 'deneyim aktar, eksik ayrıntıyı sor ve cevabı teyit et', pronunciation: 'soru sözcüklerinde yazılı vurgu ve söz dizimi',
      check: 'Farklı bir olayda açıklama ve takip; sonra yeni kişi ve zamanla gecikmeli kontrol' }, B2: plannedSpanish('B2'), C1: plannedSpanish('C1'), C2: plannedSpanish('C2'),
  },
  en: {
    A1: { function: 'Tanışma, temel ihtiyaç, fiyat ve yer sorma', grammar: 'be, temel soru ve olumsuzluk, çoğul, yer edatları',
      vocabulary: 'ad, şehir, sayı, ürün ve fiyat kalıpları', reading: 'menü, tabela, kısa profil', listening: 'açık fiyat ve yön mesajı',
      writing: 'kısa profil ve sipariş notu', speaking: 'ad ve şehir söyle, fiyatı doğrula', pronunciation: '/θ/, /eɪ/, kısaltmalar',
      check: 'Yeni menü veya kişi kartı, sonraki gün farklı ad ve fiyat' },
    A2: { function: 'Hizmet, randevu ve rota değişikliği', grammar: 'past simple, going to, miktar, yer/yön edatları',
      vocabulary: 'ulaşım, randevu, rezervasyon ve günlük rutin', reading: 'duyuru ve kısa hizmet mesajı', listening: 'değişen saat ve yer',
      writing: 'plan değişikliği veya kısa geçmiş notu', speaking: 'rezervasyon değiştir, yol sor', pronunciation: 'sayı vurgusu ve geçmiş -ed',
      check: 'Yeni rezervasyon senaryosu, gecikmede farklı yer ve saat' },
    B1: { function: 'Olay anlat, iş güncelle, gerekçe ve açıklama iste', grammar: 'present/past perfect, past continuous, zaman ve neden bağları',
      vocabulary: 'görev devri, aksaklık, geri bildirim', reading: 'bağlantılı olay notu ve kısa rapor', listening: 'olay sırası, neden ve sonuç',
      writing: 'ekip güncellemesi ve olay kaydı', speaking: 'takip sorusuna bağlamla yanıt ver', pronunciation: 'ana eylem vurgusu ve durak',
      check: 'Farklı bir aksaklığı aktar, gecikmeli yeni olayda aynı yapıyı kullan' },
    B2: { function: 'Karşılaştır, koşullu karar ver, iddia ile kanıtı ayır', grammar: 'varsayım, ödünleme, koşul ve bildirilen söz',
      vocabulary: 'eşik, iş gerekçesi, kanıt ve doğrulama', reading: 'birden çok tanık, iş kaydı veya teklif', listening: 'itiraz, tavır ve eylem kararı',
      writing: 'kaynakları ayıran karar notu', speaking: 'teklif sun, koşulu ve sakıncayı açıkla', pronunciation: 'karşıt vurgu ve bilgi gruplama',
      check: 'Yeni teklifte gerekçeli karar, gecikmede farklı kaynak ve muhatap' },
    C1: { function: 'Sentezle, karşı savı ele al, kararı sınırla', grammar: 'ihtiyatlı kiplik, ödünleme, kapsam ve gönderim',
      vocabulary: 'kanıt ağırlığı, karar eşiği, kibar itiraz', reading: 'çelişen rapor ve görüşmeler', listening: 'örtük itiraz ve karar koşulu',
      writing: 'ölçülü öneri ve gerekçeli yanıt', speaking: 'yeni itiraza ölçülebilir koşulla karşılık ver', pronunciation: 'vurgu, durak ve tonla tutum',
      check: 'Yeni kaynak dosyasıyla sentez ve sonraki hafta farklı itiraz' },
    C2: { function: 'İma ve mizahı yorumla, uzmanlar ve genel kitle arasında aracılık et', grammar: 'bilgi odağı, ince kiplik, yoğun metinde gönderim',
      vocabulary: 'deyim, çağrışım, kayıt düzeyi ve alan terimleri', reading: 'uzun uzman ve edebî metinler', listening: 'hızlı ve farklı aksanlı tartışmalar',
      writing: 'aynı savı farklı kitleler için yeniden kur', speaking: 'beklenmedik itiraz ve ima ile müzakere et', pronunciation: 'prosodiyle nüans ve tutum',
      check: 'Bağımsız çok kaynaklı görev ve gecikmeli farklı türde uzman incelemesi' },
  },
  ru: {
    A1: { function: 'Tanışma, meslek, yaşanan şehir, sipariş', grammar: 'Kiril, ты/вы, yalın ve yaygın bulunma ve belirtme biçimleri',
      vocabulary: 'ad, meslek, şehir, ürün, fiyat', reading: 'tabela, kısa profil ve menü', listening: 'açık ad, yer ve fiyat',
      writing: 'kısa tanışma ve sipariş', speaking: 'adını söyle, kibarca iste', pronunciation: 'Kiril sesleri ve sözcük vurgusu',
      check: 'Farklı ad ve menüyle iletişim, gecikmede farklı şehir ve fiyat' },
    A2: { function: 'Yol sor, tarif ver, buluşmayı değiştir', grammar: 'до + tamlayan, emir, yön ve yer, zaman kalıpları',
      vocabulary: 'ulaşım, yön, saat, buluşma', reading: 'harita notu ve kısa mesaj', listening: 'dönüş, konum ve yeni saat',
      writing: 'yön tarifi ve plan değişikliği', speaking: 'iki adımlı tarifi teyit et', pronunciation: 'vurgu ve vurgusuz ünlüler',
      check: 'Yeni harita ve randevu, gecikmede farklı rota' },
    B1: { function: 'Hizmet aksaklığını çöz ve alternatif öner', grammar: 'чтобы, если, görünüş ve gelecek',
      vocabulary: 'sipariş, teslimat, çözüm ve zaman', reading: 'hizmet yazışması', listening: 'istek ve bekleme koşulu',
      writing: 'sorun, istek ve alternatif', speaking: 'görevliyle anlaşmaya var', pronunciation: 'odak vurgusu ve kibar soru tonlaması',
      check: 'Farklı hizmet bağlamı ve yeni bir bekleme koşulu' },
    B2: { function: 'Resmî talebi gerekçelendir ve müzakere et', grammar: 'из-за, tamlayan, resmî mastar kalıpları, neden ve sonuç',
      vocabulary: 'iade, fatura, son gün ve resmî yazışma', reading: 'firma yanıtı ve talep', listening: 'çözüm, koşul ve son tarih',
      writing: 'belgeli resmî talep', speaking: 'karşı öneriye yanıt ver', pronunciation: 'hâl sonları ve anlam grupları',
      check: 'Yeni fatura ve iade senaryosu, gecikmede farklı muhatap' },
    C1: { function: 'Rapor ve görüşmelerden ölçülü sonuç çıkar', grammar: 'судя по + yönelme, хотя ve karşıtlık, kiplik',
      vocabulary: 'geçici çıkarım, örneklem, karşı kanıt', reading: 'kurul raporu ve görüşme bulguları', listening: 'eksik temsil ve öneri',
      writing: 'iki kaynağı kullanan kurul önerisi', speaking: 'soruya dayanak ve belirsizlikle yanıt ver', pronunciation: 'karşıt bulguların ton ve durakları',
      check: 'Yeni rapor ve görüşme, gecikmede ölçütü farklı bağlamda savun' },
    C2: { function: 'Örtük tutumu yorumla, söylemi farklı kitleye uyarla', grammar: 'parçacıklar, bilgi yapısı, üslup, sıkıştırılmış anlatı',
      vocabulary: 'çağrışım, deyim, uzman dilinde eşdizim', reading: 'eleştiri, uzman metni ve çoklu yorum', listening: 'hızlı, örtük, değişken üslup',
      writing: 'farklı kitlelere çok kaynaklı sentez', speaking: 'örtük itirazı aç, nüansla yanıt ver', pronunciation: 'konuşma temposu, vurgu ve pragmatik tonlama',
      check: 'Farklı türde bağımsız üretim ve gecikmeli uzman değerlendirmesi' },
  },
}

function plannedSpanish(level: Band): Strand {
  return { function: `İspanyolca ${level} içeriği henüz yayımlanmadı`, grammar: 'Kapsam planlanmadı',
    vocabulary: 'Kapsam planlanmadı', reading: 'Yayımlanmadı', listening: 'Yayımlanmadı', writing: 'Yayımlanmadı',
    speaking: 'Yayımlanmadı', pronunciation: 'Yayımlanmadı', check: 'Bu bant için değerlendirme görevi yok' }
}

function band(level: CEFRLevel): Band {
  return level === 'B2+' ? 'B2' : level
}

export function curriculumCoverage(course: Course) {
  return bands.map((level, index) => ({
    level, previousBand: bands[index - 1], ...goals[course.language][level],
    lessons: course.unit.lessons.filter(({ objective }) => band(objective.level) === level),
  }))
}
