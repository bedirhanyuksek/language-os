# Uygulama planı

13 Kasım 2026 · Ürün yeniden değerlendirmesi sonrası sıra

İlk geliştirme önceliği, kullanıcının cevaplarıyla gerçekten değişen yerel rehberdir. Yeni ders sayısı, arayüz yüzeyi ve AI bağlantısı ayrı iş paketleridir. [Denetim](PRODUCT_VISION.md) · [Deneyim](LEARNING_EXPERIENCE_SPEC.md) · [Müfredat](CURRICULUM_ARCHITECTURE.md) · [Kabul kapıları](EDUCATIONAL_QUALITY_GATES.md)

## Korunacak temel

- React/Vite ekranları, `ExerciseForm`, `PedagogyView`, MP3 ve çevrimdışı önbellek. Yeni akışları mevcut Plan, Çalışma, Sonuç ve Beceri Profili üzerine yerleştir.
- Saf TypeScript puanlama, gün/bütçe seçimi, kelime planlayıcı, Dexie repository, yedek doğrulaması ve v1/v2 içerik kimlikleri. Yeni kanıt alanlarını sürümlü ve geriye uyumlu ekle.
- Speaking Report v1 ve yerel 2A prototipi. Bir hesap veya veri köprüsü çalışmadığında mevcut rapor ve öğrenme kayıtları kullanılabilir.
- İlk aşamalarda küçük paket kayıt defteri, dil başına içerik, deterministik aday sıralaması ve mevcut test araçları yeterli. İçerik girişini JSON ve inceleme şablonuyla sürdür.

## v1 teslimatı ve sonraki sıra

Birlikte geliştirilen kapsam: iki koşullu köprü, dört yeni devam dersi, iki dilde yeniden açılabilen ek tanılama, okuma/dinleme onarımı, yazı revizyonu, karşılaştırmalı gelişim ve yerel sesli prova. Kapsam teknik kontrolden geçti; uzman ve öğrenci pilotu açık. Aşağıdaki tablo kademeli hedefleri, teknik ilk yayın ile uzman ve pilot kapıları dahil, gösterir.

İlk önerilen devam çalışması, mevcut rotaların doğal ses ve uzman incelemesiyle doğrulanması; ardından daha geniş tanılama ve bağımsız üretim görevleri. AI hesap pilotu ayrı ilerler.

## Hedef teslimat sırası

| Aşama | Teslimat | Doğrulanabilir kabul |
| --- | --- | --- |
| 1 · Kanıt ve rehber, mevcut iki ünite | Sonuç ile görevin tamamlanmasını ayır. Alımlama hatası için ayrı öğretim ve paralel kontrol. Plan gerekçesine kaynak gözlem ve “yapabilirim” hedefi ekle. Desteği kaydet. Gecikmeli ve bağımsız başarının etiketini daralt. | İki dilde G2–G5 ve G7. Ekranda yöntem değişikliği ve yeni bağlam gözlenir. Yanlış dinleme veya okuma başarıya çevrilmez. İpucu açma ve çözümü görme bağımsız kanıt sayılmaz. v1/v2 yedek aynı tarihsel anlamı korur. |
| 2 · Yerel iletişim ve gelişim döngüsü | Doğal dinleme çiftleri, rubrikli yazı ve revizyon, izinli yerel konuşma kaydı/oynatma, kişisel amaç ve karşılaştırılabilir gelişim ekranı. Hesapsız işleyiş. | G6, G8, G9. Yeni ses bağlamı önceki anlam hatasına bağlanır. İlk yanıt ve revizyon görünür. Mikrofon ve AI kapalıyken plan ilerler ve eksik kanıt işaretlenir. Kullanıcı ekrandan önceki/sonraki örneğin karşılaştırma temelini görür. |
| 2C · İsteğe bağlı hesap ve öğretmen | Yerel loopback servisinde hesap izni ve seçilmiş tek metin isteği doğrulandıktan sonra PWA’dan bağlantı durumu, açık izin, bağlantıyı kaldırma ve yerel açıklamaya dönüş. Öncelik metin açıklaması ve rubrikli yazı önerisi. | Uygun hesapla bir kez uçtan uca izin ve `response.completed` doğrulanır. Kota/ret/ağ hatası, bağlantı kaldırma ve AI kapalıyken G6/G9 çalışır. Tokenlar tarayıcıya ve yedeğe düşmez. Gerçek hesap, test izni ve uygunluk 2A’daki ayrı kapılardır. |
| 3 · Dil bazlı yerleştirme ve ilk uzun rota | İngilizce B1 omurgasını A2 köprüsü ve B2 devamıyla, Rusça A1’i Kiril köprüsü ve A2 devamıyla büyüt. Okuma, dinleme, dil biçimleri ve ayrı üretim örneklerini kapsayan tanılama. Hedefe göre iki işlevsel dal. | G1/G10. Aynı tahmin, farklı kanıtla farklı başlangıç verir. Her yayımlanan rotada günlük bütçeye sığan birden çok hafta planlanabilir. Kapalı bant ve eksik kanıt görünür. Beceri başına komşu bant örneği ve açıklanabilir yerleştirme mevcut. Uzman incelemesi ve kullanıcı pilotu tamamlanır. |
| 4 · A1–C1 kapsamının kademeli yayını | İngilizce A1/A2 temeli, B1/B2 kapsam tamamlama ve C1; Rusça A1/A2 kapsam tamamlama, B1, ardından B2/C1. Ortak iletişim amaçları üzerinde genel ve mesleki dallar. | Her bant kendi kapsam matrisini, iki farklı aktarım ortamını, doğal alımlama ve rubrikli üretim örneklerini, gecikmeli kontrolü ve bağımsız uzman onayını karşılar. Önceki/sonraki bant sınırı ve yol bütçesi yeniden test edilir. Haritadaki planlı bant, içerik yayınına kadar tanılamada ve planda etkinleşmez. |

