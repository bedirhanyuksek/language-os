# Mimari

- `src/content` Zod şemaları ve uygulamadan bağımsız JSON kurs paketlerini barındırır. Dersler, kazanımlar, ön koşullar, varyantlar ve kelime kartları kararlı kimliklerle birbirine bağlanır.
- `src/domain` saf TypeScript fonksiyonlarıyla puanlama, tarama, planlama, tekrar ve konuşma raporundan durum geçişini hesaplar. Zaman ve konuşma oturum kimliği çağırandan gelir.
- `src/persistence` Dexie üzerinde repository sözleşmesini uygular. Her değişiklik IndexedDB yazma işlemi içinde en güncel profili okuyup günceller. Yedek değişimi beklenen yerel kayıtla karşılaştırılır.
- `src/features` React bileşenlerinde görevleri sunar, kullanıcı girdilerini toplar ve durum geçişlerini çağırır. Oturum gezintisi React durumuyla sınırlıdır.
- `vite.config.ts` üretimde sürümlü uygulama kabuğunu önbelleğe alan service worker üretir. Dağıtım, HTTPS veya localhost altında adresin kökünde çalışır.

Müfredat sürümü, IndexedDB tablo sürümü, yedek sürümü ve konuşma raporu sürümü bağımsızdır. Ders paketi, IndexedDB ve yedek v2’ye yükseltildi. Speaking Report v1 kullanır. v1 paket anahtarları önceki denemeleri doğrulamak için korunur. Sonraki IndexedDB değişiklikleri yeni `version(...).upgrade(...)` adımıyla ve eski kayıt testiyle yapılmalı. Yedek geçişleri içe aktarma sınırında uygulanmalı. Yayımlanmış yanıt anahtarları değiştiğinde eski içerik sürümü okunabilir tutulmalı.

Bugünkü tek etkin yerel kayıt bir profil kimliğine bağlıdır. Hesap senkronizasyonu eklenirse profil ve içerik kimlikleri korunabilir. Uzak bir MCP sunucusu tarayıcı IndexedDB’sini doğrudan okuyamaz. Uzaktan yazma için kimliği doğrulanmış bir veri köprüsü, yetkilendirme ve çakışma yönetimi gerekir.

Learning Experience v1, v2 içeriğine yeni kimliklerle ekleme yapar. Önceki soruların anahtarları ve yedek biçimi korunur. `diagnostic` denemeleri başlangıç profiline, `revision` denemeleri yazı geçmişine girer. Plan ve beceri geçişi yerel kurallarla hesaplanır. `TutorProvider` yalnızca harici öneri döndüren bir sözleşmedir; yerel kanıta yazma yetkisi yoktur. [Deneyim tasarımı](LEARNING_EXPERIENCE_SPEC.md)


Milestone 2C yerel önizlemede ayrı bir hesap bağlantısı sınırı ekler. `npm start` üretim arayüzü ve OAuth servisini `127.0.0.1:4173` üzerinde birlikte sunar. Model listesi ve metin istekleri resmî uçlara yalnızca bu servis üzerinden gider. Tokenlar tarayıcı, öğrenci yedeği ve Git dışında, kullanıcıya ait `~/.language-os` dizinindeki yerel kayıtta tutulur. POSIX sistemlerde dizin ve kayıt yalnızca kullanıcıya açılır. Windows’ta kullanıcı profilinin erişim izinleri geçerlidir. Tek etkin bağlantı kullanılır.

AI öğretmene ders hedefi, ön koşullar, ilgili kelimeler ve hata sayıları gönderilir. Cümle değerlendirmesinde ayrıca öğrencinin özellikle girdiği cümle gönderilir. Öğrenci kimliği ve geçmişin tamamı gönderilmez. Zod hem yanıt biçimini hem de düzeltme alıntılarının öğrenci cümlesinde bulunmasını denetler. AI örnekleri yerel değerlendirme veya beceri kaydı oluşturmaz. [Resmî kayıt ve doğrulama](https://developers.openai.com/siwc/token-sharing-open-source/sign-in) · [Metin istekleri](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)

Gerçek hesap kabul testi için Ayarlar’dan kullanıcı yetkilendirir, model listesini kontrol eder ve bir derste tek bir kısa açıklama isteğini onaylar. Yanıtı gördükten sonra Ayarlar’dan bağlantıyı kaldırır. İptal çağrısı doğrulanamazsa yerel tokenlar silinir ve arayüz ChatGPT tarafındaki iptalin doğrulanamadığını bildirir. Sesli çalışma mevcut elle başlatma ve onaylı rapor aktarımıyla devam eder.


IndexedDB v3, v1/v2 çalışma satırlarını aynı yükseltme transaction'ında doğrular. Eski sürümlerde bulunmayan kelime tekrar geçmişi ve atlanan dinleme listesi boş olarak eklenir. Mevcut alanlar, içerik kimlikleri ve konuşma raporu sürümleri korunur. Katalog ve kanıt denetimi JSON yedek aktarımında ayrıca uygulanır.

Şemaya uymayan çalışma satırı, özgün hali ve teknik tanılamasıyla aynı veritabanındaki koruma tablosuna taşınır. Etkin satırda sorun varsa uygulama bunu gösterir ve yeni profil açma seçimini kullanıcıya bırakır. Profil tek bir çalışma satırı olduğundan, bağlı öğrenci kanıtları parça parça yeniden yorumlanmaz. Taşıma tamamlanamazsa IndexedDB, yazıları ve sürüm değişikliğini birlikte geri alır. Ekrandaki tanılama şema yolları, kodlar ve bilinen sürüm numaralarıyla sınırlıdır.

Ders içi öğretmen kararı `lesson-coaching.ts` üzerinden verilir. Açık yazı için gönderilen metin mevcut denemeden alınır. Tekrarlanan yerel hatada önerilen prova isteğe bağlıdır. Öğretmen çıktısı çalışma ekranında kalır. Bir sonraki yerel varyant, yazı düzenlemesi ve gecikmeli ölçüm mevcut motorla kaydedilir. Öğretmen çıktıları kalıcı önbelleğe alınmaz.
