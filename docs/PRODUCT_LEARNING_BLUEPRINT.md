# Language OS · Ürün ve öğrenme ana planı

## Ürün kararı

Language OS, İngilizce ve Rusçada öğrencinin gerçek iletişim görevlerine hazırlanmasını sağlayan, yerel çalışan bir öğrenme rehberidir. Günlük ekran şu üç soruya cevap verir: Bugün neyi yapabileceğim, bunu neden çalışıyorum ve son çalışmamdan devam edebiliyor muyum? A1–C2, ürünün hedef kapsamıdır. Öğrenciye gösterilen rota bandı, yayımlanan içerik ve kişisel beceri kanıtı ayrı bilgilerdir.

Bu plan mevcut 103 dersi başlangıç kataloğu olarak korur. Önce az sayıdaki temsilî rotada, öğretimden yeni bağlama ve gecikmeli kontrole kadar güvenilir bir döngü doğrulanır. Bir sonraki müfredat partisi, bu döngüde gözlenen bir boşluğu kapatır. Bir aşamanın ilerlemesi ve kapsam değişiklikleri [uygulama yol haritasındaki](IMPLEMENTATION_ROADMAP.md) kabul kapıları üzerinden kararlaştırılır.

| Belge | Sorumluluğu |
| --- | --- |
| [Öğrenme deneyimi](LEARNING_EXPERIENCE_SPEC.md) | Üç öğrenci yolculuğu, günlük plan, öğretim biçimleri ve ekran davranışı |
| [Müfredat tamamlama](CURRICULUM_COMPLETION_PLAN.md) | Dil ve bant bazında diziler, materyal ve yayın ölçütleri, doğal ses |
| [Değerlendirme ve kanıt](ASSESSMENT_AND_EVIDENCE.md) | Yerleştirme, kanıt sözleşmesi, adaptasyon, seviye iddiası ve beceri profili |
| [Uygulama yol haritası](IMPLEMENTATION_ROADMAP.md) | Bağımlılıklar, doğrulama kapıları ve ilk geliştirme görevleri |

## Mevcut uygulamanın denetimi

Temel alınan sürüm `main` üzerindeki `a93819d`. Kaynak kod, paketler, yedek sözleşmesi, testler ve güncel katalog raporu karşılaştırıldı. Sınıflandırma işlevin bugünkü durumunu gösterir. Kullanım alanı sütunu, öğrencinin davranışı hangi koşulda gördüğünü ve iddianın sınırını verir.

