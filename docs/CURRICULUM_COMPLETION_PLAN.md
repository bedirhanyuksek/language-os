# Müfredat tamamlama planı · İngilizce ve Rusça

## Mevcut envanter

Güncel `npm run curriculum:report` çıktısı 103 ders ve 144 iletişim hedefi gösteriyor. Açık 41 hedef, bağlanmış ders bulunmayan envanter maddeleridir. Bir iletişim hedefinde ders bulunması, bağlantılı gramerin öğretilmesini, söz varlığının yeterliliğini veya bağımsız görevin kalitesini garanti etmez. Örneğin İngilizce B1 envanterinde 14/14 hedefin dersi var, doğal dinleme ve hazırlıksız etkileşim için ayrıca kanıt ve materyal gerekiyor. [Son kapsam ve simülasyon](MILESTONE_5_REVIEW_LOAD.md)

| Bant | İngilizce çalışılabilir/hedef | Rusça çalışılabilir/hedef | Belirgin yayımlama açıkları |
| --- | ---: | ---: | --- |
| A1 | 6/12 | 11/13 | EN rutin, aile, temel form ve ses ayrımı. RU duygu ve ses/vurgu ayrımı. |
| A2 | 8/13 | 10/12 | EN ev ilanı, geçmiş gün, gündelik anlaşmazlık, eğitim ve çevrim içi plan. RU ilişki/onarma ve çevrim içi plan. |
| B1 | 14/14 | 10/13 | EN bağımsız etkileşim ve varyant derinliği. RU yaratıcı anlatı, tonlama ve topluluk iletişimi. |
| B2 | 11/13 | 9/12 | EN aksan ve prosodi. RU doğal hızda çok konuşmacı, sesleri ayırma ve sosyal ikna. |
| C1 | 10/12 | 5/10 | EN akademik sunum ve sesli kaynak; RU müzakere, uzun sunum ve araştırma, çevrim içi tartışma ve nüans. |
| C2 | 4/10 | 5/10 | EN edebî yeniden yazım, mizah, hassas arabuluculuk ve hızlı gündelik ses. RU aksan, nüans, hassas etkileşim ve prosodi. |

A1–C2 boyunca ana ve onarım etkinlikleriyle katalogda **206 dinleme kullanımı** vardır. Rapor bunların tamamını sentetik olarak işaretliyor. Bu sayı ayrı doğal konuşmacı ya da kaynak türü sayısı değildir. RU C1/C2’de raporun en uzun dinleme transkriptleri 86/123 sözcük, EN C1/C2’de 153/260 sözcük. Uzunluk tek başına zorluk ve doğallık ölçütü değildir. [Katalog raporu uygulaması](../src/content/curriculum/inventory.ts)

## Kapsam modeli

Bir dizi, bağımsız bir iletişim görevi ve açık ön koşullarla tanımlanır. Mevcut ders, hedef, kart ve madde kimlikleri korunur. JSON paket biçimi güncellemesi ancak kapsama veya kanıta ihtiyaç duyulduğunda ve geriye uyumluluğu tanımlandığında yapılır.

| Ayrı takip alanı | Dizi için kaydedilecek bilgi ve yayın eşiği |
| --- | --- |
| İletişim | Amaç, muhatap, bağlam, öğrenci ürünü ve bağımsız başarı ölçütü. Bir tanımlayıcıya birden çok öğretim/uygulama dizisi bağlanabilir. |
| Gramer | Yapı + anlam + kullanım + benzer yapıdan farkı, ön koşul bağı, model, rehberli pratik, yeni bağlam ve gecikmeli kontrol. Açıklamada geçmesi ile öğretimi ayrı. |
| Kelime ve kalıp | Lemma/ifade, anlam, kullanıldığı tür, eşdizim, sıklık/işlev gerekçesi, alımlama veya aktif hedef. Aktif hedefte bağlam, yazılı hatırlama, farklı yerde üretim ve vade kontrolü. Çekim varyantı sayımları şişirmez. |
| Okuma ve dinleme | Tür, anlatıcı/konuşmacı sayısı, kaynak seçimi, tahmini hız/uzunluk, görev talebi ve ses kökeni. Ana fikir, ayrıntı, çıkarım, strateji ve kaynak/kayıt bağımsızlığı ayrı. |
| Yazma ve konuşma | Muhatap, görev sonucu, ölçütlü rubrik, örnek yanıt, yardımsız paralel görev. Konuşmada takip, sıra alma ve onarım yer alır. |
| Telaffuz | İngilizcede anlaşılabilir vurgu, sınır, ritim ve seçili sesler. Rusçada fonem, sert/yumuşak ayrımı, sözcük vurgusu, ünlü indirgenmesi ve cümle vurgusu. Geçtiği yer ile ölçülen yer ayrı. |
| Söylem, pragmatik ve kültür | Resmiyet, doğrudanlık, hitap ve varsayımlar, yazılı tür, arabuluculuk ve çevrim içi etkileşim. Bir kültürel beklenti evrensel kural olarak verilmez. |
| Değerlendirme ve tekrar | Tanılama, yardım, bağımsız bağlam, gecikmeli örnek, rubrik ve kaynak sürümü. Materyal veya görev değiştiğinde ölçtüğü beceri korunur. |

