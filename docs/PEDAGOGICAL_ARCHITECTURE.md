# Milestone 2B · Pedagojik mimari

Bu belge 2B sürümünü kaydeder. Etkin rotanın ek tanılama, onarım, yazı revizyonu ve genişleyen dersleri için [Learning Experience v1](LEARNING_EXPERIENCE_SPEC.md) belgesine bak.

## Başlangıç durumu ve kapsam

Önceki dersler kısa anlatım, kavram başına bir kesin yanıt ve açık uçlu bir örnek kullanıyordu. Doğru tanıma yanıtı sonraki dersi açabiliyor, geçmiş kelime tekrarları son kayda indirgeniyordu. Beş görevli başlangıç taraması dil bilgisi, kelime ve okuma hakkında dar kanıt veriyor, yazıyı inceleme bekleyen örnek olarak saklıyor, dinleme ve konuşmayı ölçmüyordu. Günlük planda gerekçe vardı. Yeni aşamalar bu gerekçeyi önerinin yanında görünür kılıyor.

İngilizce B1 iş deneyimi ve güncelleme ünitesi ile Rusça A1 tanışma ünitesi derinleştirildi. Her biri mevcut üç dersi korur. Yeni ders veya seviye eklenmedi.

## Öğretim dizisi

- Ön bilgiyi hatırlat, kuralı ve kullanım bağlamını örnekle açıkla, rehberli pratik yaptır. Bağımsız yazıya örnek ve iki ölçüt ver. Yanlış yanıtta ilgili kavramın doğru/yanlış örneğini ve gerekçesini göster.
- Yeni bağlamda seçenek yardımı olmadan üretim iste. Okumada bağlama dayalı anlama sorusu sor. Dinlemede ön görev, ana fikir, yeniden dinleme, ayrıntı, ardından transkript ve açıklama sırayla açılır.
- Kelimeyi anlam, sözcük türü, kullanım bağlamı, örnek, kalıp ve sesle öğret. Tanıma, yazılı hatırlama ve serbest cümle farklı kayıtlardır. Serbest kullanım `review_required` kalır. Aralıklı tekrar, bir sonraki yazılı hatırlama sonucuna göre planlanır. Eski öz bildirim ile yeni yazılı tekrar aynı kanıt türü sayılmaz.
- Yeni bağlamda başarılı üretimden en az 24 saat sonra yeni soruyla gecikmeli kontrol aç. Başarısız kontrolde farklı varyant, en erken bir sonraki gün gelir. Hazır ve gecikmeli doğrulanmış durumlar ayrıdır.

