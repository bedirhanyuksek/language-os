# Milestone 5 · Tekrar birikimi ve bağlam aktarımı

## 42 günlük tekrar denetimi

İki dilde altı profil ve 5, 15, 30, 60 dakikalık bütçelerle 48 senaryo çalıştırıldı. [Günlük CSV](MILESTONE_5_REVIEW_LOAD_DAILY.csv) her senaryonun önceki ve güncel uygulamayla yaptığı 42 çalışmayı içerir. İki koşuda toplam 4.032 satır var. Önceki koşu 99 dersle, güncel koşu 103 dersle çalıştı. Bu nedenle özellikle rotanın ilerleyen günlerindeki farklar hem planlama kurallarını hem katalog değişikliğini yansıtır.

Her gün aynı yerel saatte başlıyor. Yeni öğrenci sıfır kartla, düzenli öğrenci dokuz güne dağılmış 18 kartla, hafif dönüş 8’i gecikmiş 12 kartla başlıyor. İki ağır dönüşte 65 kartın vadesi geçmiş. Bunlardan sık hata yapan profilde 24 kart her seferinde yanlış yanıtlanıyor. Kalan yazılı tekrarlarda yaklaşık dokuzda bir hata simüle ediliyor. 250 kartlı senaryoda değerlendirme motoru geçerli kart kimlikleri alır ve yalnızca testte kullanılan, öğretim rotasının dışındaki bir katalog kopyasından beslenir. Derslerde örnek yanıtlar kullanılır, ses oynatma bildirilir ve konuşma teklifi atlanır. Süreler sistemin etkinlik bütçesidir. Gerçek öğrenme süresi, doğal dinlediğini anlama veya konuşma yeterliği ölçülmedi.

CSV’de `dueStart` ve `dueEnd` oturumun başında ve sonunda vadesi gelmiş bütün kartları sayar. `deferred` yalnız ilk kuyruktan o gün hiç yanıtlanmayanları, `failed` başarısız yanıtları, `unresolved` son sonucu hâlâ başarısız olan kartları içerir. `review` başarı ve hatalar dahil deneme sayısıdır. Her kart bir dakikalık bütçe kullanır. `instruction`, `skills` ve `checks` sırasıyla öğretim, beceri pratiği ve gecikmeli kazanım değerlendirmesi dakikalarıdır. `introduced` yeni kart sayısı, `ready` kontrollü ön koşul eşiğine ulaşmış kümülatif ders sayısıdır. `speakingOffers` konuşma teklifi sayısıdır ve harcanan süreye dahil edilmez. Simülasyonda günlük bütçe aşılmadı; ertelenen kartların önceki kayıtları ve vadeleri korundu.

Uygulama 5 dakikalık planlarda en az 10 geçmiş gün vadeli kart varsa tekrar dışında bir etkinlik yapılan günün ardından tekrar ağırlıklı bir gün açar. Bir sonraki oturum öğretime alan ayırır. Vadesi birikmiş, ilk tekrarını bekleyen veya hatırlanamamış kart yükü bir günlük tekrar kapasitesine ulaşırsa yeni kelime grubu üçten bire iner. Bu grup hâlâ bağlam, tanıma, yazılı hatırlama ve açık kullanım içerir. İlk hatada yeniden deneme 10 dakika sonradır. Ardışık hatalarda sonraki denemeler 1, 2 ve en fazla 4 gün sonraya atanır. Bu süreler yalnızca gerçekten başarısız bir yanıt kaydedilince atanır. Bir doğru yazılı yanıt başarılı tekrar adımlarını yeniden başlatır. Uygulama konuşma raporundan gelen kartları önce, diğer kartları da vade sırasıyla sunmayı sürdürür.

### Günler arası eğilim

İlk dört ölçüm oturumun başındaki vadesi gelmiş kart sayısını, son ölçüm 42. günün sonundaki kuyruğu gösterir. Aralıklar iki dildeki en düşük ve en yüksek değerdir. Yüzdeler kart tekrarı dakikalarının 14 veya 42 günlük **ayrılmış bütçeye** oranıdır. Öğretim ve beceri sütunu ilk 42 günde gecikmeli kazanım kontrolleri hariç toplamdır.

