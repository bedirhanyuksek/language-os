# Language OS

Language OS, İngilizce, Rusça ve İspanyolca öğrenenler için Türkçe arayüzlü, yerel çalışan bir dil çalışma uygulamasıdır. Başlangıç örneklerinden ve önceki çalışmalardan yararlanarak kişisel bir günlük yol önerir. Rehberli öğretim, farklı bağlamda üretim ve gecikmeli hatırlama için ayrı görevler sunar.

## Başlangıç

Node.js **22.13 veya üzeri 22.x** ya da **24 ve üzeri**, npm, Git ve güncel bir Chrome/Chromium gerekir.

```sh
git clone https://github.com/bedirhanyuksek/language-os.git
cd language-os
npm ci
npm start
```

Tarayıcıda [http://127.0.0.1:4173/](http://127.0.0.1:4173/) adresini aç. `npm start` üretim derlemesini ve yerel ChatGPT bağlantı servisini birlikte başlatır. `npm run dev` aynı komutu çalıştırır. Kod veya içerik değişince terminalde Ctrl+C ile durdurup yeniden başlat. HMR kapalıdır ve port doluysa komut hata verir.

Normal kullanım için `.env`, API anahtarı, ChatGPT hesabı veya harici veritabanı gerekmez. İngilizce/Rusça ders sesleri depodan gelir. İspanyolca başlangıç dersleri cihazdaki yerel İspanyolca sesi kullanır; uygun ses yoksa metinle devam edilir ve dinleme kanıtı oluşmaz. Tarayıcı testleri için ayrı Chromium kurulumu aşağıda yer alıyor.

## Çalışan kapsam

| Dil | A1 | A2 | B1 | B2/B2+ | C1 | C2 | Çalışılabilir hedef |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| İngilizce | 6 | 8 | 14 | 11 | 10 | 4 | 53 / 74 |
| Rusça | 11 | 10 | 10 | 9 | 5 | 5 | 50 / 70 |
| İspanyolca | 6 | 3 | 0 | 0 | 0 | 0 | 9 / 9 başlangıç hedefi |

İngilizce/Rusça envanterinde 144 iletişim hedefinden 103’ü çalışılabilir. İspanyolca buna ek dokuz A1–A2 başlangıç hedefi sunar; tam A1/A2 kapsamı veya seviye sertifikası değildir. Sıra: selamlaşma ve tanışma, ser/estar, sayılar/fiyatlar, aile, düzenli presente ile rutin, kafe, yön/yer, gustar, pretérito perfecto. Sıfırdan başlayanlar İspanyolca soru görmeden temellerden başlar; önceden çalışanlar isteğe bağlı altı soruluk taramayı açar. İspanyolca B1–C2 henüz yayımlanmadı. İngilizce/Rusça gramer, sözcük ve beceri açıkları [kapsam raporunda](docs/MILESTONE_5_REVIEW_LOAD.md), bekleyen İspanyolca sesleri [ses listesinde](docs/SPANISH_AUDIO_TODO.md) yer alır.

- Dil başına yerel profil, başlangıç taraması, hedef seviye ve süreye göre açıklamalı günlük plan
- Rehberli öğretim, yeni bağlamda pratik, okuma ve sentetik dinleme, hata sonrasında ayrı onarım kaynakları
- Kelime tanıma, yazılı hatırlama ve aralıklı tekrar. Açık uçlu yazıda taslak ve revizyon
- Speaking Coach bağlamı, manuel ChatGPT Voice pratiği ve kullanıcının onayladığı JSON raporu aktarımı
- İlerleme ve konuşma raporları için yerel IndexedDB, dil bazlı JSON yedekleme ve geri yükleme

Başlangıç taraması az sayıda örneğe dayanır ve konuşmayı ölçmez. Açık yazı ve içe aktarılan konuşma kanıtı uzman değerlendirmesi gerektirebilir. Doğal çok konuşmacılı dinleme, kalibre edilmiş seviye ölçümü ve öğrenci pilotu açık çalışma alanlarıdır.

## Çevrimdışı kullanım ve veriler

İlk yüklemede uygulama kabuğu ve sesler tarayıcı önbelleğine alınır. Önbellek hazır olduğunda temel öğretim, yerel değerlendirme ve tekrar çevrimdışı çalışır. Bağlantılı AI istekleri internete ihtiyaç duyar. İlerleme tarayıcı profiline ve uygulama adresine bağlıdır. Eski bir adresteki kayıtların durduğu yer korunur. Taşımak istersen eski adresten **Ayarlar** ile yedek dışa aktar ve yeni adreste içe aktar. Yedek dosyaları kişisel yanıt ve rapor içerebilir.

## İsteğe bağlı ChatGPT bağlantısı

1. `npm start` ile çalıştır ve sabit yerel adresi aç. **Ayarlar → ChatGPT bağlantısı → Continue with ChatGPT** seçeneğini kullan.
2. Açılan OpenAI ekranında hesabı ve izinleri inceleyip onayla. Yerel dönüş adresi `http://127.0.0.1:4173/auth/callback`. Uygulamaya dönüp **Bağlantıyı kontrol et** seçeneğini kullan.
3. Hesap ve çalışma alanı uygun olduğunda, ders içinde önerilen bir AI işlemine ayrıca onay ver. Uygulama yalnızca ilgili ders bağlamını ve işlem için gerekli yanıtı gönderir. Model erişimi, kota ve varsa kredi kullanımı hesabın koşullarına bağlıdır. [ChatGPT kullanım ayarları](https://chatgpt.com/settings/usage)
4. İstersen **Bağlantıyı kaldır** seçeneğini kullan. Yerel bağlantı dosyaları kullanıcının ev dizinindeki `~/.language-os/` altındadır. Bunları veya OAuth dönüş bağlantılarını paylaşma.

Bu entegrasyon loopback için tasarlandı. GitHub Pages, `npm run preview` veya herkese açık bir tünel yerel OAuth sunucusunun çalışma biçimi değildir. AI geri bildirimi resmi seviye veya kazanım kararı vermez. Speaking Coach’un talimat kopyalama ve kullanıcı onaylı rapor akışı OAuth bağlantısından bağımsızdır. [Entegrasyon ve kısıtlar](docs/CHATGPT_INTEGRATION_FEASIBILITY.md)

## Android APK

Capacitor Android projesi `android/` altında bulunur. Android Studio/Android SDK ve JDK 21 gerekir. Web dosyalarını yenilemek için `npm run android:sync`, debug APK üretmek için `npm run android:apk` çalıştır. Bu komutlar web arayüzünü `vite build` ile derler.

APK çıktısı: `android/app/build/outputs/apk/debug/app-debug.apk`. Android Studio'da açmak için `npx cap open android` kullan. Gradle wrapper 8.14.3 kullanır. Gradle ve Android bağımlılıkları ilk derlemede indirme gerektirebilir; çevrimdışı APK derlemesi için bunların önceden önbelleğe alınmış olması gerekir. `android/local.properties` ve derleme çıktıları depoya eklenmez.

Mobil uygulamada web dosyaları APK ile gelir ve service worker kaydedilmez. ChatGPT OAuth bağlantısı yalnızca masaüstündeki `http://127.0.0.1:4173` yerel sunucusunda kullanılabilir. ChatGPT bağlantısı mobil uygulamada henüz yok. Speaking Coach'un kopyala/yapıştır akışı çalışır. Tarayıcıdaki ilerlemeyi mobil uygulamaya taşımak için Ayarlar'dan JSON yedeğini dışa aktarıp uygulamada içe aktar.

## Müfredat katkısı

`src/content/packs/*.json` dosyaları sürüm, dil ve ders listesi içerir. Ders; sabit kimlik, envanter hedefi, ön koşullar, öğretim örnekleri, rehberli/aktarım/gecikmeli görevler, kelime ve kalıplar, okuma/dinleme kaynakları ve açıklamalı cevaplar, yazı/revizyon ve konuşma görevi içerir. Mevcut açık hedefe ders eklemek için uygun JSON paketini düzenle. Ses değiştiğinde eSpeak NG ve FFmpeg ile ilgili klipleri üret.

```sh
npm run curriculum:audio -- paket-adi.json
npm run curriculum:check
npm run curriculum:report
```

Alanlar, ses adlandırması ve yayın kontrolleri [üretim kılavuzunda](docs/MILESTONE_5_SCALABLE.md). Paketler otomatik doğrulanır. Doğallık, ses niteliği ve pedagojik uygunluk için içerik incelemesi ayrıca yürütülür.

## Geliştirme ve testler

React 19 ve TypeScript 6, Vite 8, IndexedDB üzerinde Dexie, Zod, Node.js üzerinde loopback sunucusu ve OAuth/JWT için jose kullanılır. Vitest alan ve entegrasyon testlerini, Playwright tarayıcı akışlarını çalıştırır.

```sh
npm run typecheck
npm run lint
npm run curriculum:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright öncesinde 4173 portunu boş bırak. Linux’ta gerekiyorsa `npx playwright install --with-deps chromium` kullan. Sistemdeki Chrome ile test etmek için `PLAYWRIGHT_CHROME_PATH` değişkenine Chrome çalıştırılabilir dosyasının yolunu ver. Testler gerçek hesap ve kredi gerektirmez. Üretim paketi katalog büyüdükçe boyut uyarısı verebilir.

[Katkı rehberi](CONTRIBUTING.md) · [Mimari](docs/ARCHITECTURE.md) · [Yol haritası](docs/ROADMAP.md) · [Güvenlik bildirimi](SECURITY.md) · [MIT lisansı](LICENSE) · [Varlık ve üçüncü taraf notları](THIRD_PARTY_NOTICES.md)