2C, 1 ve 2’nin veri sözleşmesini değiştirmeden ayrı yürüyebilir. Gerçek hesap doğrulanana kadar uygulamaya çalışan bağlantı etiketi eklenmez. Doğrudan Live başlatma veya MCP üzerinden otomatik rapor alma bu plana bağımlılık olarak girmez. Uygun çalışma alanı, yetkili köprü ve gerçek Live çağrısı ayrı fizibilite koşullarıdır. [2A fizibilitesi](CHATGPT_INTEGRATION_FEASIBILITY.md)

## İçerik üretimini büyütme

Her yayın partisi bir iletişim alanını uçtan uca işler. Örneğin Rusça A1 hizmetler alanı saat/fiyatı okumayı, doğal bir isteği dinlemeyi, kısa yazılı talebi ve takip sorusuyla sözlü işlem yapmayı bağlar. Bir sonraki bağlam, aynı yapıyı farklı amaçta yeniden kullanır. İngilizce B1 iş güncellemesine günlük olay, fikir belirtme ve sorun çözme alanları eklenir. B2/C1’de tür, kaynak ve muhatap çeşitliliği özellikle planlanır.

Tek geliştirici önce şu çevrimi kurar: kazanım ve ölçüm taslağı → özgün metin, ses ve alternatif yanıtlar → bağımsız dil incelemesi → motor ve tarayıcı senaryosu → öğrenci gözlemi → paket yayını. AI taslak ve test girdisi üretebilir. Uzman dil ve rubriği onaylar. Çalışma, yayımlanmış ders, bekleyen bağımsız görev, pilot ve kapsama göre takip edilir.

Beş dakikalık bütçe ve hafta içi takvimi kullanan, koşullu köprüyle başlayan otomatik örnek öğrenci İngilizcede 45, Rusçada 48 çalışma gününde altı dersteki gecikmeli kontrolleri tamamladı. Modelde sırasıyla 179 ve 186 dakika planlanmış çalışma kaydı oluştu. Bu değerler tekrarları içerir; gerçek çalışma süresi veya öğrenme hızı tahmini değildir. Sonraki partinin boyutu uzman incelemesi, doğal ses hazırlama süresi ve pilot bulgularına göre ayarlanır.

Çok haftalı rota kabulünde yerel takvimle en az birkaç çalışma haftası canlandırılır. Yeni görev, hata dönüşü, kaçırılan gün ve tekrar yığılması birlikte çalıştırılır. Tam seviye kapsamı ilanı, bu simülasyonun yanı sıra kazanım matrisindeki açıkların kapanmasına ve insan incelemesine bağlıdır.

Yeni bir ders için dilin `*-experience.json` paketine benzersiz kimlikli kazanım, örnek ve karşı örnek, iki aktarım ve iki gecikmeli varyant, ayrı metin ve ses onarımı, kelime uygulaması ve revizyon ekle. Yanıt anahtarını metin veya transkriptteki dayanakla karşılaştır. Var olan kimliğin anlamını değiştirme. [Ses üretimi](../src/content/audio/README.md) ve [kalite kapılarını](EDUCATIONAL_QUALITY_GATES.md) uygula.