| Bileşen | Sınıf | Bugünkü davranış ve sınır |
| --- | --- | --- |
| İlk açılış ve dil hedefi | Mevcut ve çalışıyor | Dil, hedef, öz tahmin, günlük dakika, hedef türü ve çalışma günleri alınır. Öz tahmin tek başına beceri ölçümü üretmez. Profil oluşturulunca ilk tarama açılır. [Profil ve başlangıç](../src/features/App.tsx) |
| İlk tarama | Mevcut fakat yetersiz | İngilizce 8 madde (5 gramer, 1 kelime, 1 okuma, 1 yazı), Rusça 9 (6 gramer, 1 kelime, 1 okuma, 1 yazı). İlk gönderim tek formdur. Dinleme ve konuşma bu formda yoktur. Yazı kesin puan almaz. [Katalog](../src/content/catalog.ts) · [Değerlendirme](../src/domain/assessment.ts) |
| Devam tanılaması ve rota | Kısmen uygulanmış | Köprü veya temel rotadan bir okuma ve bir dinleme örneği. Temel rotada ikisi doğruysa iki gramer/kelime maddesi daha açılır. Her cevap ayrı kaydedilir. Başlangıçtaki tanıma ve kontrollü üretim bazı kazanımları kısaltabilir. Becerilere göre komşu bantlarda yeterli örnekleme ve çelişkili kanıt çözümü yoktur. [Tanılama](../src/domain/diagnostic.ts) · [Kısaltma](../src/domain/pedagogy.ts) |
| Günlük plan ve aralıklı tekrar | Mevcut fakat yetersiz | Uygunluk, ön koşul, hedef, son hata, takvim, yerel gün ve dakika ile tek sonraki görev seçilir. Vadesi gelmiş kartlar ve erken sıradaki dersler akışı uzun süre belirleyebilir. Aynı gün üç ardışık kontrollü hatadan sonra bazı görevler ertelenir. Katalog, beceri türleri arasında görünür bir plan dizisi üretmez. [Planlayıcı](../src/domain/progress.ts) · [42 günlük simülasyon](MILESTONE_5_REVIEW_LOAD.md) |
| Gramer, kelime ve devamlılık | Kısmen uygulanmış | Çalışılmış örnek, rehberli varyant, ayrı aktarım ve gecikmeli soru bulunur. Belirli hata yanıtlarında ön koşul onarımı vardır. Kelime oturumları tek veya üç kartla devam eder. Ana akışta ilk yazı ve kontrollü aktarım, dersin kelime aşamasından önce gelebilir. Bağımsız yazıda gerekli kelimenin ne zaman öğretildiğine dair genel bir ön koşul denetimi yoktur. [Öğretim aşamaları](../src/domain/pedagogy.ts) |
| Soru tekrarı ve yarım oturum | Kısmen uygulanmış | Başarılı kaydedilmiş aşama ve tamamlanan kart grubu korunur. Sonlu rehberli ve aktarım varyantları hatadan sonra modüler sırada başa dönebilir. Gönderilmemiş form, adım ve ipucu React durumundadır. Yeniden açılışta aynı göreve dönmek bu nedenle mümkün. Bu mekanizmalar mevcut yakınmayı açıklayabilir. Yakınmanın sıklığı ölçülmedi. [Deneme seçimi](../src/domain/progress.ts) · [Oturum ekranı](../src/features/App.tsx) |
| Okuma ve dinleme | Kısmen uygulanmış | Okuma sorusu, dinlemede ana fikir ve ayrıntı; bazı hatalarda ayrı metin veya kayıt. Dinleme gönderiminden önce oynatma tamamlanır. Erişim yoksa ders için atlama saklanır; erişim geri döndüğünde yeniden teklif eden genel akış yoktur. Oynatma, doğal konuşmayı anladığına dair tek başına kanıt üretmez. [Alımlama](../src/domain/pedagogy.ts) · [Ses oynatıcı](../src/features/AudioPlayer.tsx) |
| Yazma | Kısmen uygulanmış | Açık yanıt ve revizyon ayrı saklanır. Yerelde yazı `review_required` durumunda kalır; örnek/rubrik ve AI yorumu sunulabilir. Görev başarısı, doğruluk ve üslup için kalibre değerlendirme yoktur. [Açık yanıt değerlendirmesi](../src/domain/assessment.ts) |
| Konuşma ve telaffuz | Kısmen uygulanmış | Yerel sözlü prova ve elle yürütülen ChatGPT Live görevi var. Kullanıcı onaylı rapor, alıntıya ve oturum kimliğine bağlanır. Eşleşen gramer hatası veya kelime açığı sonraki plana dönebilir. Yerel mikrofon kaydı, yerel rubrik puanı ve doğrudan telaffuz tanısı uygulanmamış. [Konuşma akışı](SPEAKING_INTEGRATION.md) · [Rapor içe aktarımı](../src/domain/progress.ts) |
| Beceri profili | Mevcut fakat yetersiz | Tarama ve üretim sınırları belirtiliyor. Her ders için kanıt satırı ve toplu doğru adetleri gösteriliyor. Bir sonuç tablosu, benzer zorlukta bağımsız örnekleri karşılaştıran haftalık özet yerine geçmiyor. `ready` ve `retained` ders içi motor durumlarıdır. [Beceri ekranı](../src/features/StudyViews.tsx) |
| Müfredat ve yayın | Mevcut fakat yetersiz | İki dilde sürümlü JSON paketleri ve önceki TypeScript dersleri ortak kataloğa dönüşür. 53 İngilizce, 50 Rusça ders ve 41 açık hedef var. İletişim hedefinin bağlı dersi olması, o banttaki gramer, söz varlığı, doğal dinleme veya bağımsız üretim kapsamını tamamlamaz. [Paketler](../src/content/curriculum/packs.ts) · [Kapsam planı](CURRICULUM_COMPLETION_PLAN.md) |
| ChatGPT öğretmeni | Mevcut ve çalışıyor | Geçerli bağlantıda açıklama, örnek, yazı yorumu ve hata odaklı prova, ayrı istek onayıyla açılır. Şema doğrulama ve kota/erişim hatası sonrası yerel çalışma var. Gerçek hesap erişimi ve pedagojik etki bu denetimde ölçülmedi. [Öğretmen ekranı](../src/features/TutorPanel.tsx) · [Yerel servis](../server/local-tutor.ts) |
| Yerel kayıt ve yedek | Mevcut ve çalışıyor | Dexie v3, dil profillerini ayrı tutar ve geçersiz eski kaydı karantinaya alabilir. v2 dışa aktarma etkin profili içerir, v1 içe aktarma normalize edilir. V2, iki dilin tek dosyada atomik yedeği değildir. [Depolama](../src/persistence/repository.ts) |
| Haftalık gelişim, doğrulanmış seviye ve ölçekli ölçme | Henüz uygulanmamış | Her beceri için bağımsız, paralel ve gecikmeli örnek bankası ile standart belirleme eksik. Ürün uygun rota ve kanıt durumunu anlatır. [Kanıt planı](ASSESSMENT_AND_EVIDENCE.md) |
| Öğretim etkisi, doğal ses ve erişilebilirlik | Gerçek öğrenciyle doğrulama gerekiyor | Teknik testler ve sentetik öğrenci örnekleri kayıt ve rota davranışını ölçüyor. Gerçek öğrenme kazanımı, bırakma nedeni, uygun zorluk, konuşma değerlendirme güvenirliği ve sesin eğitim değeri pilot kapılarıdır. [Kalite kapıları](EDUCATIONAL_QUALITY_GATES.md) |

