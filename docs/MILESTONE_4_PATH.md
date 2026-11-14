# Milestone 4 · Kişisel öğrenme yolu ve kapsam

## Başlangıç ve günlük rota

Önceki tarama dil başına sabit bir çekirdek ve isteğe bağlı okuma/dinleme örneği sunuyordu. Artık iki alımlama örneği de doğruysa ve öğrenci köprü rotasında değilse iki hedefli dil bilgisi ve söz varlığı örneği açılıyor. İlk taramada yanlış yanıtlar ve ek örnekler, bağlı kazanımlara ilişkin açıkları gösterir. Yazı örneği inceleme bekler. Konuşma için gözlem, kullanıcı onaylı dış rapordaki kanıta bağlıdır. Başlangıç öz tahmini, hedef ve çalışılan ders bandı ayrı kalır.

Güçlü tanıma ve kontrollü üretim kanıtı varsa öğrenci yeni bağlam kontrolüne geçebilir. Dinleme örneği zayıfken okuma güçlü ise tek başına dinleme sonucu öğrenciye temel gramer veya Kiril köprüsü atamaz. İlk uygun derste dinleme erkene alınır. Aynı hedefte bir günde üç ardışık başarısızlık olursa diğer uygun hedefler devam edebilir. Ön koşulu kapanmamış bir hedef başarı kazanmış sayılmaz.

Günlük plan bir sonraki yapılabilir çalışmayı, seçilme nedenini ve kullanılan/kalan dakikaları gösterir. Tercihler 5–180 dakika kabul eder. Yanıta bağlı sonraki adımlar her kayıttan sonra yeniden hesaplanır. Önerilen süreler tahmindir ve harcanan gerçek süre ölçülmez. Plan, gelecekteki serbest yazının veya bir dış konuşma oturumunun performansını önceden varsaymaz. Son yayımlanan hedef sonrası vadesi gelen tekrarlar sürer ve hedef bantta içerik yoksa uygulama açıkça belirtir.

Her dil için ayrı profil, tarama, çalışma zamanı, denemeler, kartlar ve konuşma raporları saklanır. IndexedDB'nin mevcut çalışma alanında etkin kayıt ve bekleyen dil kaydı tek transaction içinde yer değiştirir. Eski tek dilli kayıt biçimi açılır. Yedek dosyası etkin dili içerir. Farklı dilden yedek geri yüklenince önceki etkin dil saklanır ve dosyadaki dil açılır.

## CEFR karşılaştırması ve içerik durumu

Avrupa Konseyi iletişim görevlerini ve yeterlik ölçeklerini tanımlar. Ders sırası, örnek seçimi ve bir göreve atanan bant ürün kararıdır. İngilizce Core Inventory A1–C1 dilsel içerik referansıdır. C2 için CEFR'nin esnek, hassas ve nüanslı kullanım ile aracılık tanımlayıcıları esas alınır. Rusçada TORFL ayrı sınav becerileri ve A1–C2 kapsamı için bir kontrol noktasıdır. [CEFR tanımlayıcıları](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors-search), [British Council ve Eaquals](https://www.teachingenglish.org.uk/publications/case-studies-insights-and-research/british-council-eaquals-core-inventory-general), [SPbPU TORFL](https://english.spbstu.ru/education/programs/short-term-programs/russian-language-studies/testing-center-russian-as-foreign-language/), [Между нами](https://mezhdunami.org/toc.shtml)

Aşağıda her satırdaki yayımlanan hedefler için öğretim, alıştırma/değerlendirme ve otomatik kontrol tamamlanmıştır. Bağımsız uzman ve gerçek öğrenci doğrulaması bekliyor. Açık örnekler tanımlanmış kapsamı gösterir ve ders olarak açılmaz. Ayrıntılı işlev ve ön koşullar [kazanım haritasında](CURRICULUM_ARCHITECTURE.md).

| Bant | İngilizce yayımlanan hedefler | Rusça yayımlanan hedefler | Tanımlanmış kapsam açıkları |
| --- | --- | --- | --- |
| A1 | — | Kiril köprüsü, kibar tanışma, meslek, yaşanan şehir, sipariş | EN ilk temas, sayı/saat, alışveriş ve yer; RU yön, aile, sayı ve saat çeşitliliği |
| A2 | Çalışma rutini ve bugünkü değişiklik köprüsü | Buluşmayı yeniden planlama | EN hizmet, yolculuk ve kısa geçmiş anlatısı; RU geçmiş/gelecek, hareket, yön ve hizmet |
| B1 | Geçmiş deneyim, olay sırası, iş güncellemesi, gerekçeli öneri | Hizmet aksaklığını bildirme ve çözüm isteme | EN görüş, anlatı ve açıklama isteme çeşitliliği; RU görünüş, hareket, anlatı ve görüş |
| B2 ve B2+ | İki seçeneği tartma, koşullu öneri ve vazgeçme eşiği | — | EN profesyonel yazı, itiraz ve uzayan kaynaklar; RU sav, uzun etkileşim, rapor ve bağdaşıklık |
| C1 | İki kaynaktan ölçülü bir sonuç ve öneri çıkarma | — | EN uzun kaynak sentezi, kayıt düzeyi ve müzakere; RU akademik/mesleki sentez, kiplik ve üslup |
| C2 | — | — | Her iki dilde örtük tutumu çözümleme, nüanslı yeniden ifade, uzmanlık alanları arasında aracılık, hızlı ve karmaşık etkileşim |

Yeni diziler `en.tradeoff → en.conditional → en.synthesis` ve `ru.meeting → ru.service`. Her yeni derste iki öğretim modeli, rehberli ve yeni bağlam üretimi, kelime, yazı ve revizyon, farklı kaynakla okuma/dinleme onarımı, gecikmeli kontrol ve sözlü görev var. Çevrimdışı sesler mevcut eSpeak NG ve FFmpeg zinciriyle üretildi. [Ses üretimi](../src/content/audio/README.md)

## Doğrulama sınırları

B1 öz tahmini, güçlü dinleme örneği, dil bilgisi ve kelime hataları ve konuşma raporu eksikliği olan sentetik öğrenci 15, 30 ve 60 dakika bütçelerinde C1 içerik görevine ulaştı ve gecikmeli kontrollü örnek tamamladı. Başlangıç ve hedef ayarları değişmedi. 5 dakikalık hafta içi simülasyonları iki dilin mevcut derslerini kapsar. Simülasyonlar sınırlı örneklerden kişisel rota üretimini sınar. Düzey belirleme geçerliği, öğrenme etkisi, doğal ses kalitesi ve her seviyenin kapsamı için ayrı doğrulama gerekir.

Sonraki içerik çalışması, her iki dilde en büyük boşluklara ve daha uzun doğal alımlama/üretim dizilerine odaklanır. Sınırlı madde bankası ve üçüncü deneme sonrası bekleme eşiği ürün kararlarıdır. Sonlu içerik bankası tükendiğinde uygulama yeni bir ders veya yeterlik iddiası üretmez.