| Profil | dk/gün | 1. gün | 7. gün | 14. gün | 28. gün | 42. gün sonu | Tekrar 14 / 42 gün | Öğretim + beceri dk | Yeni kart |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Yeni | 5 | 0 | 1 | 1–2 | 0–1 | 0–1 | 7–10% / 14–19% | 139–147 | 7 |
| Yeni | 15 | 0 | 1–2 | 0–2 | 0–3 | 0 | 10–11% / 15–18% | 405–425 | 22–25 |
| Yeni | 30 | 0 | 2 | 4–5 | 8–11 | 0 | 11–12% / 22–26% | 777–830 | 59–65 |
| Yeni | 60 | 0 | 3–7 | 9–12 | 15–16 | 0 | 14–16% / 23–25% | 1030–1245 | 96–111 |
| Düzenli | 5 | 0 | 8 | 7 | 9–10 | 4–7 | 40% / 40% | 112 | 5–6 |
| Düzenli | 15 | 0 | 3–4 | 3 | 2–6 | 0 | 28–29% / 29% | 350–362 | 19–22 |
| Düzenli | 30 | 0 | 5–6 | 7–8 | 8–10 | 0–1 | 19–22% / 30–31% | 735–739 | 62–64 |
| Düzenli | 60 | 0 | 8–10 | 14–16 | 11–16 | 0 | 20–21% / 22–23% | 890–1000 | 76–81 |
| 8 gecikmiş | 5 | 8 | 3 | 10 | 5–8 | 1–2 | 29–31% / 30–31% | 130–132 | 6–7 |
| 8 gecikmiş | 15 | 8 | 0–1 | 1–2 | 3 | 0 | 23–26% / 24–27% | 362–378 | 21–22 |
| 8 gecikmiş | 30 | 8 | 2–3 | 4–5 | 4–9 | 0 | 18–20% / 29–30% | 740–755 | 64–65 |
| 8 gecikmiş | 60 | 8 | 6–7 | 11–15 | 10–12 | 0 | 20% / 22% | 890–1000 | 80–83 |
| 65 gecikmiş | 5 | 65 | 46 | 51 | 56 | 34–35 | 64% / 64–65% | 67–69 | 3–4 |
| 65 gecikmiş | 15 | 65 | 8 | 18–19 | 11–12 | 0 | 75% / 54–55% | 220–228 | 10–12 |
| 65 gecikmiş | 30 | 65 | 6–7 | 9 | 9 | 0 | 47–48% / 36–41% | 640–667 | 31–45 |
| 65 gecikmiş | 60 | 65 | 6–8 | 13–14 | 6–10 | 0 | 32–33% / 20–24% | 890–1000 | 31–45 |
| 250 gecikmiş | 5 | 250 | 231 | 236 | 236 | 229–230 | 64% / 64–65% | 67–69 | 3–4 |
| 250 gecikmiş | 15 | 250 | 191 | 191 | 209 | 131–133 | 76% / 76–77% | 133–135 | 6–7 |
| 250 gecikmiş | 30 | 250 | 111 | 135 | 53–55 | 0 | 88% / 83–84% | 175–188 | 8–9 |
| 250 gecikmiş | 60 | 250 | 8–9 | 14–15 | 16–17 | 0 | 78% / 48% | 890–1000 | 13–16 |
| 65 ve sık hata | 5 | 65 | 46 | 60 | 59 | 44–45 | 64% / 64–65% | 67–69 | 3–4 |
| 65 ve sık hata | 15 | 65 | 30 | 41 | 21–25 | 0 | 76% / 71–72% | 150–155 | 7–8 |
| 65 ve sık hata | 30 | 65 | 12 | 19 | 7–8 | 0 | 61–62% / 50–51% | 505–512 | 31–35 |
| 65 ve sık hata | 60 | 65 | 5–6 | 14 | 5–8 | 0 | 39–41% / 28–31% | 890–1000 | 31–45 |

Beş dakikalık normal dönüşte 42. gün sonunda 63–64 yerine 34–35 kartın vadesi geçmişti. Bu kazanımın karşılığında öğretim ve beceri pratiği 132’den 67–69 dakikaya indi. 250 kartlı profilde 5 dakikada 229–230, 15 dakikada 131–133 kart açık kaldı. Ayrıca 5 dakikada düzenli profil ikinci haftadan itibaren dalgalanıyor. Tek kısa oturumun bütün kuyruğu eritmesi ve yüksek hızda yeni içerik sunması aynı anda mümkün görünmüyor.

65 kartın 24’ünün sürekli yanlış yanıtlandığı 30 dakikalık senaryoda 42 günlük tekrar 1.108–1.109’dan 633–642 dakikaya indi. Öğretim ve beceri 132’den 505–512 dakikaya çıktı. 15 dakikada aynı profil 14 günlük bütçenin hâlâ %76’sını, 42 günlük bütçenin %71–72’sini tekrara ayırdı. Son vadesi gelmiş kuyruk boşalsa bile sık hata profilindeki 24 kart hâlâ başarısız durumda. Hata bekleme süresi öğrenme kanıtı üretmez. Dört günlük üst sınır ve 10 kart eşiği, bu sentetik karşılaştırmada seçilen ürün kurallarıdır. Canlı öğrenenlerle sınanmadı.

250 kartlı 30 dakikalık profilde 7. günden 14. güne kuyruk yeniden yükseldi. Önceki başarılı kartların tekrar vadesinin geri dönmesi bu dalgalanmayı oluşturur. 42. gün sonunda kuyruk boşalsa bile ilk 14 günde bütçenin %88’i kart denemelerine gitti. Testte 60 dakikaya ve yeterli seviyeye sahip bazı öğrenciler yayımlanmış rotanın sonuna ulaştığı için sonraki günlerde ayrılmış sürenin tamamını kullanmadı.

Günlük raporu yeniden üretmek için çalıştırılacak komut:

```sh
LANGUAGE_OS_REVIEW_REPORT=1 npm test -- --disableConsoleIntercept tests/review-load.test.ts
```

## Öğretim içeriği

| Ders | Ön koşul ve öğretim | Ana okuma / dinleme, sözcük | Aktif kart / alımlama |
| --- | --- | ---: | ---: |
| EN B1 konuşma onarımı | B1 etkileşim → `did + say/mean`, `not` ile karşıt odak ve kısa duraklar. İki kişi, yanlış duyulan eşya yerini teyit eder. | 100 / 91 | 4 / 3 |
| EN C2 kaynak dosyasını dönüştürme | C1 kanıt ve farklı kitleye aktarım → `subject to + -ing` ile `if` arasında tür değişimi, `whether/how many` ile kanıt sınırı. Gece servisi dosyası kurul notuna ve yolcu duyurusuna dönüşür. | 276 / 258 | 5 / 4 |
| RU B1 kültürel ziyaret | A2 misafirlik ve B1 hareket fiilleri → `к` + yönelme, `через` + belirtme, `из` + ilgi. Yol tarifi, ziyaret koşulu ve ayrılma yeri yeni bağlamda uygulanır. | 76 / 70 | 4 / 3 |
| RU B2 kültürlerarası arabuluculuk | B1 kültürel ziyaret ve B2 tartışma → `по словам / с точки зрения` + ilgi, `если бы` + geçmiş biçimi. Üç taraflı bir görüşmede geçici istek, varsayımsal kabul ve bekleyen teyit ayrılır. | 183 / 165 | 5 / 4 |

**18 benzersiz aktif kart**, 14 alımlama girdisi (katalog geneline 13 benzersiz ifade), 8 yapı odağı, dört yazma ve dört konuşma senaryosu eklendi. Kartlarda açık kullanım toplam 18 kez istenir. Her yapı kontrollü, farklı bağlamda aktarım ve gecikmeli değerlendirme aşamalarında örneklenir. Bu örnekler serbest üretim yeterliği yerine geçmez. Ana materyallerin yanında dört ayrı okuma ve dört ayrı dinleme onarım kaynağı var. 34 sentetik ses dosyası kaynak metin eşleşmesi ve yüklenebilirlik açısından kontrol edildi. Çok konuşmacılı diyalogların seslendirmesi doğal konuşmacı ayrımı, vurgu veya telaffuz uzmanlığı açısından doğrulanmadı.

EN B1→C1 rotasında örnek yanıtlı test 35 benzersiz ders, 895 dakika ilk çalışma ve 85 tanıtılan kart kaydetti. Önceki raporda 34 ders, 865 dakika ve 81 kart vardı. Seviyeler arasında aynı terimleri tekilleştiren içerik denetimi bu rota için 84 aktif ve 60 alımlama ifadesi sayıyor. 15/30/60 dakikalık senaryolarda gecikmeli kazanım kontrolleri ve kart tekrarları ilk çalışma sürelerine dahil edilmedi.

RU A1→B2 rotasında önceki 36 yerine 38 yayımlanmış ders var. Önceki içerik bütçesine iki yeni 30 dakikalık ders eklendi ve kapsam tahmini 940’tan 1.000 dakikaya çıktı. Seviye bazlı terimleri tekilleştiren içerik denetimi 96 aktif ve 65 alımlama ifadesi sayıyor. 60 dakikalık sıfırdan başlayan profil, farklı yerleştirme ve köprü yoluyla 1.030 öğretim ve beceri dakikası, 120 gecikmeli kazanım kontrolü dakikası ve 575 kart tekrar dakikası kaydetti. Bu profil iki yeni Rusça dersin tüm temel aşamalarına ulaştı.

## Açık kapsam

| Dil | A1 | A2 | B1 | B2 | C1 | C2 | Çalışılabilir / toplam |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| İngilizce | 6/12 | 8/13 | 14/14 | 11/13 | 10/12 | 4/10 | 53/74 |
| Rusça | 11/13 | 10/12 | 10/13 | 9/12 | 5/10 | 5/10 | 50/70 |

Envanterde 41 hedef açık. İngilizce A1–A2’de rutin, aile, temel form, ev ilanı ve çevrim içi planlama eksikleri sürüyor. B1’de envanterdeki her hedefe bir ders bağlandı; ileriye dönük kelime tekrar yoğunluğu, telaffuz ve bağımsız konuşma kanıtı hâlâ sınırlı. B2–C2’de doğal aksan ve prosodi, uzun akademik dinleme, edebî üslup ve hassas arabuluculuk açık. Rusçada temel ses karşıtlıkları, duygu ve ilişkiler, B1 vurgu/tonlama, B2 doğal çok konuşmacılı dinleme, C1 müzakere ve sunum notu, C2 aksan ve nüans çalışmaları eksik. Güncel envanter ve seviye ölçümleri `npm run curriculum:report` ile yeniden çıkarılabilir. İçerik envanterinin doluluk oranı CEFR yeterlik sonucu değildir.