### Chrome gözlemi ve kapsamı

Yerel üretim sürümünde Chrome ve Playwright ile masaüstü ve mobilde **24/24** senaryo geçti. İki dilin uzun akışları hızlandırılmış tarayıcı saati ve 180 dakikalık test bütçesi kullanır. [Tarayıcı senaryoları](../tests/e2e/study.spec.ts) · [Dil ve ilk rota](../tests/e2e/learning-guide.spec.ts)

- Rusça ilk okuma hatası Kiril köprüsünü öne aldı. Kaydedilen ek okuma sonrası yenilemede sıradaki dinleme açıldı. Dinleme tek gözlem ve düşük güvenle görünürken konuşma ölçülmemiş kaldı.
- İngilizce ilk rotada örnek dış konuşma raporu önce kelime tekrarını, sonra farklı gramer bağlamını seçti. İki dilde saat ilerleyince yazılı kelime hatırlama ve gecikmeli görev açıldı. Rusça yerel rota, önbellek hazırlandıktan sonra çevrimdışı yenilendi.
- AI için istek onayı, kota ve bozuk yanıt yerel servis yerine test yanıtlarıyla sınandı. Ayrı tarayıcı profilleri kullanıldı. Üç hedef öğrenci yolculuğunun tamamı, gerçek hesap kullanımı, gerçek ses kalitesi ve gerçek öğrenme etkisi bu çalıştırmanın kapsamı dışında kaldı. [AI tarayıcı senaryoları](../tests/e2e/tutor.spec.ts)

## Ürünün değişmez kararları