Bir dizi için `boşluk → bağlı içerik → teknik olarak çalışıyor → dil ve ölçme uzmanı inceledi → pilot gözlemi → geniş kullanım` durumlarını ayrı takip et. Her kayıt dizinin kime, nerede ve nasıl ulaştığını gösterir. Kart sonu doğru cevap, oyun süresi veya ders sayısı bu yayın durumlarını otomatik ilerletmez.

## Bant ve dil başına gerekli diziler

Aşağıdaki dizi aileleri ilk editoryal kapsam hedefidir. Her satırdaki alımlama örneklerini farklı tür ve konuşmacı kaynaklarına, üretimi yeni kişi/amaç ve koşula bağla. Uzman, dil düzeyini görev talebi ve anlaşılabilirlikle beraber değerlendirir. [CEFR Tamamlayıcı Cilt](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions)

| Dil/Bant | Öğretim dizisi ve dilsel kapsam | Gerekli materyal, görev ve değerlendirme |
| --- | --- | --- |
| EN A1 | Kimlik → aile → rutin → hizmet. Zamir, `be/have`, basit şimdiki/geniş zaman bağlamı, soru, sayılar, sıklık, yer ve temel rica. İşlevsel kalıplar ev, okul ve seyahatte döner. | Form, saat çizelgesi, mesaj, yavaş doğal duyuru ve iki kişilik servis diyaloğu. Öğrenci yeni form doldurur, aynı sesi ezberlemeden isim/sayı ayırır ve kendini tanıtır. |
| RU A1 | Kiril → tanışma → aile ve günlük ihtiyaç. Cinsiyet/uyum, temel fiil ve soru, yer ve nesne hâllerine başlangıç. Sözcük vurgusu, sert/yumuşak ses ve `вы/ты`. | İsim levhası, kısa mesaj, farklı seslerden isim ve sayı. Yeni durumda kendini tanıtma, temel yön/istek ve kelime vurgusuna geri çağırma. |
| EN A2 | Randevu/ulaşım → barınma → geçmiş gün ve sosyal çözüm. Düzensiz geçmiş, karşılaştırma, sayılabilirlik, süre ve miktar, ricada nezaket. | İlan ve mesaj dizisi, iki hizmet sesi. İki ilanı karşılaştır, rezervasyon değişikliğini yeni koşulda yaz, kısa geçmişi anlat. |
| RU A2 | Alışveriş → buluşma → ilişki ve çevrim içi plan. Sayı/ilgi, yönelme ve araç hâli, geçmiş, süreç/sonuç görünüşüne ilk karşılaştırma, hareket kalıpları. | Katalog, davet yanıtı, iki planlama diyaloğu. Yeni saat kararlaştır, özür ve gerekçe ver, iki bağlamda hâl ve vurgu örneği. |
| EN B1 | Geçmiş deneyim → olay/sonuç → görüş ve takip. Simple past ve present perfect, olay sırası, gerekçe, zaman bağlayıcıları, toplantı ve sosyal söz varlığı. | Haber, röportaj, kişisel anlatım, telefon/iş diyaloğu. Yeni olayın tarihli özetini yaz, kaynaktan kritik ayrıntıyı al, takip sorusunu yanıtla. |
| RU B1 | Yolculuk/olay → yaratıcı anlatı → topluluk görüşü. Yönlü/habitüel hareket ve önek, görünüş, hâl yönetimi ve bağlı cümleler; tonlama onarımı. | Gezi anlatısı, haber ve doğal düzeltme diyaloğu. Yol değişikliğini anlat, yeni kişi ve zamanla olay aktar, topluluk önerisine cevap ver. |
| EN B2 | İddia → itiraz → uzlaşma. Kiplik/yapı, dolaylı aktarım, koşul, taviz, derecelendirme ve tematik eşdizimler. Aksan ve tutum ipuçları. | Tartışma, farklı aksanlarla doğal konuşma, karşıt editoryal kaynak, rol değişimli müzakere. İki kaynağı ilişkilendir, sesli itiraza çözüm üret. |
| RU B2 | Rapor/tutanak → doğallık → ikna. Varsayımsal koşul, ortaç/ulaç ve yapısal seçim, kaynak atfı, görünüş ve ton. | Çok konuşmacılı toplantı, haber yorumları ve karşıt yazılar. Konuşmacıyı, pozisyonu ve alt metni ayır. Yeni muhatapla uzlaşma/ikna. |
| EN C1 | Uzun sunum → eleştirel kaynak → tür değiştirme. İddia/kanıt sınırı, uyum, sözcüksel yoğunluk, akademik ve yarı resmî ifade, üslup. | Doğal ders/konuşma, bölümlü kaynak ve karşı görüş, ekip görüşmesi. Notlardan yeterli sentez, farklı muhatap, hazırlıksız takip. |
| RU C1 | Sunum/araştırma → müzakere → çevrim içi tartışma. Tümce bağları, alıntı ve dolaylı anlatım, tutum, profesyonel/akademik eşdizimler, üslup değişimi. | Uzun sunum, araştırma özeti, doğal anlaşmazlık ve paralel metin. Kaynak sınırını koru, bir paydaşın itirazına sözlü yanıt ver. |
| EN C2 | Edebî yeniden yazım → hassas arabuluculuk → ima ve mizah. Söylem tercihi, örtük anlam, farklı bölgesel sesler ve anlamı koruyan esnek dönüşüm. | Uzun çok kaynaklı dosya, hızlı çok konuşmacılı doğal görüşme, edebî örnekler. İki türde yeniden yaz, hazırlıksız itirazı onar, ayrı gecikmeli karşı örnek. |
| RU C2 | Nüans → hassas iletişim → hızlı doğal konuşma. Örtük kabuller, stilistik yeniden formüle etme, bölgesel/konuşma dili, vurgu ile anlam ayrımı. | Doğal karma aksan, hızlı karşılıklı konuşma, farklı türde kaynak. Eşzamanlı ayrıntı ve tutum ayrımı, yeni paydaşla arabuluculuk, rubrikli tekrar. |

