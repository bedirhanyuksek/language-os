# Öğretim analizi

> Codex (gpt-6.1-sol) ile salt okunur inceleme, 2026-11-20. Uygulama planı için [NEXT_ROUND.md](NEXT_ROUND.md).

**1. Şikâyetlerin bugünkü kodda karşılığı**

**A — Alıştırma, anlatımdan önce geliyor**

- Normal ders yolunda anlatım mevcut: `LessonStudy`, `teaching.situation` ve `teaching.models` örneklerini sırayla gösterip ardından pratiği açıyor. Ancak anlatım adımı yalnızca bileşenin `useState(0)` durumunda; görülmüş örnekler ve yarım oturum kalıcı kaydedilmiyor. [StudyViews.tsx:79](../src/features/StudyViews.tsx:79)
- `canAccelerate`, yerleştirmede her kavram için doğru tanıma ve kontrollü üretim bulduğunda anlatımı atlatabiliyor. Günlük plan doğrudan `transfer` açıyor; bu ekran genel anlatımı göstermeden formu sunuyor. Öğrenciye anlatımı yeniden açabileceği açık bir seçim sunulmuyor. [pedagogy.ts:9](../src/domain/pedagogy.ts:9), [progress.ts:315](../src/domain/progress.ts:315), [PedagogyView.tsx:98](../src/features/PedagogyView.tsx:98)
- İlk deneyim her durumda zorunlu tarama: `placementAt` yokken ders açılamıyor. Böylece özellikle sıfır başlayan öğrenci, öğretimden önce bütün soru grubuyla karşılaşıyor. [App.tsx:171](../src/features/App.tsx:171)
- Kelime öğretimi, plan sıralamasında aktarım, okuma ve dinlemeden sonra geliyor. Yazmadan önce kullanım notları gösterilse de ilgili kelimeyi görevden önce sistematik öğretme garantisi yok. Bu, deneyim belgesindeki “kelime ve kalıp ilgili görevden önce öğretilir” hedefiyle uyuşmuyor. [pedagogy.ts:135](../src/domain/pedagogy.ts:135), [LEARNING_EXPERIENCE_SPEC.md:18](LEARNING_EXPERIENCE_SPEC.md:18)

**Sonuç:** Anlatım içeriği bulunuyor; bütün giriş yollarını kapsayan, kaydedilen bir “önce öğret” sözleşmesi bulunmuyor.

**B — Yol haritası ve haftalık/aylık plan belirsiz**

- Şema bir kurs altında tek `unit` tanımlıyor. Katalog, farklı düzeylerden içerikleri bu ünitenin `lessons` dizisine ekliyor. Gerçek seviye → ünite → ders hiyerarşisi korunmuyor. [schema.ts:33](../src/content/schema.ts:33), [catalog.ts:83](../src/content/catalog.ts:83)
- Ana ekranda ders listesi ve açılır A1–C2 kapsamı zaten var; ancak liste düz, satırlar ders açmıyor ve ünite geçişini/takvimini göstermiyor. Menüde yalnızca Plan, Beceri profili ve Ayarlar var. [StudyViews.tsx:23](../src/features/StudyViews.tsx:23), [StudyViews.tsx:64](../src/features/StudyViews.tsx:64), [App.tsx:280](../src/features/App.tsx:280)
- `dailyPlan` bir sonraki işi hesaplıyor; çalışma günü, dakika, hedef ve ön koşulları kullanıyor. Haftalık sıra, kalan toplam emek veya tahmini bitiş üretmiyor. [progress.ts:253](../src/domain/progress.ts:253)

**Sonuç:** Öğrenci yayımlanan dersleri görebiliyor; kendi konumunu, sonraki ünitesini ve hedefe yönelik zaman planını okuyamıyor.

**C — Tekrar güvenilir değil, gelişim görünmüyor**