- **Yerel döngü önce.** Profil, aşama, taslak ve değerlendirme kaynağı cihazda belirli bir dile bağlanır. Hesap, mikrofon, ağ ve AI olmadan bir kazanımın öğretimi, uygun yerel kontrolü ve sonraki çalışma çalışır. Dinleme erişilemezse aynı beceri daha sonra örneklenebilir.
- **Gerekli bilgi önce.** Yazı veya konuşmadaki zorunlu dil yapılarına, kelime/kalıplara ve stratejiye öğretim veya eşdeğer bağımsız kanıt bağlanır. Hızlandırma her bağı ayrı kontrol eder.
- **İlerleme ölçülen işe bağlı.** “Bu istek kibarca ve anlaşılır biçimde iletildi” gibi bir iddia, bir görev ve destek düzeyiyle ilişkilidir. Telaffuz ve anlam başarısı, görev tamamlanma ve kart sayılarına dönüştürülmez.
- **Devam etmek görünür.** Öğrenci aynı kazanımı yeniden görürse son kanıtı ve yeni görevdeki farkı görür. Yardım, yeniden deneme ve gecikmeli değerlendirme ayrı akışlardır.
- **Tasarım sınırı.** Öğrenme ekibi ekran durumlarını, gerekli bilgiyi, erişilebilirlik ve kanıt kurallarını tanımlar. Görsel hiyerarşi, yerleşim, bileşen görünümü ve mobil sunum arayüz ekibine aittir. [Ekran sözleşmesi](LEARNING_EXPERIENCE_SPEC.md)

## AI ve konuşma sözleşmesi

| Öğretim ihtiyacı | Yerel yol | İzinli AI desteği |
| --- | --- | --- |
| Alternatif açıklama, örnek ve kişisel hata | İlgili editoryal örnek, ipucu ve yanlış yanıtın etkisi | Öğrencinin seçtiği yanıt ve hedefle adım adım açıklama, yeni örnek |
| Açık yazı ve revizyon | Alana uygun rubrik, model ve kendi metnini düzeltme | Metinden alıntıyla iki öncelik, anlamı değiştirmeyen örnek ve yeniden yazma sorusu |
| Yeni bağlamda pratik | Ayrı ve sürümlü yerel madde | Puanlanmayan kişisel prova. Yararlı örnek, editoryal yayın kapısından geçebilir. |
| Konuşma | İsteğe bağlı sözlü görev, takip sorusu, öz değerlendirme | Kopyalanan bağlamla ChatGPT Live. Rapor, içe aktarmadan önce incelenir ve kullanıcı onayıyla ilgili oturuma bağlanır. |

Talep öncesinde hangi yanıt ve bağlamın paylaşılacağı, izin verilen kullanım planı/kredi ve gönderim açıkça gösterilir. Reddedilen/iptal edilen istek model çağrısı üretmez. Kota, hatalı sonuç veya ağ kesintisi yazı taslağına ve yerel rotaya zarar vermez. AI önerisi ve dış rapor kaynakları görünür olur. Rapor, uyumlu bir yerel kontrol önerir; yeni kontrol sonucu kanıtı günceller. AI çıktısı tek başına CEFR, bağımsız başarı veya kalıcılık üretmez.

## Bu planın sınırı

Başarı ölçütleri öğrenme akışını sınamak için ilk ürün eşikleridir. Günlük süre tahminleri, haftalık örnekleme sıklığı ve pilot eşikleri gerçek etkinlik verisine göre yeniden değerlendirilecek. CEFR, iletişim etkinliklerini ve yeterlik boyutlarını betimlemek için kullanılır; yerel sistemin seviyelerle ilişkilendirmesi ayrıca kanıt gerektirir. [Avrupa Konseyi CEFR Tamamlayıcı Cilt](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions) · [CEFR ile sınav ilişkilendirme el kitabı](https://www.coe.int/en/web/common-european-framework-reference-languages/relating-examinations-to-the-cefr)
