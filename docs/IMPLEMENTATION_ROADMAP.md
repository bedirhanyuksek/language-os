# Uygulama yol haritası

Bu sıra [ürün ana planının](PRODUCT_LEARNING_BLUEPRINT.md) geliştirme sözleşmesidir. Yayımlanmış dersleri, UI/UX tasarımını, mevcut dil profillerini, yedek ve konuşma raporlarını başlangıç noktası olarak alır. Her aşamada ölçülen eksik kapatılır. Bir aşamanın test ve kabul kayıtları sonraki aşamanın girdisidir.

## Aşama 1 · Güvenilir devam ve gerekçeli tekrar

**Amaç ve neden ilk:** Öğrenci ertesi gün, yenilemeden veya dil değişiminden sonra kaldığı işi görebilmeli. Aynı sorunun ödev, prova veya yanlış rota kararı olduğunu ayırt etmeden değerlendirme ve müfredat ölçeklenemez.

- **Kapsam ve ön koşullar.** Mevcut paketlerle RU A1 Kiril/tanışma, EN B1 geçmiş olay/güncel sonuç ve EN B2/C1 üst bant kaynak görevi rotaları sabitlenir. Yeni içerik gerekiyorsa ilk aşamada test örnekleri kullanılır. Öğrenci verisi test kopyalarına girmez.
- **Bileşen ve veri.** `progress.ts`, `pedagogy.ts`, `state.ts`, `repository.ts`, `migration.ts`, `App.tsx` ve ilgili form/plan ekranları. Yerel oturum kaydı dil/profil, görev, paket sürümü, adım, taslak ve görülen yardım bilgisi taşır. Tamamlama işlemi deneme, süre ve oturum durumunu tek transaction içinde günceller.
- **Beklenen davranış.** “Devam et”, “Tekrar neden burada?” ve “Bitirdim” ayrı durumlar. Geçersiz/tükenmiş varyantta başka öğrenme, kısa onarım veya eksik kanıt görünür. Başarı ve tekrar vadeleri meşru nedenlerle kalır.
- **Otomatik kapı.** İki dilde form ortasında yenileme, gece yarısı, gün/bütçe değişikliği, yanlış → yeni madde, başarılı → sonraki adım, banka tükenmesi, çift gönderim ve çevrimdışı yeniden açma. V1/v2 yedek, Dexie v3 geçişi, dil geçişi ve karantinadan dönme regresyonları sürer.
- **Kabul.** Test matrisinde sebepsiz tekrar sıfır. Son kaydedilmiş taslak, adım ve yardım geri gelir. Çift gönderimde tek sonuç. Eski yedek ve içe aktarmada elde olmayan yardım bilgisi bilinmiyor kalır. Yeni davranışın gerçek yaşamda anlaşılırlığı pilotta sorulur.
- **Bitiş sayılmayacak durum ve risk.** Oturumu yalnız ekran içi durumda tutmak veya aynı soruyu arka arkaya göstermeye yeni bir açıklama etiketi eklemek kapıyı karşılamaz. Sık yazmanın IndexedDB maliyeti ve çoklu sekme yarışı test edilir. Bu aşama 2’nin tanılama taslağına, 3’ün plan kararına temel olur.

### Uygulama ve kabul kaydı

**Durum · Teknik kabul tamamlandı.** TypeScript, ESLint ve üretim derlemesi geçti. Müfredat kontrolleri 46/46, Vitest 98/98 ve gerçek Chrome Playwright masaüstü 16/16, mobil 16/16. Üretim derlemesinde ana paket boyutu uyarısı sürüyor. [Üç rota ve yarış testleri](../tests/e2e/session-continuity.spec.ts) · [Kayıt ve eski yedek testleri](../tests/repository.test.ts)

