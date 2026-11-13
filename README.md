# Language OS

İngilizce ve Rusça için yerel çalışan bir öğrenme stüdyosu. Learning Experience v1 başlangıç taramasını, günlük planı, hata sonrası yeni öğretimi ve gecikmeli değerlendirmeyi birleştirir.

## Yerelde çalıştır

Node.js 22.13+ (22 serisi) veya 24+ ve npm gerekir.

```sh
npm ci
npm start
```

[Yerel uygulamayı aç](http://127.0.0.1:4173/). `npm start` üretim derlemesini ve isteğe bağlı AI öğretmen bağlantısı için gerekli yerel servisi aynı adreste başlatır. Daha önce başka bir adreste açtıysan ilerlemeni Ayarlar’dan JSON olarak taşıyabilirsin.

**Ayarlar → ChatGPT bağlantısı** bölümünden resmî yetkilendirmeyi aç. Geri döndüğünde **Bağlantıyı kontrol et** ile hesabına sunulan modelleri gör. Ders anlatımının yanında başka bir açıklama ya da örnek isteyebilir, konu hakkında soru sorabilirsin. Açık yazı yanıtının yanında geri bildirim, tekrarlanan hatanın yanında hedefli prova önerilir. Uygulama modeli bağlı hesabın listesinden seçer. Her metin isteği için plan kotası ve varsa kredi kullanımına ayrı onay verirsin. Kredi kullanımını [ChatGPT Kullanım ayarlarında](https://chatgpt.com/settings/usage) yönetebilirsin. Hesap uygunluğu ve model erişimi ChatGPT tarafında belirlenir.

Her iki komut da (`npm start` ve `npm run dev`) aynı yerel uygulamayı başlatır. Değişiklikleri görmek için sunucuyu durdurup yeniden başlat. Tek adres kullanıldığı için geliştirme sırasında HMR kapalıdır. Port doluysa başlatma durur. Sunucu süreçleri otomatik olarak kapatılmaz. Çalışan Language OS'u yeniden başlatmak için başlattığın terminalde Ctrl+C kullan.

Tarayıcı ilerlemesi adres ve Chrome profiline bağlıdır. Daha önce `localhost:5173` üzerinde oluşturulan kayıtlar o adreste kalır. IndexedDB erişimi başarısız olursa uygulama **Teknik ayrıntılar** altında işlemi, hata türünü ve güvenli bir sonraki adımı gösterir. Tanılama kayıt içeriklerini göstermez. Uygulamanın çevrimdışı sayfası üretim derlemesinin önbelleğini kullanır. Çevrimiçiyken yeni sayfa sunucudan alınır.

## Çalışan kapsam

- Türkçe arayüz, çoklu öğrenme hedefi, tahmini seviye, hedef seviye, çalışma günleri ve günlük süre.
- Her dilde beş ana ders ve bir koşullu köprü. İngilizcede seçili A2–B2, Rusçada seçili A1–A2 kazanımları.
- Yeni bağlamda üretim, ön koşul pratiği, okuma ve çevrimdışı sentetik dinleme. Yanlış okuma/dinleme yanıtında farklı bir kaynakla yeni deneme.
- Bağlam içinde kelime öğretimi, yazılı hatırlama ve aralıklı tekrar geçmişi.
- Gecikmeli kazanım kontrolleri ve ayrı kanıt türleri. [Pedagojik mimari](docs/PEDAGOGICAL_ARCHITECTURE.md)
- İsteğe bağlı AI öğretmen önerileri. AI yanıtları ilerleme veya beceri kanıtı olarak kaydedilmez.
- Yazıda taslak ve revizyon; yerel sesli prova, destekli derslerde isteğe bağlı ChatGPT Voice ve JSON rapor aktarımı.
- Başlangıç taraması sınırlı örnekler üzerinden beceri profili verir. Ek tanılama ayrı okuma ve dinleme örnekleriyle daha sonra tamamlanabilir. Konuşma taramada ölçülmez, serbest yazı inceleme bekler. Sınav profilleri ve ayrıntılı seviye ölçümü [yol haritasında](docs/ROADMAP.md).

## Kalite kontrolleri

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Linux CI’da tarayıcı sistem bağımlılıkları için `npx playwright install --with-deps chromium` kullanılır. Yerelde mevcut uyumlu Chrome ile çalıştırmak için `PLAYWRIGHT_CHROME_PATH` değişkenine çalıştırılabilir dosyanın yolunu ver.

Ürün kapsamı ve katkı akışı için [ürün notlarına](docs/PRODUCT.md), [mimariye](docs/ARCHITECTURE.md) ve [katkı rehberine](CONTRIBUTING.md) bak.