İlk içerik ölçeği üç diziyle sınırlı. RU A1 Kiril/tanışma erişimi, EN B1 zayıf gramer/kelime ile güçlü listening, EN B2/C1’den C2’ye tür dönüşümü. Mevcut dersi yeniden kullan; yeni örnek ön koşulu veya ölçme boşluğunu giderdiğinde eklenir. Sonraki partilerde RU A1–B2 ve EN B1–C1 geçişleri, ardından RU C1 ve iki dilin C2 boşlukları. Ön koşula sahip olmayan üst düzey dizileri katalog sayısı için öne alma. İngilizce A1–C1 için işlev ve dil envanterini, Rusça için giriş öğretim dizisini karşılaştırmaya yarayan kaynaklar ders şablonunun yerine geçmez. [British Council/Eaquals genel İngilizce envanteri](https://www.eaquals.org/resources/the-core-inventory-for-general-english/) · [Между нами](https://www.mezhdunami.org/)

## Doğal ses, telaffuz ve lisans

Mevcut MP3’ler eSpeak NG ile sentezleniyor ve uygulama bunları etiketliyor. Tek bir sentetik sesle yazılmış diyalog, konuşmacı ayırma, doğal durak, karşılıklı giriş, doğal hız veya bölgesel söyleyiş ölçümüne temel olamaz. Oynatılabilirlik ve transkript eşleşmesi teknik kapıdır. [Ses üretim notları](../src/content/audio/README.md) · [eSpeak NG ses belgeleri](https://github.com/espeak-ng/espeak-ng/blob/master/docs/voices.md)

| Kaynak seçeneği | Yerel kullanım ve kabul koşulu |
| --- | --- |
| Özgün insan kaydı | İlk tercih, küçük iki dilli pilot için her dilde ayrı konuşmacılarla kaydedilmiş kontrollü örnekler ve yönlendirilmiş doğal diyalog. Kayıt, düzenleme, çevrimdışı dağıtım ve gerekli saklama izinleri yazılı olmalı. Konuşmacı sesi ve kimlik bilgisi ayrı tutulur. |
| Açık lisanslı kayıt | Kaynak ve ses düzeyinde güncel lisans, uyarlama ve yeniden dağıtım yetkisi, atıf metni, kullanım alanı, değişiklikler ve ses indirme koşulu kaydedilir. Erişilebilir bir web sayfası otomatik olarak çevrimdışı paket lisansı sağlamaz. [CC BY 4.0 yasal metni](https://creativecommons.org/licenses/by/4.0/legalcode) |
| Yerel TTS veya sentetik MP3 | Kontrollü dinleme alıştırması ve erişim desteği için etiketli seçenek. Sistem sesi cihazda hazır olmayabilir. Motor, model, ses veri seti ve çıktı için dağıtım şartları ayrı incelenir. Sentetik ses, doğal çok konuşmacılı hedefin yayın koşulunu karşılamaz. |
| Uzaktan ses veya ASR | İsteğe bağlı. Çevrimdışı indirme ve kullanım ayrı doğrulanır. Mikrofon izni, cihaz dışına çıkacak veri ve öğrenci onayı açık. Otomatik tanıma hatası, telaffuz veya başarı puanı olarak doğrudan kullanılmaz. |

A1–A2 kaynakları anlaşılır kısa dönüşler, temel vurgu ve iki farklı seste aynı işlevi içerir. B1–B2 doğal tempo değişimi, konuşmacı geçişi, farklı iletişim ortamı ve onarım içerir. C1–C2 uzun sunum, çok konuşmacılı panel, arka plan koşulları, tutum, ima ve esnek vurgu örnekler. İnsanların anlaşılırlığı değerlendirirken aksan tercihinden daha çok iletişim etkisini, segmental ayrımı ve prosodiyi puanlaması gerekir. [CEFR fonolojik yeterlik](https://www.coe.int/en/web/common-european-framework-reference-languages/phonological-competence)

**İlk kabul örneği.** Her dilde kontrollü doğal kısa örnek, iki ayrı konuşmacılı özgün diyalog, ikisinin transkripti ve paralel görev ailesi hazırlanır. İki yetkin değerlendirici kelime/cümle vurgusunu, hız ve rol ayrımını ve görevde kullanılan ipuçlarını ayrı inceler. Cihazda ağ kapalıyken oynatma ve metin alternatifinin kanıt etiketi otomatik test edilir. Pilot öğrencileri ilk dinleme, yeniden dinleme ve transkript yardımıyla oluşan sonuçları ayrı bırakır. Sentetik/doğal kayıtları birleştirip ortalama başarı üretme. Sonuçlar rota ve materyal tercihlerini günceller.

## Dizi ve bant için bitiş

Dizi tamamlanması, öğretim ön koşulları, anahtar/rubrik, yeni bağlamlı görev, ayrı gecikmeli örnek, medya izinleri, teknik çalışma, uzman bulguları ve pilot dönüşü kaydedildiğinde önerilir. Her bantta ana beceriler için birden çok görev ailesi, günlük/sosyal ve uygun profesyonel/kamusal tür, erişilebilir materyal ve bir sonraki banda köprü gerekir. Envanter satırlarının doluluğu, içerik yayın ölçütüdür. Öğrenci düzeyi ayrı [kanıt ve standardizasyon](ASSESSMENT_AND_EVIDENCE.md) koşullarına tabidir.