- Kelime tekrarında kayıt ve geçmiş mevcut. Başarı aralıkları 1/3/7/14/30 gün; ardışık başarısızlıklarda bekleme 10 dakikadan 1/2/4 güne uzuyor. Tekrarlanan yanlışlar yeniden öğretim yerine giderek geciken kartlara dönüşebiliyor. [review.ts:11](../src/domain/review.ts:11)
- Günlük plan önce öğretim görevinin süresini ayırıyor, tekrarları kalan dakikalara yerleştiriyor. Beş dakikalık ders, beş dakikalık bütçeyi doldurabiliyor. Özel tekrar günü mekanizması yalnızca beş dakikalık profilde en az on kart gibi koşullarda devreye giriyor. Daha küçük kuyruklar da ertelenebiliyor. [progress.ts:320](../src/domain/progress.ts:320)
- Kavramların gecikmeli kontrolünde iki kritik boşluk var: son gecikmeli cevap doğruysa başka kontrol üretilmiyor; bütün `delayed` varyantları kullanılıp yanlış kalırsa yeni görev bulunamıyor. Bu, sürekli tekrar sağlamıyor. [pedagogy.ts:100](../src/domain/pedagogy.ts:100)
- `ready` ve `retained` esas olarak kavram/aktarım kontrollerine dayanıyor. Okuma, dinleme ve serbest üretimin durumu ayrı kalırken sonraki ders açılabiliyor. `retained` zaman geçince yeniden kontrol gerektiren bir duruma dönüşmüyor. [progress.ts:71](../src/domain/progress.ts:71), [progress.ts:228](../src/domain/progress.ts:228)
- Beceri profilinde tekrar geçmişi ve ilk/gecikmeli cevap karşılaştırması bulunuyor; ana görünüm ise ağırlıkla doğru cevap ve gözlem sayıları gösteriyor. Haftalık kazanım özeti, yaklaşan kontroller ve kalan öğrenme adımları yok. [StudyViews.tsx:231](../src/features/StudyViews.tsx:231)

**Sonuç:** Veri toplanıyor; tekrarın sürekliliği ve öğrencinin anlayacağı gelişim anlatımı eksik.

**D — Başlangıç ve zorluk uyumsuz**

- Rusça ilk soru doğrudan “Меня зовут Оля…” metnini okutuyor; sonraki görevler Kiril yazmayı da istiyor. Form bütün sorulara yanıt zorunlu tutuyor. “Kiril bilmiyorum / sıfırdan başla / bunu atla” yolu yok. [ru.json:432](../src/content/ru.json:432), [ExerciseForm.tsx:64](../src/features/ExerciseForm.tsx:64)
- Kiril dersi ancak taramadaki okuma yanlışı veya en az üç gramer yanlışı gibi sonuçlardan sonra öneriliyor. Yani temel eksik, öğrenciyi önce başarısızlığa uğratarak keşfediliyor. [diagnostic.ts:10](../src/domain/diagnostic.ts:10), [diagnostic.ts:60](../src/domain/diagnostic.ts:60)
- Mevcut `ru.cyrillic` birkaç harflik köprü. Öğretim notu bütün Kiril harflerini kapsamadığını açıkça söylüyor. Üstelik `ru.intro` ön koşulsuz ve “Я ve вы … sesli oku” hatırlatmasıyla başlıyor. [teaching.ts:161](../src/content/teaching.ts:161), [ru.json:21](../src/content/ru.json:21)
- Hedef seviye mevcut yeterlik gibi rota seçimini etkiliyor: İngilizce A1 dersleri bazı profillerde eleniyor; A1/A2 hedef seçmek ise başlangıç rotasını tetikliyor. Aynı bilgi düzeyindeki kişinin yalnızca hedefini değiştirmesi başlangıç yolunu değiştirebiliyor. [progress.ts:247](../src/domain/progress.ts:247), [progress.ts:263](../src/domain/progress.ts:263)
- İspanyolca için yalnızca yeni paket eklemek yetmez: dil enum’u EN/RU, köprü seçimi “RU ise Kiril, diğeriyse İngilizce rutin”, ses üretimi de ikili dil seçimine bağlı. [model.ts:3](../src/domain/model.ts:3), [diagnostic.ts:6](../src/domain/diagnostic.ts:6), [teaching.ts:20](../src/content/teaching.ts:20)

**Sonuç:** Hedef, yazı sistemi bilgisi ve mevcut beceri yeterince ayrıştırılmıyor; küçük tarama ve birkaç sabit eşik geniş rotayı belirliyor.

