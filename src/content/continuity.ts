import type { CEFRLevel, Language } from '../domain/model'
import type { Exercise, Lesson } from './schema'
import { modelRecording, type Teaching } from './teaching'

type Practice = [prompt: string, answer: string, ...alternatives: string[]]
type Concept = {
  skill?: 'grammar' | 'reading'; label: string; incorrect: string; correct: string; explanation: string
  guided: [Practice, Practice]; transfer: [Practice, Practice]; delayed: [Practice, Practice]
  foundation?: { conceptId: string; errorAnswers: string[]; practice: Practice; explanation: string }
}
type Question = [prompt: string, answer: string, wrongA: string, wrongB: string, explanation: string]
type Material = {
  text: string; reading: Question
  transcript: string; preparation: string; main: Question; detail: Question
}
export type Word = { term: string; meaning: string; example: string; usage: string; pronunciation: string; collocations: string[]
  recognize: Question; recall: Practice; use: string }

export type Module = {
  id: string; level: CEFRLevel; prerequisite?: string | string[]; title: string; objective: string
  situation: string; bridge: string; models: Teaching['models']; concepts: [Concept, Concept]
  word: Word; additionalWords?: Word[]; receptive?: Teaching['receptive']
  writing: { prompt: string; sample: string; revision: string; criteria: [string, string] }
  input: Material; retry: Material; readingUse: string; listeningUse: string
  speaking: string; speakingContext?: NonNullable<Lesson['speaking']>['context']
  recovery?: { reading: string; main: string; detail: string }
  approach?: Teaching['approach']; readingPurpose?: string
}

