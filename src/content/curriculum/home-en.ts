import type { Module } from '../continuity'
import { expression, practice } from './batch-tools'

export const englishHome: Module[] = [{
  id: 'en.home', level: 'A1', prerequisite: 'en.identity', speakingContext: 'daily_conversation',
  title: 'Bir odayı ve eşyaların yerini tarif et', objective: 'Bir odadaki eşyaları say, bir nesnenin yerini sor ve tarif et.',
  situation: 'Bir arkadaşın odanda kalan çantasını almaya geliyor. Odayı bulmasına ve çantayı almasına yardım et.',
  bridge: 'Tek eşya için there is, birden çok eşya için there are. Yeri on, under veya next to ile belirt.',
  models: [
    { phrase: 'There is a desk next to the window. There are two bags under the desk.', explanation: 'There is bir şeyin varlığını, there are birden çok şeyi bildirir. Under altına, next to yanına işaret eder.' },
    { phrase: 'Where’s my bag? It’s on the chair, not under the table.', explanation: 'Bilinen tek nesneyi it ile göster. On yüzey, under alt konumdur. On ve under arasında karşıt vurgu yap.' },
  ],
  concepts: [
    practice('There is ve there are', 'There are a lamp here.', 'There is a lamp here.', 'Tekil isimle is, çoğul isimle are kullan.', [
      ['There ___ a bed here.', 'is'], ['There ___ two books here.', 'are'],
      ['Mutfak: There ___ a chair by the door.', 'is'], ['Koridor: There ___ three coats by the door.', 'are'],
      ['Kütüphane: There ___ a computer by the window.', 'is'], ['Sınıf: There ___ four chairs by the door.', 'are'],
    ]),
    practice('Konumu edatla bildir', 'The book is in the table. (Masanın üstünde.)', 'The book is on the table.', 'On üst yüzeyde, under altında, next to hemen yanındadır.', [
      ['Üstünde: The key is ___ the desk.', 'on'], ['Altında: The bag is ___ the chair.', 'under'],
      ['Yanında: The lamp is ___ the bed.', 'next to', 'beside'], ['Üstünde: The pen is ___ the shelf.', 'on'],
      ['Altında: The shoes are ___ the bed.', 'under'], ['Yanında: The chair is ___ the door.', 'next to', 'beside'],
    ]),
  ],
  word: expression('by the window', 'pencerenin yanında', 'The table is by the window.', 'By burada yakın yeri gösterir.',
    '/baɪ ðə ˈwɪndoʊ/', ['a seat by the window', 'stand by the window'], ['pencerenin dışında', 'masanın altında'], 'Arkadaşına pencere yanındaki eşyayı tarif et.'),
  additionalWords: [expression('top shelf', 'en üst raf', 'My bag is on the top shelf.', 'Birden fazla raftan en yükseğini seçmek için top shelf.',
    '/tɑp ʃɛlf/', ['on the top shelf', 'from the top shelf'], ['en alt raf', 'pencere kenarı'], 'Kitabının hangi rafta olduğunu söyle.')],
  receptive: [{ term: 'spare room', cue: 'boş oda' }, { term: 'hall', cue: 'giriş veya koridor' }],
  writing: { prompt: 'Odaya gelen bir arkadaşına iki eşyayı ve çantasının yerini yaz.', sample: 'There is a desk by the window. There are two chairs. Your bag is on the top shelf.',
    revision: 'Bir başka odadaki nesnenin konumunu ekle ve tekil/çoğul biçimini kontrol et.', criteria: ['Eşyaların sayısı anlaşılır.', 'Çantanın yeri açıkça tarif edilir.'] },
  input: { text: 'The spare room is on the left of the hall. There is a chair by the window. Your bag is on the top shelf. The key is under the little table.',
    reading: ['Anahtar nerede?', 'Küçük masanın altında', 'En üst rafta', 'Pencere yanında', 'Under the little table anahtarın yerini verir.'],
    transcript: 'There are two chairs in the room. Put your coat on the chair by the window. Your bag is under the other chair.',
    preparation: 'İki sandalyenin işlevini ayır.', main: ['Palto nereye bırakılır?', 'Pencerenin yanındaki sandalyeye', 'Kapının yanına', 'Çantanın içine', 'On the chair by the window.'],
    detail: ['Çanta nerede?', 'Diğer sandalyenin altında', 'Pencerenin yanında', 'Kapının önünde', 'Under the other chair.'] },
  retry: { text: 'The blue book is on the desk. The red book is on the top shelf. There are two pencils by the window.',
    reading: ['Hangi kitap rafta?', 'Kırmızı', 'Mavi', 'İkisi de', 'The red book is on the top shelf.'],
    transcript: 'The keys are on the desk, next to a blue cup. Your book is under the chair.',
    preparation: 'Anahtar ve kitap için ayrı yer dinle.', main: ['Anahtarlar hangi nesnenin yanında?', 'Mavi fincan', 'Kırmızı kitap', 'Pencere', 'Next to a blue cup.'],
    detail: ['Kitap nerede?', 'Sandalyenin altında', 'Masanın üstünde', 'Rafta', 'Under the chair.'] },
  recovery: { reading: 'Renk ve konum bilgisini eşleştir.', main: 'Anahtar sözcüğünün hemen sonrasındaki konumu ara.', detail: 'Book ve keys için söylenen konumları karıştırma.' },
  readingPurpose: 'Nesne adlarını yerleriyle eşleştir.', readingUse: 'Bir arkadaşına metindeki nesnelerden birini buldur.',
  listeningUse: 'Arkadaşına çantayı veya anahtarı nerede bulacağını geri söyle.', speaking: 'Odanı üç eşya ile tarif et ve arkadaşının konum sorularını cevapla.',
}]