**2. Hedef ders akışı ve veri modeli**

Standart akış: **hedef → anlatım ve örnekler → gerekli kelimeler → kontrollü pratik → yeni bağlamda kullanım → kişisel üretim → açıklamalı sonuç/revizyon → aralıklı kontrol.** Okuma ve dinleme, dersin iletişim hedefine göre üretimden önce veya sonra konumlanmalı.

| Adım | Kullanılacak mevcut alanlar | Eklenecek alan/davranış |
|---|---|---|
| Hedef ve hazırlık | `objective.description`, `objective.level`, `prerequisites`, `recall` | `lessonKind`, açık `successCriteria`; bilinmeyen ön bilgiyi hatırlama talebine dönüştürmeyen başlangıç |
| Türkçe anlatım | `teaching.situation`, `approach`, `models`; `pedagogy.sections`; `explanation`, `examples` | Anlatım bloklarına sabit kimlik ve `conceptIds`; model–kavram bağlantısı |
| Gerekli kelimeler | `vocabulary`, `teaching.vocabulary`, `pedagogy.vocabulary`, `receptive` | Görevlerde `requiredVocabularyIds`; öğretilecek ve yalnızca tanınacak ifadelerin ayrımı |
| Kontrollü pratik | `concepts[].variants` | İpucu, çözülmüş örnek ve yardımsız deneme ayrımı; her yanıtın ardından kısa geri bildirim |
| Okuma/dinleme | `reading`, `listening`, `receptionRetry`, `readingPurpose` | Görev/bağlam kimliği ve kullanılan destek; transkriptle çalışma dinleme başarısı sayılmaz |
| Yeni bağlamda kullanım | `checks[].transfer` | `contextId`, yardım düzeyi ve gerekli kanıt politikası |
| Kişisel üretim | `production`, `speaking`, `rubric` | İlk örnek ve ölçütler görev öncesinde erişilebilir; yazı kaydetmek otomatik başarı sayılmaz |
| Sonuç ve onarım | Alıştırma `explanation`, `checks[].correction`, `foundation`, `revision` | Hata → ilgili anlatım bloğu → yeni paralel deneme bağlantısı |
| Gecikmeli kontrol | `checks[].delayed`, `reviewAfterHours`, tekrar kayıtları | Sürekli çizelge, sonraki tarih, tekrar nedeni ve varyant yönetimi |

Mevcut alanlar bu akışın büyük bölümünü karşılıyor; ikinci bir anlatım deposu oluşturulmamalı. [schema.ts:18](../src/content/schema.ts:18), [teaching.ts:7](../src/content/teaching.ts:7), [pedagogy-schema.ts:22](../src/content/pedagogy-schema.ts:22)

Yeni sözleşmeler:

- **`LessonFlow`**: sıralı aşamalar; her aşamada `id`, `kind`, içerik/görev referansları, tahmini dakika ve tamamlanma koşulu. Alfabe dersine gereksiz paragraf yazma veya gramer rubriği zorunluluğu yüklenmemeli.
- **`LessonSession`**: aktif aşama, görülen anlatım blokları, taslak yanıtlar, kullanılan ipuçları, ertelenen görev ve son kayıt zamanı. Yenileme sonrası aynı noktadan devam.
- **Deneme metadatası**: `contextId`, `assistance`, `assessmentVersion`; atlanan/bilinmeyen görev için ayrı durum ve neden. Bunları cevap metnine `"bilmiyorum"` yazarak temsil etmemek.
- **`CompletionPolicy`**: sonraki dersi açmaya yeterli kanıt ile dersin bütün gerekli çalışmalarını bitirme koşulu ayrı. Kalıcılık durumu ayrıca hesaplanmalı.

İlk öğrenmede anlatım varsayılan olmalı. Hızlandırmaya uygun öğrenciye “Kısa kontrolle ilerle” ve “Konuyu anlat” seçenekleri gösterilmeli. Hızlandırma başarısızsa ilgili anlatım otomatik açılmalı; her aşamada “Anlatıma dön” bulunmalı.

