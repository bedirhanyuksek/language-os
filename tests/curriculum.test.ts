import { expect, test } from 'vitest'
import { packedLessons } from '../src/content/curriculum/packs'
import { catalog } from '../src/content/catalog'
import { curriculumCoverage } from '../src/content/curriculum/coverage'
import { englishBatch } from '../src/content/curriculum/en'
import { russianBatch } from '../src/content/curriculum/ru'
import { englishTravel } from '../src/content/curriculum/travel-en'
import { russianMovement } from '../src/content/curriculum/movement-ru'
import { englishAdvanced } from '../src/content/curriculum/advanced-en'
import { russianAdvanced } from '../src/content/curriculum/advanced-ru'
import { englishInteraction } from '../src/content/curriculum/interaction-en'
import { englishHealth } from '../src/content/curriculum/health-en'
import { russianNarrative } from '../src/content/curriculum/narrative-ru'
import { englishLife } from '../src/content/curriculum/life-en'
import { russianCommunity } from '../src/content/curriculum/community-ru'
import { englishSocial } from '../src/content/curriculum/social-en'
import { russianHome } from '../src/content/curriculum/home-ru'
import { englishSeminar } from '../src/content/curriculum/seminar-en'
import { russianSeminar } from '../src/content/curriculum/seminar-ru'
import { englishHome } from '../src/content/curriculum/home-en'
import { assess } from '../src/domain/assessment'

