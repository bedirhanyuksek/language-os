# Mimari

- `src/content` Zod şemaları ve uygulamadan bağımsız JSON kurs paketlerini barındırır. Dersler, kazanımlar, ön koşullar, varyantlar ve kelime kartları kararlı kimliklerle birbirine bağlanır.
- `src/domain` saf TypeScript fonksiyonlarıyla puanlama, tarama, planlama, tekrar ve konuşma raporundan durum geçişini hesaplar. Zaman ve konuşma oturum kimliği çağırandan gelir.
- `src/persistence` Dexie üzerinde repository sözleşmesini uygular. Her değişiklik IndexedDB yazma işlemi içinde en güncel profili okuyup günceller. Yedek değişimi beklenen yerel kayıtla karşılaştırılır.
- `src/features` React bileşenlerinde görevleri sunar, kullanıcı girdilerini toplar ve durum geçişlerini çağırır. Oturum gezintisi React durumuyla sınırlıdır.
- `vite.config.ts` üretimde sürümlü uygulama kabuğunu önbelleğe alan service worker üretir. Dağıtım, HTTPS veya localhost altında adresin kökünde çalışır.

Müfredat sürümü, IndexedDB tablo sürümü, yedek sürümü ve konuşma raporu sürümü bağımsızdır. Ders paketi, IndexedDB ve yedek v2’ye yükseltildi. Speaking Report v1 kullanır. v1 paket anahtarları önceki denemeleri doğrulamak için korunur. Sonraki IndexedDB değişiklikleri yeni `version(...).upgrade(...)` adımıyla ve eski kayıt testiyle yapılmalı. Yedek geçişleri içe aktarma sınırında uygulanmalı. Yayımlanmış yanıt anahtarları değiştiğinde eski içerik sürümü okunabilir tutulmalı.

Bugünkü tek etkin yerel kayıt bir profil kimliğine bağlıdır. Hesap senkronizasyonu eklenirse profil ve içerik kimlikleri korunabilir. Uzak bir MCP sunucusu tarayıcı IndexedDB’sini doğrudan okuyamaz. Uzaktan yazma için kimliği doğrulanmış bir veri köprüsü, yetkilendirme ve çakışma yönetimi gerekir.

Learning Experience v1, v2 içeriğine yeni kimliklerle ekleme yapar. Önceki soruların anahtarları ve yedek biçimi korunur. `diagnostic` denemeleri başlangıç profiline, `revision` denemeleri yazı geçmişine girer. Plan ve beceri geçişi yerel kurallarla hesaplanır. `TutorProvider` yalnızca harici öneri döndüren bir sözleşmedir; yerel kanıta yazma yetkisi yoktur. [Deneyim tasarımı](LEARNING_EXPERIENCE_SPEC.md)
