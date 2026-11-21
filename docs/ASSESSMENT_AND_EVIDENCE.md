# Değerlendirme, kanıt ve adaptasyon

Bu belge yerleştirme, değerlendirme ve ürün kararlarının hedef sözleşmesidir. Mevcut uygulamanın envanteri [ana planda](PRODUCT_LEARNING_BLUEPRINT.md), ekran davranışı [deneyim sözleşmesinde](LEARNING_EXPERIENCE_SPEC.md).

## Başlangıçta küçük, ilk hafta boyunca artan örnekleme

| Aşama | Ne toplanır? | Karar |
| --- | --- | --- |
| 0 · Hedef ve erişim | Dil, süre, amaç, öğrencinin tahmini, Kiril deneyimi gibi bir ön bilgi, ses ve mikrofon tercihi. | Öz tahmin içerik örneği seçer. Önceden edinilmiş beceri olarak kaydedilmez. Beş dakikada tarama ve ilk öğretim farklı oturumlara bölünebilir. |
| 1 · Rota açan mini tarama | 15 dakika ve üstünde yaklaşık 4–7 dakika hedeflenir. Bir kontrollü gramer/kelime örneği, kısa okuma, uygunsa kısa dinleme. Kiril için ayrı yazı-ses girişi. Her maddede “Bilmiyorum”, “Şimdilik geç” veya ses sorunu seçilebilir. | Kaldığı madde ve verdiği yanıt saklanır. İlk yararlı ders kapsam ve ön koşula göre açılır. Sonuç başlangıç önerisi ve belirsiz becerileri açıklar. |
| 2 · Komşu bant veya ikinci örnek | İlk 2–4 **çalışma** gününde, belirsiz her beceriye farklı kaynaktan kısa örnek. Güçlü görünen beceriye komşu banttan zorlayıcı örnek, çelişkili beceriye eşdeğer paralel örnek. Yeni bağlamda açık yazı ve isteğe bağlı konuşma. | Alt beceri ve bağlam bazında öneri. Bir okuma başarısı, gramer veya konuşma bandını yükseltmez. Ses yoksa alımlama verisi ertelenir. Öğretim başlamışsa o hedefin sonradan gelen kanıtı öğrenme kanıtı olarak işaretlenir. |
| 3 · Periyodik rota kontrolü | Yol ayrımında veya haftalık özet için karşılaştırılabilir bağımsız örnekler. Başarılı iletişim görevinin ardından ayrı gecikmeli görev. | Yeterli örnek varsa ilgili alt rotayı hızlandır, devam ettir veya odaklı onarım ver. Tek başarısızlıktan bant düşürme. Yetersizse örnek istenir ve çalışma sürer. |

Planlanan ilk güven kapısı, aynı beceride iki farklı görev ailesinde uyumlu, yardımsız gözlemdir. Bu eşik pilotta sınanacak bir **rota kuralıdır**. İki örnekten genel seviye çıkarılmaz. Bağımsız üretime dair çelişkili kanıt varsa bir paralel göreve ve açık uçlu sonuçta incelemeye öncelik verilir. İsteğe bağlı görevde yanıt yoksa ilgili beceri “henüz değerlendirilemedi” görünür.

## Kanıt sözleşmesi

Mevcut `ExerciseAttempt` ham yanıtları ve kanıtı, `reviewHistory` tekrar olaylarını, dış konuşma raporları da kendi kaynağını korur. Aşağıdaki alanlar hedef sözleşmedir. İlk aşamada yalnızca tekrarın nedenini ve oturumun devamını güvenilir kılan alanlar gerekir.