CEFR kullanım hedeflerini ve beceri türlerini tanımlamak için kullanıldı. İkinci dil aralıklı pratik araştırması, gecikmeli kontrol tasarımına dayanak sağlar. Bu üründeki 24 saat, varyant sayısı ve seçme kuralları tasarım kararlarıdır. Öğrenme etkileri henüz kullanıcılarla ölçülmedi. [Avrupa Konseyi CEFR Companion Volume](https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4) · [Kim ve Webb, 2022](https://doi.org/10.1111/lang.12479)

## Adaptif kararlar ve kanıt

| Durum | Karar |
| --- | --- |
| İlk dersin her hedef kavramında farklı tanıma ve kontrollü üretim örneği doğru | Açıklama ve rehberli tur atlanabilir. Yeni bağlamda üretim ve bağımsız yazı yine istenir. |
| Tanıma doğru, kontrollü üretim zayıf | Hızlandırma açılmaz. Yeni bağlamda üretim hatası sonrası yalnızca ilgili kavrama ikinci örnek gelir. |
| Yanıt, içerikte işaretlenmiş önceki kavram hatasıyla eşleşiyor | Bir sonraki öneri önceki kazanımdan kısa açıklama ve geri dönüş alıştırmasıdır. Sonra yeni bağlamın farklı örneği gelir. Eşleşme bir öğretim ipucudur. |
| Konuşma raporunda alıntılı kavram hatası | İlgili yeni bağlam üretimi tekrar açılır. Kelime açığı ilgili kartı yeniden sıraya alır. |
| Öğrenilen üretimin süresi doldu | Günlük bütçe içinde farklı gecikmeli kontrol seçilir. Gecikmeli yanlışlar “doğrulandı” durumunu vermez. |

Kararlar kimlikler, deneme sırası, gözlem türü ve zaman damgasına dayanır. Her plan metni gerekçe taşır. Küçük soru bankasında iki varyant tüketildikten sonra sorular döngüye girer. Doğru hatırlama yazılı tanıma ve kontrollü kullanıma kanıt sağlar. Serbest yazı, telaffuz ve konuşma başarısı hakkında çıkarım için ayrıca uygun kanıt gerekir.

## Dinleme ve ses

Ders metinleri özgün. Bu sürümde altı kısa dinleme parçası ve dokuz kelime örneği, eSpeak NG ile sentetik MP3 olarak üretildi ve uygulama ile dağıtılıyor. Ses dosyaları ilk çevrimiçi üretim yüklemesinden sonra önbelleğe alınır. Şema kaynak ve lisansla doğal kayıt eklenmesini de destekler. Sentez seçeneğinde yalnızca uygun dildeki cihaz sesleri kullanılır. Ses yüklü değilse veya çalma başarısızsa metinle çalışma seçeneği kanıt oluşturmadan devam eder. [eSpeak NG](https://github.com/espeak-ng/espeak-ng) · [Web Speech yerel ses özelliği](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService)

Dinleme kanıtı için çalma sonrasında ana fikir ve ayrıntı yanıtları kaydedilir. Uygulama kişinin sese dikkat ettiğini ölçemez. Sentetik ses doğal hız, bölgesel telaffuz ve sıra alma gibi özellikleri temsil etmez. Sonraki kayıtlar için doğal konuşma, konuşmacı çeşitliliği ve lisans kaydı gerekir.

## İçerik ve kayıt uyumluluğu

`en.json` ve `ru.json` v1 yanıt anahtarlarını korur. v2 ekleri aynı ders, kazanım ve kart kimliklerine bağlanır. Yeni aşamaların kendi sabit alıştırma kimlikleri vardır. Dexie v2 geçişi önceki kayıtları korur ve yeni geçmiş alanlarını başlatır. Eski son tekrar kaydından geçmiş olaylar türetilmez. Yedek doğrulaması her denemeyi kendi paket sürümü ve aşamasındaki anahtarla karşılaştırır. v1 ve v2 yedekleri desteklenir. Speaking Report şeması v1 ve manuel aktarım korunur. Bağlama güncel hedef ve kelime bilgisi eklenir.

## Kalite ve yayın

- Şema boş alanları, hatalı seçenek ve anahtarı, yinelenen seçenekleri, eksik kazanım ve ön koşulları, yanlış kavram ve kart bağlantılarını, tekrar eden bağlamları, çakışan rubriği ve dil/versiyon uyuşmazlığını kontrol eder. Testler yerel ses dosyalarının varlığını da denetler.
- Katkı `draft` olarak başlar. Otomatik kontroller ve bağımsız anahtar karşılaştırması sonrası `automated_checked` olur. Dil uzmanına teslim edildiğinde `awaiting_review`, bağımsız dil ve pedagojik inceleme tamamlanınca `reviewed` kullanılır. v2 başlangıç paketleri `automated_checked` statüsünde kullanılabilir. Taslak ve inceleme kuyruğundaki paketler yüklenmez.
- Otomasyon anlamın doğal oluşunu, tüm alternatif doğru ifadeleri, sentetik vurguyu veya ayırt edici soru niteliğini tek başına belirleyemez. Bu teslimde açıklamalar yayımlanmış gramer kaynaklarıyla karşılaştırıldı, ses ve anahtarlar dosya ve tarayıcı kontrollerinden geçirildi. Bağımsız eğitmen onayı ve öğrenci pilotu bekliyor. [British Council · geçmiş zaman](https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/talking-about-past) · [Между нами · hitap](https://mezhdunami.org/unit01/1_4/language.shtml) · [Между нами · yer bildirme](https://mezhdunami.org/unit03/3_7/language.shtml)

## A1–C1 kazanım haritası

Bu tablo tasarım hedeflerini gösterir. Uygulamadaki ders kapsamı İngilizce B1 ve Rusça A1 örnek üniteleridir.

| Düzey | İngilizce | Rusça |
| --- | --- | --- |
| A1 | Temel kişisel bilgi, çok kısa talimat ve basit yazılı mesaj | Kiril, temel vurgu, kibar tanışma, kişi ve yer bildirimi |
| A2 | Rutin alışveriş ve düzenlemeler, kısa mesaj, geçmiş ve plan | Günlük işlem ve yol tarifi, sık hâl kalıpları, kısa geçmiş/gelecek anlatımı |
| B1 | Deneyim anlatma, ana noktaları izleme, bağlantılı yazı ve gerekçe | Görünüş ve hareket fiillerini bağlamda kullanma, gündelik sorun anlatma, kısa görüş |
| B2 | Uzun konuşmanın savını izleme, seçenekleri tartma, iş yazışması | Uzun metin ve sunumu izleme, kayıt düzeyine uygun tartışma ve yazışma |
| C1 | Örtük anlamı çıkarma, kaynakları birleştirme, profesyonel ton uyarlama | Hızlı doğal söylem, örtük anlam ve üslup, profesyonel sunum ve kaynak sentezi |

### Daha kapsamlı başlangıç değerlendirmesi

İlk kazanımdaki tanıma ve üretimi eşleyen görevlerle tarama İngilizcede 8, Rusçada 9 görev oldu. Bu, o dersin başlangıç rotasını seçmeye yeterli bir tasarım sinyalidir. Beceri profili düşük güvenli kısa gözlemler sunar ve genel CEFR seviyesi atamaz. Dinleme kanıtı ders içinde toplanır, başlangıç taramasına yazılmaz.

Daha geniş tarama için her dil ve beceride birkaç zorluk düzeyi, paralel görev formları ve çoklu bağlam gerekir. Dinleme için farklı konuşmacılar ve ses koşulları, yazı ve konuşma için ayrı rubrik ve değerlendiriciler arası tutarlılık gerekir. Pilot verilerinde soru güçlüğü, ayrıştırma ve tekrar güvenilirliği incelenmeli. Seviye eşlemesi için CEFR bağlantısını uzmanlar ayrı doğrulamalı.

## Önerilen sonraki milestone

Küçük bir iki dilli kullanıcı pilotunda sentetik ve doğal kayıtları karşılaştır, paralel gecikmeli görevleri ve yanlış sınıflandırılan ön koşul eşleşmelerini ölç. İçerik uzmanı incelemesi ve alternatif yanıt kapsamından sonra soru bankasını büyüt. ChatGPT hesap bağlantısı ve Live/MCP denemesi 2A’daki izin ve doğrulama koşullarına bağlı kalır. [2A fizibilitesi](CHATGPT_INTEGRATION_FEASIBILITY.md)
