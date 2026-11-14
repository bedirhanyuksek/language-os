# Milestone 5 · Ölçeklenebilir ders üretimi

Sekiz JSON paketiyle beş İngilizce ve altı Rusça ders yayımlandı. Katalog **35 İngilizce + 31 Rusça ders** içeriyor. 144 hedefin **66’sı çalışılabilir**, 78’i açık. Önceki ders, alıştırma ve kart kimlikleri korundu. Sayılar Language OS envanterini ölçer. CEFR yeterliği ölçümü için gerçek öğrenenlerle ayrıca değerlendirme gerekir.

## Yeni öğrenme dizileri

| Yol | Çalışılabilir yeni hedefler | Bağımsız uygulama |
| --- | --- | --- |
| EN B1→B2 · Haber ve medya | Kaynak atıflı yerel haber → karşıt görüş yazılarında olgu, değer ve iddia | Olay ve kaynakları aktar, sonra aynı veriyi iki farklı öncelikle yorumla ve gerekçeli görüş yaz. |
| EN B1→C1 · Etkileşim | Söz sırası ve takip → üç paydaşlı müzakere → hassas itiraza hazırlıksız karşılık | Konuşmayı yeniden aç, koşullu uzlaşmayı kaydet ve yeni izin itirazında sınırı koruyan alternatif sun. |
| RU A1→A2 · Hizmet | Yavaşlatma, tekrar ve yazım isteme → belirti, süre ve randevu teyidi | Anlaşılmayan ayrıntıyı yeniden sor; doğru gün/saat ve belirtiyi geri söyle. |
| RU A2→C1 · Anlatıdan kanıta | Sağlık ve geçmiş deneyim ön koşulları → olay anlatısı → yerel haber → rapor karşılaştırması → uzman varsayımı | Tanık ve kurum bilgisini ayır, çelişen sayımları incele ve başka bir alanda hangi verinin sonucu değiştireceğini açıkla. |

Yeni B2/C1 derslerinin ilk kaynakları **115–187 okuma**, **72–118 dinleme** ve **97–138 örnek yazı sözcüğü** aralığında (boşlukla sayım). Kaynak türleri arasında politika üzerine görüş yazıları, toplantı belgeleri, sözleşme/e-posta, yerel haber, teknik rapor ve karşı uzman görüşü var. İlk görev ve onarım için ayrı bağlamlar yazıldı. Dersler aynı 2×3 kontrollü alıştırma düzenini kullanıyor. Boşluk doldurma ve seçenekli kanıt çıkarma mekanikleri hâlâ tekrarlanıyor; tür farkı esas olarak kaynak, yazılı üretim, revizyon ve konuşmada görülüyor.

## Ders üretimi

Eski yöntemde bir içerik grubu için TypeScript ders modülü ve katalog kaydı, envanterde elle kazanım eşleştirmesi, ayrı ses üretimi ve sabit liste/sayı testlerinin güncellenmesi gerekiyordu. Artık **mevcut açık hedefe bir ders eklemek için bir JSON paketini düzenlemek ve iki komut çalıştırmak** yeterli. Yeni bir kazanım tanımlamak gerektiğinde iletişim envanteri de değişir. Ders metninin, alternatiflerin ve kaynakların yazarlığı devam eder.

1. `src/content/packs/` altındaki benzer bant ve beceriye ait bir paketi başlangıç olarak kullan. `format: 1`, `language` ve `lessons` yer almalı. Aynı dosyaya birden çok ders eklenebilir.
2. Bölüme envanterdeki boş `outcome` anahtarını, yeni dil önekli `id` ve ilgili ders kimliklerini `prerequisite` olarak ver. Envanterde belirtilen ana ön koşul çalışılabilir olmalı ve paket dersinde kullanılmalı. Paketler dosya sırasından bağımsız olarak ön koşula göre bağlanır. Yayımlanan kimlikleri ve kavram/kart sıralarını koru.
3. Öğretim modellerini ve kullanım açıklamalarını, `grammarStrands` denetim başlıklarını, iki kavram için rehberli, aktarım ve gecikmeli alıştırmaları ekle. Her kontrollü alıştırma `[istem, doğru cevap, ...alternatifler]` dizisidir. Geçerli bölgesel yazımlar ve çekimler cevap anahtarına açıkça eklenir. Her okuma/dinleme sorusu `[istem, doğru cevap, iki çeldirici, açıklama, kısa kaynak alıntısı]` biçiminde altı değer alır. Cevabı gerekçelendiren alıntıyı ilgili metinden seç.
4. İlk ve onarım kaynaklarını, türleri, hedef kelimelerin kullanım ve hatırlama görevlerini, alımlama ipuçlarını, yazma ve revizyonu ve yeni durumda konuşma senaryosunu yaz. Konu ve görev türü için aynı örneği başka isimlerle tekrar etme.
5. `npm run curriculum:audio -- paket.json` komutu model, iki transkript ve aktif kart kliplerini üretir. Dosya adı vermezsen tüm paketleri işler. eSpeak NG ve FFmpeg gerekir. eSpeak NG WASM dağıtımı haricen kurulmuşsa `LANGUAGE_OS_ESPEAK_WASM_DIR` ile kullanılabilir. Kaynak ve sentez ayarlarının parmak izi eşleşen klipler yeniden üretilmez. `--force` komutu yeniden sentezler. Klipler ve paket birlikte yayımlanır.
6. `npm run curriculum:check` ve `npm run curriculum:report` ile paketi ve rotayı doğrula. Rapor mevcut envanterin açık hedeflerini, gramer ve sözcük kapsamını, yeni kaynak türlerini ve öğrenci senaryolarında rota süresini çıkarır.