| Alan | Beklenen bilgi |
| --- | --- |
| Kimlik ve kapsam | Olay ve deneme kimliği, profil/dil, hedef/alt beceri, madde ve paket sürümü, görev ailesi, bağlam ve materyal kimliği. Kaydedilmiş kararlar kaynak kimliklere bağlanır. |
| Koşul | Tanılama/öğretim/aktarımı/gecikmeli veya prova bağlamı, hangi yardımın ne zaman açıldığı, yanıt modu, kaynak türü ve ses hızı/yeniden dinleme/transkript, başlangıç ve gönderim zamanları. |
| Sonuç | Doğru, yanlış, inceleme bekliyor, gözlem, yanıtsız, ertelenmiş veya erişilemedi. Boş maddeyle yanlış cevap ayrıdır. Deneme başarısı ile değerlendirici güveni ayrıdır. |
| Kaynak ve güven | Deterministik anahtar, öğrencinin öz değerlendirmesi, dış rapor, AI önerisi veya eğitimli değerlendirici. Açık üretimde rubrik sürümü, ölçüt, kısa dayanak ve uyuşmazlık/inceleme durumu. |
| Gecikme ve bağ | Başlangıç/önceki başarılı bağımsız deneme ve bekleme aralığı, yeni bağlam ailesi ve sonraki kontrol. Tekrar kursa yeni bilgi eklediğinde yeni öğretim olarak da kaydedilir. |

**Ekran durumları ayrı tutulur.** Materyali açmak veya dinlemek “karşılaştı” durumudur. Seçenekle doğru tanıma ve ipucuyla doğru üretim iki farklı gözlemdir. Yardımsız başarı için beklenen işin tamamlandığı ve cevap yardımının kapalı olduğu görülür. “Yeni bağlam”, aynı maddenin sözcük değiştirerek tekrarı yerine benzer talebi başka durum, muhatap veya kaynakla ölçer. Kalıcılık, önceki uygun başarının ardından belirlenen aralıkta yeni aileden doğrulama ister. Başarısız gecikmeli görev, mevcut güvendeki düşüşü ve sonraki adımı gösterir; eski başarı kaydı kalır.

| Beceri | Ölçülen iş | Daha güçlü kanıt ve sınır |
| --- | --- | --- |
| Gramer | Biçimi tanıma, anlam ayrımı, kontrollü kurma | Gereken yapıyla yeni amaca destek olmadan ulaşma. Boşluk doldurma, kontrollü üretim olarak kalır. |
| Kelime ve kalıp | Anlamı tanıma, bağlam ve eşdizim, yazılı hatırlama | Yeni cümle/iletişimde yerinde kullanma ve gecikmeli geri çağırma. Bir kart tanıtımı veya öz bildirim, bağımsız üretim göstermez. |
| Okuma | Ana fikir, ayrıntı, çıkarım, metnin işlevi/kaynak ilişkisi | Paralel metinden yanıt ve uygun metin dayanağı. Aynı pasajda öğrenilen cevabın tekrarı prova. |
| Dinleme | Ana fikir, ayrıntı, niyet, konuşmacı ve tutum | Aynı beceriyi başka kayıtta sesle gösterme. Transkriptle yanıt yardım etiketli alımlamadır; ses erişimi yoksa dinleme sonucu oluşmaz. Sentetik ve doğal kayıt ayrı görünür. |
| Yazma | Görev başarısı, anlaşılırlık, hedef yapı ve bağlama uygun dil | İlk bağımsız metin, revizyon ve rubrik incelemesi ayrı saklanır. Örnekle benzerlik veya AI yorumu tek başına rubrik başarısı üretmez. |
| Konuşma | Anlaşılabilirlik, etkileşim, görevi tamamlama, hedef dil kullanımı | Yeni takip sorusuyla hazırlıksız sözlü yanıt ve dayanaklı rubrik. Prova, alıntıya dayalı dış bildirim ve eğitimli değerlendirici farklı kaynaklardır. |

## İki rubrik örneği

**EN B1 toplantı güncellemesi.** Örneğe bakmadan kısa mesaj yazar. Ölçütler tamamlanan olay ve zamanın doğru ilişkilendirilmesi, güncel durum ve sonraki adımın anlaşılması, gerekli kalıbın doğal kullanımıdır. “Toplantıyı yarın” ile “toplantı geçen hafta oldu” okur için farklı anlam doğuruyorsa görevde eksik işaretlenir. Küçük ve anlamı bozmayan sözcük hatası ayrı dil notu alabilir. Örneği gördükten sonraki metin revizyondur. Yeni bir proje bağlamındaki eşdeğer görev daha güçlü kanıt verir.

