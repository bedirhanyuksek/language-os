# Katkıda bulunma

[README](README.md) ile temiz kurulum yap. Değişikliği güncel `main` üzerinden kendi branch’inde geliştir. Örneğin `git switch -c fix/lesson-retry` veya `git switch -c content/ru-b2-reports`. Depoya yazma erişimin yoksa bir fork üzerinden PR aç.

## Pull request

- PR’ı tek bir soruna veya öğrenme dizisine odakla. Bağlantılı olduğu durumu ve doğruladığın davranışı belirt.
- Kod ve içerik değişikliklerini bağımsız incelenebildiklerinde ayrı PR’larda tut. JSON paketini ve üretilen seslerini aynı PR’a ekle.
- Şema veya kayıt davranışı değişiyorsa eski yedekler ve yerel ilerleme için bir regresyon senaryosu ekle.
- Commit mesajını kısa ve eylem odaklı yaz. Örneğin `fix: preserve delayed review history` ya da `content: add Russian B2 reporting sequence`.

## Yeni ders

1. [Envanterden](src/content/curriculum/inventory.ts) açık hedefi ve ana ön koşulu seç. [Üretim kılavuzundaki](docs/MILESTONE_5_SCALABLE.md) JSON alanlarını doldur. Mevcut ders, kart ve alıştırma kimliklerini koru.
2. Kabul edilen alternatif yanıtları, ilk görevden farklı aktarım/gecikme bağlamlarını ve okuma/dinleme kanıt alıntılarını ekle. Alıntı, paket içindeki ilgili materyalden gelmeli.
3. Harici materyal yüklemeden önce kaynağı, sahibi, lisans koşullarını ve yeniden dağıtım iznini belirt. Öğrenci kaydı, gerçek danışma diyaloğu veya telif durumu belirsiz ses kullanma.
4. Ses değiştiyse `npm run curriculum:audio -- paket-adi.json` çalıştır. PR’da hedefleri, sesin kaynağını ve kalan dil incelemelerini yaz. Otomatik kontrolden geçmiş dersin yayın durumu `automated_checked` olur.

## Kontroller

`npm run typecheck`, `npm run lint`, `npm run curriculum:check`, `npm test` ve `npm run build` çalıştır. Tarayıcı akışı veya görünümü etkileniyorsa derlemeden sonra `npm run test:e2e` çalıştır. CI tüm kontrolleri çalıştırır. Çalıştıramadığın kontrolü PR’da belirt.

[Davranış kuralları](CODE_OF_CONDUCT.md) · [Özel güvenlik bildirimi](SECURITY.md)
