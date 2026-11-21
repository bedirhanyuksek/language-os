# Language OS

Language OS, İngilizce, Rusça ve İspanyolca çalışanlar için Türkçe arayüzlü, yerel öncelikli bir öğrenme rehberidir. Öğrencinin hedefini günlük çalışmaya bağlar; açıklamalı öğretim, rehberli pratik, yeni bağlamda kullanım ve gecikmeli hatırlamayı birbirinden ayırır. İlerleme dil ve beceriye ait yerel kanıtlara dayanır; tamamlanan ders sayısı veya tek bir puan yeterlik iddiası olarak kullanılmaz.

## Mevcut kapsam

- **İngilizce ve Rusça:** Sürümlü ders paketleri, başlangıç değerlendirmesi, kişisel çalışma rotası, açıklamalı öğretim, okuma/dinleme, yazılı üretim ve revizyon, kelime hatırlama ve aralıklı tekrar kullanılabilir. Açık yazı, konuşma provası ve içe aktarılan konuşma raporu kesin seviye puanı üretmez.
- **İspanyolca:** Selamlaşma, tanışma, ser/estar, sayılar, aile, rutin, kafe, yönler, beğeniler ve yakın geçmiş konularında başlangıç dersleri bulunur. Bu içerik tamamlanmış A1–A2 kapsamı veya seviye belgesi değildir.
- **Yerel çalışma:** Profil, ilerleme ve yedekler tarayıcıda tutulur. Uygun içerik ve önbellek hazır olduğunda temel öğrenme akışı çevrimdışı devam edebilir.
- **İsteğe bağlı ChatGPT desteği:** Yerel geliştirme sunucusuyla kullanılabilen entegrasyon ayrı onay gerektirir. AI geri bildirimi resmi seviye veya öğrenme başarısı kararı değildir.

A1–C2, ürünün uzun vadeli hedefidir; tüm dil ve beceriler için tamamlanmış bir kapsam değildir. Mevcut İngilizce/Rusça dersleri ve İspanyolca başlangıç içeriği yayımlanmış alt kapsamı temsil eder. Aşama 4'teki pilot tasarımı ve ses fizibilitesi belgelenmiştir; doğal kayıt entegrasyonu, uzman incelemesi ve öğrenci pilotu tamamlanmış özellikler değildir. Paket 2B için dokuz yerel TTS adayı üretilmiş ve kullanıcı tarafından anlaşılır bulunmuştur. Bunlar yalnızca açıkça etkinleştirilen, puansız yerel önizlemede kullanılabilir; üretim uygulamasına, Git deposuna veya çevrimdışı pakete eklenmemiştir. MP3 çıktılarını ticari, çevrimdışı ve açık depoda dağıtma hakları henüz net değildir. Ayrıntılar [Aşama 4 ses fizibilitesinde](docs/PHASE_4_AUDIO_FEASIBILITY.md#paket-2b-teknik-teslimi) yer alır.

## Gereksinimler ve kurulum

Node.js **22.13 veya üzeri 22.x** ya da **24 ve üzeri** ve npm gerekir. `npm ci`, `package-lock.json` dosyasındaki bağımlılıkları kurar. Normal web geliştirme ve kullanım için sistem Chrome kurulumu gerekmez.

```sh
git clone https://github.com/bedirhanyuksek/language-os.git
cd language-os
npm ci
```

## Web geliştirme ve preview

```sh
npm start
```

`npm start`, production build alır ve uygulamayı `http://127.0.0.1:4173/` adresinde sunar. `npm run dev`, şu an `npm start` için bir takma addır; ayrı bir Vite geliştirme sunucusu veya HMR sağlamaz. Kaynak değişikliklerinden sonra süreci yeniden başlatın.

```sh
npm run build
npm run preview
```

`npm run preview`, mevcut `dist/` derlemesini Vite preview sunucusunda sunar; kendisi yeniden build almaz. Önceki derlemeyi görmek için kullanılır. `npm start` ise build adımını da içerir ve yerel entegrasyon sunucusunu aynı sabit adreste açar.

### Paket 2B yerel TTS önizlemesi

İnceleme MP3'lerini depoya kopyalamadan yerel geliştirme sunucusunda dinlemek için, `LANGUAGE_OS_PILOT_AUDIO_REVIEW_DIR` değerini MP3'lerin bulunduğu klasöre ayarlayıp Vite'ı açıkça etkinleştirin:

```sh
VITE_PILOT_AUDIO_REVIEW=1 LANGUAGE_OS_PILOT_AUDIO_REVIEW_DIR=/absolute/path/to/pilot-mp3 npx vite --host 127.0.0.1 --port 4173 --strictPort
```

Önizleme yalnızca Vite geliştirme sunucusunda ve loopback üzerinden çalışır; dış klasördeki her MP3'ün SHA-256 değerini kontrol eder. İlgili derslerde “Yerel Paket 2B TTS önizlemesi” bölümünden açılır. Sesler sentetik olarak etiketlenir, puanlanmaz ve öğrenme kanıtı oluşturmaz. `npm start`, `npm run dev`, `npm run preview`, production build ve çevrimdışı uygulama bu önizlemeyi açmaz veya dosyaları paketlemez.