**RU A1 tanışma.** Öğrenci yeni muhatabın selamına cevap verir, anlaşılır biçimde adını söyler ve karşı soruyu anlayıp yanıtlar. Telaffuz, adın veya ana ifadenin yanlış anlaşılmasına yol açıyorsa ilgili bölüm yeni örnekle çalışılır. Bir konuşmacının aksanına benzemek ölçüt değildir. Modeli tekrarlamak rehberli prova, tanımadığı birinin basit takip sorusuna model olmadan cevap vermek ayrı kanıttır.

Her ölçüt `karşıladı`, `kısmen karşıladı`, `karşılamadı` veya `gözlenemedi` olarak ve kısa dayanakla kayıt edilir. Toplam puan, görevin kritik şartındaki eksikliği gizlememeli. Bir değerlendirici ses kalitesi yüzünden karar veremiyorsa `gözlenemedi` seçer. İki değerlendirici kritik koşulda ayrıştığında çalışma “inceleme bekliyor” durumunda kalır.

## Kanıttan karara

1. Uygun adayları dil, yayımlanmış paket, çalışma günü/bütçe, erişim ve ön koşula göre filtrele. Ertelenmiş görev bir sonraki uygun çalışmaya taşınır; otomatik puan ve vade değişikliği yapılmaz.
2. Kaydedilmiş bir oturuma öncelik ver. Açık hata için önce eksik bağı belirle. Tanıyor ama kuramıyorsa aşamalı üretime, başlıca ön koşul eksikse kısa onarıma, aynı hata tekrarlanıyorsa farklı açıklama veya daha küçük bileşene, alımlamada ayrıntı kaçıyorsa ayrıntıya odaklanan paralel kaynağa geç.
3. Ön koşuldaki kısaltma yalnızca bağı ve koşulları karşılayan güncel kanıtla yapılır. Yedek, eski madde sürümü veya dış rapor yeni bir kontrol önerebilir. Eski kanıtın kaynağı ve yardımı bilinmiyorsa bilinmiyor olarak kalır.
4. Başarılı bağımsız uygulamayı, gerektiğinde kart hatırlamasından ayrı gecikmeli aktarım göreviyle kontrol et. Yeniden deneme için aynı görev ailesi tükenirse açığı ve sonraki kullanılabilir yolu göster. `retained` gibi iç motor durumları doğrudan beceri bandı etiketine dönüştürülmez.
5. Karar, hedefi, aşamayı, neden kodunu, kanıt kimliklerini, bütçeyi ve başka bir seçenek varsa uygun alternatifi döndürür. Aynı girdi ve saatle karar tekrar üretilebilir. Kayıt güncellemesi bir kez uygulanır; iki sekme yarışında ikinci gönderim kanıtı çoğaltmaz.

## Beceri profili ve ilerleme

İlk görünüm altı beceride birer güncel özet ve sıradaki ihtiyaçtan oluşur. Haftalık değişim için yalnızca benzer görev talebi ve yardım düzeyi olan iki gözlem eşleştirilir. Örnek: “İki yeni kayıtta ana fikri yakaladın. Konuşmacının önerisini ayırmak için ikinci bir örnek gerekiyor.” Varsayılan ekranda gözlemsiz derslerin her biri için satır açılmaz. Ayrıntıda kaynak, tarih, yardım, yanıt ve varsa önceki karşılaştırma görülebilir. Bir grup karşılaştırılamazsa “yeni örnek eklendi” etiketini kullan.