const keys = {
  'en.mediation': ['Kısıtlı koruma onaylı, kamu izni düzenleme incelemesinden sonra karar bekliyor','Kaydı kısıtlı erişimle korumak','Önerilen klibi dinlemeleri','Projenin kısa açıklaması','Başka okulla paylaşmak','Alıntısız proje özeti'],
  'ru.recast': ['İlk izlenimi aktar, son repliğin muhatabını açık bırak','Eylem ve devam eden belirsizlik','Anlatıcının reddedilmiş hissetmesi','Yanıt ertelendi','Karşısındakinin yeniden sorduğu','İki yorum da'],
  'en.home': ['Küçük masanın altında','Pencerenin yanındaki sandalyeye','Diğer sandalyenin altında','Kırmızı','Mavi fincan','Sandalyenin altında'],
  'en.seminar': ['Güven artışı bildirildi; farklı katılım biçimleri için yeni veri gerekli','Karşılaştırılabilir kanıt toplanırken','Başlangıç deneyimi benzer başka etkinlikten','Tur alan ve almayanlara aynı bulma görevini vermek','Geri giren aynı kişiyi yeniden sayıyor','Rezervasyonlu ve rezervasyonsuz gelenler'],
  'ru.fiction': ['Anahtarı beklemesi ve trene yetişmeye çalışması','Anlatıcının rahatsızlığını ve komşunun acele etmiş olma ihtimalini','Usta telefonlarının bulunduğu zarf','Arkadaşı gecikmeyi önceden bildirmiş','Gecikme mesajının sona bırakılmasına','Kahraman her zaman dikkatsizdir'],
  'en.invite': ['Cumartesi geç seans','Pazar','Öğlen','14.45','İstasyon kafesine','Dokuz'],
  'en.host': ['Malzemeleri bir karta yazmalı','Ayakkabılarını orada bırakmayı','Su','Paylaşmak için bir şey getirilip getirilmeyeceği','Soldaki boş odaya','Tabağı mutfağa götürmek'],
  'ru.home': ['Masada','Dolapta','Sandalyede','Odada','Çantada','Rafta'],
  'ru.housing': ['A','İkinci','İnternet','Otobüsle','Daha ucuz','İnternet'],
  'ru.debate': ['Cuma denemesi, sokak girişi ve ay sonu ölçümü','Dört haftalık deneme','Sokak tarafındaki','Teslimat','Hastanede durak','Aydınlatma'],
  'en.story': ['Yardım istemenin katılmasını sağladığını gördü','Yeni gelen başka biriyle çalıştı','Diğer şarkıcı dosyasını tutmasını istedi','İki ziyaretçi aynı fotoğrafı seçti','Tanıdık bir yemek','Tarifler'],
  'en.media': ['Meydanda az kişi vardı; toplam katılım hâlâ belirsiz','Geçerli bir gözlem ama tüm etkinliği temsil etmiyor','Üç mekândan karşılaştırılabilir sayımlar','Gözlemler farklı günlere ait','Aile biletlerinin kaldırıldığı','İnternetten en ucuz seçeneğin görünmemesi'],
  'ru.quantity': ['Yarım kiloluk paketle','İki yarım litrelik şişe','Yarım kilo','Portakal','Muz','120 ruble'],
  'ru.opinion': ['Yalnız iki tezgâh erken açılacak','Sadece cumartesi erken açılış denensin','Eski saat korunacak','Sekizden sonra müzik','Polikliniğe ulaşım zor','Eczane yanına'],
  'en.clarify': ['Yan kapıyı görevliye açtırmalı','Paketin son teslim saatini','1.30','11.00','Yeşil kutuda','5.00'],
  'en.uncertainty': ['Teslim formuyla aynı saati kullanıyor','Yan masada kayıt','Tarayıcı bağlı değildi','Ayrı anahtar kaydı','Misafir eski numarayı aradı','Misafirin bileti'],
  'en.evidence': ['Daha yoğun ayda ilk ve tekrar ziyaretlerin girişten çıkışa süresini ayrı ölçmek','Sayaç ziyaretin ilk aşamasını ölçmüyor','Bir geç açılma saati',
    'Aktarılmış arama ile gerçekten sonuçlanmış konuşmayı ayırır','Formu bulmak zorlaştı ve insanlar başka kanalı kullandı','Altı hafta'],
  'en.symptoms': ['Öksürük','Burun tıkanıklığı','Bu sabah','Baş ağrısı','Öksürük','Bu sabah'],
  'en.appointment': ['14.20','Çarşamba','4','Telefondan gösterilebilir','9.15','Fotoğraflı kimlik'],
  'ru.weekend': ['Sergide','Nehir kıyısında yürüdüler','Öğle yemeğinden sonra','Evde çalıştı','Çalıştı','Parkta'],
  'ru.progress': ['Eki kontrol edip mektubu göndermek','Yanıt yazılıp gönderildi','Müşteriye','İra','Başvuru metni','Sabah'],
  'ru.handover': ['Kuryeyle görüşmeli','Yük altında test','Teslim alma saati','Başvurunun resmî kaydı','Adresi doğrulamak','Son e-posta'],
  'en.station': ['4', 'Leeds', '2', '11:35', 'Bristol', '6'],
  'en.rebook': ['Boş koltuk varsa', 'Daha sonraki sefer', '3:15', 'Rezervasyon numarası', 'Cumartesi', 'Rezervasyon numarası bulunan e-posta'],
  'en.detour': ['Sola dönmek', 'Güney kapısı', 'Kafe', 'Sağda', 'Sola dönmek', 'Mavi kapının karşısında'],
  'en.brief': ['Mevcut klinik çalışıyor; yeni klinikler henüz onaylanmadı.', 'Yüz yüze rezervasyon sürecek', 'Cuma',
    'Bir rehberin uygun olması', 'Mevcut otobüs hattı', 'Cumartesi'],
  'en.implication': ['İddianın kapsamına itiraz ve daha dar denemeye açıklık', 'Çıkarım kanıtı aşıyor', 'Normal bir aya ait veri',
    'Seçeneğe açık, karar için maliyet bekliyor', 'Onay izlenimi vermeye karşı çıkıyor', 'Tarih ve bütçe'],
  'ru.family': ['Büyük erkek kardeş', 'Küçük kız kardeş', 'Anne', 'Kız kardeş', 'Büyük erkek kardeş', 'Doktor'],
  'ru.routes': ['Otobüsle', 'Otobüsle', 'Bankanın yanında', 'Tramvay', 'Taksi', 'Geç kalıyorlar'],
  'ru.aspect': ['Yolcular gelmeden önce', 'Taksi', 'Yedide', 'Perşembe', 'Onlar varmadan ayrıldı', 'Bir saat'],
  'ru.register': ['Açık şubenin adresi ve başvuru yolu', 'Bu hafta saatler değişmiyor', 'Onaya', 'Denemelerin bitmesine', 'Telefonla', 'Perşembe'],
  'ru.implication': ['Finansman açık; küçük pilot görüşülebilir', 'Hesabın eksik olduğunu düşünüyor ve kararı bekletiyor', 'Eğitim',
    'Kış verilerini gördükten sonra değerlendirme', 'Hayır, çekinceli bir değerlendirme', 'Başka bir ilçede'],
  'en.identity': ['Ali', 'Kendini tanıtıyor', 'York', 'Sabah', 'Karşıdakinin adını', 'Porto'],
  'en.cafe': ['4', 'Kahve', '3 sterlin', '5 sterlin', 'Çay', '2 sterlin'],
  'en.incident': ['Projektörü kurarken', 'Arka kapı sıkıştı', 'Daha küçük olanları', 'Kâğıt makbuz', 'İnternet gitti', 'Sayfanın fotoğrafını çekti'],
  'en.report': ['6:58’de kart okutulduğunu', 'Kargoyu taşıyıcının teslim alıp almadığını', 'Etiketin basıldığını', 'Öğlen bir test yapıldı',
    'Ücretin geri alınıp alınmadığı', 'Bekleyen bir işlem'],
  'en.rebuttal': ['Cumartesi akşamlarının vardiya planıyla karşılanması', 'Yalnızca cumartesi hizmetini', 'Ek ziyaretçilerin tekrar gelip gelmediği',
    'Daha önce formu kullananlar', 'Acil randevular için telefon hattı', 'Altı hafta sonra'],
  'ru.directions': ['Sağa dönmeli', 'Sola', 'Sağda', 'Sağda', 'Sağa dönmeli', 'Solda'],
  'ru.complaint': ['Adres cuma gününe kadar teyit edilirse', 'Teslimat ücretinin iadesini', 'Sipariş iptal edilmeyecek',
    'Salı öğleden sonra', 'Düzeltilmiş fatura', 'Çarşamba'],
  'ru.synthesis': ['İlk ve sonraki başvurunun süresini ayrı karşılaştırmak', 'Akşam sefer aralıklarını kontrol etmek', 'Sekizden sonra',
    'İade süreci', 'Çalışanlar iki bölümü karıştırıyor', '10'],
}