export function author(language: Language, item: Module): Lesson {
  const { id, level, word, writing, concepts } = item
  const words = [word, ...(item.additionalWords ?? [])].map((entry, index) => ({ ...entry, cardId: `${id}.word.${index + 1}` }))
  const lessonConcepts = concepts.map((concept, i) => {
    const conceptId = `${id}.form.${i + 1}`
    const exercises = (part: 'guided' | 'transfer' | 'delayed') => concept[part].map(([prompt, ...accepted], index) => ({
      id: `${conceptId}.${part}.${index + 1}`, kind: 'fill' as const, skill: concept.skill ?? 'grammar',
      prompt, accepted, explanation: concept.explanation,
    }))
    const support = concept.foundation
    const foundation = support && {
      conceptId: support.conceptId, errorAnswers: support.errorAnswers,
      exercise: { id: `${conceptId}.foundation`, kind: 'fill' as const, skill: 'grammar' as const,
        prompt: support.practice[0], accepted: support.practice.slice(1), explanation: support.explanation },
    }
    return {
      id: conceptId, label: concept.label, variants: exercises('guided'),
      check: { conceptId, misconception: concept.label, correctExample: concept.correct, incorrectExample: concept.incorrect,
        correction: concept.explanation, transfer: exercises('transfer'), delayed: exercises('delayed'),
        ...(foundation && { foundation }) },
    }
  })
  const question = (key: string, skill: 'reading' | 'listening' | 'vocabulary',
    [prompt, accepted, wrongA, wrongB, explanation]: Question): Exercise => {
    const options = [wrongA, accepted, wrongB]
    const offset = [...`${id}.${key}`].reduce((sum, character) => sum + character.charCodeAt(0), 0) % options.length
    options.push(...options.splice(0, offset))
    return { id: `${id}.${key}`, kind: 'single', skill, prompt, accepted, options, explanation }
  }
  const reception = (material: Material, retry: boolean) => {
    const key = retry ? 'retry' : 'input'
    return {
      reading: { text: material.text, question: question(`${key}.reading`, 'reading', material.reading) },
      listening: { transcript: material.transcript, preparation: material.preparation,
        audio: { ...modelRecording(id, 0, language), src: `/audio/${id}.${key}.mp3` },
        main: question(`${key}.main`, 'listening', material.main), detail: question(`${key}.detail`, 'listening', material.detail) },
    }
  }
  const alternate = reception(item.retry, true)
  const production = (key: string, prompt: string, sample: string, skill: 'writing' | 'vocabulary' = 'writing'): Extract<Exercise, { kind: 'open' }> =>
    ({ id: `${id}.${key}`, kind: 'open', skill, prompt, sample, explanation: item.bridge })
  const teaching: Teaching = {
    situation: item.situation, approach: item.approach ?? 'contrast', models: item.models, bridge: item.bridge,
    readingPurpose: item.readingPurpose ?? 'Kararı veya öneriyi bul. Onu destekleyen koşulu ayrı düşün.',
    readingUse: item.readingUse, listeningUse: item.listeningUse, vocabulary: words.map(({ cardId, usage }) => ({ cardId, usage })), receptive: item.receptive,
  }
  return {
    id, title: item.title, objective: { id: `${id}.objective`, description: item.objective, level },
    prerequisites: [item.prerequisite ?? []].flat().map((id) => `${id}.objective`), minutes: 5, goals: language === 'en' ? ['general', 'professional'] : ['general'],
    teaching, recall: item.situation, explanation: item.models.map(({ explanation }) => explanation),
    examples: concepts.map(({ correct, incorrect, explanation }) => ({ correct, incorrect, note: explanation })),
    concepts: lessonConcepts.map(({ id, label, variants }) => ({ id, label, variants })),
    production: production('writing', writing.prompt, writing.sample),
    vocabulary: words.map(({ cardId, term, meaning, example, usage, pronunciation }) => ({
      id: cardId, term, meaning, example, context: item.situation, partOfSpeech: 'kalıp', grammar: usage, pronunciation,
    })),
    speaking: { scenario: item.speaking, grammar: concepts.map(({ label }) => label).join(' · '),
      goals: [item.objective], rubric: writing.criteria, context: item.speakingContext ??
        (language === 'en' ? 'workplace' : 'daily_conversation') },
    pedagogy: {
      language, target: level, version: 2, quality: 'automated_checked', reviewAfterHours: 24,
      sources: ['https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors-search'],
      sections: item.models.map(({ phrase, explanation }, index) => ({ title: concepts[index].label, example: phrase, explanation })),
      rubric: writing.criteria.map((criterion, index) => ({ criterion, example: item.models[index].phrase })),
      checks: lessonConcepts.map(({ check }) => check),
      ...reception(item.input, false),
      receptionRetry: {
        reading: { ...alternate.reading, coaching: item.recovery?.reading ?? 'Önce hangi kararın alındığını bul. Sebep ve koşulu ayrı işaretle.' },
        listening: { ...alternate.listening, mainCoaching: item.recovery?.main ?? 'İlk turda öneriye odaklan.',
          detailCoaching: item.recovery?.detail ?? 'İkinci turda koşulu veya sayıyı yakala.' },
      },
      revision: production('revision', writing.revision, writing.sample),
      vocabulary: words.map((entry, index) => {
        const [recall, ...accepted] = entry.recall
        const key = index === 0 ? 'word' : `word.${index + 1}`
        return {
          cardId: entry.cardId, collocations: entry.collocations, pronunciation: entry.pronunciation,
          audio: { ...modelRecording(id, 0, language), src: `/audio/${entry.cardId}.mp3` },
          recognize: question(`${key}.recognize`, 'vocabulary', entry.recognize),
          recall: { id: `${id}.${key}.recall`, kind: 'fill', skill: 'vocabulary', prompt: recall, accepted, explanation: entry.usage },
          use: production(`${key}.use`, entry.use, entry.example, 'vocabulary'),
        }
      }),
    },
  }
}

