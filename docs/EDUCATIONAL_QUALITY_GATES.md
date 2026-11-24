# Eğitim kalitesi ve kabul kapıları

Bir dersin öğretici sayılması için öğrenciye ilgili iletişim görevini açıklaması, doğru kullanım ve anlamlı karşı örnek göstermesi, yardımın azaldığı deneme sunması ve hatanın ardından işe yarar bir sonraki adım vermesi gerekir. Bağımsız ve gecikmeli kanıt, öğretilen cümlelerin kopyası dışındaki bağlamlardan gelir. Soru ve süre sayıları üretim bütçesi olabilir.

## Yeni ders paketleri

İngilizce, Rusça ve İspanyolca paketlerinde önce öğrencinin hangi iletişim işini yapacağı ve hangi önceki kazanımı kullanacağı yazılır. İki öğretim modeli biçim ile anlamı bağlar. Rehberli deneme hedef biçimi öğretir. Aktarım ve gecikmeli görev aynı biçimi farklı kişi, amaç veya koşulla kullandırır. Okuma ve dinleme soruları karar için gerekli bilgiye ya da çıkarıma odaklanır. Onarım girdisi yeni bir kaynak ve hataya yönelik ipucu kullanır. İlk yazı, revizyon ve sözlü takip sorusu ayrı çalışmalardır. Açık yanıt gönderimi inceleme bekler.

Yeni aktif kelime kartına kalıcı anlam kimliği ve denetlenen kart sürümü bağlanır. Öğrenciye kart miktarını süre, tekrar yükü ve performansa göre mevcut planlayıcı verir. Yeni ses kayıtları için `device-synthesis` kullanan paketlerde model, örnek ve dinleme metinleri yerel cihaz sesiyle çalışabilir. Yerel ses yoksa metinle çalışma dinleme kanıtı oluşturmaz. Üretim gereksinimlerini `npm run curriculum:audio -- --audio-report` ile incele. Yeni Rusça terim, örnek ve replikler için vurgu girdisini metinle birlikte doğrula. Dosya üretimi ve dağıtım kararı ayrı adımlardır.

İncelenmiş kaydı bekleyen bir diyalog `script-practice` olarak açılır. Öğrenci konuşmacıları ve söylediklerini metin üzerinden izler, ana fikir ve ayrıntı açıklamalarını kontrol edebilir. Bu akış mevcut eksik dinleme kaydını kullanır. Çalışma planı sonraki aşamaya geçebilir; kapsam raporu diyalog metinlerini dinleme materyallerinden ayrı sayar.

## Kanıt ve geçiş

| Durum | Gerekli gözlem | Ürün davranışı |
| --- | --- | --- |
| Örnek yok veya eksik | Görev yok, erişilemedi ya da öğrenci erteledi | Eksik kanıtı belirt. Planı uygun görevle sürdür. |
| Tanıma | Özgün örnekte biçim veya anlamı ayırt etti | Daha az ipucuyla anlam veya üretim öner. |
| Anlama | Yeni metin/seste görevle ilgili anlam, ayrıntı veya çıkarımı verdi | Kullanılan mod ve yardımı göster. Ayrıntı ve ana fikir eksiklerine ayrı dönüş. |
| Rehberli üretim | Örnek, kalıp veya ipucuyla biçim üretti | Desteği azalt. |
| Bağımsız aktarım | Yeni ve eşdeğer bağlamda, yanıt yardımı olmadan hedefi gerçekleştirdi. Açık uçlu görevlerde uygun rubrik ve değerlendirici kanıtı gerekir | Yalnızca ölçülen kazanımı sonraki çalışma için hazır say. |
| Kalıcılık gözlendi | Başarılı bağımsız görevden sonra uygun aralık geçmiş ve farklı görevde aynı beceri gözlenmiş | Aralığı, görevi ve kanıt sınırını göster. Sonraki hata yeniden çalışma açabilir. |

