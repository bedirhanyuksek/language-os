# Milestone 3 · Müfredat ve öğretim

## Ürün denetimi

| Önceki davranış | Bu sürümdeki karşılığı |
| --- | --- |
| Kural, kontrollü yanıt ve ilk yazı aynı formdaydı. Yanlış yanıt bile yazıyı açabiliyordu. | Ders iletişim durumuyla başlar. Konuya göre karşıtlık, diyalog, olay sırası veya harf–ses çözümleme kullanılır. Öğrenci örnekleri adım adım inceler, sonra rehberli cümle kurar. |
| Tanıma sorularında doğru seçenek, yazıya hazırlık olarak yeterli olabiliyordu. | Yeni akışta her hedef için kontrollü üretim kanıtı gerekir. Eksik hedef farklı madde ve hata açıklamasıyla geri gelir. Çift başlangıç kanıtı olan öğrenci yeni bağlamda sınanarak hızlanabilir. |
| İlk yazı tamamlandığında bağımsız kullanımın doğruluğu belirlenemiyordu. | İlk yazı ve sonraki revizyon örnek ve rubrikle desteklenir. Serbest yazı inceleme bekleyen kanıttır. Yeni bağlamdaki kısa kontrollü kullanım ile gecikmeli kullanım ayrıca kaydedilir. |
| Aktif söz varlığı tanıma, hatırlama ve yazıyla çalışılıyordu. İfadeye ilk yazıda erişim ve alımlama amaçlı söz varlığı ayrımı zayıftı. | Yazıdan önce kullanılabilir kalıplar, kelime dersinde kullanım ayrımı, bağlam, telaffuz ve eşdizim var. Seçili metinlerdeki alımlama ipuçları çalışma kartı veya üretim kanıtı oluşturmaz. |
| Okuma ve dinlemede ayrı kaynaklarla onarım vardı. Anlamı yeniden kullanmak her derste açık bir adım değildi. | Okumada amaç, dinlemede ilk turda ana fikir ve ikinci turda ayrıntı, sonuçta bağlama uygun sözlü prova var. Yanlış alımlama yanıtında mevcut ayrı kaynak ve ipucu kullanılır. |
| Plan ön koşul, dinlenme, süre ve vade biliyordu. Rehberli yanıt ile ilk yazıya ayrı zaman ayırmıyordu. | İlk yazı kısa bir çalışma olarak plana girer. Ön koşul pratiği, kelime tekrarı ve gecikmeli yeni örnekler mevcut planla birlikte çalışır. |

İlk uçtan uca diziler İngilizce deneyimden tarihe geçiş ve Rusça kibar tanışma. Aynı standart altı İngilizce ve altı Rusça derse uygulandı. İngilizce A2 köprü, B1 ve B2; Rusça A1, Kiril köprüsü ve A2 seçili kazanımlar içeriyor. Tam kapsam ve ileride eklenecek bantlar [müfredat haritasında](CURRICULUM_ARCHITECTURE.md). İngilizce A1/C1 ve Rusça B1–C1 için yayımlanan ders yok.

Mevcut ders, kazanım, kelime ve madde kimlikleri ile cevap anahtarları korundu. Rehberli üretim için beş yeni madde eklendi. Öğretim notları v2 kataloğuna eklenir. İlk yazı, aktarım ve tekrar ayrı mevcut olay türleriyle kaydedilir. Bu nedenle yeni IndexedDB şeması gerekmedi. AI onay, kota ve çıktı doğrulaması mevcut ders akışında kalır. Speaking Coach mevcut talimat ve kullanıcı onaylı JSON aktarımıyla çalışır.

## Araştırma ve uygulama kararları

- **İletişim amacı.** Avrupa Konseyi tanımlayıcıları alımlama, üretim ve etkileşim hedeflerini tanımlar. Derslerin iş ve günlük yaşam durumları bu çerçeveyle eşleştirilir. Bant eşlemesi içerik tasarımı içindir. [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions)
- **Biçim ve anlam.** L2 öğretim araştırmalarının sentezi, hedefli öğretimin çalışılan biçimlerde kazanım sağlayabildiğini gösterir. Bu uygulamada İngilizcede zaman ve durum karşıtlıkları, Rusçada kişi, hitap, harf–ses ve hâl seçimi örnekler üzerinden öğretilir. [Norris ve Ortega](https://doi.org/10.1111/0023-8333.00136)
- **Alımlama ve üretim.** Nation anlam odaklı girdi, anlam odaklı çıktı, dil odaklı çalışma ve akıcılık için bir çerçeve önerir. Üretim çalışmasının bazı dil görevlerine yararı ayrıca deneysel olarak araştırılmıştır. Bu ürünün örnek → kontrollü üretim → kısa yazı sırası ve hızlanma eşiği pilotta sınanacak kararlardır. [Nation](https://www.victoria.ac.nz/__data/assets/pdf_file/0019/1626121/2007-Four-strands.pdf), [Almanca dilbilgisel cinsiyet üzerine üretim deneyi](https://www.cambridge.org/core/journals/applied-psycholinguistics/article/productionbased-training-benefits-the-comprehension-and-production-of-grammatical-gender-in-l2-german/75C18FC9EAFD5FFB402A3E95B38354E2)
- **Geri getirme ve aralık.** Yabancı dil kelimeleriyle yapılan deney, geri getirme pratiğinin gecikmeli hatırlamaya katkısını gösterir. L2 araştırma sentezi ve eşdizim çalışması aralıklı pratiği destekler. Uygulamanın 24 saatlik ilk aktarım kontrolü ve kart takvimi test edilebilir varsayımlardır. [Karpicke ve Roediger](https://pubmed.ncbi.nlm.nih.gov/18276894/), [Kim ve Webb](https://doi.org/10.1111/lang.12479), [Yamagata ve diğerleri](https://doi.org/10.1017/S0272263122000225)

## Doğrulama sınırı

Otomatik kontroller içerik bağlantılarını, cevapları, ön koşulları, aşama geçişini, kayıt ve yedek uyumunu sınar. Hesapsız 5 dakikalık hafta içi simülasyonunda her dilde altı dersin kontrollü gecikmeli kanıtı 90 günlük pencere içinde oluşur. Simülasyon varsayılan doğru yanıtlar ve seçilmiş hatalarla çalışır. Gerçek öğrencinin öğrenme hızı veya CEFR seviyesi bu sonuçtan çıkarılamaz.

Ses paketi, 25 yeni örnek klibiyle birlikte 68 MP3 içerir. Tüm dosyalar teknik olarak çözüldü. 28 dinleme ve tanılama klibi 2,56–9,95 saniye aralığında, tek kanallı ve ölçülen en yüksek örnek tepesi −0,2 dBFS. Sesler sentetik olarak etiketlenir. Doğal vurgu, aksan ve gerçek öğrencinin anlayabilirliği dil uzmanı ve öğrenci pilotunda incelenecek. [Ses üretim zinciri](../src/content/audio/README.md)

Kalan kapsam, ses incelemesi ve daha uzun veya çeşitli metin ve diyaloglar, farklı yazma ve konuşma bağlamları, sınırlı onarım maddeleri tükendiğinde yeni öğretim ve eksik seviye paketleridir. [Yol haritası](ROADMAP.md)
