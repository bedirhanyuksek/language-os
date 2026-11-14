# Milestone 5 · Kazanım envanteri ve öğrenme dizileri

Bu belge önceki 92 hedeflik durumu kaydeder. [Güncel kapsam denetimi](MILESTONE_5_DEPTH_AUDIT.md).

## Harita denetimi

Önceki harita her bant için geniş beceri başlıkları veriyordu. Hangi iletişim görevinin çalışılabildiği, hangisinin bir sonraki göreve temel olduğu ve boşlukların ne kadar büyük olduğu ders düzeyinde görünmüyordu. Katalogdaki tekil C2 dersleri de uzun canlı tartışma, edebî ses, uzmanlık arası aracılık veya çok kaynaklı yeniden anlatım için örnek sağlamıyordu.

CEFR’nin alımlama, üretim, etkileşim ve aracılık ölçekleriyle harita karşılaştırıldı. İngilizce için Core Inventory biçimler, işlevler ve söylem, Rusça için Между нами temel hâl ve iletişim sırası, TORFL ise gramer/kelime, okuma, dinleme, yazma ve konuşma alanlarını çapraz kontrol etmek için kullanıldı. Envanterdeki görevler ürün hedefleridir. CEFR tanımlayıcılarının bire bir kopyası veya resmi seviye tamamlama ölçütü değildir. [Avrupa Konseyi CEFR](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions), [British Council ve Eaquals](https://www.teachingenglish.org.uk/publications/case-studies-insights-and-research/british-council-eaquals-core-inventory-general), [Между нами](https://mezhdunami.org/toc.shtml), [Tomsk Devlet Üniversitesi TORFL merkezi](https://torfl.ido.tsu.ru/en/)

[Kaynak envanteri](../src/content/curriculum/inventory.ts) her görev için bant, iletişim amacı, planlama öncülü ve varsa gerçek katalog kimliğini taşır. Bir planlama öncülü öğretim sırası önerisidir. Zorunlu ders ön koşulları katalog şemasında ayrı doğrulanır. Dili o seviyede “tamamlandı” olarak işaretlemek için oran kullanılmaz.

## Katalogdan hesaplanan kapsam

Ders / hedef, 92 tanımlı görev içinde yayımlananları sayar. Aktif, benzersiz üretim kartı yüzey biçimlerini sayar. Alımlama, okuma bağlamında işaretlenen benzersiz ifade ipuçlarını sayar. Metinlerde geçen diğer sözcükler ve kartların eşdizimleri bu sayıya eklenmez. Sayılar derslerde sunulan söz varlığını gösterir. Dilin o banttaki gerekli kelime hazinesi veya öğrencinin öğrendiği sözcük sayısı için bir tahmin vermez.

| Dil ve bant | Çalışılabilir / hedef | Aktif / alımlama | Okuma / dinleme | En uzun okuma / ses metni, sözcük | Yazı / Speaking |
| --- | ---: | ---: | ---: | ---: | ---: |
| EN A1 | 3/8 · %38 | 4/1 | 6/6 | 20/13 | 3/3 |
| EN A2 | 5/9 · %56 | 9/6 | 10/10 | 33/24 | 5/5 |
| EN B1 | 6/9 · %67 | 8/3 | 12/12 | 46/26 | 6/4 |
| EN B2/B2+ | 4/8 · %50 | 5/3 | 8/8 | 86/51 | 4/4 |
| EN C1 | 4/8 · %50 | 6/4 | 8/8 | 171/94 | 4/4 |
| EN C2 | 1/6 · %17 | 2/1 | 2/2 | 174/121 | 1/1 |
| RU A1 | 6/9 · %67 | 9/3 | 12/12 | 17/13 | 6/3 |
| RU A2 | 3/8 · %38 | 4/2 | 6/6 | 21/19 | 3/3 |
| RU B1 | 4/8 · %50 | 7/4 | 8/8 | 23/19 | 4/4 |
| RU B2 | 2/7 · %29 | 3/2 | 4/4 | 58/46 | 2/2 |
| RU C1 | 2/6 · %33 | 3/1 | 4/4 | 93/29 | 2/2 |
| RU C2 | 1/6 · %17 | 2/1 | 2/2 | 127/93 | 1/1 |

Toplam 23 İngilizce ve 18 Rusça ders. İlk kaynak ve onarım ayrı sayılır. Başlangıç tanılaması hariçtir. Her yazının revizyon görevi vardır. Speaking sayısı yerel prova ve mevcut Live + JSON iş akışına bağlı senaryoları gösterir.

## Kapanan açıklar

| Dizi | İçerik ve beceri çıktısı | Hâlâ açık |
| --- | --- | --- |
| EN A2 · İstasyon ve rezervasyon → belirti → randevu | Süre ile başlangıcı ayır. Telefon görüşmesinde uygun saati seç, giriş ve belge gerekliliklerini teyit et. | Kolay erişilebilir doğal randevu diyalogları; ev, gündelik davet ve temel talimat çeşitliliği. |
| EN B1→C1 · Öneri → talimat teyidi → geçmiş çıkarım → yöntem karşılaştırması | Gömülü soruyla belirsizliği gider. Geçmiş hipotezi ve karşı kanıtı ayır. İki farklı ölçüm, yöntem ve örneklemi karşılaştırıp 100–130 sözcüklük karar notu yaz. | B1 iş dışı anlatı, B2 çok taraflı tartışma ve doğal aksan çeşitliliği, C1 uzun sunumlar ve akademik türler. |
| RU A1→B2 · Aile → geçmiş anlatı → görünüş → vardiya devri | Geçmişte cinsiyet/çoğul uyumu kur. Hareket dizisindeki görünüşü okuma ve yazma çiftlerine aktar. Açık iş ve doğrulanmış sonucu bir ekip kaydından ayır. | A1 sayılar ve iletişim onarımı, A2 miktar ve yer çeşitliliği, B1 bağlantılı öykü ve gerekçeli görüş, B2 rapor ve doğal tartışma. |
| EN/RU C2 · Mevcut ima görevinin kaynaklarını geliştirme | Tutanak, tam söz, takip açıklaması ve ölçüm koşullarını birlikte işle. İlk ses metninde kaynak sınırı ve kararın nasıl değişeceği izlenir. | Uzman sunumları, aksan ve ironi, edebî türler ve bağımsız çok kaynaklı aracılık. Bir C2 görevi bunları karşılamıyor. |

## Üretim standardı ve tekrarlanabilir denetim

Eski ders oluşturucu bir dersi yayımlamayı hızlandırıyordu. Ancak iki kavramı benzer boşluk doldurmalarla ölçüyor, çoğu söz varlığı kartını tekil bir kalıpla sınırlıyor ve ileri düzey için kısa kaynakları engellemiyordu. Uzun metin tek başına kalite ölçütü olmadığı için bu partide özellikle kaynakların çelişmesi, okuma niyeti, açık üretim sonucu, alternatif cevap ve gecikme bağlamı birlikte yazıldı. Serbest görevler inceleme bekliyor. Kontrollü görevler yalnızca kendi küçük hedefi için puanlanıyor. 16 aktif kart ve 17 alımlama ipucu eklendi. Kelime çalışması anlam, telaffuz kaydı, eşdizim, hatırlama ve kullanım istemi taşır.

- `npm run curriculum:check` katalog şemasını, kazanım bağlantılarını, ön koşul ve düzey bütünlüğünü, kaynak anahtarlarını, kabul biçimlerini, çalışılmış modele benzeyen aktarımları, materyal dosyalarını ve uzun dönem öğrenci rotalarını sınar.
- `npm run curriculum:report` bant bazında kapsam, boş görevler, benzersiz kartlar, alımlama ipuçları, materyal sayısı, en uzun kaynak ve yazı/konuşma envanterini mevcut katalogdan üretir.
- Yeni kanıt görevlerinde olasılık ile dışlamanın karışmaması, işe özgü kayıt ile iddianın ayrı tutulması ve farklı dil biçimlerinin normalize edilmesi örneklerle sınandı. Tekrarların bütçeye sığması ve gecikmenin aynı gün kanıtı oluşturmaması mevcut ve genişletilmiş simülasyonlarla sınandı.
- İngilizce B1 benzeri profil, 15, 30 ve 60 dakikada A1'e dönmeden C1 yöntem karşılaştırmasına ulaştı. Sözcük hatırlama, aktarım, okuma ve gecikmeli kontrolde farklı aşamalarda hata yaptı ve onarım aldı. Rusça A1 öz tahminiyle başlayan senaryo B2 vardiya devrine ve ayrı çalıştırmada C2 ima görevine ulaştı. Sonuçlar motoru ve örnek kapsamını doğrular.
- 48 yeni sentetik klip ve iki uzatılmış C2 klibi üretildi. Dosyalar çevrimdışı ve teknik olarak denetlendi. İnsan dinleme testi, aksan çeşitliliği, uzman incelemesi ve gerçek öğrenci sonuçları açık. Okuma/dinleme uzunluğu üst bantların tamamında düzenli artmıyor. Özellikle Rusça C1 konuşma kaynakları kısa.

Bir sonraki üretim sırası, İngilizce B1 iş dışı anlatı ve B2 çok konuşmacılı görüş dizisi ile Rusça A2 miktar ve konut, B1 gerekçeli görüş ve B2 uzun tartışmadır. Sonraki ileri parti doğala yakın ses ve farklı türlerde daha uzun kaynaklar olmadan kapsamı genişletmiş sayılmayacak.