Seviye iddiası tek kazanımdan çıkarılmaz. Her beceri ve bant için temsil edilen bağlamlar, zorluk, tekrarlı kanıt ve belirsizlik ayrı tutulur. Yapay zekâ önerisi, öz değerlendirme, kesin anahtar ve uzman rubriği farklı güven ve amaç taşır. İlk plan, konuşma/yazı ölçümünün eksik olduğu profille de çalışır.

## Üç doğrulama sorumluluğu

- **Otomatik içerik denetimi:** Zod sözleşmesi, benzersiz ve sürümlü kimlik, çözülür kaynak/medya, geçerli ön koşul grafı, madde türüne uygun anahtar/rubrik, normalizasyon çakışması, boş veya tekrar eden seçenek, kanıt politikasında eksik aşama. Öğretim ve kontrol bağlamlarının kimlik ve metin tekrarını uyar. Kabul edilen ve reddedilen örnekler anahtarın dışında ayrıca test edilmeli. Sürüm değişiminde v1/v2 yedekleri ve kayıt geçişi çalışmalı.
- **Uzman incelemesi:** Doğallık, doğru alternatifler, kabul edilebilir dil çeşitleri, seviye ve bağlam uygunluğu, hatanın gerçek açıklaması, çeldirici kalitesi, ses ve transkript uyumu, rubrik ve düzey örnekleri, telif/izin kaydı. Yazarın ürettiği anahtar, uzman örneğiyle karşılaştırılır. AI üretimi de aynı kuyruğa girer.
- **Öğrenci pilotu:** Aynı amacı ölçen farklı görevler; başlangıç, öğretim sonrası ve gecikmeli gözlem. Yardımı, deneme süresini, kopuşu ve beklenmeyen rota kararını kaydet. İki değerlendirici örnek rubrikleri ayrı uygular, uyuşmazlığı inceleyip ölçütü düzeltir. Küçük pilot kusur ve yön bilgisi verir. Genel öğrenme etkisi ve seviye kalibrasyonu için daha geniş, dil ve başlangıç bandına göre ayrılmış örnek gerekir.

