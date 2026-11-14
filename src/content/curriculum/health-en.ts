import type { Module } from '../continuity'
import { expression, practice } from './batch-tools'

export const englishHealth: Module[] = [
  {
    id: 'en.symptoms', level: 'A2', prerequisite: 'en.station', title: 'Belirtiyi ve başlangıcını bildir', approach: 'dialogue',
    objective: 'Kısa bir sağlık görüşmesinde belirtinin ne olduğunu ve ne zaman başladığını anlat.',
    situation: 'Bir sağlık merkezini arıyorsun. Görevli şikâyetinin ne olduğunu ve ne zaman başladığını soruyor.',
    bridge: 'Have ile belirtini söyle. Başlangıcı happened/started veya zaman ifadesiyle belirt. For süreyi, since başlangıcı verir.',
    models: [
      { phrase: 'I’ve had a sore throat since Monday.', explanation: 'I’ve had, hâlâ süren belirtide başlangıca geri bakar. Since Monday başlangıçtır. Throat /θɹ/ ile başlar.' },
      { phrase: 'I’ve had a cough for three days. It started on Friday.', explanation: 'For three days süre, on Friday başlangıç günü. Started tamamlanmış başlangıç olayını anlatır.' },
    ],
    concepts: [
      practice('Başlangıç ve süre ayrımı', 'I’ve had a cough since three days.', 'I’ve had a cough for three days.', 'For + süre, since + başlangıç noktası.', [
        ['I’ve had it ___ two days.', 'for'], ['I’ve felt unwell ___ Monday.', 'since'], ['I’ve had this pain ___ last night.', 'since'],
        ['I’ve had a blocked nose ___ six hours.', 'for'], ['I’ve felt tired ___ a week.', 'for'], ['It’s been sore ___ yesterday.', 'since'],
      ]),
      practice('Geçmiş başlangıç için started', 'It start yesterday.', 'It started yesterday.', 'Bitmiş bir başlangıç olayında start → started.', [
        ['It ___ (start) on Tuesday.', 'started'], ['The pain ___ (start) this morning.', 'started'],
        ['My cough ___ (start) after lunch.', 'started'], ['The headache ___ (start) on the bus.', 'started'],
        ['The sore throat ___ (start) last night.', 'started'], ['The back pain ___ (start) on Sunday.', 'started'],
      ]),
    ],
    word: expression('a sore throat','boğaz ağrısı','I have a sore throat.','Have a sore throat, boğazın ağrıdığını söyler.','/ə sɔɹ θɹoʊt/',['have a sore throat','wake up with a sore throat'],['baş ağrısı','burun tıkanıklığı'],'Görevliye boğazının ağrıdığını söyle.'),
    additionalWords: [expression('a blocked nose','burun tıkanıklığı','I woke up with a blocked nose.','Blocked nose burun tıkanıklığıdır; stuffy nose konuşmada da duyulur.','/ə blɑkt noʊz/',['have a blocked nose','wake up with a blocked nose'],['boğaz ağrısı','mide ağrısı'],'Burun tıkanıklığının ne zaman başladığını söyle.')],
    receptive: [{ term: 'symptoms', cue: 'belirtiler' }, { term: 'reception', cue: 'danışma' }],
    writing: { prompt: 'Sağlık merkezi için örnek bir form yaz. Bir belirti, başlangıç zamanı ve geçen süreyi belirt.', sample: 'I have a sore throat. It started on Monday. I’ve had it for three days.', revision: 'Başlangıç ile süreyi iki ayrı ifadeyle açıklaştır.', criteria: ['Belirti anlaşılır.', 'Başlangıç ve süre birbirine karışmıyor.'] },
    input: { text: 'Clinic reception form. List your symptoms and when they started. Example: It is Wednesday. I’ve had a cough since Sunday. My sore throat started yesterday.',
      reading: ['Daha önce hangi belirti başladı?','Öksürük','Boğaz ağrısı','İkisi de aynı gün','Sunday, yesterday’den önceki başlangıç olarak veriliyor.'],
      transcript: 'I’ve had a blocked nose since Monday. The sore throat started this morning. I haven’t had a cough.',
      preparation: 'Hangi belirtinin daha önce başladığını dinle.', main: ['İlk belirti neydi?','Burun tıkanıklığı','Boğaz ağrısı','Öksürük','Blocked nose since Monday.'], detail: ['Boğaz ağrısı ne zaman başladı?','Bu sabah','Pazartesi','Dün gece','This morning.'] },
    retry: { text: 'I’ve had a headache for two days. The cough started this afternoon. My nose isn’t blocked.',
      reading: ['Hangisi iki gündür sürüyor?','Baş ağrısı','Öksürük','Burun tıkanıklığı','A headache for two days.'],
      transcript: 'I’ve had a cough for three days. I felt tired yesterday, and my nose became blocked this morning.',
      preparation: 'Süre ve ayrı başlangıçları dinle.', main: ['Hangi belirti üç gündür sürüyor?','Öksürük','Yorgunluk','Burun tıkanıklığı','A cough for three days.'], detail: ['Burun ne zaman tıkandı?','Bu sabah','Üç gün önce','Dün gece','This morning.'] },
    readingPurpose: 'Belirti ve başlangıçları sıralamaya hazır ol.', readingUse: 'Bir danışma görevlisine belirtileri zamanlarıyla aktar.',
    listeningUse: 'İki belirtiyi farklı başlangıç bilgileriyle geri söyle.', speaking: 'Bir sağlık merkezi görevlisine kurgusal iki belirtiyi bildir ve başlangıç sorusuna cevap ver.',
  },
  {
    id: 'en.appointment', level: 'A2', prerequisite: ['en.symptoms', 'en.rebook'], title: 'Randevu seç ve koşulu doğrula', approach: 'dialogue',
    objective: 'Uygun randevuyu seç, saat ve gerekli belgeyi teyit et.',
    situation: 'Görevli iki saat veriyor. Birine yetişemiyorsun ve diğerine hangi belgeyi getirmen gerektiğini soracaksın.',
    bridge: 'Hangi saate gelebileceğini söyle. Do I need to ile gerekli belgeyi sor. Saati ve yeri teyit et.',
    models: [
      { phrase: 'I can make it at half past two, but not at eleven.', explanation: 'Make it bir yere zamanında gelebilmek demektir. At saatten önce gelir; half past two 2.30’dur.' },
      { phrase: 'Do I need to bring my appointment letter?', explanation: 'Do I need to + yalın fiil, bir gerekliliği sorar. Bring‘i, gidilen yere bir şeyi götürmek için kullan.' },
    ],
    concepts: [
      practice('Need to ile gerekli eylem', 'Do I need bring ID?', 'Do I need to bring ID?', 'Need to + yalın fiil kullan.', [
        ['Do I need ___ bring my ID?', 'to'], ['Do I need ___ arrive early?', 'to'], ['Do I need ___ fill in a form?', 'to'],
        ['Do I need ___ take a ticket?', 'to'], ['Do I need ___ call before I come?', 'to'], ['Do I need ___ print the letter?', 'to'],
      ]),
      practice('Saatli uygunluk ifadesi', 'I can make it on two thirty.', 'I can make it at two thirty.', 'Belirli saatten önce at. Gün adı için on kullan.', [
        ['I can make it ___ three.', 'at'], ['I can come ___ Monday.', 'on'], ['I can make it ___ half past two.', 'at'],
        ['I can come ___ Thursday.', 'on'], ['I can get there ___ ten forty.', 'at'], ['I can be there ___ Friday.', 'on'],
      ]),
    ],
    word: expression('an appointment slot','randevu aralığı','There is an appointment slot at three.','Slot, ayrılmış bir zaman aralığıdır.','/ən əˈpɔɪntmənt slɑt/',['offer an appointment slot','take an appointment slot'],['giriş bileti','klinik adresi'],'Görevliden öğleden sonra boş randevuyu sor.'),
    additionalWords: [expression('proof of address','adres kanıtı','Please bring proof of address.','Proof of address, adresi gösteren bir belgedir; hangi belgenin geçerli olduğunu sorabilirsin.','/pɹuːf əv əˈdɹɛs/',['bring proof of address','ask for proof of address'],['ulaşım ücreti','randevu saati'],'Adres kanıtı getirmenin gerekip gerekmediğini sor.')],
    receptive: [{ term: 'available', cue: 'boş, uygun' }, { term: 'check in', cue: 'girişte kendini kaydettirmek' }],
    writing: { prompt: 'Randevu için iki saatten birini seçtiğini yaz. Saati teyit et ve kimlik gerekip gerekmediğini sor.', sample: 'I can make it at half past two on Tuesday. Do I need to bring my ID?', revision: 'Mesaja girişte kime başvuracağını soran bir cümle ekle.', criteria: ['Gün ve saat anlaşılır.', 'Gerekli belge soru olarak açık.'] },
    input: { text: 'Two times are available on Thursday: 11:00 and 14:30. Please bring your appointment letter. Check in at the desk ten minutes before your visit.',
      reading: ['14.30 randevusu için kaçta giriş yapılmalı?','14.20','14.30','14.40','Randevudan on dakika önce.'],
      transcript: 'I can offer Tuesday at eleven or Wednesday at half past two. For Wednesday, bring your letter and check in at desk four.',
      preparation: 'İkinci seansın günü ve gişesini dinle.', main: ['İkinci seçenek hangi gün?','Çarşamba','Salı','Perşembe','Wednesday.'], detail: ['Hangi gişeye gidilmeli?','4','2','11','Desk four.'] },
    retry: { text: 'Friday visits move to the north entrance. Bring your letter; you do not need to print it if you can show it on your phone.',
      reading: ['Mektup telefondaysa ne yapılmalı?','Telefondan gösterilebilir','Mutlaka basılmalı','Mektup gerekmiyor','Show it on your phone.'],
      transcript: 'Your appointment is on Monday at nine fifteen. Please bring a photo ID. You can check in at the south entrance.',
      preparation: 'Saat ve gerekli kimliği yakala.', main: ['Saat kaç?','9.15','9.50','10.15','Nine fifteen.'], detail: ['Hangi belge?','Fotoğraflı kimlik','Adres kanıtı','Mektup','A photo ID.'] },
    readingPurpose: 'Boş saat, giriş zamanı ve belge koşulunu ayır.', readingUse: 'Bir arkadaşına randevuya ne zaman ve neyle gideceğini anlat.',
    listeningUse: 'Görevliye gün, saat ve gişeyi geri söyle.', speaking: 'İki saat arasından birini seç. Giriş yeri ve belgeyi sorarak randevuyu teyit et.',
  },
]
