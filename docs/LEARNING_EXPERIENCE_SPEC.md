# Kişisel Öğrenme Rehberi · Deneyim tasarımı

Bu belge hedef deneyimi tanımlar. Bugün çalışan kapsam [ürün vizyonunda](PRODUCT_VISION.md). Rehberin temel önerileri yerel kanıt ve kurallardan hesaplanır. AI, öğrenci istediğinde aynı hedefe farklı açıklama, örnek veya geri bildirim getirebilir.

## v1 uygulaması

İlk tarama tamamlanınca çalışma hemen açılır. Ek okuma ve dinleme tanılaması plan veya beceri profilinden başlatılır. İlk örneklerdeki okuma veya dil bilgisi hataları temel örnek kümesini seçer. Yanlış ek örnek de köprü önerisi oluşturabilir; tamamlanmamış ek soru sonraki ziyarette devam eder. Tanılama ders başarısına eklenmez. Ana tarama şu anda tek gönderimde tamamlanır; atlanan madde veya taslak kaydı yoktur.

Öğretimde önce açıklama ve örnek, ardından rehberli deneme ve yeni bağlam gelir. Ön koşul hatası önceki kazanımın ayrı örneğini açabilir. Alımlamada ilk yanlış cevap plan gerekçesinde görünür ve ilgili boyut yeni metin veya kayıtla kontrol edilir. Son örnek de yanlışsa eksik kanıt olarak kalır. Yazıda ilk metinle revizyon ayrı saklanır; yerel sesli prova gözlem veya puan üretmez. Rapor aktarımı isteğe bağlıdır. AI öneri sözleşmesi ileride kullanılabilir; uygulama şu anda AI öğretmen çağırmaz.

## Hedef ekranlar ve veri akışı

| Ekran | Öğrenci deneyimi | Okunan ve yazılan veri | Sonraki karar |
| --- | --- | --- | --- |
| Hedef ve kapsam | Dil, günlük/mesleki hedef, kullanacağı ortam, çalışma süresi. Yayımlanan kapsamı ve tanılamanın sınırını görür | Hedef profili, kendi seviye tahmini, gün ve zaman tercihi, içerik kapsamı | Öz beyan ölçüm veya rota kararı üretmez. Önceki kanıt, geçerli pakette başlangıç aralığını daraltır. |
| Tanılama ve beceri profili | Birkaç farklı türde kısa görev. “Bilmiyorum”, ses erişimi ve erteleme seçenekleri. Her beceride gözlem, güven ve eksik veri görünür | Madde sürümü, bağlam, yardım, sonuç, kaynağa bağlı kanıt. Eksik görev için neden | Yeterli, çelişkili veya yetersiz kanıt ayrılır. Kararsız bantta komşu banttan bir görev verilir. Uygun içerik yoksa mevcut kapsam ve devam seçenekleri gösterilir. |
| Bugünkü rehber | Bir öneri, nedeni, iletişim getirisi, tahmini süre. Örneğin “Yer adını tanıyorsun. Sesli tanışmada kimin nerede yaşadığını ayırmayı dene.” Başka uygun çalışma seçilebilir | Hedef, ön koşullar, kanıt açığı, ertelenmiş işler, son benzer hata ve bütçe | Küçük bir öğretim bloğu seçilir. Geciken kontroller, zorunlu onarım ve yeni içerik arasında bütçe bölünür. |
| Öğretim oturumu | Örnek üzerinden farkı görür, bir adımı yardımla yapar, yardım azalınca yeni duruma geçer. Kelime ve kalıp ilgili görevden önce öğretilir | Kullanılan ipucu/örnek, rehberli deneme, açıklama türü, anlam ve söz dizimi hatası | Yanıt örüntüsü yöntemi değiştirir. Örneğin iki zaman çerçevesi karışırsa zaman çizgisi, Rusça hitap karışırsa konuşmacı rollerini karşılaştıran diyalog gelir. |
| Okuma ve dinleme | Bir amaçla okur/dinler. Ana fikir ve ayrıntıyı ayırır. Zorlandığında kısa bölüm, yeniden dinleme ve açıklama alır | Görev ve kaynak kimliği, metin/ses modu, yardım, soru türü, gözlem | Ana fikir ile ayrıntı hatası farklı onarıma gider. Sonraki kontrol yeni metin veya ses kullanır. Transkript modu okuma/çalışma kaydı üretir. |
| Yazma ve konuşma | Gerçekçi bir görev tamamlar. Örnek ve rubrikle kendi yanıtını gözden geçirir. Konuşma görevini bir tekrar veya takip sorusuyla geliştirir | İlk deneme, revizyon, rubrik, izin verilmişse ses ve değerlendirici notları. Self-review, AI ve uzman kaynakları ayrı | Kanıt varsa anlaşılabilirlik, görevi tamamlama ve hedef kullanım için ayrı geri bildirim. Belirsiz sonuç incelemeye kalır veya yeni görev önerir. |
| Açıklamalı sonuç ve tekrar | Neyin işe yaradığını, hangi hatanın anlamı etkilediğini, tekrarın nedenini görür | Sonuç ve kanıt, önceki benzer gözlem, sonraki kontrol zamanı ve farklı bağlam kimliği | Başarısızlıkta açıklama ve paralel görev. Başarıda gecikmeli hatırlama. Bekleyen çalışma izinli şekilde ertelenebilir. |
| Gelişim değerlendirmesi | Önceki ve son örneği yan yana görür. “Bir iş güncellemesinde geçmiş olayı doğru tarihlendirebiliyorsun. Bunu takip sorusuna hazırlıksız yanıtta henüz gözlemlemedik.” | Eşdeğer zorlukta görev çifti, yardım farkı, rubrik sürümü, aralık ve kanıt örnekleri | Hedef güncellenir, kalıcılık yeniden örneklenir. Karşılaştırılamayan örnek için fark iddiası üretilmez. |