İçerik denetimi yalnızca alan varlığına bakmamalı. Örneğin `ru.forms` anlatım modelleri bütün yaş biçimlerini göstermeden `год` ve `лет` ürettiriyor; `en.shopping` aktarım sorularının bazıları seçenekleri soru içinde veriyor. Model–hedef kapsamı ve yardım düzeyi ayrıca doğrulanmalı. [ru-registration.json:17](../src/content/packs/ru-registration.json:17), [ru-registration.json:33](../src/content/packs/ru-registration.json:33), [en-shopping-basics.json:42](../src/content/packs/en-shopping-basics.json:42)

**3. Seviye → ünite → ders yol haritası**

Ders ve alıştırma kimliklerini koruyan, ayrı bir **müfredat manifestosu** eklenmeli:

`CourseRoadmap → LevelNode[] → UnitNode[] → lessonIds[]`

- Seviye: bant, yayımlanan kapsam, planlanan kapsam, üniteler ve kapsam açıkları.
- Ünite: iletişim hedefi, ders sırası, gerekli/isteğe bağlı dersler ve ünite sonu kontrolü.
- Ders bağlantısı: sıra, ön koşullar, hedeflere uygunluk ve aşama bazlı süre.
- “Başlangıç/Kiril hazırlığı” CEFR seviyelerinden ayrı gösterilmeli; yeni bir resmî seviye gibi sunulmamalı.
- İlk sürümde eski `course.unit.lessons` tüketicileri uyumluluk katmanıyla korunabilir. Yol haritası dosya yükleme sırasından türetilmemeli.

**Durum hesabı tek domain çıktısından yapılmalı:**

| Boyut | Durumlar ve kural |
|---|---|
| Erişim | Yayımlanmadı / ön koşul bekliyor / başlanabilir |
| Ders çalışması | Başlanmadı / sürüyor / gerekli aşamalar tamamlandı |
| Kanıt | Destekle yapıyor / yardımsız kullanım gözlendi / inceleme bekliyor |
| Kalıcılık | Kontrol bekliyor / kontrol zamanı geldi / gecikmeli doğrulandı / yeniden çalışma gerekiyor |

Ünite ilerlemesi gerekli ders ve ünite kontrolünden hesaplanmalı. “8/10 ders çalışıldı” ile “5 kazanım gecikmeli doğrulandı” ayrı gösterilmeli. Seviye kartı, yayımlanan alt kapsamı tamamlamayı bütün CEFR seviyesini kazanmakla eşitlememeli; mevcut mimari de seçili kazanım kapsamını vurguluyor. [CURRICULUM_ARCHITECTURE.md:51](CURRICULUM_ARCHITECTURE.md:51)

**Sonraki adım seçimi:**

1. Devam eden oturum ve gerekli temel onarımı belirle.
2. Vadesi gelen kelime/kavram kontrollerine bütçe ayır.
3. Kanıtlanan başlangıç noktasından itibaren ön koşulları sağlanan dersi seç.
4. Aynı derecede uygun adaylarda `goals` tercihlerini kullan.
5. Çıktıya `reasonCode`, gerekçe, kaynak kanıt kimlikleri ve süre ekle. Ana ekran ve yol haritası aynı kararı göstermeli.

`target` bitiş kapsamını, `minutes` ve `days` hızı belirlemeli. Başlangıç yeterliğini hedef seviyeden çıkarmamak gerekir.

**Hafta hesabı:**

- Haftalık kapasite: `B = profile.minutes × seçili gün sayısı`.
- Kalan iş: bitmemiş aşamaların dakikaları + öngörülen tekrarlar + onarım payı.
- İlk tahmin editoryal aşama sürelerinden; yeterli kullanım sonrası benzer aşamalardaki gözlenen sürelerden hesaplanmalı. Bugünkü `activity.minutes` tahmini olduğundan gerçek ölçüm gibi kullanılmamalı. [progress.ts:108](../src/domain/progress.ts:108)
- Seçili günler üzerinde günlük bütçe ve `dueAt` kısıtlarıyla takvim simülasyonu yapılmalı. Gecikmeli doğrulama için gereken bekleme takvime dahil edilmeli.
- Örneğin 20 dakika × 5 gün = 100 dakika/hafta; kalan yayımlanmış iş ve tekrarlar varsayımsal olarak 400–600 dakikaysa yaklaşık 4–6 çalışma haftası gösterilmeli.
- Hedefte içerik açığı varsa yalnızca mevcut kapsama süre verilmeli; hedef seviyenin tamamına bitiş tarihi üretilmemeli.