**Bant ilerleme kararı.** Ürün önce hangi görevlerde bağımsız ve kalıcı performans gözlendiğini belirtir. Bir sonraki banttan örnek, uygun öğretimi seçmek için kullanılabilir. Dört iletişim becerisi farklı bantlarda görünüyorsa ayrı raporlanır. Resmî ya da kesin CEFR iddiası için tanımlayıcı-kapsam haritası, paralel maddeler, eğitimli değerlendiriciler ve örnek rubrikler, uzmanlarla standart belirleme, temsilî pilot, bağımsız dış referans ve karar tutarlılığı gerekir. Örneklem/pilot yeterli olmadıkça yalnızca yerel çalışma önerisi ve kanıt durumu yayımlanır. [Avrupa Konseyi CEFR ilişkilendirme el kitabı](https://www.coe.int/en/web/common-european-framework-reference-languages/relating-examinations-to-the-cefr)

| Doğrulama | Kabul edilen iddia |
| --- | --- |
| Motor ve tarayıcı testi | Yardımlı yanıt, açık yazı, ses yokluğu, aynı madde, çift gönderim ve gecikme doğru durumlara ayrılır. Kanıt ve sonraki karar yeniden yüklemede korunur. |
| İçerik kontrolü | Madde, kaynak, varyant ve rubrik bağları vardır. Anahtarlar, farklı kabul edilen yanıtlar ve olumsuz örnekler otomatik denetlenir. |
| Dil/ölçme uzmanı | Hedef, bağımsızlık, zorluk ve rubrik uyumlu. İki değerlendiricinin uyuşmadığı örnekler incelenir. |
| Gerçek öğrenci pilotu | Kararın rotayı uygunlaştırması, yardımın işe yararlığı, yeni ve gecikmeli işte değişim. Küçük pilotu CEFR kalibrasyon örneklemi olarak kullanma. |

## Aşama 2 · Mevcut banka ve teknik sınırlar

Eski tarama İngilizcede 8 sabit madde (5 gramer, 1 kelime, 1 okuma, 1 yazma), Rusçada 9 sabit madde (6 gramer, diğer üç alan birer madde) kullanıyordu. İngilizce ağırlıkla B1 temel zaman ayrımı ve deneyim, Rusça A1 tanışma ve hâl bağlamındaydı. Başlangıçta dinleme ve konuşma yoktu. Tek okuma sorusu ana fikir, ayrıntı, çıkarım ve tür çeşitliliğini; yazı örneği de farklı amaç ve üslupları ayıramıyordu. İngilizcede zaman ayrımı, Rusçada «___ зовут» biçimi aynı listede benzer istemlerle tekrar ediyordu. Örneğin Rusça `ru.placement.3` ve `ru.diagnostic.2` aynı boşluğu farklı kişi adına göre soruyordu. Bunlar ayrı kimlikli maddelerdi. Eski ek tanılama aday çekirdek/köprü dersinin okumasını ve ayrı kaydını kullanıyordu. Çekirdek okuma ve dinleme doğruysa bir sonraki dersten iki gramer/kelime örneği açılıyordu. Aynı kimlik ikinci kez sunulmuyordu, ancak hata veya başarıya paralel bir kaynak seçilmiyordu. Bir yanlış okuma veya üç yanlış gramer köprü dersini öne çıkarabiliyor, eşleşen tanıma ve kontrollü kullanım aynı kazanıma denk geldiğinde plan rehberli çalışmayı kısaltabiliyordu.

Yeni sürümde öz beyan örnek havuzunun girişini belirler. Başlangıç, dil ve havuza göre 2–4 madde sürer. B1’de gramer ve kelime için iki açık “Bilmiyorum” sonrası daha kısa A2 okuma maddesi seçilir. Her adımda öğretime başlama ve kaldığı yerden devam seçenekleri vardır. İlk ders açıldıktan sonra takip soruları çalışma günlerinde isteğe bağlıdır. Beş dakikalık planda günde en fazla bir, diğerlerinde en fazla iki ek örnek sunulur. Bir ailede aynı bant ve öğretim zamanlamasında iki tutarlı doğru dinleme yanıtı komşu bir madde açabilir. Okuma veya gramerde çelişki varsa mevcut farklı kaynaklı paralel madde öne alınır; tanıma ve kontrollü kurma ayrı ailelerdir. Örneği yeniden açmak öğrenci yanıtı sayılmaz. Uygun paralel madde yoksa banka bu beceri için ek sonuç üretmez.

`assessmentBankVersion: 1` bankayı tanımlar. Yanıtlar İngilizce ve Rusçanın ayrı yerel profil kayıtlarında kalır. Madde kimliği, örnek aşaması, öğretimle ilişkisi, sonuç ve yardım koşulu birlikte saklanır. Transkript kullanımı ayrı, ses erişimi olmaması ayrı durumdur. Yazma inceleme bekler. Sözel prova puansızdır; derslerdeki Speaking Coach kullanıcı onaylı mevcut akışını kullanır. Yeni örnekler ders kazanımı veya resmî seviye yazmaz. Yedek v4 bu kayıtları kapsar; v1–v3 girişleri ve eski tarama sonuçları desteklenir. Eski profilde yeni banka isteğe bağlıdır.

| Dil ve havuz | Gramer | Kelime | Okuma | Dinleme | Yazma | Sözlü prova | Toplam |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EN A1 başlangıç | 1 | 1 | 1 | 0 | 1 | 1 | 5 |
| EN B1 odaklı, A2 ve B2 komşu örnekleri | 4 | 2 | 3 | 3 | 1 | 1 | 14 |
| EN B2/C1 kaynak ve söylem | 2 | 2 | 4 | 2 | 1 | 1 | 12 |
| RU A1 odaklı, A2 ses örneği | 2 | 1 | 2 | 3 | 1 | 1 | 10 |
| RU A2 ek havuz | 1 | 1 | 1 | 0 | 1 | 1 | 5 |

| Beceri | İngilizce kapsama sınırı | Rusça kapsama sınırı |
| --- | --- | --- |
| Gramer | Temel kişi/fiil, geçmiş/deneyim ayrımı ve kontrollü kurma, kiplik ve koşullu belirsizlik. Geniş zaman/görünüş sistemi ve ileri söylem yapıları açık. | Tanışma, zamir/hâl ve hedef yönü. Hâl sisteminin bütünü, görünüş, hareket fiilleri ve ileri söz dizimi açık. |
| Kelime | Yer, iş/etkinlik kalıbı, iddia anlamı ve hatırlama. Tematik ve üsluba göre kapsam sınırlı. | A1 bilet gişesi ve A2 randevu kalıbı. Yaygın temalar ile aktif hatırlama çeşitliliği sınırlı. |
| Okuma | Mesaj, duyuru, program kaydı, rapor/araştırma özetinde çıkarım. Uzun veya edebî tür, toplu ana fikir ve C2 kapsamı açık. | Tabela, etiket ve randevu mesajı. Uzun metin, ileri çıkarım ve tür çeşitliliği açık. |
| Dinleme | Üç mesaj/duyuru ve iki tutum kaydı. İleri kayıtlar B2 odaklı; A1 ve C1–C2, doğal ses ve etkileşim açık. | Üç kısa kayıt, kişi/ayrıntı ve değişen plan. A2 bağımsız havuzunda ses yok; B1–C2, doğal ses ve telaffuz ölçümü açık. |
| Yazma | Üç açık örnek, değerlendirme bekler. Paralel rubrik, daha uzun ve çeşitli yazı örnekleri açık. | İki açık örnek, değerlendirme bekler. A2 üstü, uzun türler ve rubrikli insan incelemesi açık. |
| Konuşma | Üç isteğe bağlı prova, ölçüm yok. | İki isteğe bağlı prova, ölçüm yok. |

Sekiz ses metni değerlendirme için yazıldı. MP3’ler yerelde çalınır ve transkript yanıtı dinlemeden ayrılır. Klipler sentetik tek seslidir. Kaynak ve seçenek çeşitliliği henüz ölçme uzmanlarınca kalibre edilmedi. İngilizce C2 ve Rusça B1–C2 için bağımsız seviye kapsaması yok. Aşama 3, kısa tarama sinyallerini ön koşul öğretimiyle ilişkilendirirken bu sınırları korumalı. Dinleme doğallığı ve üretim ölçümü Aşama 4’te insan sesi, rubrik ve öğrenci pilotu gerektirir.