## Hedef karar sözleşmesi

1. Görev adayları yayımlanmış kapsam, kullanıcının hedefi, ön koşul, son kanıt, gecikme ve erişim üzerinden çıkarılır. Zorunlu sesin mevcut olmaması veya bütçenin daralması durumunda daha kısa yerel görev seçilebilir. Erteleme ilerlemeyi saklar.
2. Aynı öğrenme amacı için önceki etkinliği tekrar sunmadan önce hatanın nerede olduğunu değerlendir. **Tanıyor, üretemiyor:** destekli kurma → yardım azaltma → yeni üretim. **Ana fikir var, ayrıntı kaçıyor:** belirli işareti fark ettir → doğal bir paralel parçada ayrıntıyı sor. **Ön koşul zayıf:** alt göreve dön → ana göreve bağlam değiştirerek geri gel. **Yeterli kanıt:** örnek anlatımı kısalt, iletişim görevini koru. **Bir hata tekrarlanıyor:** yeni yöntem, farklı bağlam veya inceleme öner. Her yöntem seçiminin bir gerekçesi ve kanıt referansı olur.
3. Sonuç yeni bir deneme olarak kaydedilir. Kanıt görünümünde tür, doğru/yanlış veya rubrik sonucu, destek, kaynak, tarih ve sınırlar korunur. Gecikmeli kontrol aynı maddeyi ezberleyerek geçilemez. Karar, gözlem sayısını başarı yerine kullanmaz.
4. Haftalık veya birkaç çalışma oturumundan sonra gelişim özeti önerilir. İlk sıklık pilot varsayımıdır. Yeterli eşdeğer kanıt yoksa özet örnekleri ve eksik boyutu gösterir. Her karşılaştırma görev zorluğu ve destek farkını açıkça belirtir.

Mevcut `ExerciseAttempt`, `AssessmentEvidence`, tekrar geçmişi ve repository korunur. Eklenecek en küçük alanlar görev bağlamı, yardım düzeyi, ayrı sonuç durumları ve değerlendirici kaynağıdır. Plan kararı bir sonraki önerinin gerekçesini ve kaynak deneme kimliklerini üretir. Her ekranda aynı kararın farklı yorumunu kodlamak yerine bu çıktıyı kullan. Oturumda ara adım, ertelenmiş görev ve tekrar çizelgesi yerel kayıttan geri yüklenir.

## İsteğe bağlı öğretmen ve ses

- **Yerel rehber:** Alternatif açıklama, karşılaştırmalı örnek ve hata geri bildirimi editoryal paketten gelir. Kullanıcı gerçek bir iletişim görevi üzerinde ilerleyebilir. Hesap açma, çevrimiçi servis ve mikrofon temel yolun şartı değildir.
- **AI öğretmen:** İzinli istekle seçili kazanımı, önceki ilgili hatayı ve öğrenci tarafından seçilen yanıtı kullanır. Önce ipucu, sonra gerekirse örnek verir. Yazıda rubrikle ilişkili gözlem ve revizyon önerir. Çıktı öneri olarak işaretlenir. İçerik bankasına kendiliğinden eklenmez, plan kanıtını tek başına yükseltmez. Reddetme, kota ve bağlantı hatasında taslak yerelde kalır ve aynı hedefin yerel açıklaması açılır.
- **Konuşma:** İlk yerel sürüm için cihaz destekliyorsa kayıt, oynatma, görev ve öz değerlendirme. Mikrofon izni yoksa plan devam eder ve konuşma kanıtı eksik kalır. ChatGPT Voice’a seçili bağlam elle aktarılır. İçeri alınan rapor kullanıcı onayına tabi. Önceki hatalar konuşma görevi ve takip sorusunu seçebilir. Doğrudan Live başlatma, gerçek hesapta özel MCP ve otomatik aktarım için [2A’nın doğrulama koşulları](CHATGPT_INTEGRATION_FEASIBILITY.md) geçerli.
- **Dinleme:** Lisanslı doğal sesler ve yerel MP3; hedefe ve önceki hataya göre parça seçimi. Hız değişikliği, yeniden dinleme ve transkript yardım olarak kaydedilir. Sentetik ses etiketli destek seçeneğidir. Ses olmadan dinleme puanı oluşmaz.

Ölçülebilir senaryolar [Kalite kapılarında](EDUCATIONAL_QUALITY_GATES.md), uygulama sırası [Uygulama planında](IMPLEMENTATION_PLAN.md).
