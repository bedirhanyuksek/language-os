# İkinci tur: yapılacaklar

Bu dalda gelenler: Rusça cevap kontrolü ve Kiril klavyesi, Android APK (Capacitor), İspanyolca A1–A2 başlangıcı. Aşağıdakiler bir sonraki turun işleri. Öğretimle ilgili maddelerin gerekçesi ve dosya/satır referansları [TEACHING_AUDIT.md](TEACHING_AUDIT.md) içinde.

## 1. Öğretim düzeni (dört şikâyet)

Öğrenci geri bildirimi: önce anlatım yok, yol haritası yok, tekrar/ilerleme zayıf, seviye uymuyor.

- [ ] **Önce anlatım.** Her ders aynı sırayla ilerlesin: hedef → anlatım ve örnekler → gerekli kelimeler → kontrollü pratik → yeni bağlam → üretim → geri bildirim → aralıklı kontrol. Hızlandırma bir seçenek olsun ("Kısa kontrolle ilerle" / "Konuyu anlat"). Her adımda "Anlatıma dön" bulunsun. Oturum kaydedilsin, yenileyince aynı adımdan devam edilsin.
- [ ] **Yol haritası ekranı ("Yol haritam").** Seviye → ünite → ders hiyerarşisi. "Buradasın", "Sıradaki ders", "Bu hafta", "Önümüzdeki 4 hafta". Süre tahmini günlük dakika × çalışma günü ve kalan işten hesaplansın. Yayımlanmamış kapsam açıkça gösterilsin.
- [ ] **Tekrar motoru.** Kelime ve kavram için tek kuyruk. Yanlış cevap tekrarı ertelemesin, kısa yeniden öğretim açsın. Tek başarılı gecikmeli kontrol tekrarı bitirmesin. Varyant bitince görev sessizce kaybolmasın. Kısa günlük sürelerde bile tekrara pay ayrılsın. Haftalık özet gösterilsin.
- [ ] **Seviye/başlangıç.** Girişte "Sıfırdan öğreniyorum" ve "Bildiklerimi kontrol et" seçenekleri. Taramada "Bilmiyorum / Atla" seçeneği olsun ve bu ayrı bir durum olarak saklansın. Hedef seviye başlangıç noktasını değiştirmesin.
- [ ] **Rusça alfabe ünitesi.** Kiril'i küçük harf gruplarıyla öğreten gerçek bir başlangıç ünitesi; tanışma dersinden önce gelsin. Kiril bilen öğrenci kısa kontrolle geçebilsin.

Önerilen paralel paketler ve dosya sahipliği için [TEACHING_AUDIT.md](TEACHING_AUDIT.md) §6'ya bak: ders oturumu, yol haritası, tekrar motoru, yerleştirme/başlangıç içeriği, ortak sözleşmeler/entegrasyon.

## 2. İspanyolca

- [ ] **"Sıfırdan başla" düzeltmesi.** Şu an bütün tarama soruları "Bilmiyorum" metniyle kaydediliyor. Beceri profilinde "0/5 doğru · Düşük güven" görünüyor. Atlanan tarama, yanlış cevap gibi sayılmamalı. Yukarıdaki "Bilmiyorum / Atla" durumuyla birlikte çözülecek.
- [ ] **Sesleri kayda geçir.** 54 MP3 bu dalda üretildi (`src/content/audio/es.*`, eSpeak NG 1.52 + FFmpeg). Uygulama hâlâ cihaz sentezini kullanıyor. `src/content/teaching.ts` (`modelAudio()`) ve `src/content/continuity.ts` (`author()`) içindeki İspanyolca `synthesis` dallarını `recording`'e çevir. Ayrıntılar: [SPANISH_AUDIO_TODO.md](SPANISH_AUDIO_TODO.md).
- [ ] **Ekran klavyesi.** `TextAnswer` bileşenine İspanyolca için ñ, á, é, í, ó, ú, ü, ¿, ¡ tuşları eklenecek.
- [ ] Sesleri dinleyerek kontrol et; içerik doğallığı için anadili İspanyolca biri incelesin.

## 3. Android APK

- [ ] Uygulama simgesi ve açılış ekranı hâlâ Capacitor'ın varsayılan mavi logosu. Defter simgesi (`public/icon.svg`) ile değiştirilecek.
- [ ] Mağaza/paylaşım için imzalı release yapılandırması (keystore repoya girmez).
- [ ] Mobilde ChatGPT bağlantısı yok. İstenirse küçük bir backend ile web OAuth akışı ayrıca tasarlanacak.

## 4. Küçük düzeltmeler

- [ ] Kiril klavyesi açıkken düğme hâlâ "Kiril klavyesini aç" diyor; "kapat" olmalı.
- [ ] Kiril klavyesinde yalnızca küçük harfler var. Değerlendirmeyi etkilemiyor ama özel isimler için büyük harf tuşu eklenebilir.

## Doğrulama

Bu dalın son hâli: typecheck, lint, 150 birim testi, `vite build` ve 30/30 Playwright testi (masaüstü + Pixel 7) geçti. Debug APK emülatörde (Pixel 10 Pro) açıldı.