## Android / Capacitor

Uygulama simgesi ve açılış görselleri `public/icon.svg` içindeki defterden üretilir. Arka plan renkleri `src/style.css` içindeki `:root` değişkenlerinden alınır: kâğıt `--paper`, yuvarlak simgenin zemini `--ink`. Yeniden üretmek için yerel Playwright Chromium kurulumu ile çalıştırın:

```sh
npm run android:icons
```

Bu komut araç veya tarayıcı indirmez, APK derlemez. Beklenen Chromium sürümü yerelde yoksa `ANDROID_ICONS_CHROMIUM_EXECUTABLE` değişkenine kurulu Chromium'un tam yolunu verin. Örneğin PowerShell'de:

```powershell
$env:ANDROID_ICONS_CHROMIUM_EXECUTABLE = 'C:\yerel\chromium\chrome.exe'
npm run android:icons
```

Üretilen PNG dosyaları `android/app/src/main/res/` altında tutulur ve kaynak kodla birlikte commit edilir:

| Yoğunluk | Normal ve yuvarlak simge | Adaptive ön plan | Ön plandaki defter alanı |
| --- | --- | --- | --- |
| mdpi | 48×48 px | 108×108 px | 66×66 px |
| hdpi | 72×72 px | 162×162 px | 99×99 px |
| xhdpi | 96×96 px | 216×216 px | 132×132 px |
| xxhdpi | 144×144 px | 324×324 px | 198×198 px |
| xxxhdpi | 192×192 px | 432×432 px | 264×264 px |

Adaptive ön planın çevresi saydamdır; 108dp tuvalde defter ortadaki 66dp alanda kalır. Her iki `mipmap-anydpi-v26` XML'i `@mipmap/ic_launcher_foreground` ve `@color/ic_launcher_background` kaynaklarını kullanır. Android 12 ve sonrasının sistem açılışı da aynı ön planı ve kâğıt rengini kullanır.

| Splash kaynağı | Yatay | Dikey |
| --- | --- | --- |
| mdpi | 480×320 px | 320×480 px |
| hdpi | 800×480 px | 480×800 px |
| xhdpi | 1280×720 px | 720×1280 px |
| xxhdpi | 1600×960 px | 960×1600 px |
| xxxhdpi | 1920×1280 px | 1280×1920 px |

Genel `drawable/splash.png` 480×320 px boyutundadır. Betik mevcut tüm `drawable*/splash.png` dosyalarının boyutunu korur; defteri kâğıt zeminde ortalar (96dp; genel kaynakta 96px). Aynı Chromium sürümüyle dosyaların birebir yeniden üretildiğini, ikon renklerini, güvenli alanı ve splash boyutlarını doğrulamak için:

```sh
npm run android:icons -- --check
node --test scripts/android-icons.test.mjs
```

Depoda Capacitor Android projesi `android/` altında bulunur. Android derlemesi için Android Studio, Android SDK ve uyumlu bir JDK kurun. Web varlıklarını Android projesine aktarmak ve platform dosyalarını eşitlemek için:

```sh
npm run android:sync
```

Debug APK üretmek için:

```sh
npm run android:apk
```

Proje Android Studio'da `npx cap open android` ile açılabilir. Bu komutlar web uygulamasını build eder; Gradle/Android araçları ve gerekli SDK bileşenleri ilk derlemede indirme gerektirebilir. Bu yönlendirme proje yapılandırmasını açıklar; her cihazda başarılı APK veya mağaza dağıtımı garantisi değildir.

## Test ve kalite kontrolleri

Proje birim ve entegrasyon testlerinde **Vitest**, tarayıcı akışlarında **Playwright** kullanır. Playwright için proje tarafından beklenen Chromium'u bir kez kurun:

```sh
npx playwright install chromium
```

Kullanılabilir kontroller:

```sh
npm run typecheck
npm run lint
npm test
npm run curriculum:check
npm run test:e2e
npm run build
```

`npm test` tüm Vitest testlerini, `npm run curriculum:check` müfredatla ilgili hedefli Vitest grubunu, `npm run test:e2e` Playwright senaryolarını çalıştırır. `npm run build` TypeScript kontrolünü ve production build'i birlikte yürütür. Playwright yerel `dist/` çıktısını Vite preview üzerinden `127.0.0.1:4173` adresinde test eder; güncel çıktı gerektiğinde önce `npm run build` çalıştırın. E2E senaryoları izole test tarayıcısı kullanır.

## Ürün ve geliştirme belgeleri

- [Ürün ve öğrenme Blueprint'i](docs/PRODUCT_LEARNING_BLUEPRINT.md)
- [Ürün vizyonu](docs/PRODUCT_VISION.md)
- [Uygulama yol haritası](docs/IMPLEMENTATION_ROADMAP.md)
- [Aşama 4 pilot sözleşmesi — Paket 1](docs/PHASE_4_PILOT_CONTRACT.md)
- [Aşama 4 ses fizibilitesi — Paket 2A](docs/PHASE_4_AUDIO_FEASIBILITY.md)
- [Mimari](docs/ARCHITECTURE.md)
- [Katkı rehberi](CONTRIBUTING.md)