- **Başlangıç bulguları.** Eski üretim sürümünde Rusça formdaki gönderilmemiş metin ertesi güne geçip sayfa yenilenince boşaldı. Motor testi, iki rehberli varyanttan sonra ilk maddeyi tekrar seçti. Tekrar işleminin eski giriş noktası, başka sekmede bitirilmiş bir kartı ertesi gün gerçekten vadesi geldiğinde eski ekrandan yeniden kabul edebiliyordu. Regresyon, bu eski giriş davranışı ile oturum kimliğini doğrulayan yeni işlemi ayrı sınar.
- **Yerel kayıt.** Taslak etkin dilin profil satırında tutulur. Oturum kimliği, içerik sürümü ve görev metni/materyali için parmak izi, madde kimlikleri, neden, adım, yanıt, destek ve tahmini süre saklanır. Dinleme adımı ve oynatma sayısı da geri açılır. Ölçülen etkileşim saniyeleri yaklaşık bir süredir; plan bütçesindeki tahmini dakikalar ayrı kalır. Kaydetme bildirimi son yerel yazmanın tamamlandığını gösterir. Editoryal sürümü değişen taslak yeni maddeye aktarılmaz; yerel kayıtta ve yedekte kalır.
- **Tekil sonuç.** IndexedDB işlemi taslak kimliğini ve sürümünü kontrol eder. Deneme, süre ve taslağın kapanması aynı işlemde gerçekleşir. Eski sekme yeni kaydı ezemez. Açılmış yerel destek ve oynatma bilgisi yeni denemeye bağlanır; taslak yanıt beklerken puan oluşmaz.
- **Banka sınırı.** Hata sonrası açıklama ve denenmemiş soru önerilir. Tükenen rehberli/aktarım örneği başa sarmaz. Uygun başka görev yoksa içerik açığı ve puansız yerel açıklama sunulur. Vadesi gelen kartın yeni, geçerli oturumu ayrı kalır.
- **Uyumluluk.** Dexie v4 geçişi v3 satırlarını olduğu gibi taşır. v1/v2 karantina geçişi sürer. Oturum veya yeni kanıt alanı içeren dışa aktarımlar v3, eski biçimi karşılayan dışa aktarımlar v2 olur. v1 ve v2 dosyaları açılır. Dil geçişi iki profilin taslağını ve geçmişini ayrı tutar. ChatGPT çağrısı ve konuşma raporu onayı mevcut akışlarını kullanır. Açık AI isteği veya yanıtı yeniden başlatılmaz.
- **Üç rota.** Rusça A1 / 15 dk Kiril açıklaması, hatadan yeni soru, çevrimdışı ve ertesi gün dönüş ile tanışma öğretimi. İngilizce B1 / 30 dk model → rehberli hata → onarım → yeni yazı/aktarım → kelime öğretimi ve ertesi gün hatırlama → beceri profilinde gecikmeli kanıt. İleri İngilizce / 60 dk geçerli v2 geçmişinden çok kaynaklı ders, iki muhatap için yazı, açık rubrikle yenileme, bütçe/dil değişimi ve yeni aktarım görevi. Tarayıcı rotalarında belirli dinleme adımları oynatma sonu olayını kullanır. Mevcut tarayıcı paketi ayrıca yerel medya oynatmayı doğrular.
- **Sonraki aşama.** Kısa yerleştirme ve çoklu beceri örneklemesi Aşama 2 kapsamındadır. İlk yazıya gereken bütün kelime/gramer bağlarının editoryal denetimi ve doğal ses/öğrenci pilotu ayrıca açık. Yazının `review_required` durumunda kalması korunur. Ani süreç sonlandırmasında tamamlanmamış disk yazımı, tarayıcıda kesin kaydedilmiş sayılamaz.

### İlk geliştirme görev listesi

| Sıra | İş | Somut teslim ve bitti ölçütü |
| --- | --- | --- |
| 1 | Yeniden üretilebilir başlangıç senaryoları | Mevcut Chrome ve motor testlerine RU A1 15 dk, EN B1 30 dk ve EN ileri 60 dk geçmişleri ekle. Sabit saat ve bağımsız yazılmış sentetik yanıtlarla sonraki görev kimliği, adım ve vade doğrulansın. Yenilemede taslak kaybı ve varyant sarımı önce eski davranışla yeniden üretilebilsin. |
| 2 | Görev kimliği ve tekrar nedeni | `progress.ts` ve `pedagogy.ts` kararının görev/bağlam kimliği, aşama ve nedenini tek kaynaktan döndürmesini tasarla. Nedenler devam, açıklamalı prova, yeni deneme ve vadesi gelmiş kontrol olsun. Aynı girdiler aynı karar ve gerekçeyi üretmeli. |
| 3 | Küçük sürümlü oturum kaydı | `state.ts` ve repository’de aktif dil için görev kimliği, paket sürümü, adım, taslak ve izinli yardım durumu. Mevcut taslak yoksa oturum boş başlar. Yayından kaldırılmış sürümde taslak korunur ve uygun yeni görev gösterilir; eski cevap yeni göreve taşınmaz. |
| 4 | Güvenli kayıt ve gönderim | Formda değişiklik olduysa güvenilir yerel kayıt ve sayfa kapanışında son kaydedilmiş durum bilgisi. Gönderim için tekrar işleme anahtarı ve mevcut transaction. Paralel sekme ile test et; bir kez süre ve bir kez deneme kaydedilsin. |
| 5 | Devam ve hata davranışı | `App`, tanılama ve pratik formuna “Devam et” durumu. Rehberli hata ve bağımsız kanıt ayrı. Varyantlar tükendiğinde otomatik sarımı durdur, kısa ön koşul veya açık içerik boşluğu göster. Bilinçli prova kanıtı yükseltmesin. |
| 6 | Yedek ve dil sınırı | V1/v2 yedekleri, karantina ve mevcut iki dil geçişi için regresyon. Ürün yeni alan taşıyorsa sürüm/okuma politikası belgelenir. Aktif dil dışarı aktarımı iki dilli yedek olarak gösterilmez. |
| 7 | Dikey kabul | Üç rotada masaüstü ve mobilde yarım bırak, dön, hata yap, yeni göreve ilerle ve sonraki yerel günde farklı bağlamı aç. AI kapalı, ses erişilemiyor ve eski yedek senaryoları da geçsin. UI/UX ekibine durumlar ve açıklama metni sözleşmesi ile teslim et. |