**Eklenecek ekran: “Yol haritam”.** Seviye kartları → ünite ayrıntısı → ders aşamaları açılmalı. Üstte “Buradasın”, “Sıradaki ders”, “Bu hafta” ve “Önümüzdeki dört hafta” bulunmalı. Kilit nedenleri, tekrar tarihleri, süre varsayımları ve yayımlanmamış kapsam görünür olmalı.

**4. Tekrar ve gelişim tasarımı**

- Kelime ve kavram için ortak bir **tekrar kuyruğu** oluşturulmalı: öğe türü, son kanıt, başarı aralığı, başarısızlık sayısı, `dueAt`, `nextVariantId` ve tekrar nedeni.
- Kelime öğretimindeki ilk hatırlama sonucu çizelgeye aktarılmalı. Bugünkü gibi her kartı, ilk yanıtına bakmadan hemen vadesi gelmiş olarak eklemek yerine başarılı ilk öğrenme sonrası gecikmeli kontrol planlanmalı. [progress.ts:169](../src/domain/progress.ts:169)
- Başlangıç politikası olarak 1/3/7/14/30 günlük başarı aralıkları korunabilir. Kavramlar da bu çizelgeye katılmalı; bir başarılı gecikmeli kontrol tekrarları bitirmemeli.
- Yanlış yanıtta kısa açıklama ve destekli yeniden öğrenme açılmalı; ardından ilk uygun günde yardımsız kontrol gelmeli. Ardışık yanlışlar beklemeyi otomatik büyütmemeli.
- Varyantlar tükenince görev sessizce kaybolmamalı. Yeniden öğrenme sunulmalı; tekrarlanan soru “yeni bağlam kanıtı” olarak işaretlenmemeli. Yeni bağlam iddiası için editoryal olarak doğrulanmış ek varyantlar gerekli.
- Kuyruk önceliği; gecikme, son yanlış, temel önemi ve konuşma raporundaki açık üzerinden hesaplanmalı. Günlük tekrar payı, kuyruk varken en az bir kısa kontrolü karşılamalı. Beş dakikalık oturum için yaklaşık iki dakika tekrar/üç dakika öğretim başlangıç politikası olabilir; görevler buna sığan bloklara ayrılmalı.
- Uzun aradan dönüşte birikmiş bütün kartlar yüklenmemeli. Kısa örnekleme, yeniden öğrenme ve birkaç güne yayılan toparlama planı oluşturulmalı.
- Dinlenme gününde ana plan korunmalı; öğrenci isterse kısa tekrar açabilmeli.

Öğrenciye gösterilecekler:

- **Bugün:** “3 ifade, 1 kazanım kontrolü; yaklaşık 4 dakika.”
- **Ders sonunda:** neyi yapabildiği, hangi desteği kullandığı, sıradaki çalışma ve kontrol tarihi.
- **Gelişim ekranında:** çalışılan/yeni bağlamda kullanılan/gecikmeli doğrulanan kazanımlar; gereken destek ve inceleme bekleyen üretimler.
- **Haftalık özette:** tamamlanan üniteler, doğrulanan kazanımlar, zorlanılan noktalar ve gelecek haftanın planı.
- İlk/son örnek karşılaştırmaları yalnızca zorluk ve destek karşılaştırılabilir olduğunda gelişim iddiası üretmeli. Öz bildirim ve dış raporlar kaynak etiketiyle ayrı kalmalı.

**5. Yerleştirme ve düzey düzeltmeleri**

**Ortak giriş**

Profil sonrası iki yol sunulmalı: **“Sıfırdan öğreniyorum”** ve **“Bildiklerimi kontrol et.”** İlk yol ders açmak için tarama tamamlamayı gerektirmemeli; `placementAt` yerine başlangıç seçimini de kapsayan bir onboarding durumu kullanılmalı.