const english: Module[] = [
  {
    id: 'en.conditional', level: 'B2+', prerequisite: 'en.tradeoff', title: 'Koşullu bir öneri sun',
    objective: 'Bir hizmet için öneride bulun ve kararın hangi koşulda değişeceğini açıkla.',
    situation: 'Ekibin yeni bir destek kanalını deneyecek. İzin veren koşulu ve vazgeçme eşiğini birbirinden ayır.',
    bridge: 'Bir seçenek öner. Önce izin veren koşulu, ardından vazgeçmene yol açacak durumu yaz.',
    models: [
      { phrase: 'We can extend the trial provided that support is available.', explanation: 'Provided that gerekli koşulu ekler. Destek varsa deneme uzatılabilir.' },
      { phrase: 'We won’t extend the trial unless the response time improves.', explanation: 'Unless, burada if … not demektir. Yanıt süresi iyileşmezse uzatma yapılmaz.' },
    ],
    concepts: [
      { label: 'Gerekli koşulu provided that ile belirt', incorrect: 'We can launch although the tests pass.',
        correct: 'We can launch provided that the tests pass.', explanation: 'Provided that bir kararın gerçekleşmesi için gerekli koşulu belirtir.',
        guided: [['Use “provided that”: We can publish ___ the editor approves.', 'provided that'], ['Gerekli koşulu ekle: We can open the room ___ staff are present.', 'provided that']],
        transfer: [['Müşteri dosyaları silinirse denemeye izin ver: We’ll run the demo ___ customer files are removed.', 'provided that'], ['Yer bulunması koşuluyla katıl: I’ll join ___ there is space.', 'provided that']],
        delayed: [['İzin verilmesi koşuluyla kaydet: We can record ___ everyone agrees.', 'provided that'], ['Hava açık kalırsa rotaya izin ver: We can hike ___ the weather stays clear.', 'provided that']] },
      { label: 'İstisnayı unless ile belirt', incorrect: 'We won’t leave unless the driver doesn’t arrive.',
        correct: 'We won’t leave unless the driver arrives.', explanation: 'Unless kendi içinde “eğer … olmazsa” anlamını taşır. Bu örnekte yan tümceye ikinci olumsuzluk ekleme.',
        guided: [['Use “unless”: We can’t begin ___ everyone is ready.', 'unless'], ['If the fee does not fall, we won’t join. We won’t join ___ the fee falls.', 'unless']],
        transfer: [['If the parcel does not arrive, we won’t open the stand. We won’t open the stand ___ the parcel arrives.', 'unless'], ['Teyit gelmezse oda ayırma: Don’t reserve the room ___ they confirm.', 'unless']],
        delayed: [['If the list isn’t complete, do not send it. Do not send it ___ it is complete.', 'unless'], ['Garanti verilmedikçe yenileme: Don’t renew ___ they offer a guarantee.', 'unless']] },
    ],
    word: { term: 'meet a deadline', meaning: 'son teslim tarihine yetişmek', example: 'We can meet the deadline if we start on Monday.',
      usage: 'Meet a deadline zamanında bitirmek, miss a deadline geç kalmaktır.', pronunciation: '/miːt ə ˈdedlaɪn/',
      collocations: ['meet a deadline', 'miss a deadline', 'extend a deadline'],
      recognize: ['Meet a deadline ne demek?', 'Zamanında bitirmek', 'Süreyi uzatmak', 'Süreyi kaçırmak', 'Meet, burada belirlenen süreye uymaktır.'],
      recall: ['“Son teslim tarihine yetişmek” kalıbını yaz.', 'meet a deadline', 'meet the deadline'],
      use: 'Bir teslim tarihine hangi koşulda yetişeceğini söyle.' },
    writing: { prompt: 'Çevrim içi bir kursu hangi koşulda açabileceğini ve hangi durumda erteleyeceğini iki cümlede yaz.',
      sample: 'We can open the course provided that the tutor is available. We won’t open it unless at least ten people enrol.',
      revision: 'İlk mesajını yeniden yaz. Kararı değiştiren koşulları birbirinden ayır.',
      criteria: ['İzin veren koşulu açıkça belirt.', 'Unless tümcesini koşul ve olumsuzluk açısından kontrol et.'] },
    input: {
      text: 'We can open a second support desk provided that volunteers are available on Fridays. We won’t advertise it unless we can keep it open for a month.',
      reading: ['Masa hangi gün açık olmalı?', 'Cuma', 'Pazartesi', 'Perşembe', 'On Fridays, gönüllülerin bulunması gereken günü belirtir.'],
      transcript: 'We can test the new service provided that a technician is present. We won’t extend the trial unless at least twenty people sign up.',
      preparation: 'İlk turda konuşmacının ne yapmak istediğini, ikinci turda uzatma eşiğini dinle.',
      main: ['Öneri nedir?', 'Hizmeti denemek', 'Hizmeti kapatmak', 'Ücreti artırmak', 'Konuşmacı bir deneme öneriyor.'],
      detail: ['Uzatma için kaç kişi gerekli?', 'En az 20', 'En az 10', 'En az 30', 'At least twenty ifadesi alt sınırı verir.'],
    },
    retry: {
      text: 'We can lend tablets provided that readers register first. We won’t buy more unless at least thirty people borrow one.',
      reading: ['Ödünç almak için ilk adım nedir?', 'Kayıt olmak', 'Tablet satın almak', 'Telefonla aramak', 'Register first ilk koşuldur.'],
      transcript: 'We can run the evening tour provided that the museum stays open. We won’t print tickets unless twelve guests book.',
      preparation: 'Etkinliğin adını ve bilet basma eşiğini yakala.',
      main: ['Neyi düzenlemek istiyorlar?', 'Akşam turu', 'Yemek kursu', 'Sabah turu', 'Evening tour önerilen etkinliktir.'],
      detail: ['Kaç rezervasyon isteniyor?', '12', '10', '20', 'Twelve guests book bilet basma koşuludur.'],
    },
    readingUse: 'Gönüllülerin bulunmadığı bir gün için ekibe alternatif koşul öner.',
    listeningUse: 'Deneme koşulunu ve uzatma eşiğini bir iş arkadaşına aktar.',
    speaking: 'Bir ekip projesini hangi koşulda deneyeceğini ve hangi durumda durduracağını konuş.',
  },
  {
    id: 'en.synthesis', level: 'C1', prerequisite: 'en.conditional', title: 'İki kaynaktan ölçülü sonuç çıkar',
    objective: 'Çelişen bulguları tek öneride birleştir ve çıkarımının sınırını açıkla.',
    situation: 'Bir pilotun hız verisi olumlu, destek kaydı olumsuz. Yöneticine iki bulguyu birlikte açıklayan bir öneri ver.',
    bridge: 'İki bulguyu karşı karşıya koy. Kanıtın izin verdiği bir çıkarım yaz ve hangi veriyle kararını gözden geçireceğini belirt.',
    models: [
      { phrase: 'While the dashboard shows shorter waits, the support log records more repeat calls.', explanation: 'While burada iki kaynağın sonuçlarını karşılaştırır. Her bulguyu kendi kaynağına bağla.' },
      { phrase: 'The pilot appears to save time, but the sample is too small to justify a wider rollout.', explanation: 'Appears to bir çıkarım bildirir. Too small to justify, verinin hangi kararı desteklemediğini belirtir.' },
    ],
    concepts: [
      { label: 'Çelişen bulguları while ile ilişkilendir', incorrect: 'While the queue fell, so the error rate rose.',
        correct: 'While the queue fell, the error rate rose.', explanation: 'While karşıtlığı tek başına bağlar. Ana cümleye so eklemek burada yanlış bir neden-sonuç ilişkisi kurar.',
        guided: [['Use “while”: ___ costs fell, complaints increased.', 'while'], ['Karşıtlık kur: ___ surveys were positive, interviews revealed confusion.', 'while']],
        transfer: [['Raporları karşılaştır: ___ the log shows fewer errors, staff report longer delays.', 'while', 'whereas'], ['___ attendance rose, participation per person fell.', 'while', 'whereas']],
        delayed: [['İki bulgu: ___ bookings increased, repeat visits fell.', 'while', 'whereas'], ['___ the trial was quicker, its results were less consistent.', 'while', 'whereas']] },
      { label: 'Çıkarımı appears to ile sınırla', incorrect: 'The change appears reduce delays.',
        correct: 'The change appears to reduce delays.', explanation: 'Appears to + yalın fiil, eldeki örnekten çıkarım yapar ve kesinlik iddiasını azaltır.',
        guided: [['Use “appear” to hedge: The change ___ reduce delays.', 'appears to'], ['Use “appear”: Early reports ___ support the change.', 'appear to']],
        transfer: [['Use “appear”: The new route ___ save fuel, but the sample is small.', 'appears to'], ['Use “appear”: The figures ___ suggest a fall in demand.', 'appear to']],
        delayed: [['Use “appear”: The change ___ benefit new users more.', 'appears to'], ['Use “appear”: The interviews ___ reveal a training gap.', 'appear to']] },
    ],
    word: { term: 'draw a conclusion', meaning: 'bir sonuca varmak', example: 'We need another month of data before we draw a conclusion.',
      usage: 'Draw a conclusion from evidence kalıbında from, çıkarımın dayanağını belirtir.', pronunciation: '/drɔː ə kənˈkluːʒən/',
      collocations: ['draw a conclusion', 'draw a tentative conclusion', 'draw conclusions from data'],
      recognize: ['Draw a conclusion ne demek?', 'Bir sonuca varmak', 'Bir tablo çizmek', 'Bir kararı ertelemek', 'Burada draw, kanıttan sonuç çıkarmaktır.'],
      recall: ['“Bir sonuca varmak” kalıbını yaz.', 'draw a conclusion'], use: 'Hangi veri olmadan bir sonuca varamayacağını yaz.' },
    writing: { prompt: 'Bir rapor hizmetin hızlandığını, müşteri görüşmeleri tekrar aramaların arttığını gösteriyor. İki bulguya dayalı kısa bir öneri yaz.',
      sample: 'While the report shows faster service, interviews suggest more repeat calls. The change appears to save time on first contact. I would review repeat calls before expanding it.',
      revision: 'Önerini yeniden yaz. İki kaynağın sonuçlarını ayır ve yaygınlaştırma için gereken kanıtı ekle.',
      criteria: ['Her bulguyu kendi kaynağıyla ilişkilendir.', 'Önerinin belirsizliğini ve bir sonraki kontrolü belirt.'] },
    input: {
      text: 'While the dashboard shows shorter waits, the support log records more repeat calls. The pilot appears to speed up initial contact. The team will keep the pilot in one branch and review repeat calls after four weeks.',
      reading: ['Ekip şimdi ne yapacak?', 'Denemeyi tek şubede sürdürecek', 'Bütün şubelere yayacak', 'Denemeyi iptal edecek', 'Keep the pilot in one branch, kararın kapsamını verir.'],
      transcript: 'While sales rose, returns rose too. The trial appears to attract more buyers. We’ll check why items were returned before expanding.',
      preparation: 'Olumlu bulgu, karşıt bulgu ve sonraki kontrolü ayır.',
      main: ['Konuşmacının kararı nedir?', 'Genişletmeden önce bir bulguyu araştırmak', 'Satışları durdurmak', 'Hemen genişletmek', 'Before expanding, genişleme öncesi kontrol gerektiğini gösterir.'],
      detail: ['Neyin sebebi araştırılacak?', 'İadelerin', 'İndirimlerin', 'Geç teslimatın', 'Why items were returned, kontrolün konusudur.'],
    },
    retry: {
      text: 'The survey suggests the app is easier to navigate, while interviews reveal trouble with password recovery. The team will test recovery before recommending the app to other departments.',
      reading: ['Öneriden önce ne sınanacak?', 'Şifre kurtarma', 'Fiyatlandırma', 'Gezinme menüsü', 'Test recovery, eksik kanıta yönelik karardır.'],
      transcript: 'The guide appears to help new staff. While quiz scores rose, trainers still noted errors on live calls. We’ll observe five more calls.',
      preparation: 'İyiye giden ölçümü ve ek örnek sayısını dinle.',
      main: ['Neden ek gözlem istiyorlar?', 'Gerçek aramalarda hatalar sürüyor', 'Sınav puanları düştü', 'Kılavuz henüz yayımlanmadı', 'Trainers still noted errors, kalan riski belirtir.'],
      detail: ['Kaç arama daha gözlenecek?', '5', '3', '10', 'Five more calls, ek örnek sayısıdır.'],
    },
    readingUse: 'Kararı ve kararın bir sonraki kanıt koşulunu bir yöneticiye aktar.',
    listeningUse: 'İki bulguyu ayrı aktar ve hangi kaynağın öneriyi değiştirebileceğini söyle.',
    speaking: 'İki çelişkili bulguyu sun ve önerine gelen bir itiraza kanıtla yanıt ver.',
  },
]

