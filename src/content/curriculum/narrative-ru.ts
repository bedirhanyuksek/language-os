import type { Module } from '../continuity'
import { practice, expression } from './batch-tools'

export const russianNarrative: Module[] = [
  {
    id: 'ru.weekend', level: 'A2', prerequisite: 'ru.family', title: 'Geçen hafta sonunu anlat', approach: 'sequence',
    objective: 'Bir aile üyesinin geçmişte nerede olduğunu ve ne yaptığını sırayla anlat.',
    situation: 'Kurs arkadaşın ailece hafta sonu ne yaptığınızı soruyor. Yer ve eylemi ayrı belirt.',
    bridge: 'Önce kişiyi ve yeri söyle. Sonra onun yaptığı işi ve ne zaman yaptığını ekle.',
    models: [
      { phrase: 'Мама была дома, а брат был в парке.', explanation: 'Был eril, была dişil. Дома sabit “evde” biçimi; в парке yer bildirir. Была́ sonunda vurgu.' },
      { phrase: 'В субботу мама работала. В воскресенье мы гуляли.', explanation: 'Работала dişil tekil, гуляли çoğul. Rusçada geçmiş biçim kişiye göre değil, tekilde cinsiyet ve çoğula göre değişir.' },
    ],
    concepts: [
      practice('Geçmişte nerede olduğunu anlat', 'Брат была дома.', 'Брат был дома.', 'Был eril, была dişil, были çoğul biçimdir.', [
        ['Мама ___ дома. (быть)', 'была'], ['Брат ___ в парке. (быть)', 'был'], ['Родители ___ на даче. (быть)', 'были'], ['Вера ___ на выставке. (быть)', 'была'], ['Олег ___ на вокзале. (быть)', 'был'], ['Дети ___ в музее. (быть)', 'были'],
      ]),
      practice('Geçmiş eylemde uyum', 'Мама работал в субботу.', 'Мама работала в субботу.', 'Dişil tekilde -ла, eril tekilde -л, çoğulda -ли kullan.', [
        ['Сестра ___ в субботу. (работать)', 'работала'], ['Мы ___ вечером. (гулять)', 'гуляли'], ['Отец ___ утром. (работать)', 'работал'], ['Подруги ___ у реки. (гулять)', 'гуляли'], ['Вера ___ после обеда. (гулять)', 'гуляла'], ['Олег ___ по телефону. (работать)', 'работал'],
      ]),
    ],
    word: expression('на выходных', 'hafta sonunda', 'На выходных мы были дома.', 'На выходных, hafta sonu içinde gerçekleşeni belirtir.', 'на выходны́х', ['быть дома на выходных','гулять на выходных'], ['iş gününde','her sabah'], 'Hafta sonunda nerede olduğunu söyle.'),
    additionalWords: [expression('после обеда', 'öğle yemeğinden sonra', 'После обеда мы гуляли в парке.', 'После ardından tamlayan hâli: обед → обеда.', 'по́сле обе́да', ['гулять после обеда','работать после обеда'], ['öğle yemeğinden önce','gece yarısı'], 'Öğle yemeğinden sonraki etkinliği söyle.')],
    receptive: [{ term: 'выставке', cue: 'sergide' }, { term: 'даче', cue: 'yazlıkta' }],
    writing: { prompt: 'İki aile üyesinin hafta sonunda nerede olduğunu ve ne yaptığını yaz.', sample: 'В субботу мама была дома и работала. В воскресенье мы были в парке и гуляли.', revision: 'Bir zaman ayrıntısı ekle, geçmiş biçimleri kontrol et.', criteria: ['Yer ile eylem ayrı anlaşılıyor.', 'Geçmiş biçimleri özneyle uyumlu.'] },
    input: { text: 'В субботу Лена была на выставке. Её брат был на даче. В воскресенье они встретились и после обеда гуляли в парке.',
      reading: ['Cumartesi Lena neredeydi?', 'Sergide','Yazlıkta','Parkta','Лена была на выставке.'], transcript: 'В субботу мама работала дома, а папа был на даче. В воскресенье мы все гуляли у реки после обеда.', preparation: 'Cumartesi ve pazar bilgilerini ayrı sırala.',
      main: ['Pazar günü ne yaptılar?', 'Nehir kıyısında yürüdüler','Sergiye gittiler','Evde çalıştılar','Мы все гуляли у реки.'], detail: ['Yürüyüş ne zamandı?', 'Öğle yemeğinden sonra','Sabah erkenden','Akşam yemeğinden önce','После обеда.'] },
    retry: { text: 'Дима был в музее утром. После обеда он работал дома. Его сестра гуляла в парке.',
      reading: ['Dima öğleden sonra ne yaptı?', 'Evde çalıştı','Müzeye gitti','Parkta yürüdü','После обеда он работал дома.'], transcript: 'Мы были в городе утром. После обеда Оля работала, а мы гуляли в парке.', preparation: 'Olya ile grubun eylemlerini ayır.',
      main: ['Olya ne yaptı?', 'Çalıştı','Parkta yürüdü','Şehirden ayrıldı','Оля работала.'], detail: ['Grup nerede yürüdü?', 'Parkta','Nehirde','Yazlıkta','Мы гуляли в парке.'] },
    readingPurpose: 'Kişi, yer ve zamanı eşleştir.', readingUse: 'Bir kişinin hafta sonunu iki adımda anlat.', listeningUse: 'Hafta sonu planındaki iki eylemi geri söyle.',
    speaking: 'Ailece geçen hafta sonu nerede olduğunu ve ne yaptığını anlat, iki takip sorusuna yanıt ver.',
  },
  {
    id: 'ru.progress', level: 'B1', prerequisite: ['ru.weekend', 'ru.aspect'], title: 'İşin süreciyle biten sonucu ayır', approach: 'contrast',
    objective: 'Bir işin sürdüğünü, tekrarlandığını veya tamamlandığını görünüş çiftleriyle bildir.',
    situation: 'Bir arkadaşın dosyanın hazır olup olmadığını soruyor. Üzerinde çalışmak ile işi bitirmek farklı bilgi verir.',
    bridge: 'Önce süre veya alışkanlık mı, tek bir sonuç mu bildirdiğini seç. Sonra uygun fiil biçimini kur.',
    models: [
      { phrase: 'Я читал отчёт час, но не прочитал его до конца.', explanation: 'Читал süreyi, прочитал sonuca ulaşmayı gösterir. Не прочитал, tamamlanmadığını söyler. Прочита́л son hecede vurgulu.' },
      { phrase: 'Вчера я писал письмо. Сегодня я написал его и отправил.', explanation: 'Писал yazma sürecini anlatır. Написал mektubun tamamlandığına işaret eder. Отправил ayrı bir eylemdir.' },
    ],
    concepts: [
      practice('Читать ile прочитать ayrımı', 'Я прочитал отчёт час, но не закончил.', 'Я читал отчёт час, но не закончил.', 'Süre ve açık süreç için читал. Sonuca ulaşılan tek olay için прочитал.', [
        ['Süreç: Я ___ отчёт целый час. (читать)', 'читал'], ['Sonuç: Я наконец ___ отчёт до конца. (прочитать)', 'прочитал'],
        ['Süreç: Она ___ статью всё утро. (читать)', 'читала'], ['Sonuç: Она ___ инструкцию до конца. (прочитать)', 'прочитала'],
        ['Süreç: Мы ___ договор два часа. (читать)', 'читали'], ['Sonuç: Мы ___ письмо целиком. (прочитать)', 'прочитали'],
      ]),
      practice('Писать ile написать ayrımı', 'Каждый вечер она написала заметки.', 'Каждый вечер она писала заметки.', 'Alışkanlık ve süreç için писать; tek tamamlanmış metin için написать.', [
        ['Her gün: Она ___ заметки. (писать)', 'писала'], ['Bitti: Она наконец ___ заявление. (написать)', 'написала'],
        ['Süreç: Мы долго ___ ответ. (писать)', 'писали'], ['Bitti: Мы ___ ответ и отправили его. (написать)', 'написали'],
        ['Alışkanlık: Он часто ___ отчёты. (писать)', 'писал'], ['Bitti: Он ___ письмо и закрыл файл. (написать)', 'написал'],
      ]),
    ],
    word: expression('до конца', 'sonuna kadar', 'Я прочитал договор до конца.', 'До конца tamamlanmanın sınırını belirtir.', 'до конца́', ['прочитать до конца','дослушать до конца'], ['yeniden başlamak','yarıda bırakmak'], 'Hangi belgeyi sonuna kadar okuduğunu söyle.'),
    additionalWords: [expression('отправить письмо', 'mektubu göndermek', 'Я написал и отправил письмо.', 'Написать ve отправить ayrı tamamlanmış adımlardır.', 'отпра́вить письмо́', ['отправить письмо клиенту','сразу отправить письмо'], ['mektubu almak','taslak yazmak'], 'Bir mektubu kime gönderdiğini söyle.')],
    receptive: [{ term: 'черновик', cue: 'taslak' }, { term: 'приложение', cue: 'yazışma eki' }],
    writing: { prompt: 'Okuduğun ama bitirmediğin bir belgeyi ve tamamlayıp gönderdiğin bir mesajı ayrı bildir.', sample: 'Я читал договор, но не прочитал его до конца. Я написал письмо и отправил его клиенту.', revision: 'Ekip arkadaşın için süre ve sonraki adımı ekle.', criteria: ['Süreç ve sonuç açıkça ayrılmış.', 'Belge ile mesajın durumları belirgin.'] },
    input: { text: 'Анна читала договор два часа, но ещё не прочитала его до конца. Она написала черновик письма, но не отправила его: нужно проверить приложение.',
      reading: ['Hangi adım kaldı?', 'Eki kontrol edip mektubu göndermek','Taslağı yazmaya başlamak','Sergiye gitmek','Taslak yazıldı, ek kontrolü ve gönderim kaldı.'], transcript: 'Олег писал ответ утром. К обеду он написал его и отправил клиенту. Договор он ещё читает.',
      preparation: 'Mektubun ve sözleşmenin durumunu ayır.', main: ['Hangi iş bitti?', 'Yanıt yazılıp gönderildi','Sözleşme okundu','Yeni toplantı ayarlandı','Написал и отправил.'], detail: ['Yanıtı kime gönderdi?', 'Müşteriye','Kardeşine','Kurula','Отправил клиенту.'] },
    retry: { text: 'Мы читали инструкцию вместе. Ира прочитала её до конца, а Павел остановился на третьем разделе.',
      reading: ['Kim okumayı bitirdi?', 'İra','Pavel','İkisi de','Ира прочитала её до конца.'], transcript: 'Я написал заявление, но пока не отправил его. Мы проверяли адрес утром. Сейчас у меня есть правильный адрес.',
      preparation: 'Yazılan ve henüz gönderilmeyen belgeyi dinle.', main: ['Hangi belge hazır?', 'Başvuru metni','Sözleşme','Fatura','Я написал заявление.'], detail: ['Ne zaman adres kontrolü yaptılar?', 'Sabah','Öğle','Gece','Мы проверяли адрес утром.'] },
    readingPurpose: 'Her belge için bekleyen ve biten adımı etiketle.', readingUse: 'Ekibe iki işin durumunu aktar.', listeningUse: 'Bir takip sorusuyla bekleyen işi netleştir.',
    speaking: 'Bir arkadaşına belge ve mesaj işlerinin hangi aşamada olduğunu açıkla. O bittiyse hangi adımın kaldığını söyle.',
  },
  {
    id: 'ru.handover', level: 'B2', prerequisite: ['ru.progress', 'ru.complaint'], title: 'Vardiya devrinde kanıt ve açık işi ayır',
    objective: 'İş kaydı ve ekip notundan doğrulanmış adımı çıkar, sorumluyu ve kalan işi yazılı olarak devret.',
    situation: 'Gece vardiyası siparişin “hazır” olduğunu yazmış. Kayıt yalnızca etiketin basıldığını gösteriyor.',
    bridge: 'Bir kaynağa göre tamamlanan adımı söyle. Henüz doğrulanmayan adımı ve kimin kontrol edeceğini ayrı bildir.',
    models: [
      { phrase: 'Этикетка уже распечатана, но посылка ещё не передана курьеру.', explanation: 'Kısa edilgen biçimler sonuç durumunu anlatıyor. Этикетка ve посылка dişil olduğu için -а ile uyum var. Уже ve ещё не karşıtlığını vurgula.' },
      { phrase: 'Из журнала следует, что сотрудник проверил адрес. Нельзя подтвердить, что он отправил заказ.', explanation: 'Из … следует, что kaynağın desteklediği çıkarımı bildirir. Нельзя подтвердить daha ileri bir iddianın doğrulanmadığını söyler.' },
    ],
    concepts: [
      practice('Sonuç durumundaki kısa biçim', 'Посылка отправлен.', 'Посылка отправлена.', 'Dişil tekil isimle -а; çoğul isimle -ы kullan.', [
        ['Dişil: Этикетка ___ (распечатан).','распечатана'], ['Çoğul: Документы ___ (проверен).','проверены'], ['Dişil: Посылка ___ (передан).','передана'], ['Çoğul: Заявки ___ (отправлен).','отправлены'], ['Dişil: Копия ___ (запрошен).','запрошена'], ['Çoğul: Письма ___ (написан).','написаны'],
      ]),
      { ...practice('Kaydın desteklediği sınırı belirle', 'Kayıt etiketi gösteriyor, demek paket teslim edildi.', 'Запись подтверждает печать этикетки. Передачу курьеру нужно проверить.', 'Bir kayıt hangi eylemi belgeliyorsa onu bildir. Bundan sonraki adımı ayrı doğrula.', [
        ['Kayıt yalnızca adres kontrolünü gösteriyor. Rusça hangi adım açık? отправка / проверка адреса','отправка'], ['Sistem belgeyi yüklediğini gösteriyor. Hangi adım hâlâ açık? получение / загрузка','получение'],
        ['Kayıtta imza var, ödeme bilgisi yok. Hangi iş açık? оплата / подпись','оплата'], ['Fotoğraf ambalajı gösteriyor. Açık adım? доставка / упаковка','доставка'],
        ['Form yazıldı, sisteme geçmedi. Açık adım? регистрация / подготовка','регистрация'], ['Makbuz iade talebini gösteriyor. Açık adım? возврат / запрос','возврат'],
      ]), skill: 'reading' },
    ],
    word: expression('передать смену', 'vardiyayı devretmek', 'Передайте смену с коротким списком открытых задач.', 'Передать смену, sorumluluk ve açık iş bilgisini sonraki ekibe vermektir.', 'переда́ть сме́ну', ['передать смену коллеге','передать смену вовремя'], ['vardiyayı iptal etmek','vardiyaya geç kalmak'], 'Vardiyayı kime devredeceğini ve neyi bildireceğini söyle.'),
    additionalWords: [expression('уточнить статус', 'durumu netleştirmek', 'Позвоните курьеру, чтобы уточнить статус посылки.', 'Уточнить статус, bir işin hangi aşamada olduğunu doğrulamaktır.', 'уточни́ть ста́тус', ['уточнить статус заявки','уточнить статус посылки'], ['yeni bir form açmak','adres değiştirmek'], 'Bir ekip arkadaşına durumu hangi kaynakla doğrulayacağını bildir.')],
    receptive: [{ term: 'накладной', cue: 'sevk belgesinin' }, { term: 'под подпись', cue: 'teslim alanın imzasıyla' }],
    writing: { prompt: 'Bir not “sipariş hazır” diyor. Kayıtta adres doğrulandı ve etiket basıldı. Kurye teslimi belgesiz. Sonraki vardiyaya kanıt, açık iş, sorumlu ve kontrol saati yaz.', sample: 'Адрес проверен, этикетка распечатана. Записи о передаче курьеру нет. Пожалуйста, уточните статус у курьера до десяти и внесите номер накладной в журнал.', revision: 'Bir varsayımı kayıtla doğrulanmış bilgi gibi yazdığın yer varsa düzelt; son kontrolü bildir.', criteria: ['Doğrulanmış sonuç ve varsayım ayrı.', 'Sonraki işin sorumlusu ve saati belli.'] },
    input: { text: 'Ночная смена оставила отметку «заказ готов». В журнале указано, что адрес проверен, а этикетка распечатана. Однако строка для номера накладной пуста. По действующему порядку посылку передают курьеру под подпись. Подписи нет, а курьер ещё на маршруте. Утренней смене нужно сначала связаться с курьером, а затем решить, следует ли готовить посылку заново. Один статус в чате не закрывает задачу.',
      reading: ['Sabah vardiyası ilk olarak ne yapmalı?', 'Kuryeyle görüşmeli','Paketi yeniden hazırlamalı','Adresi değiştirmeli','Нужно сначала связаться с курьером.'],
      transcript: 'В чате написано, что оборудование готово. Из журнала следует, что техник проверил кабели и подписал лист осмотра. Но испытание под нагрузкой не проведено. Прежде чем отдавать оборудование заказчику, дневная смена должна провести это испытание. Если оно пройдёт успешно, можно оформить передачу и сообщить клиенту время выдачи.',
      preparation: 'Gözle kontrol, test ve teslimi ayrı dinle.', main: ['Teslim öncesi hangi aşama kaldı?', 'Yük altında test','Kabloları saymak','İlk gözlem formu','Испытание под нагрузкой не проведено.'], detail: ['Testten sonra müşteriye hangi bilgi verilecek?', 'Teslim alma saati','Teknisyenin adresi','Kablo sayısı','Время выдачи.'] },
    retry: { text: 'Заявка заполнена и сохранена. В архиве есть копия, но входящего номера ещё нет. Попросите приёмную подтвердить регистрацию до конца дня.',
      reading: ['Hangi adım doğrulanmalı?', 'Başvurunun resmî kaydı','Formun yazılması','Arşive kopya konması','Подтвердить регистрацию.'], transcript: 'Счёт подготовлен, но не отправлен. В карточке клиента указан старый адрес. Сначала проверьте адрес по последнему письму, потом отправьте счёт и отметьте это в журнале.',
      preparation: 'Hazır belgeyle sonraki işlemi ayır.', main: ['Önce ne yapılmalı?', 'Adresi doğrulamak','Faturayı göndermek','Yeni müşteri eklemek','Сначала проверьте адрес.'], detail: ['Adres hangi kaynaktan doğrulanacak?', 'Son e-posta','Telefon rehberi','Eski fatura','По последнему письму.'] },
    readingPurpose: 'İş notu ve kayıt karşılaştırmasında eksik kanıtı bul.', readingUse: 'Sonraki vardiyaya ilk kontrolü ve sebebini aktar.',
    listeningUse: 'Ekibe biten işi ve teslim öncesi koşulu geri söyle.', speaking: 'Vardiyayı devret. Meslektaşın işin bittiğini varsayarsa hangi adımın gerçekten doğrulandığını açıklayıp kontrol iste.',
  },
]