test.each([['en', [...englishBatch, ...englishTravel, ...englishAdvanced, ...englishInteraction, ...englishHealth, ...englishLife, ...englishSocial, ...englishSeminar, ...englishHome]], ['ru', [...russianBatch, ...russianMovement, ...russianAdvanced, ...russianNarrative, ...russianCommunity, ...russianHome, ...russianSeminar]]] as const)('%s coverage separates published work from planned bands', (language, batch) => {
  const course = catalog[language]
  const coverage = curriculumCoverage(course)
  expect(coverage.map(({ level }) => level)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  const added = new Set(packedLessons.map(({ entry }) => entry.id))
  expect(coverage.map(({ lessons }) => lessons.filter(({ id }) => !added.has(id)).length))
    .toEqual(language === 'en' ? [4, 7, 7, 5, 5, 2] : [7, 5, 5, 3, 3, 2])
  expect(coverage.flatMap(({ lessons }) => lessons)).toHaveLength(course.unit.lessons.length)
  for (const { id } of batch) {
    const lesson = course.unit.lessons.find((item) => item.id === id)!
    const p = lesson.pedagogy!
    const retry = p.receptionRetry!
    expect(lesson.speaking).toBeDefined()
    expect(p.revision).toBeDefined()
    expect(p.quality).toBe('automated_checked')
    for (const prerequisite of lesson.prerequisites) {
      const earlier = course.unit.lessons.find(({ objective }) => objective.id === prerequisite)!
      const bands = ['A1', 'A2', 'B1', 'B2', 'B2+', 'C1', 'C2']
      expect(bands.indexOf(earlier.objective.level)).toBeLessThanOrEqual(bands.indexOf(lesson.objective.level))
    }
    const items = [p.reading.question, p.listening.main, p.listening.detail,
      retry.reading.question, retry.listening.main, retry.listening.detail]
    for (const [index, exercise] of items.entries()) {
      expect(assess(exercise, keys[id as keyof typeof keys][index], language).outcome, exercise.id).toBe('correct')
    }
    for (const check of p.checks) {
      const guided = lesson.concepts.find(({ id }) => id === check.conceptId)!.variants
      const prompts = [...guided, ...check.transfer, ...check.delayed].map(({ prompt }) => prompt)
      expect(new Set(prompts).size).toBe(6)
      expect(lesson.teaching!.models.some(({ phrase }) => prompts.includes(phrase))).toBe(false)
    }
  }
})

test.each([['en', [...englishTravel, ...englishAdvanced]], ['ru', [...russianMovement, ...russianAdvanced]]] as const)(
  '%s new words have distinct active and receptive objectives', (language, batch) => {
    for (const module of batch) {
      const lesson = catalog[language].unit.lessons.find(({ id }) => id === module.id)!
      const cards = lesson.vocabulary
      expect(new Set(cards.map(({ term }) => term)).size).toBe(2)
      expect(lesson.teaching!.receptive).toHaveLength(1)
      const p = lesson.pedagogy!
      for (const { cardId, recognize, recall, use } of p.vocabulary) {
        const card = cards.find(({ id }) => id === cardId)!
        expect(assess(recognize, card.meaning, language)).toMatchObject({ observation: 'recognition', outcome: 'correct' })
        expect(assess(recall, card.term, language)).toMatchObject({ observation: 'controlled_production', outcome: 'correct' })
        expect(assess(use, card.example, language)).toMatchObject({ observation: 'free_production', outcome: 'review_required' })
      }
    }
  },
)

test('accepts independently checked alternatives with different spellings and equivalent wording', () => {
  const en = catalog.en.unit.lessons.find(({ id }) => id === 'en.rebuttal')!
  const ru = catalog.ru.unit.lessons.find(({ id }) => id === 'ru.synthesis')!
  expect(assess(en.pedagogy!.checks[1].transfer[0], 'in so far as', 'en').outcome).toBe('correct')
  expect(assess(en.pedagogy!.checks[1].transfer[0], 'even though', 'en').outcome).toBe('incorrect')
  expect(assess(ru.concepts[0].variants[0], 'отчету', 'ru').outcome).toBe('correct')
  expect(assess(ru.concepts[0].variants[0], 'отчёт', 'ru').outcome).toBe('incorrect')
})
