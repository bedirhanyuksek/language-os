import { z } from 'zod'
import { idSchema } from '../domain/model'
import type { Language } from '../domain/model'
import type { ListeningActivity } from './pedagogy-schema'
import type { Exercise } from './schema'

const text = z.string().trim().min(1).max(1000)
export const teachingSchema = z.strictObject({
  situation: text,
  audioMode: z.enum(['device-synthesis', 'script-practice']).optional(),
  approach: z.enum(['contrast', 'dialogue', 'decoding', 'sequence']),
  models: z.array(z.strictObject({ phrase: text, explanation: text })).min(2),
  bridge: text,
  readingPurpose: text,
  readingUse: text,
  listeningUse: text,
  vocabulary: z.array(z.strictObject({ cardId: idSchema, usage: text })).min(1),
  receptive: z.array(z.strictObject({ term: text, cue: text })).optional(),
})
export type Teaching = z.infer<typeof teachingSchema>

export const audioLocales = { en: 'en-US', ru: 'ru-RU', es: 'es-ES' } as const

export function modelRecording(lessonId: string, index: number, language: Language): Extract<ListeningActivity['audio'], { kind: 'recording' }> {
  return { kind: 'recording', src: `/audio/${lessonId}.model.${index + 1}.mp3`, license: 'MIT',
    source: 'https://github.com/espeak-ng/espeak-ng', locale: audioLocales[language], synthetic: true }
}

export function modelAudio(lessonId: string, index: number, language: Language, mode?: Teaching['audioMode']): ListeningActivity['audio'] {
  return mode ? { kind: 'synthesis', locale: audioLocales[language], rate: 0.9 }
    : modelRecording(lessonId, index, language)
}

export const guidedAlternatives: Record<string, Exercise> = {
  'en.experience.overview': { id: 'en.experience.overview.guided.3', kind: 'fill', skill: 'grammar',
    prompt: 'Deneyim sorusu. Complete with “ever” and the verb “meet”: Have you ___ a client in person?',
    accepted: ['ever met'], explanation: 'Ever deneyimin herhangi bir zamanda olup olmadığını sorar. Meet fiilinin üçüncü biçimi met.' },
  'en.update.status': { id: 'en.update.status.guided.3', kind: 'fill', skill: 'grammar',
    prompt: 'Form şimdi kullanıma hazır. Use the present perfect of “fix”: We ___ the form.',
    accepted: ['have fixed'], explanation: 'Have fixed, geçmişte yapılan işin bugünkü sonucunu vurgular.' },
  'ru.roles.role': { id: 'ru.roles.role.guided.3', kind: 'fill', skill: 'grammar',
    prompt: 'Вера kadın. Uygun zamiri yaz: Это Вера. ___ врач.',
    accepted: ['Она'], explanation: 'Вера için она kullanılır. Şimdiki zamanda meslek adından önce “быть” yazılmaz.' },
  'ru.roles.lex': { id: 'ru.roles.lex.guided.3', kind: 'short', skill: 'vocabulary',
    prompt: '“Mühendis” sözcüğünü Rusça ve tek kelimeyle yaz: Это Борис. Он ___.',
    accepted: ['инженер'], explanation: 'Инженер, “mühendis” anlamına gelir ve bu cümlede yalın hâldedir.' },
  'ru.city.meaning': { id: 'ru.city.meaning.guided.3', kind: 'short', skill: 'reading',
    prompt: 'Ольга живёт в Казани. Вера живёт в Самаре. Kim Kazan’da yaşıyor? Metindeki adı yaz.',
    accepted: ['Ольга'], explanation: 'В Казани, ilk cümlede Ольга ile birlikte geçiyor.' },
}