## Aşama 2 · Kısa yerleştirme ve beceriye göre örnekleme

- **Amaç ve ön koşullar.** Aşama 1’in oturum devamı, görev sürümü ve neden kaydı hazır. İlk etkinliği geciktiren tek formu, bölünebilen mini tarama ve ilk çalışma günlerine yayılan örneklemeye dönüştür.
- **Kapsam, bileşen, veri.** `diagnostic.ts`, `assessment.ts`, `model.ts`, tarama ekranı ve mevcut paket doğrulaması. İki dilde her pilot için temel/komşu bantta ayrı rotaya yönelik görev aileleri, erişim ve erteleme, ilk açık yazı, seçimlik konuşma ve kaynak/yardım kaydı üret.
- **Beklenen davranış.** İlk yararlı iş birkaç kısa örnekten sonra açılır. Set yarım kalabilir. Güçlü listening, zayıf konuşmayı gizlemez. Yeterli kanıtı olan alt hedefte kısaltma, çelişkide paralel örnek.
- **Otomatik kapı ve kabul.** İki dilde yanıtsız, bilmiyorum, ses yok, çelişkili iki örnek, üst örnek ve yeni oturum senaryoları. Öz beyan, hedef ayarı ve tanılama kısaltması beceri başarısı üretmez. Eşdeğer olmayan görevler aynı karşılaştırmaya girmez. Pilot hedefi ilk öğretime 15–60 dk bütçenin ilk 7 dakikası içinde ulaşmaktır; zamanlar gerçek akışta ölçülür.
- **Bitiş ve risk.** Daha uzun bir sabit soru listesi, tek puan ve kalibre edilmemiş seviye etiketi yeterli değildir. Az örnek ve gramer ağırlığı ilk riskler. Sonuç, aşama 3’e birden çok beceri durumunu verir.

### Uygulama ve kabul kaydı