Tarama tek tek kaydedilen kısa görevlerden oluşmalı. “Bilmiyorum”, “Atla”, “Sonra devam et” seçenekleri bulunmalı. Eksik yanıt, erişilemeyen ses ve yanlış yanıt ayrı saklanmalı. Yeni kanıt toplandıkça başlangıç noktası güncellenmeli; birkaç sorudan genel CEFR seviyesi atanmasından kaçınılmalı.

“Çok kolay” seçimi paralel bir meydan okuma açmalı; başarılı tanıma ve yardımsız üretim ilgili kazanımı atlatabilmeli. “Çok zor” seçimi ipucu/anlatım/ön koşul onarımına dönmeli. Tek hata bütün seviyeyi düşürmemeli.

**Rusça gerçek başlangıç rotası**

1. Türkçe yönergelerle yazı sistemi tanıtımı; ilk ekranda Kiril okuma/yazma zorunluluğu bulunmamalı.
2. Küçük gruplarla harf–ses öğretimi: benzer harfler, yanıltıcı benzerler, yeni biçimler.
3. Öğretilen harflerle hece ve kısa kelime çözümleme; vurguya giriş.
4. Kiril giriş desteği: karakter seçici veya uygulama klavyesi; fiziksel klavye bilgisi ayrı tutulmalı.
5. Tanışma dersinin gerektirdiği harf/kelime kapsamı için kontrol.
6. `ru.intro` → meslek/yer → sayılar ve diğer A1 üniteleri.

Bütün alfabenin bitmesi ilk iletişimi gereksiz geciktirmemeli; her dersin gereken harf kapsamı açıkça tanımlanmalı. Mevcut `ru.cyrillic` kimliği korunarak bu ünitenin ilgili köprü dersi olarak kullanılmalı. “Kiril okuyabiliyorum” diyen öğrenci kısa kontrolle hazırlığı geçebilmeli; sözlü bilgisi ve yazı bilgisi ayrı değerlendirilmeli.

**İspanyolca başlangıcı**

- Ayrı `es` dil kaydı, ses yereli ve dil bazlı kabul politikası eklenmeli. Latin harfi bilen Türkçe konuşan öğrenci için temel harf öğretimi yerine ses–yazı eşleşmesi, vurgu, aksan işaretleri ve `ñ` gibi farklar öğretilmeli.
- İlk sıra: ses/yazı farkları → selamlaşma ve ad → temel kişisel bilgiler → sayılar/günlük ihtiyaçlar. Serbest üretim, gerekli kalıplar öğretildikten sonra gelmeli.
- Yeni dil kaydı; başlangıç yolu, tarama bankası, ses yerelleri ve normalizasyon kurallarını taşımalı. `en ? … : ru` dalları kaldırılmalı.
- Paket doğrulamasındaki EN/RU kimlik kısıtı ve zorunlu en az bir ön koşul, bağımsız İspanyolca başlangıç derslerini destekleyecek şekilde değişmeli. [packs.ts:25](../src/content/curriculum/packs.ts:25)
- İlk yayın kapsamı tamamlanmış başlangıç üniteleriyle gösterilmeli; henüz yazılmamış seviyeler açıkça planlı kalmalı.

**6. Paralel uygulanabilecek beş iş paketi**

Dosya sahipliği tekil tutulmalı. Ortak tipler ve fonksiyon imzaları başta kararlaştırıldıktan sonra 1–4 numaralı paketler sözleşme örnekleriyle paralel yürüyebilir.

