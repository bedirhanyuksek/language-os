# Language OS

İngilizce ve Rusça için yerel çalışan bir öğrenme stüdyosu. Learning Experience v1 başlangıç taramasını, günlük planı, hata sonrası yeni öğretimi ve gecikmeli değerlendirmeyi birleştirir.

## Yerelde çalıştır

Node.js 22.13+ (22 serisi) veya 24+ ve npm gerekir.

```sh
npm ci
npm run dev
```

Vite’ın gösterdiği yerel adresi aç. Çevrimdışı uygulama önbelleğini denemek için üretim derlemesini kullan.

```sh
npm run build
npm run preview
```

Üretim önizlemesini bir kez çevrimiçi yükle. Service worker kurulunca aynı adreste çevrimdışı olarak yeniden açabilir ve çalışabilirsin. Profil ve yanıtlar tarayıcıya ve uygulama adresine bağlıdır. Ayarlar ekranından JSON yedeği indirilebilir veya geri yüklenebilir.

## Çalışan kapsam

- Türkçe arayüz, çoklu öğrenme hedefi, tahmini seviye, hedef seviye, çalışma günleri ve günlük süre.
- Her dilde beş ana ders ve bir koşullu köprü. İngilizcede seçili A2–B2, Rusçada seçili A1–A2 kazanımları.
- Yeni bağlamda üretim, ön koşul pratiği, okuma ve çevrimdışı sentetik dinleme. Yanlış okuma/dinleme yanıtında farklı bir kaynakla yeni deneme.
- Bağlam içinde kelime öğretimi, yazılı hatırlama ve aralıklı tekrar geçmişi.
- Gecikmeli kazanım kontrolleri ve ayrı kanıt türleri. [Pedagojik mimari](docs/PEDAGOGICAL_ARCHITECTURE.md)
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