// Authored lesson notes. Assessment items and their versioned answer keys live in the catalog.
export const teaching: Record<string, Teaching> = {
  'en.experience': {
    situation: 'Yeni bir ekipte bir arkadaşın daha önce eğitim verip vermediğini soruyor. Önce deneyimini tanıt. Tarihi, konuşma ayrıntıya döndüğünde ver.',
    approach: 'contrast',
    models: [
      { phrase: 'Have you ever trained new staff?', explanation: 'Have + özne + üçüncü biçim, şimdiye kadarki deneyimi sorar. Ever burada “hiç” anlamı katar.' },
      { phrase: 'I’ve trained new staff, but I haven’t led a workshop yet.', explanation: 'Olumlu ve olumsuz biçim aynı deneyim çerçevesinde. Yet, şu ana kadar gerçekleşmediğini belirtir.' },
      { phrase: 'I trained two new colleagues in March.', explanation: 'In March olayın bitmiş tarihini verir. Bu cümlede trained kullan. I’ve trained … in March aynı anlam için uygun değil.' },
    ],
    bridge: 'Önce “Have you ever …?” sorusuna bir deneyimle yanıt ver. Ardından “When?” sorusuna ayrı bir tarih cümlesi kur.',
    readingPurpose: 'Deneyimi bildiren cümleyi bul. Sonra aynı olayı tarihlendiren ipucunu ara.',
    readingUse: 'Metni kapatıp bir iş arkadaşına önce deneyimi, sonra tarihini birer cümleyle aktar.',
    receptive: [{ term: 'moved to a new office', cue: 'yeni bir ofise taşındı' }],
    listeningUse: 'Konuşmacıya bir takip sorusu sor ve duyduğun ayrıntıyı kullanarak yanıt ver.',
    vocabulary: [{ cardId: 'en.experience.word.1', usage: 'Lead a workshop, oturumu yönetmek demektir. Attend a workshop yalnızca katılmayı anlatır. Lead → led → led.' },
      { cardId: 'en.experience.word.2', usage: 'A handover, sorumluluğun devredildiği süreç veya bilgilendirmedir. Give a handover ile bir iş arkadaşını bilgilendir.' }],
  },
  'en.sequence': {
    situation: 'Toplantı başladığında hazırlıkların hangisinin bitmiş olduğunu anlatıyorsun. Dinleyici, olayları sen hangi sırada söylersen söyle gerçek sırayı anlayabilmeli.',
    approach: 'sequence',
    models: [
      { phrase: 'When the call began, Maya had already shared the link.', explanation: 'Zaman çizgisi: bağlantıyı paylaş → görüşme başla. Had shared önceki adımı işaretler.' },
      { phrase: 'Had Maya shared the link before the call? She hadn’t sent the slides yet.', explanation: 'Soruda had öne gelir. Olumsuzda hadn’t + üçüncü biçim, o noktaya kadar gerçekleşmeyen işi anlatır.' },
    ],
    bridge: 'İki olayı önce sıraya koy. Sonraki olayı past simple, daha önce biteni had + üçüncü biçimle ifade et.',
    readingPurpose: 'Ana olayı ve ondan önce tamamlanan işi ayır.', readingUse: 'İki olayı önce kronolojik sırada, sonra son olayı ilk söyleyerek anlat.',
    listeningUse: 'Bir ekip arkadaşına görüşme öncesi ve sonrası işleri ayrı ayrı bildir.',
    vocabulary: [{ cardId: 'en.sequence.word.1', usage: 'Agenda, toplantıda konuşulacak konuların listesidir. Send the agenda hazırlığı, add an item to the agenda listeye eklemeyi anlatır.' }],
  },
  'en.update': {
    situation: 'Kısa bir ekip mesajında işin şimdiki durumunu, ne zaman tamamlandığını ve ekibin kararlaştırdığı sonraki adımı bildir.',
    approach: 'sequence',
    models: [
      { phrase: 'We’ve fixed the booking form. We fixed it on Tuesday.', explanation: 'İlk cümle bugünkü sonucu, ikincisi geçmişteki bitiş tarihini öne çıkarır.' },
      { phrase: 'Have you checked it yet? We’re going to test it tomorrow.', explanation: 'Have you … yet? sonucu sorar. Going to + yalın fiil, önceden kararlaştırılan sonraki adımı verir.' },
    ],
    bridge: 'Üç kısa not al: hazır olan iş, bitiş günü, yeni adım. Her birini ayrı cümleye çevir.',
    readingPurpose: 'Metinde tamamlanan işi ve yapılacak işi ayır.', readingUse: 'Metni kapatıp durum ve sonraki adımı tek bir ekip mesajına dönüştür.',
    listeningUse: 'Duyduğun sonraki işi bir iş arkadaşına görev olarak hatırlat.',
    vocabulary: [{ cardId: 'en.update.word.1', usage: 'Ask for feedback geri bildirim istemektir. Ask someone for feedback kalıbında kişiyi ask ile for arasına koy.' }],
  },
  'en.routine': {
    situation: 'İş arkadaşın seni bugün neden ofiste gördüğünü soruyor. Normal düzeninle bugünkü değişikliği karşılaştır.',
    approach: 'contrast',
    models: [
      { phrase: 'I usually work from home. Today I’m working at the office.', explanation: 'Usually alışkanlığı, today ve am working geçici durumu gösterir.' },
      { phrase: 'Does she usually work here? She isn’t working here today.', explanation: 'Does ile ana fiil work olur. Geçici olumsuzlukta isn’t + fiil-ing kullan.' },
    ],
    bridge: 'Bir rutinin önüne usually getir. Sonra today ile başlayan yeni cümlede am, is veya are seç.',
    readingPurpose: 'Normal saat ile bugünkü saati ayır.', readingUse: 'Bilgiyi müşteriye bugünkü açılış saati olarak bildir.',
    listeningUse: 'Duyduğun değişikliği kendi rutininle karşılaştır.',
    vocabulary: [{ cardId: 'en.routine.word.1', usage: 'Work from home, çalışmanın nereden yapıldığını söyler. On Mondays gibi ifadelerle birleştir.' }],
  },
  'en.opinion': {
    situation: 'Ekip görüşmesi için iki saat var. Birini öner ve ekibe neden uygun olduğunu açıkla.',
    approach: 'dialogue',
    models: [
      { phrase: 'We could meet on Thursday because everyone is free.', explanation: 'Could + yalın fiil bir seçenek açar. Because, önerinin gerekçesini bağlar.' },
      { phrase: 'Could we start later? I wouldn’t choose Friday because the office closes early.', explanation: 'Soruda could öne geçer. Wouldn’t choose kişisel itirazı gerekçelendirmek için kullanılabilir.' },
    ],
    bridge: 'Bir öneri seç. Bir neden ekle. Bir arkadaşın itiraz ederse could ile ikinci seçenek sun.',
    readingPurpose: 'Öneriyi ve diğer kişinin değişiklik isteğini ayır.', readingUse: 'Kendi karşı önerini bir gerekçeyle söyle.',
    listeningUse: 'Duyduğun ana öneriyi ve yedek seçeneği bir katılımcıya ilet.',
    vocabulary: [{ cardId: 'en.opinion.word.1', usage: 'Suggest a change bir değişiklik önermek demektir. Suggest moving the meeting biçiminde fiil -ing alır.' }],
  },
  'en.tradeoff': {
    situation: 'Bir eğitim için iki ulaşım seçeneğini değerlendiriyorsun. Hız ve maliyet arasında karar vermen gerekiyor.',
    approach: 'contrast',
    models: [
      { phrase: 'Although the train costs more, it arrives earlier.', explanation: 'Although bir dezavantajı kabul eder. İki cümle arasına ayrıca but koyma.' },
      { phrase: 'If we had a larger budget, we would take the train.', explanation: 'If + geçmiş biçim burada varsayım bildirir. Sonuç bölümünde would + yalın fiil kullan.' },
    ],
    bridge: 'Bir fayda ve bir sakınca yaz. Sonra varsayımsal bir değişiklik seç ve kararının nasıl değişeceğini söyle.',
    readingPurpose: 'Seçeneklerin bedelini ve zaman kısıtını karşılaştır.', readingUse: 'Metindeki bir seçeneği savun ve bir sakıncayı kabul et.',
    receptive: [{ term: 'require a week of training', cue: 'bir haftalık eğitim gerektirmek' }],
    listeningUse: 'Konuşmacının seçimini kendi önceliğinle karşılaştır.',
    vocabulary: [{ cardId: 'en.tradeoff.word.1', usage: 'Weigh the options, seçenekleri karar vermeden önce karşılaştırmaktır. Weigh the pros and cons benzer bir kalıptır.' }],
  },
  'ru.intro': {
    situation: 'Bir kursun ilk gününde tanımadığın biriyle karşılaşıyorsun. Selam ver, adını söyle ve onun adını sor.',
    approach: 'dialogue',
    models: [
      { phrase: '— Здравствуйте! Меня зовут Оля. — Как вас зовут?', explanation: 'Здравствуйте kibar selamdır. Меня зовут kalıbından sonra adını söyle. Как вас зовут? aynı resmiyetle karşıdakinin adını sorar.' },
      { phrase: 'Привет! Как тебя зовут?', explanation: 'Привет ve тебя tanıdık veya akranla samimi konuşmada kullanılır. İlk karşılaşmadaki kibar diyalog için вас seç.' },
    ],
    bridge: 'Kibar selamı seç, kalıba kendi adını ekle, sonra karşıdaki kişinin adını sor.',
    readingPurpose: 'Konuşan iki kişinin adlarını selam ve soru kalıplarından ayır.', readingUse: 'Metni kapatıp kendi adınla aynı kibar diyaloğu canlandır.',
    receptive: [{ term: 'зовут', cue: 'bu kalıpta birinin adını sorarken veya söylerken kullanılır' }],
    listeningUse: 'Duyduğun adı tekrar et ve konuşmacıya kibarca karşılık ver.',
    vocabulary: [{ cardId: 'ru.intro.word.1', usage: 'Здравствуйте, tanımadığın bir kişiye veya birden fazla kişiye hitap ederken kullanılır.' },
      { cardId: 'ru.intro.word.2', usage: 'Меня зовут ifadesini bir bütün olarak hatırla. Меня зовут Анна örneğinde Анна adını değiştir.' }],
  },
  'ru.roles': {
    situation: 'Bir tanışmada kendini ve yanındaki kişiyi meslekleriyle tanıt.',
    approach: 'dialogue',
    models: [
      { phrase: 'Я инженер. Это Анна. Она врач.', explanation: 'Şimdiki zamanda mesleği söylerken genellikle “olmak” fiili eklenmez. Она Anna’ya döner.' },
      { phrase: '— Вы врач? — Нет, я инженер.', explanation: 'Kısa evet-hayır sorusunda söz dizimi aynı kalabilir, vurgu soruyu belirtir. Нет ile yanıtı düzelt.' },
    ],
    bridge: 'Önce kişi zamirini seç. Mesleği onun arkasına koy. Arkadaşını Это ile tanıttıktan sonra он veya она kullan.',
    readingPurpose: 'Her adı doğru meslekle eşleştir.', readingUse: 'Kişilerden birini mesleğiyle bir başkasına tanıt.',
    listeningUse: 'Duyduğun mesleklerden birini Вы …? kalıbıyla doğrula.',
    vocabulary: [{ cardId: 'ru.roles.word.1', usage: 'Врач doktor demektir. Она врач cümlesinde meslek adı yalın hâldedir.' },
      { cardId: 'ru.roles.word.2', usage: 'Инженер mühendis demektir. Я инженер ile kendi mesleğini söyle.' }],
  },
  'ru.city': {
    situation: 'Bir tanışma mesajında nerede yaşadığını söyle ve başka bir kişinin yaşadığı şehri sor.',
    approach: 'contrast',
    models: [
      { phrase: 'Самара → Я живу в Самаре. Москва → Она живёт в Москве.', explanation: 'Где? sorusuna burada в ve bulunma hâliyle yanıt verilir. Bu iki şehirde -а sonu -е olur.' },
      { phrase: '— Где вы живёте? — Я не живу в Москве. Я живу в Самаре.', explanation: 'Вы ile живёте, я ile живу kullan. Не fiilden önce gelir. Her şehir aynı ek kalıbını izlemez.' },
    ],
    bridge: 'Kişiye göre fiili seç. Sonra verilen şehir adının bu derste gösterilen bulunma biçimini ekle.',
    readingPurpose: 'Kişi ile şehir adını ayrı ayrı işaretle.', readingUse: 'Metindeki bir kişiyi adı ve yaşadığı şehirle tanıt.',
    listeningUse: 'Duyduğun bir şehri Где … живёт? sorusuna cevap olarak söyle.',
    vocabulary: [{ cardId: 'ru.city.word.1', usage: 'Жить mastardır. Я живу, он/она живёт, вы живёте. Yaşanan yeri в + bulunma hâliyle ekle.' }],
  },
  'ru.cyrillic': {
    situation: 'Bir metro girişinde tabelayı ve yanındaki isim listesini okuyacaksın.',
    approach: 'decoding',
    models: [
      { phrase: 'Роман · Нина · Соня', explanation: 'Р harfi r, Н harfi n, С harfi s sesini verir. Latin harfine benzemelerine rağmen aynı sesi göstermezler.' },
      { phrase: 'метро́', explanation: 'М ile başla, Т ve Р seslerini birleştir, vurgulu son о sesini dinle. Bu ders bütün Kiril harflerini kapsamaz.' },
    ],
    bridge: 'Önce her harfin sesini söyle, ardından duraksamadan birleştir. Vurguyu örnekteki sesle karşılaştır.',
    readingPurpose: 'İsimdeki ilk harf ile ona benzeyen Latin harfini ayır.', readingUse: 'Listedeki bir ismi sesli oku ve ilk harfin sesini belirt.',
    listeningUse: 'Duyduğun adı listede bul ve kendin seslendir.',
    vocabulary: [{ cardId: 'ru.cyrillic.word.1', usage: 'Метро, metro sistemi veya tabelası için kullanılır. Bu derste sözcüğü ses ve harf dizisiyle birlikte hatırla.' }],
  },
  'ru.order': {
    situation: 'Kafede bir içecek isteyecek ve siparişten önce fiyatını soracaksın.',
    approach: 'dialogue',
    models: [
      { phrase: 'Мне чай, пожалуйста. Сколько стоит чай?', explanation: 'Мне …, пожалуйста ile kibar istek, Сколько стоит …? ile tek bir ürünün fiyatı sorulur.' },
      { phrase: 'Можно кофе? Нет, спасибо, мне воду, пожалуйста.', explanation: 'Можно …? kısa bir istek sorusudur. Вода bu istekte воду olur; чай ve кофе bu örneklerde biçim değiştirmez.' },
    ],
    bridge: 'Menüden ürün seç, istek cümlesinde biçimini kontrol et, sonra aynı ürün için fiyat sor.',
    readingPurpose: 'Menüde ürünleri ve fiyatlarını ayır.', readingUse: 'Menüden başka bir ürünü seç ve onun için kibar bir sipariş ver.',
    receptive: [{ term: 'рублей', cue: 'bir fiyatın ruble cinsinden verildiğini gösterir' }],
    listeningUse: 'Duyduğun fiyatı doğrula, ardından farklı bir ürün için fiyat sor.',
    vocabulary: [{ cardId: 'ru.order.word.1', usage: 'Пожалуйста, sipariş cümlesinin sonunda isteği yumuşatır. Teşekküre cevap olarak da duyulabilir.' }],
  },
  'ru.meeting': {
    situation: 'Bugünkü buluşmaya gidemiyorsun. Karşındaki kişinin kabul edebileceği yeni gün ve saat öner.',
    approach: 'dialogue',
    models: [
      { phrase: 'Сегодня я не могу. Давайте встретимся завтра в шесть.', explanation: 'Не могу uygun olmadığını söyler. Давайте встретимся ortak bir buluşma önerir. В шесть başlangıç saatidir.' },
      { phrase: '— Во сколько? — В семь. — Хорошо, в семь у метро.', explanation: 'Во сколько? saat sorusudur. Kabul ederken saat ve yeri yeniden söylemek yanlış anlaşılmayı azaltır.' },
    ],
    bridge: 'Uygun olmadığın zamanı belirt. Yeni gün ve saat öner. Son cümlede anlaşmayı doğrula.',
    readingPurpose: 'İptal olan zamanı yeni öneriden ayır.', readingUse: 'Karşı tarafa yalnızca geçerli yeni gün ve saati ilet.',
    listeningUse: 'Son kararı sesli doğrula ve aynı konuşmayı başka bir saatle tekrar et.',
    vocabulary: [{ cardId: 'ru.meeting.word.1', usage: 'Встретимся, gelecekte birbirimizle buluşacağımızı söyler. Давайте встретимся ile öneri oluştur.' }],
  },
}