const russian: Module[] = [
  {
    id: 'ru.service', level: 'B1', prerequisite: 'ru.meeting', title: 'Bir hizmet aksaklığını çöz',
    objective: 'Bir gecikmeyi anlat, çözüm iste ve koşullu bir seçenek sun.',
    situation: 'Teslimat gelmedi. Hizmet görevlisine neyin aksadığını bildir ve ne istediğini netleştir.',
    bridge: 'Sorunu tek cümlede anlat. Чтобы ile istediğin sonucu, если ile alternatifin koşulunu belirt.',
    models: [
      { phrase: 'Я хочу, чтобы вы проверили номер заказа.', explanation: 'Хочу, чтобы + geçmiş biçim burada istenen eylemi gösterir. Проверили, вы ile uyumludur ve geçmişte olan bir işi anlatmaz.' },
      { phrase: 'Если курьер не приедет, я заберу посылку сам.', explanation: 'Если koşulu bildirir. Приедет ve заберу, birer tamamlanmış gelecek eylemi ifade eder.' },
    ],
    concepts: [
      { label: 'İstenen sonucu чтобы ile belirt', incorrect: 'Я хочу, что вы проверили номер.',
        correct: 'Я хочу, чтобы вы проверили номер.', explanation: 'İki ayrı özneyle bir istek bildirirken чтобы ve geçmiş zaman biçimi kullan.',
        guided: [['İstek bildir: Я хочу, ___ вы уточнили адрес.', 'чтобы'], ['İstenen eylemi yaz (проверить): Я хочу, чтобы вы ___ адрес.', 'проверили']],
        transfer: [['Teslimat adresi için istek kur: Я хочу, ___ вы изменили адрес доставки.', 'чтобы'], ['Написать fiiliyle iste: Я хочу, чтобы вы ___ мне сегодня.', 'написали']],
        delayed: [['Randevu bilgisi için istek kur: Я хочу, ___ вы подтвердили время.', 'чтобы'], ['Объяснить fiiliyle iste: Я хочу, чтобы вы ___ причину.', 'объяснили']] },
      { label: 'Koşulu если ile belirt', incorrect: 'Что пункт открыт, я заберу заказ.',
        correct: 'Если пункт открыт, я заберу заказ.', explanation: 'Если, ana eylemin hangi koşulda gerçekleşeceğini belirtir.',
        guided: [['Koşul ekle: ___ магазин открыт, я заберу заказ.', 'если'], ['Koşul ekle: Я подожду, ___ курьер скоро приедет.', 'если']],
        transfer: [['Yeni teslimat koşulu: ___ вы пришлёте код, я открою ячейку.', 'если'], ['Koşul ekle: Я позвоню, ___ не получу ответ.', 'если']],
        delayed: [['Koşul ekle: ___ пункт закрыт, я вернусь завтра.', 'если'], ['Koşul ekle: Мы поменяем билет, ___ поезд отменят.', 'если']] },
    ],
    word: { term: 'номер заказа', meaning: 'sipariş numarası', example: 'Я могу назвать номер заказа.',
      usage: 'Назвать номер заказа numarayı söylemek, проверить номер заказа siparişi numarasıyla kontrol etmektir.',
      pronunciation: 'но́мер зака́за', collocations: ['назвать номер заказа', 'проверить номер заказа', 'уточнить номер заказа'],
      recognize: ['Номер заказа ne demek?', 'Sipariş numarası', 'Telefon numarası', 'Teslimat ücreti', 'Заказ sipariş anlamına gelir.'],
      recall: ['“Sipariş numarası” kalıbını Rusça yaz.', 'номер заказа'],
      use: 'Görevliye sipariş numaranı verebileceğini söyle.' },
    writing: { prompt: 'Paketi henüz almadın. Görevliden adresi kontrol etmesini iste ve kurye gelmezse ne yapacağını yaz.',
      sample: 'Посылка ещё не пришла. Я хочу, чтобы вы проверили адрес. Если курьер не приедет, я заберу её сам.',
      revision: 'Mesajını yeniden yaz. Görevlinin yapacağı işi ve kendi alternatifini ayrı cümlelerde ver.',
      criteria: ['Чтобы ile istenen eylemi açıkça belirt.', 'Если koşuluna karşı uygulanabilir bir seçenek yaz.'] },
    input: {
      text: 'Добрый день! Посылка ещё не пришла. Я хочу, чтобы вы проверили адрес. Если курьер не приедет до шести, я заберу посылку завтра.',
      reading: ['Görevlinin ne yapması isteniyor?', 'Adresi kontrol etmesi', 'Ücreti iade etmesi', 'Siparişi iptal etmesi', 'Проверили адрес, istenen işi belirtir.'],
      transcript: 'Заказ задерживается. Я хочу, чтобы вы уточнили время доставки. Если курьер не приедет до пяти, я заберу заказ завтра.',
      preparation: 'İsteği ve bekleme saatini dinle.',
      main: ['Konuşmacı ilk olarak ne istiyor?', 'Teslimat saatinin doğrulanmasını', 'Siparişin iptal edilmesini', 'Adresin değiştirilmesini', 'Уточнили время доставки, teslimat zamanını netleştirmek anlamına gelir.'],
      detail: ['Kurye için saat kaça kadar bekleyecek?', 'Beşe kadar', 'Üçe kadar', 'Altıya kadar', 'До пяти, saat beşe kadar demektir.'],
    },
    retry: {
      text: 'В письме указан старый адрес. Я хочу, чтобы вы изменили адрес доставки. Если это невозможно, я заберу заказ в магазине.',
      reading: ['Adres değişmezse ne yapacak?', 'Siparişi mağazadan alacak', 'Yeni sipariş verecek', 'Kuryeyi arayacak', 'Заберу заказ в магазине, mağazadan alacağını belirtir.'],
      transcript: 'В письме нет номера заказа. Я хочу, чтобы вы прислали номер. Если ответа не будет до двух, я позвоню.',
      preparation: 'Eksik bilgiyi ve arama koşulunu dinle.',
      main: ['Hangi bilgiyi istiyor?', 'Sipariş numarasını', 'Kuryenin adını', 'Mağazanın adresini', 'Прислали номер, numaranın gönderilmesi isteğidir.'],
      detail: ['Ne zamana kadar yanıt bekleyecek?', 'İkiye kadar', 'Beşe kadar', 'Altıya kadar', 'До двух, saat ikiye kadar demektir.'],
    },
    readingUse: 'Müşterinin isteğini mağazadaki bir arkadaşına kısaca aktar.',
    listeningUse: 'Görevli rolünde duyduğun isteği tekrar et ve yeni bir seçenek sun.',
    speaking: 'Geciken teslimat için görevliyle konuş. Sipariş numarasını ver ve bir çözüm üzerinde anlaş.',
  },
]

export const continuity: Record<Language, Lesson[]> = {
  en: english.map((item) => author('en', item)),
  ru: russian.map((item) => author('ru', item)),
}
