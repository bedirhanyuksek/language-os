import type { Module } from '../continuity'
import { expression, practice } from './batch-tools'

export const russianHome: Module[] = [
  {
    id:'ru.home', level:'A1', prerequisite:'ru.city', speakingContext:'daily_conversation',
    title:'Odayı ve eşyaların yerini tarif et', objective:'Bir odada hangi eşyaların olduğunu ve nerede durduğunu anlat.',
    situation:'Bir arkadaşın evine ilk kez geliyor. Anahtar ve çantanın nerede olduğunu tarif edeceksin.',
    bridge:'В ile oda, на ile yüzey tanımla. Önce nesneyi, sonra konumu söyle.',
    models:[
      {phrase:'Ключ на столе, а сумка в комнате.',explanation:'Где? sorusuna burada на столе ve в комнате yanıt verir. Стол → столе, комната → комнате. Столе́ son hecede vurguludur.'},
      {phrase:'В комнате есть шкаф. Книга лежит на полке.',explanation:'Есть bir eşyanın varlığını bildirir. Лежит yatay duran nesneye uygundur. На полке raf yüzeyini gösterir.'},
    ],
    concepts:[
      practice('Oda ve dolapta в','Сумка в комната.','Сумка в комнате.','Где? sorusuna в + bulunma biçimiyle cevap ver.',[
        ['Книга в ___ (комната).','комнате'],['Стул в ___ (кухня).','кухне'],['Пальто в ___ (шкаф).','шкафу'],['Мама в ___ (квартира).','квартире'],['Ключ в ___ (сумка).','сумке'],['Лампа в ___ (комната).','комнате'],
      ]),
      practice('Yüzeyde на','Письмо на стол.','Письмо на столе.','Sabit konumda на + bulunma biçimi kullan.',[
        ['Ключ на ___ (стол).','столе'],['Книга на ___ (полка).','полке'],['Сумка на ___ (стул).','стуле'],['Тарелка на ___ (стол).','столе'],['Чашка на ___ (полка).','полке'],['Пальто на ___ (диван).','диване'],
      ]),
    ],
    word:expression('на полке','rafta','Словарь на полке.','Где? sorusuna на полке, yer bildirir.','на по́лке',['книга на полке','лежать на полке'],['yerde','dolabın içinde'],'Bir kitabın rafta olduğunu söyle.'),
    additionalWords:[expression('в шкафу','dolapta','Куртка в шкафу.','Шкаф ile bu konumda в шкафу kullanılır.','в шкафу́',['вещи в шкафу','пальто в шкафу'],['masada','kapının dışında'],'Paltonun yerini belirt.')],
    receptive:[{term:'у окна',cue:'pencerenin yanında'},{term:'на стене',cue:'duvarda'}],
    writing:{prompt:'Bir arkadaşına evdeki anahtarın, kitabın ve çantanın konumunu yaz.',sample:'Ключ на столе. Книга на полке. Сумка в комнате.',revision:'Bir konumu değiştir ve где sorusuna uygun eki kontrol et.',criteria:['Her eşya tanınabilir.','Konum edatı ve biçimi anlaşılır.']},
    input:{text:'В комнате есть стол у окна. На столе лежит ключ. Книга на полке, а часы на стене.',
      reading:['Anahtar nerede?','Masada','Rafta','Duvarda','На столе лежит ключ.'],transcript:'Куртка в шкафу. Сумка на стуле. Книга лежит на полке.',
      preparation:'Çanta, palto ve kitabın yerlerini ayır.',main:['Palto nerede?','Dolapta','Sandalyede','Rafta','Куртка в шкафу.'],detail:['Çanta nerede?','Sandalyede','Dolapta','Rafta','Сумка на стуле.']},
    retry:{text:'На кухне есть стол. На столе стоит чашка. Словарь лежит в комнате.',
      reading:['Sözlük nerede?','Odada','Masada','Mutfakta','Словарь лежит в комнате.'],transcript:'На столе нет телефона. Телефон в сумке. А ключ на полке.',
      preparation:'Sözü edilen ilk ve gerçek konumu ayır.',main:['Telefon nerede?','Çantada','Masada','Rafta','Телефон в сумке.'],detail:['Anahtar nerede?','Rafta','Çantada','Masada','Ключ на полке.']},
    recovery: { reading: 'Nesneyi bul, ardından hemen yanındaki yer ifadesini işaretle.', main: 'İlk cümle olumsuz. Telefonun gerçek yerini sonraki cümlede ara.', detail: 'Anahtarı belirten ключ sözcüğünden sonraki yer ifadesini dinle.' },
    readingPurpose:'Eşya ve yerini eşleştir.',readingUse:'Odaya girmeden önce bir eşyanın yerini tarif et.',
    listeningUse:'Arkadaşına aradığı nesnenin yerini geri söyle.',speaking:'Evine gelen arkadaşına iki nesnenin yerini tarif et ve onun konum sorusuna cevap ver.',
  },
  {
    id:'ru.housing',level:'A2',prerequisite:['ru.home','ru.quantity'],speakingContext:'daily_conversation',
    title:'İki ev ilanını ihtiyaçlarına göre karşılaştır',objective:'Kira, ulaşım ve dahil olan masrafları karşılaştırıp bir soru sor.',
    situation:'İki evden biri okula yakın ama pahalı. Ev arkadaşın iki ilanın gerçek toplam giderini bilmek istiyor.',
    bridge:'Ближе к ile mesafeyi, дешевле ile fiyatı karşılaştır. Hangi giderin dahil olduğunu sor.',
    models:[
      {phrase:'Эта квартира ближе к метро, но дороже.',explanation:'Ближе к + yönelme hâli yakınlık bildirir. Дороже ve дешевле öznenin cinsiyetine göre değişmez.'},
      {phrase:'Вода входит в стоимость, а за интернет нужно платить отдельно.',explanation:'Входит в стоимость fiyata dahil anlamındadır. Платить за + belirtme hâli ayrı ödenen gideri söyler. Отде́льно vurgusunu dinle.'},
    ],
    concepts:[
      practice('Ближе к ardından yönelme','Дом ближе к школа.','Дом ближе к школе.','К ardından yönelme biçimi kullan.',[
        ['Ближе к ___ (школа).','школе'],['Ближе к ___ (парк).','парку'],['Ближе к ___ (рынок).','рынку'],['Ближе к ___ (университет).','университету'],['Ближе к ___ (почта).','почте'],['Ближе к ___ (остановка).','остановке'],
      ]),
      practice('Fiyat karşılaştır','Первая квартира дешёвая второй.','Первая квартира дешевле второй.','Сравнение için дешевле veya дороже kullan. Ucuz/pahalı olma anlamını sayılar belirler.',[
        ['30 bin ve 40 bin: Первая квартира ___ второй.','дешевле'],['50 bin ve 40 bin: Первая квартира ___ второй.','дороже'],
        ['Bilet 100, taksi 500: Такси ___ билета.','дороже'],['Oda 20 bin, ev 35 bin: Комната ___ квартиры.','дешевле'],
        ['Akşam 600, gündüz 400: Вечерний билет ___ дневного.','дороже'],['Günlük 900, haftalık 4500: Один день ___ недели.','дешевле'],
      ]),
    ],
    word:expression('входит в стоимость','fiyata dahil','Вода входит в стоимость аренды.','Входит в стоимость, ekstra ödenmeyen kalemi gösterir.','вхо́дит в сто́имость',['входит в стоимость аренды','не входит в стоимость'],['ayrı ödenir','yalnız peşin ödenir'],'İlana göre hangi giderin kiraya dahil olduğunu söyle.'),
    additionalWords:[expression('платить отдельно','ayrı ödemek','За интернет нужно платить отдельно.','Отдельно, toplam bedelin dışında ek ödeme olduğunu belirtir.','плати́ть отде́льно',['платить отдельно за интернет','нужно платить отдельно'],['dahil olmak','ücretsiz olmak'],'Ayrı ödenecek gideri sor.')],
    receptive:[{term:'пешком',cue:'yürüyerek'},{term:'с залогом',cue:'depozitolu'}],
    writing:{prompt:'Ev arkadaşına iki ilanı karşılaştıran kısa mesaj yaz. Ulaşım ve masrafı belirt, ev sahibine bir soru ekle.',
      sample:'Первая квартира ближе к метро, но дороже. Во второй вода входит в стоимость. Нужно ли отдельно платить за интернет?',revision:'Bir toplam gider veya yürüme süresi ekleyerek nedenini açıklaştır.',criteria:['İki ilan açıkça karşılaştırılıyor.','Dahil gider veya soru anlaşılır.']},
    input:{text:'Квартира А: 35 000 рублей, пять минут пешком до метро, с залогом. Квартира Б: 30 000 рублей, пятнадцать минут до метро. Вода входит в стоимость, интернет оплачивается отдельно.',
      reading:['Hangi ev metroya daha yakın?','A','B','Aynı uzaklıkta','Пять минут вместо пятнадцати.'],transcript:'Первая квартира ближе к парку, но за воду надо платить отдельно. Во второй вода входит в стоимость. Интернет в обеих квартирах оплачивается отдельно.',
      preparation:'Ortak ve farklı gideri ayır.',main:['Hangi evde su dahil?','İkinci','Birinci','İkisi','Во второй вода входит в стоимость.'],detail:['İkisinde de hangi gider ayrı?','İnternet','Su','Kira','Интернет в обеих квартирах оплачивается отдельно.']},
    retry:{text:'Комната рядом с университетом стоит 20 000. Вторая комната дешевле, но до университета нужно ехать на автобусе.',
      reading:['Ucuz odadan nasıl gidiliyor?','Otobüsle','Yürüyerek beş dakika','Metroyla','Нужно ехать на автобусе.'],transcript:'Квартира на этой улице стоит тридцать тысяч. Она дешевле второй квартиры, но интернет не входит в стоимость.',
      preparation:'Fiyat ve ayrı gideri dinle.',main:['Bu ev ikinciyle karşılaştırılınca nasıl?','Daha ucuz','Daha pahalı','Aynı fiyat','Она дешевле второй квартиры.'],detail:['Hangi gider dahil değil?','İnternet','Su','Yol','Интернет не входит в стоимость.']},
    recovery: { reading: 'Önce kira farkını, sonra okula ulaşmak için verilen aracı bul.', main: 'Дешевле, fiyat sırasını gösterir. İki evi o sözcükle karşılaştır.', detail: 'Не входит ifadesinden önce hangi giderin söylendiğine bak.' },
    readingPurpose:'Fiyat, yol ve dahil masrafı üç ayrı satırda not al.',readingUse:'İki seçenekten birini önermek için somut gerekçe ver.',
    listeningUse:'Ev sahibinden bir masrafı teyit et.',speaking:'Ev arkadaşına iki evi karşılaştır, başka önceliği varsa önerini değiştir ve ev sahibine soru sor.',
  },
]