Aralıklı çalışma ve düzeltici geri bildirim için araştırma desteği var. Uygulamanın özel gecikme süresi, yöntem seçimi, ses farkı ve kullanıcı deneyimi ayrıca doğrulanır. [Kim ve Webb, 2022](https://doi.org/10.1111/lang.12479) · [Lyster ve Saito, 2010](https://doi.org/10.1017/S0272263109990520)

## Otomatik öğrenci senaryoları

Her satırın girdisi sabit içerik sürümü, öğrenci geçmişi, yerel zaman ve bütçeyle yeniden üretilebilir. Motor testinde karar, neden ve kayıt değişimi; tarayıcıda öğretim etkileşimi ve sonraki öneri doğrulanır. Tarayıcı beklenen yanıtları anahtar dosyasından otomatik kopyalamak yerine kritik senaryolarda bağımsız öğrenci örnekleri kullanır.

| Senaryo | Beklenen otomatik kanıt | v1 doğrulaması |
| --- | --- | --- |
| G1 · Yeni başlayan / Kiril yardımı | Okuma eksiği Kiril köprüsünü açar. Öz beyan sonucu değiştirmez. Yeniden açmada sıradaki tanılama maddesi korunur. | Kiril köprüsü, C1 öz beyanından bağımsız yönlendirme ve yeniden yüklemede tanılamaya dönüş testli. Komşu bant bankası yok. |
| G2 · Hızlı öğrenci | Bağımsız kısa görevlerle güçlü olan kısım kısalır. Yeni bağlam ve gecikmeli görev hâlâ açılır. Çelişkili örneklerde kısaltma uygulanmaz. | İlk ünite kısaltması motor ve masaüstü/mobil Chromium’da testli. Çok bantlı rota planlı. |
| G3 · Tanıyor ama kullanamıyor | Seçenekli doğru ve yazılı hata ile destekli üretim seçilir. Yeni bağımsız görev, farklı bağlam ve yardım miktarı ekranda gözlenir. Açık uçlu yanıt kendi kendine doğruya çevrilmez. | Yeni varyant ve inceleme durumu testli. Öğretim yöntemi değişimi planlı. |
| G4 · Ön koşul ve tekrarlanan hata | Hata ön koşul çalışmasını açar. Yeni soru öncesinde farklı bir öğretim örneği gösterilir. | Ön koşul örneği, farklı soru ve geri dönüş testli. Birden fazla yeniden öğretim yöntemi eksik. |
| G5 · Yanlış anlama | Okuma, ana fikir ve ayrıntı hataları ilgili açıklamayı ve paralel görevi açar. Tekrarlanan hata eksik kanıt olarak kalır. | Okuma ve dinleme için yeni kaynak ve ipucu tarayıcıda testli; ikinci yanlışta eksik kanıt korunur. |
| G6 · Ses eksik / çevrimdışı / AI reddi | İzin ve ses yokken çalışma sürer. Dinleme veya konuşma puanı oluşmaz. Çevrimdışı yerel açıklama, yeniden yükleme ve yedek çalışır. AI kota/ret durumunda taslak kalır. | Çevrimdışı Rusça ve dinleme atlama motoru testli. Yeni öğrenci senaryosu, hesapsız rotada ölçülmemiş becerilerin durumunu doğrular. Hesap reddi, AI ekranı ve ses geri dönüş senaryoları planlı. |
| G7 · Gecikmeli başarısızlık | Saat ilerlediğinde yeni bağlam açılır. Yeni hata eski doğruyla kapatılmaz; aynı görev gecikmeli kanıt olarak kullanılmaz. | 24 saat, yeni varyant ve önceki hatanın korunması testli. İki yeni soru bitince kanıt açık kalır; dönemsel banka eksik. |
| G8 · Karşılaştırmalı gelişim | İlk ve gecikmeli deneme tarih ve yanıtıyla yan yana görünür. Kalibre edilmemiş görevlerden gelişim düzeyi çıkmaz. | İlk kontrollü aktarım ve gecikmeli yanıt yan yana. Zorluk eşdeğerliği ve gelişim etkisi doğrulanmadı. |
| G9 · Yazı, konuşma ve kişisel dinleme | Yazı taslağı ile revizyon ayrı, yerel prova ve dış rapor ayrı kalır. Uygun rapor planı günceller. | Yazı revizyonu, yerel prova ve dış rapor dönüşü testli. Yerel konuşma değerlendirmesi ve üretim rubriği puanı yok. |
| G10 · Uzun rota, zaman ve kayıt | Bütçe ve takvim yeni görevlere ve vadesi gelen tekrarlara yer verir. Yedek kanıtı korur. | Her dilde altı ders, beş dakikalık çok haftalı takvim ve v1/v2 yedek testleri. Genel/mesleki uzun yollar yok. |

CI sırası içerik denetimi, motor ve veri geçişi testleri, üretim derlemesi, iki dilde seçilmiş uçtan uca senaryolar. Hata izinde görev kimliği, aşama, önceki kanıt ve öneri nedeni bulunur. Gerçek öğrenci kayıtları test verisi olarak kullanılmaz. Uzman bulgusu veya öğrenci gözlemi yazılım regresyonuna çevrilebiliyorsa ayrı örnek eklenir.

Uygulamadaki seçili v1 dersleri teknik içerik kapısını geçti. Uzman incelemeli veya öğrenci etkisi doğrulanmış bir seviye yayımlamak için ayrıca uzman ve pilot kapıları gerekir. Uzman incelemesi ile öğrencinin edinimini ölçmek iki ayrı kapıdır. Daha yüksek seviyelerin açılması [kapsam matrisi](CURRICULUM_ARCHITECTURE.md) ve [uygulama planındaki](IMPLEMENTATION_PLAN.md) yayın sırasıyla ilerler.