| Paket | Sahip olduğu dosyalar | Teslim ve kabul ölçütü |
|---|---|---|
| **1 — Ders oturumu ve öğretim sırası** | `src/domain/pedagogy.ts`, `src/content/teaching.ts`, `src/features/PedagogyView.tsx`; yeni `lesson-session.ts`, `LessonSessionView.tsx`; `tests/pedagogy.test.ts` | Kalıcı aşama akışı, görev öncesi anlatım/kelime, anlık geri bildirim, anlatıma dönüş. Yenileme aynı aşamayı ve taslağı açar; hızlandırma başarısızlığı öğretime döner. |
| **2 — Müfredat ve yol haritası** | Yeni `src/content/roadmaps/*`, `src/domain/roadmap.ts`, `src/features/RoadmapView.tsx`, `tests/roadmap.test.ts`; `docs/CURRICULUM_ARCHITECTURE.md` | Seviye/ünite/ders manifestosu, durum seçicileri, haftalık/dört haftalık görünüm ve süre simülasyonu. Gün, dakika, hedef ve ilerleme değişince tutarlı yeniden hesaplama. |
| **3 — Tekrar motoru ve gelişim** | `src/domain/review.ts`, `src/domain/progress.ts`; yeni `review-queue.ts`, `ProgressView.tsx`, `ReviewView.tsx`; `tests/review-load.test.ts`, `tests/engine.test.ts` | Sürekli kelime/kavram çizelgesi, bütçe paylaşımı, ders/kalıcılık ayrımı, gelişim özeti. Beş dakikalık bütçe, tekrarlanan yanlış, varyant tükenmesi ve uzun ara senaryoları doğrulanır. |
| **4 — Yerleştirme ve başlangıç içerikleri** | `src/domain/diagnostic.ts`, `src/domain/assessment.ts`, `src/features/ProfileForm.tsx`, `src/features/DiagnosticView.tsx`; yeni `PlacementView.tsx`, `placement-session.ts`, `language-config.ts`, `packs/ru-alphabet-*.json`, `packs/es-*.json`; `tests/personal-path.test.ts`, içerik kabul testleri | Tarama atlanabilen başlangıç, kaydedilen uyarlamalı tarama, Kiril ünitesi ve İspanyolca başlangıcı. Sıfır Rusça bilen kişi ilk soruda Kiril çözmeye zorlanmaz; ileri öğrenci temeli kanıtla geçer. |
| **5 — Ortak sözleşmeler, kayıt ve entegrasyon** | `src/domain/model.ts`, `src/domain/state.ts`, `src/content/schema.ts`, `pedagogy-schema.ts`, `exercise-schema.ts`, `catalog.ts`, `continuity.ts`, `curriculum/packs.ts`; `src/persistence/*`; `App.tsx`, `StudyViews.tsx`, `ExerciseForm.tsx`, `labels.ts`, ortak stiller; `tests/repository.test.ts`, `tests/startup.test.ts`, ilgili E2E testleri; iki deneyim/pedagoji belgesi | Yeni alanlar, dil kaydı bağlantıları, sürümlü kayıt geçişi, menü ve ekran entegrasyonu. Eski yedekler/kimlikler korunur; geçmişte görülmemiş anlatım veya yapılmamış tekrar yapılmış sayılmaz. |

**Çakışma ve bağımlılık kuralları**

- `progress.ts` yalnızca paket 3 tarafından değiştirilir. Paket 1’in aşama koşulları ve paket 4’ün yerleştirme kararları ayrı modüllerden çağrılır.
- `App.tsx`, `StudyViews.tsx` ve ortak şemalar yalnızca paket 5’e aittir. Diğer paketler bağımsız ekran ve domain modülleri teslim eder.
- Paket 1, `PedagogyView.tsx` içindeki tekrar bileşenini uyumluluk ihracıyla korur; yeni tekrar arayüzünü paket 3 kendi dosyasında geliştirir.
- Paket 4 yeni ders kimliklerini, paket 2 bunların ünite yerleşimini yönetir. Yeni başlangıç içeriği ile yol haritası aynı dosyada tutulmaz.
- Paket 5 önce asgari ortak sözleşmeleri ve örnek kayıtları teslim eder; ardından diğer paketler paralel ilerler. Son entegrasyonda katalog adaptörleri, eski kayıt geçişi ve uçtan uca akış birlikte doğrulanır.
- Yayın kabulü dört şikâyete bağlanır: **ilk öğretimden önce zorunlu sınav yok; görünür sonraki ünite ve takvim var; tekrar kuyruğu aç kalmıyor; başlangıç yolu hedef seviyeden bağımsız ve kanıta göre ayarlanıyor.**