Şema ve testler hatalı alanları, bilinmeyen/döngüsel ön koşulları, çakışan kimlik ve hedefleri, mükerrer cevapları, cevap seçeneklerini, kaynak alıntılarının metinde bulunmasını, bire bir aynı örnek ve kaynakları, aktarım/tekrar istemlerini, ileri kaynakların uzunluk alt sınırlarını ve sesin kaynakla eşleşmesini kontrol eder. Aktif hedefin başka bir derste yinelenmesi raporlanır; amaçlı aralıklı karşılaşma kalıcı öğrenmeye eşit sayılmaz. Bu turda 74 sentetik MP3 üretildi ve FFmpeg ile baştan sona çözüldü. Değişmemiş 74 klibi topluca denetleyen ses komutu yaklaşık 0,14 saniyede tamamlandı. Önceki yöntemin elle işlem süresi karşılaştırmalı olarak kaydedilmedi.

## Kullanılabilir kapsam

Aktif sütunu kontrollü hatırlama ve üretim için hedeflenmiş benzersiz yüzey biçimlerini, alımlama sütunu kaynak içinde açıklanan biçimleri sayar. Diller genelinde **EN 63 aktif / 42 alımlama**, **RU 57 aktif / 40 alımlama**. Katalogda 132 ilk/onarım dinleme kaynağı var ve hepsi sentetik. Her çalışılabilir derste bir yazma ve revizyon görevi bulunuyor.

| Dil–bant | Önce → şimdi / hedef | Açık | Aktif / alımlama | Okuma / dinleme | Konuşma | Örnek öncelikli açıklar |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| EN A1 | 4 → 4/12 | 8 | 6/3 | 8/8 | 4 | Sayı, iletişim onarımı, gündelik ihtiyaç |
| EN A2 | 7 → 7/13 | 6 | 13/10 | 14/14 | 7 | Konut/masraf, kısa talimat, eğitim |
| EN B1 | 7 → 9/14 | 5 | 16/9 | 18/18 | 7 | Kültürel gezi, geri bildirim, duygular |
| EN B2/B2+ | 5 → 7/13 | 6 | 13/9 | 14/14 | 7 | Resmî metin türleri, doğal konuşma/aksan |
| EN C1 | 5 → 6/12 | 6 | 11/9 | 12/12 | 6 | Uzun sunum, süreklilikle üslup değiştirme |
| EN C2 | 2 → 2/10 | 8 | 4/3 | 4/4 | 2 | Mizah, edebî üslup, uzun kaynak dönüşümü |
| RU A1 | 7 → 8/13 | 5 | 13/7 | 16/16 | 5 | Sayı, zaman ve ses karşıtlıkları |
| RU A2 | 5 → 6/12 | 6 | 11/8 | 12/12 | 6 | Günlük talimat, gelecek, araç hâli |
| RU B1 | 5 → 7/13 | 6 | 13/10 | 14/14 | 7 | İlgi tümceleri, kültürel deneyim, duygu |
| RU B2 | 3 → 4/12 | 8 | 8/6 | 8/8 | 4 | Türler arası yazı, ortaç, doğal çoklu konuşma |
| RU C1 | 3 → 4/10 | 6 | 8/6 | 8/8 | 4 | Akademik türler, müzakere, uzun sunum |
| RU C2 | 2 → 2/10 | 8 | 4/3 | 4/4 | 2 | İroni, aksan, ileri aracılık ve nüans |

## Öğrenci rotaları

| Sentetik profil | Benzersiz ders | İlk blok / dakika | Tekrar ve gecikme, dakika | Tanıtılan aktif kart |
| --- | ---: | ---: | ---: | ---: |
| EN A1 → A2, günlük 30 dk | 11 → 11 | 77 / 275 | 89 | 19 → 19 |
| RU A1 → A2, günlük 30 dk | 12 → 14 | 84 → 98 / 300 → 350 | 91 → 124 | 19 → 24 |
| EN B1 örnekli → C1, günlük 15/30/60 dk | 17 → 22 | 119 → 154 / 425 → 550 | 284/320/338 | 25 → 40 |
| EN B1 örnekli → C2, günlük 15 dk | 19 → 24 | 133 → 168 / 475 → 600 | 303 | 29 → 44 |

Yerel simülasyonda EN B1→C1’de 40 kart için yazılı hatırlama ve en az bir günlük gecikmeli hatırlama kaydı, 40 serbest alıştırma gönderimi ve bir kasıtlı unutma sonrası yeniden çalışma görüldü. Bağımsız konuşma kullanımı için sıfır rapor vardı. Beş dakikalık çevrimdışı senaryo Rusça A1–C1 boyunca mevcut yayımlanan hedeflere ulaştı; A1→A2 simülasyonları yayımlanan başlangıç rotasının sonuna erişti. Süreler ders × aşama için ilk plan bütçesidir. Gerçek öğrencinin yazma, okuma veya konuşma süresi ölçülmedi.

Yapısal kontroller ve örnek anahtarları insan değerlendirmesinin yerini tutmaz. Biçimsel doğruluk, doğal dil ve bağlama uygunluğa dair uzman incelemesi, doğal aksan ve birden çok gerçek konuşmacıyla ses, yazılı/sözlü bağımsız kullanım ve öğrenme etkisi açık kalıyor. Mevcut üretim paketinde ilk JS parçası yaklaşık 1,13 MB ve sesler çevrimdışı önbelleğe alınıyor. Katalog genişledikçe başlangıç yükü ayrıca ölçülmeli.

## Doğrulama sonuçları

İçerik kontrolleri 42/42 (komut duvar süresi 3,32 sn), Vitest 84/84, üretim önizlemesinde Chrome masaüstü ve mobil Playwright 22/22. TypeScript, ESLint ve üretim derlemesi başarılı. Derleme büyük JS parçası uyarısı verdi.