- Banka v1, İngilizce 31 ve Rusça 15 madde sunar. İlk tarama 2–4 maddelik, durdurulabilir ve erken öğretime geçişe açık. Takip soruları seçili çalışma günlerinde açılır ve ilk dersi engellemez. Güçlü paralel ses yanıtı komşu banttan örnek açabilir. Çelişki, bankada varsa üçüncü bir kaynak açar. [Beceri kapsamı ve eski tarama denetimi](ASSESSMENT_AND_EVIDENCE.md#aşama-2--mevcut-banka-ve-teknik-sınırlar)
- **Durum · Teknik kabul tamamlandı.** TypeScript, ESLint, üretim derlemesi, müfredat doğrulaması 46/46 ve Vitest 105/105 geçti. Gerçek Chrome Playwright üç işçiyle masaüstü 19/19, mobil 19/19; önceki beş işçili koşuda bir Chrome bağlamı test başlamadan zaman aşımına uğradı. Sekiz yerel MP3 tam çözümlendi. Ana Vite paket boyutu uyarısı sürüyor.
- Üç pilot kararının yerel kapsamı Kiril okumaya giriş, geçmiş olay ve deneyimin ayrımı, kaynak ve iddianın sınırlarını tartma. İleri rota için tek rehberli giriş açılır. Ön koşullar tamamlanmış sayılmaz. Yazma inceleme bekler, konuşma provası puansızdır. Öğretim öncesi ve sonrası, sesli ve transkriptli örnekler ayrı kalır.
- İlk tarama ekranından ilk açıklamalı ders örneğine kadar gerçek Chrome otomasyonunda RU A1 için 0,9 sn, EN B1 için 16,4–16,5 sn, ileri EN için 0,8 sn ölçüldü. B1 ölçümüne kaydın baştan sona oynatılması dahildir. Süreler sentetik yanıtlarla yürütülen teknik akış gözlemidir. Mobil proje telefon görünümü ve dokunmayı Chrome’da emüle eder. [Tarayıcı senaryoları](../tests/e2e/adaptive-placement.spec.ts)
- Dexie v5 aynı tabloları ve mevcut satırları korur. v1–v3 yedekleri açılır, adaptif kayıtlar v4 olarak dışa aktarılır. Mevcut kullanıcı kendi planından devam eder ve isterse ek değerlendirme açar.
- Aşama 3 için açık riskler az sayıda paralel madde, ileri Rusça ve C2 boşluğu, rehberli ileri girişte öğrencinin ön koşul desteğine duyabileceği ihtiyaç ve tek sentetik konuşmacı. Gerçek öğrencinin ilk öğretime ulaşma süresi ve yeterlik değerlendirmesi ayrı pilot gerektirir.

## Aşama 3 · Öğretim bağı, günlük plan ve beceri özeti

- **Amaç ve ön koşullar.** Aşama 1 kaydı ve aşama 2’nin ayrık beceri kanıtı var. Üç pilot rotada gerekli bilgiyi zamanında öğret ve görünür bir çalışma dizisi ver.
- **Kapsam, bileşen, veri.** Planlayıcı, pedagojik motor, paket grafiği, beceri profili ve kelime tekrarları. Ön koşula gereken gramer/kalıp bağı, bağlama uygun görev, rezerv süre, açık geri bildirim, bağımsız/gecikmeli madde ve haftalık örnek eşleştirmesi. Uygulama medya erişimini görev uygunluğuna katar.
- **Beklenen davranış.** Hedef, gerekiyorsa kısa onarım, sonra beceri görevi. Öğrenci bugünkü önerinin nedenini, bir sonraki adımı ve geçerli alternatifleri görür. Haftalık görünüm birkaç kanıta odaklanır ve ayrıntıya girilebilir. Geciken tekrar günlere yayılabilir.
- **Otomatik kapı ve kabul.** Her dilde 5/15/30/60 dakika ve ağır borç simülasyonları; vade korunur ve bütçe aşılmaz. Aşamalı öğrenme yolunda bağımsız etkinliğin zorunlu kelime/gramer bağları karşılanmadan görev açılmaz. Yazı, prova ve dış rapor ayrı sınıflanır. Gerçek Chrome’da üç hedef rotası, dil izolasyonu, ses yokluğu ve yinelemeli hata günleri doğrulanır.
- **Bitiş ve risk.** Süre dolsun diye doldurulan görev ve sabit yüzde paylaşımı kabul edilmez. 250 kartlık ağır profilde borcun hızlı kapanması hedeflenmez; günlerce tüm uygun yeni öğrenmeyi kapatan kararlar ayrıca incelenir. Aşama 4 doğal kaynak eklemeden önce tekrar ve profil davranışını sabitler.

### Aşama 3 uygulama ve kabul kaydı

**Durum · Teknik kabul tamamlandı.** TypeScript, ESLint ve üretim derlemesi geçti. Vitest sıralı dosya koşusunda 117/117, müfredat kontrolleri 46/46. Gerçek Chrome ana paketi masaüstü 20/20 ve mobil emülasyonu 20/20 geçti. Son taslak uygunluk kontrolünden sonra ilgili kayıt/devam senaryoları ayrıca 10/10 geçti. Son iki Chrome koşusunda yeniden deneme gerekmedi. Önceki paralel koşularda Chrome bağlamı ve uzun simülasyon başlangıçları zaman aşımına uğradı. Bir ara koşuda testler sürerken `dist` yeniden derlendiği için ses dosyası okuyan preview sunucusu kapandı. Son koşular sabit üretim çıktısıyla tamamlandı. Vite ana paket boyutu uyarısı sürüyor.

| Çok günlük rota | Gerçek Chrome kabulü |
| --- | --- |
| RU A1 / 15 dk | Yeni adaptif taramada belirsiz Kiril → açıklama ve kontrollü hata → ertesi gün aynı taslağı çevrimdışı açma → kelime öğretimi → özgün yazı → başka günde yeni bağlam ve okuma → dinleme → gecikmeli kontrol ve tanışma öğretimi. Ek kelime öğretimi yüzünden etkinlikler beş çalışma gününe yayıldı. |
| EN B1 / 30 dk | Yeni adaptif tarama → deneyim ve zaman farkı → rehberli hata ve yeni soru → iki sekmede tek kayıt → aktif kelimeler → yeni yazı inceleme bekler → aktarım, okuma/dinleme → ertesi gün kelime ve yeni bağlamlı gecikmeli kontrol. |
| İleri EN / 60 dk | Ayrı sentetik v2 geçmişinden C2 kaynak dönüştürme → gerekli kalıplar → kurul ve ziyaretçi için açık yazı → rubrik, yenileme ve dil/bütçe değişimiyle taslak devamı → sonraki gün farklı aktarım görevi ve kaynak okuma. Gerçek öğrenci veya gerçek ChatGPT hesabı kullanılmadı. |

[Öğretim ve eski ön koşul regresyonları](../tests/teaching-flow.test.ts) · [Çok günlük Chrome rotaları](../tests/e2e/session-continuity.spec.ts) · [Alternatif seçim ve vade koruması](../tests/e2e/daily-program.spec.ts) · [42 günlük yük testi](../tests/review-load.test.ts)

Öğretim, plan ve beceri özeti mevcut motor üzerinde güncellendi. Katalog 103 ders olarak korundu. Aşağıdaki ölçümler sentetik yanıtlarla elde edildi. Dil doğallığı, madde zorluğu ve gerçek öğrenme etkisi uzman ve öğrenci pilotuyla doğrulanmayı bekliyor.

**Doğrulanan başlangıç sorunları.** İki dilde yeni regresyon testi, rehberli yapıdan hemen sonra aktif kelimeler öğretilmeden özgün mesajın açıldığını gösterdi. Önceki plan tek sonraki görevi gösteriyordu; beceri ekranı gözlemsiz dersleri de varsayılan olarak listeliyordu. Yazı inceleme beklerken ilerlemenin tek beceri başarısı gibi yorumlanabilmesi ve yardım koşulları bilinmeyen eski gözlemlerin karşılaştırılması riskleri ayrıntılandırıldı.

**Öğretim sırası.** Her dersin kavramları, aktif kartları, aktarım/gecikmeli maddeleri ve yazı stratejisi aynı ders kimliğine bağlanır. Rehberli yapı yeterli olunca gerekli kartlar anlam/bağlam, biçim/telaffuz, eşdizim, tanıma, kapalı hatırlama ve açık yeni cümleyle çalışılır. Ardından ilk özgün metin ve kontrollü aktarım açılır. Hata varsa önce onarım gelir. İyi bir eski tanıma ve kontrollü üretim örneği grameri kısaltabilir; kelime ön koşulu ayrıca denetlenir. Geçerli önceki yazılı hatırlama kelime öğretimini kısaltabilir. Öz bildirim veya kartın gösterilmesi bunu sağlamaz. Kelime hatırlama yanlışsa ilk metne izin verilir, ilgili ifade desteği açılabilir ve hatırlama eksikliği profilde kalır. Açık kullanım inceleme bekler. Önceki dersin gerekli kelimeleri çalışılmadan bağlı yeni ders açılmaz.

**Ekran örnekleri.** EN B1’de “I trained two new colleagues in March.” ile tarihsiz deneyim karşılaştırılır. “Lead a workshop” kartı katılmak anlamındaki “attend” ile karşılaştırılır ve “lead → led → led” biçimini, eşdizimleri ve ayrı hatırlama/özgün kullanım sorularını içerir. RU Kiril’de model isimler ve ses-yazı eşleştirmesi, ardından farklı isimli kontrollü onarım kullanılır. İleri İngilizcede kaynak ve sınırlama, koşul ve karar, farklı muhataba aktarım mevcut iki kaynaklı derslerle çalışılır. Kullanım desteği ve rubrik açma bilgisi kaydedilir.

**Günlük program.** Ana etkinlik, gerekçesi ve gerçek süresiyle görünür. Vadesi gelen tekrarlar ve hazır öğretim birlikte sığıyorsa ayrı sıraya girer. Sonraki öğretim/üretim/alım blokları, süreleriyle ve “Yanıtına bağlı” koşuluyla gösterilir. Bu öngörü öğrenci adına doğru yanıt veya başarı yazmaz. Her sonuçtan sonra kalan süre ve sıra yenilenir. Tekrar yerine bütçeye uygun öğretim veya hazır okuma/dinleme alternatifi seçilebilir. Yarım oturumun taslağı ve bütçe sözleşmesi korunur.

**Tekrar kararı.** Önce onaylı konuşma raporundaki güncel kelime ihtiyacı, sonra tekrarda hatırlanamayan kartlar, sonra eski vade sırası kullanılır. Seçim, yaklaşık iki çalışma oturumluk geri kazanım hedefi ve başarısız kart yükünü kullanır. Gün içinde yapılan tekrarlar yeniden hesaplamaya katılır. Etkinliğe göre sıradaki anlamlı öğretim bloklarına süre korunur; 30/60 dakikada ek üretim ve beceri blokları da dikkate alınır. Beş dakikada eski borç baskısı altında öğretim ve tekrar günlere yayılır. Bu kurallar ürün varsayımlarıdır. Ertelenen vade değişmez, başarısız kart doğru sayılmaz ve yeni kartlar yük altında üç yerine tek kartla tanıtılabilir.

**Beceri özeti.** Varsayılan görünüm altı beceride son üç gözlemi, aşamasını, yardım koşulunu ve sıradaki ihtiyacı gösterir. Başlangıç ve ders ayrıntıları açılır bölümlerdedir. Gözlemsiz dersler ana profili doldurmaz. Öğretim örneği, rehberli pratik, yeni bağlamdaki kontrollü kullanım, serbest metin, revizyon, gecikmeli görev, öz bildirim ve dış konuşma raporu farklı açıklanır. Eski yardım bilgisi bilinmiyor kalır. Haftalık karşılaştırma son yedi gündeki iki örnekte, aynı sürüm, ders/kavram, beceri ve gözlem türünde, farklı madde kimlikleriyle ve bilinen eşleşen yardım koşullarında yapılır. Yazı ve konuşmaya kesin seviye atanmaz.

42 günlük test her dilde altı profili ve 5/15/30/60 dakikayı izler. 250 kart senaryosu kuyruk yükü için sentetik çoğaltılmış kartlar kullanır; 250 farklı kelimenin öğretildiği veya öğrenildiği anlamına gelmez. Her gün başlangıç/bitiş vadesi gelen kart, tamamlanan/ertelenen/başarısız tekrar, yeni kart, öğretim, beceri ve gecikmeli kontrol süresi kaydedilir. Bütçe ve ertelenen kayıtların aynen korunması sınanır. Aşağıdaki aralıklar İngilizce ve Rusça sonuçlarını birleştirir. Tekrar yüzdesi, fiilen kullanılan plan dakikalarının payıdır.

| Profil | Günlük dk | 7. / 14. / 28. / 42. gün sonu vadesi gelen | 42 gün tekrar payı | Öğretim + beceri dk | Yeni tanıtılan kart |
| --- | ---: | --- | ---: | ---: | ---: |
| Yeni | 5 | 0 / 0 / 0 / 2 | 20–22% | 138 | 7–8 |
| Yeni | 15 | 1–2 / 1 / 1 / 3–4 | 18–19% | 413–422 | 22–27 |
| Yeni | 30 | 2 / 3–6 / 5–8 / 8–11 | 21–26% | 803–852 | 62–69 |
| Yeni | 60 | 5–8 / 12–15 / 0–23 / 0 | 31–33% | 1030–1245 | 96–111 |
| Düzenli | 5 | 6 / 5–8 / 3 / 6–10 | 41–42% | 110–112 | 6–7 |
| Düzenli | 15 | 2–3 / 2 / 3 / 2–3 | 28–32% | 350–367 | 21–22 |
| Düzenli | 30 | 4–5 / 6 / 11 / 10 | 30% | 747–760 | 65–66 |
| Düzenli | 60 | 8–11 / 19–20 / 0 / 0 | 34–35% | 885–985 | 76–81 |
| 8 gecikmiş | 5 | 3 / 6–8 / 7–8 / 4–7 | 33–34% | 125–127 | 6–7 |
| 8 gecikmiş | 15 | 1–2 / 1 / 2–3 / 3 | 26–28% | 367–370 | 21–24 |
| 8 gecikmiş | 30 | 2–4 / 3–6 / 6–9 / 12 | 28–29% | 770–777 | 68–71 |
| 8 gecikmiş | 60 | 8 / 14–16 / 0 / 0 | 34–35% | 885–975 | 80–83 |
| 65 gecikmiş | 5 | 52 / 46 / 49–51 / 35–41 | 63–64% | 69–72 | 4–5 |
| 65 gecikmiş | 15 | 8–13 / 23–29 / 9–10 / 4–5 | 53–55% | 247–255 | 11–14 |
| 65 gecikmiş | 30 | 3–4 / 4 / 8 / 4 | 37–39% | 659–683 | 31–45 |
| 65 gecikmiş | 60 | 6–9 / 10–14 / 0 / 0 | 35% | 820–955 | 31–45 |
| 250 gecikmiş | 5 | 237 / 231 / 231–234 / 230–236 | 63–64% | 69–72 | 4–5 |
| 250 gecikmiş | 15 | 191–197 / 202–204 / 204–209 / 179–180 | 63–64% | 205–210 | 9–10 |
| 250 gecikmiş | 30 | 116–119 / 124–128 / 17–19 / 18–28 | 79–80% | 230–235 | 10–12 |
| 250 gecikmiş | 60 | 12 / 20–21 / 27 / 0 | 55–58% | 780–865 | 13–16 |
| 65 ve sık hata | 5 | 52 / 56 / 55–58 / 57 | 63–64% | 69–72 | 4–5 |
| 65 ve sık hata | 15 | 29–35 / 40–41 / 24–25 / 21–22 | 63–64% | 205–210 | 9–10 |
| 65 ve sık hata | 30 | 0 / 1 / 2–3 / 0 | 52–54% | 500–510 | 31–35 |
| 65 ve sık hata | 60 | 4–5 / 6–7 / 0–6 / 0 | 42% | 850–950 | 31–45 |

65 kartla dönüşte 15 dakikalık ilk 14 günde tekrar payı yaklaşık %64, 30 dakikada %44–45 oldu. Eski 42 günlük denetimde ilk 14 gün için sırasıyla yaklaşık %75 ve %47–48 raporlanmıştı. Karşılaştırmaya kelime öğretiminin daha erken açılması da dahildir. 250 kartlı 30 dakikalık öğrencide ilk 14 gün hâlâ %76–78 tekrar ve 42. gün 18–28 gecikmiş kart var. Beş dakikalık 250 kartlı öğrenci 42 gün sonunda 230–236 kart bekletiyor. Bu süreyle büyük borcu kapatma ve hızlı yeni öğretim birlikte sağlanamıyor. Sürekli yanlış yanıtlanan 24 kart sonradan vadesi bekletildiğinde de başarısız kalır; kuyruğun geçici boşalması öğrenme sayılmaz.

**Katalog ve materyal sınırı.** Yapısal denetim 103 dersin kavram–kart–aktarım/gecikmeli kontrol–strateji bağlantısını doğrular. Bu, görev metnindeki her sözcüğün ve dil yapısının editoryal olarak yeterince öğretildiği iddiasını sağlamaz. İlk EN B1 dersinde iki aktif kalıp vardır; “raise an issue / follow up on” gibi Blueprint örneklerinin tamamı bu pilot dersin aktif kapsamına eklenmedi. Pilot sınırlı olarak “lead a workshop / handover” üzerinden yürür. Geniş söz varlığı, uzun ileri kaynaklar, çok konuşmacılı doğal dinleme, telaffuzun ölçülmesi ve farklı türlerde paralel üretim açık kalır. Etiketli sentetik ses ve transkript alternatifinin kaydı sürer.

**Uyumluluk.** Aşama 3 yeni tablo veya zorunlu veri alanı getirmedi. Öğretim desteği mevcut oturum kaydında tutulur. v1–v4 yedekler, Dexie v1/v2 kurtarması ve v3/v4/v5 satırları, dil/profil izolasyonu, çevrimdışı devam, çift gönderim ve ChatGPT onay/kota mekanizmaları regresyonda korunur. Eski bir taslak yeni ön koşulları karşılamıyorsa yerel kayıtta kalır; eksik öğretimden sonra aynı içerik kimliğiyle tekrar açılabilir.

**Aşama 4 öncesi insan incelemesi.** İki dilde zorunlu yapı ve kelimenin görevle anlamsal eşleşmesi, açıklama doğruluğu ve alternatif doğru yanıtlar uzmanlarca incelenmeli. Bağımsız metin ve farklı muhataba aktarım için rubrik örnekleri karşılaştırılmalı. Gerçek öğrencilerle 5/15/30/60 dakikalık etkinlik süreleri, hata onarımı, planın anlaşılırlığı, gecikmeli hatırlama ve ağır borçta devam deneyimi gözlenmeli. Doğal sesin hakları, konuşmacı ayrımı, telaffuz ve anlaşılırlık ayrıca doğrulanmalı. Bu incelemeler henüz yapılmadı.

## Aşama 4 · Doğal ses, Speaking ve AI destekli iki dilli pilot

**Paket 1 durumu.** EN B1 ve RU A1 görev, medya ve rubrik tasarımı belgelendi. Uzman incelemesi, kayıt üretimi ve öğrenci oturumları sonraki adımlarda. [Pilot sözleşmesi](PHASE_4_PILOT_CONTRACT.md)

**Paket 2A durumu.** Doğal ses kaynakları, lisans koşulları, pilot kayıt envanteri ve teknik yaklaşım incelendi. İzinli temsilî kayıtlar ve çevrimdışı entegrasyon doğrulaması Paket 2B’de. [Ses fizibilitesi](PHASE_4_AUDIO_FEASIBILITY.md)

**Paket 2B durumu.** Kokoro ve Silero ile 4 EN B1 ve 5 RU A1 MP3 adayı yerel olarak üretildi. Manifestte sentetik kaynak, sürüm, zamanlı transkript ve ayrı hak ve kalite kontrolleri var. Dokuz MP3 de `pending` ve depo dışında. Çıktının ticari, çevrimdışı ve açık depo dağıtımı ile uzman dinleme onayı bekleniyor. Onaylı model kayıtları mevcut oynatıcıyla puansız öğretim örneği olarak açılabilir. Pilot Listening görevleri ve kaynak türüne göre kanıt Paket 3 kapsamındadır. [Ses kabulü ve kalan koşullar](PHASE_4_AUDIO_FEASIBILITY.md#paket-2b-teknik-teslimi)

- **Amaç ve ön koşullar.** Aşama 3’te yerel öğretim ve açık kanıt çalışıyor. Mevcut AI ve ChatGPT Live akışının sınırları korunarak gerçek alımlama/üretim doğrulanabilir hâle gelir.
- **Kapsam, bileşen, veri.** Oynatıcı, yerel medya paketi ve öğretim seti, `speaking.ts`, `TutorPanel` ve yerel servis. İzin kayıtlı özgün insan sesi, transkript ve paralel görev. Ses hızı/yardım ve görev bağlamı; varsa mikrofon izni, kayıt geri dinleme ve saklama politikası. AI yanıt ve rapor şeması sürer.
- **Beklenen davranış.** Çevrimdışı doğal ses çalınabilir. Erişim yoksa yerel iş devam eder ve dinleme açık kalır. Yazı/konuşma rubrikli geri bildirim alabilir. İstek başına paylaşım ve ücret/kota onayı; dış konuşma raporu kullanıcı onayıyla içe alınır.
- **Otomatik kapı.** Yerel ve çevrimdışı oynatma, sentetik/doğal veri, transkript yardımı, sesin geri gelmesi, mikrofon red, AI red/kota/şema hatası, geçersiz/tekrarlanan rapor ve eski rapor. İstek reddinde ağ çağrısı yok. Dış sonuçtan önceki kayıt düzeltilemez.
- **Uzman ve pilot kabulü.** Her dilde iki dil/ölçme değerlendiricisi örnekleri ayrı puanlar. İlk öğrenen turu için dil başına 6–10 gönüllü bir **pilot plan varsayımıdır**. Başlangıç, yeni görev ve 3–7 çalışma günü sonrasında gecikmeli örnek; ilk ders süresi, yanlış dönüş, açıklama kullanımı ve ses anlaşılırlığı gözlenir. Kritik kayıt kaybı, sebepsiz kapalı döngü veya yanlış başarı gösterimi çözülünce pilot tekrarlanır. Katılımcı sesi ve gerçek metin ancak açık seçimle toplanır.
- **Bitiş ve risk.** MP3 ve rubrik bulunması öğretim etkisi sayılmaz. Küçük pilot etki genellemesi veya seviye kalibrasyonu sağlamaz. Dağıtım izinleri ve nitelikli iki dilli değerlendirme doğal ses için ön koşul. Pilotun düzeltmeleri aşama 5 şablonuna girer.

## Aşama 5 · Doğrulanmış dizileri ölçekleme

- **Amaç ve ön koşullar.** İlk döngünün teknik, editoryal ve öğrenci pilotu bulguları işlendi. İçeriği açık hedef, dilsel kapsam, ön koşul ve materyal boşluğuna göre genişlet.
- **Kapsam, bileşen, veri.** Sürümlü içerik, kapsama grafiği, ses manifesti, görüş/rubrik bankası ve rota boşluğu raporu. [Müfredat planındaki](CURRICULUM_COMPLETION_PLAN.md) İngilizce B1–C1 ve Rusça A1–B2 köprüleri önce yürütülür. RU C1 ve iki dilin C2 açığı için bağımlılıkları açık tut.
- **Beklenen davranış.** Uygun yeni bağlam ve gecikmeli soru bulunan sürdürülebilir rota. İçeriği olmayan hedefte uygun alternatif ve görünür sınır. İlerleme, katıldığı ders sayısından ayrı.
- **Otomatik kapı ve kabul.** Her parti için `curriculum:check`, `curriculum:report`, benzersiz kimlik, cevap/çeldirici, gerekli öğretim bağı, bağımsız/gecikmeli bağlam, referans, izin ve rota ulaşılabilirliği. Her yayınlanan dizi dil uzmanı ve farklı öğrenci kohortunda örneklemeyle kontrol edilir. İki dil için seviye başına beceri kapsamı raporlanır.
- **Bitiş ve risk.** 144 satıra ders eklemek veya “otomatik kontrol geçti” rozeti geniş yetkinlik için yeterli değildir. Dar söz varlığı, sentetik ses yoğunluğu ve ileri konuşma örneği eksikliği ayrı izlenir. Bir sonrakine ancak temsilî örtük anlam, üretim ve alımlama görevleri kullanılabilir olduğunda geçilir.

## Aşama 6 · Seviye ilişkilendirme ve uzun vadeli iyileştirme

- **Amaç ve ön koşullar.** Aşama 5 ileri dahil birden çok görev ailesi ve editoryal örnek sunuyor. Çalışma önerisinin güvenini artır, seviye iddiası gerekip gerekmediğini doğrula.
- **Kapsam, bileşen, veri.** Beceri bazında karşılaştırılabilir madde/rubrik, paralel örnek, temsilci veri, eğitimli bağımsız değerlendiriciler ve dış referans. Gerekli zaman/iş yükü verisi pilot onayına bağlı.
- **Beklenen davranış.** Kullanıcı yaptığı iletişim işini, sonuç dayanağını ve sonraki adımı görüyor. Yeterli veri varsa ayrı beceriye ait tahmin ve belirsizliği görür.
- **Otomatik/insan kabulü.** Eski kanıt yeni standarda sessizce taşınmaz; eksik veri yokken ve varken ara yüz doğru görünür; değerlendirici anlaşmazlıkları, standart belirleme ve dış ölçüyle ilişki belgelenir. Aşama başlamadan ölçme uzmanı örneklem ve kabul eşiklerini belirler.
- **Bitiş ve risk.** Pilot faydası ve katalog bitişi sertifika iddiasına yeterli değildir. Dil, beceri, cihaz ve öğrenci grubu bazında yanlış eşleştirme incelenir. Kanıt yeterli değilse ürün yerel rota önerisi sunmaya devam eder. [Değerlendirme sözleşmesi](ASSESSMENT_AND_EVIDENCE.md)

## Aşama kapısı ve ortak çalışma

Her aşama, bir öncekinin doğrulanan davranışını ve bilinen açıklarını kullanır. Uygulama sorumlusu durum/kanıt sözleşmesini, tasarım sorumlusu etkileşim ve erişilebilirliği, içerik sorumlusu görev bağı, rubrik ve medya izinlerini, doğrulama sorumlusu kanıt ve pilotu teslim eder. Aynı kişi birden fazla sorumluluk alabilir. Kapsam değişikliğine ihtiyaç olduğunda gerekçeyi, etkilenen kabul koşulunu ve bağımlılığı bu belgede güncelle.

| Kapı | Karar verilebilecek konu |
| --- | --- |
| Teknik test | Uygulama aynı koşulda doğru ilerliyor, kaydı koruyor ve yardım/kanıtı karıştırmıyor. |
| İçerik kalite kontrolü | Görev şeması, anahtar, varyant, ön koşul, medya ve ölçüt bağlantıları var. |
| Uzman incelemesi | Dil doğallığı, görev temsili, kaynak uygunluğu, anlaşılırlık ve rubrik yeterli. |
| Gerçek öğrenci pilotu | Öğrenci devamı anlayabiliyor, öğretimden yararlanıyor ve yeni/gecikmeli örneğe taşıyabiliyor. |
