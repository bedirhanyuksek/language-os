# ChatGPT entegrasyonu · Yerel prototip

Proje kökünde Node.js 22.13+ veya 24+ ile çalıştır.

```sh
npm ci
npm --prefix experiments/chatgpt ci
npm --prefix experiments/chatgpt test
npx --no-install tsc -p experiments/chatgpt/tsconfig.json
```

Test paketi yerel MCP bağlantısı ve yapay OAuth/JWT/SSE girdileri kullanır. ChatGPT hesabı, API anahtarı veya kota gerektirmez.

## A · Kullanıcı onaylı hesap ve tek metin isteği

Prototip ilk OAuth kaydını dener. Her denemede aynı makineye ait kimliği tekrar kullan. İlk kullanımda bir kez üret ve kendi cihazında sakla.

```sh
node -e 'console.log("urn:uuid:" + crypto.randomUUID())'
LO_SIWC_HOST_ID='üretilen-urn-değeri' npm --prefix experiments/chatgpt run siwc
```

1. Önce ChatGPT **Ayarlar → Kullanım** altında diğer uygulamaların limit sonrası kredi kullanımını kapat. Bu ayar deneme programı tarafından okunamaz. Ayarı doğrulayamıyorsan metin isteğini onaylama. Yalnızca uygun planı olan kendi hesabını seç.
2. Terminalin verdiği OpenAI yetkilendirme bağlantısını kendi tarayıcında aç. Hesabı ve plan kapsamını incele. İptal edersen kod değişimi ve metin isteği yapılmaz.
3. Terminalde kimlik doğrulamasını gördükten sonra tek istek için `EVET` yaz. Program model listesinden uygun bir model seçer. İstersen erişimin olan bir modelin slug’ını `LO_SIWC_MODEL` ile belirt.
4. Başarı ölçütü, akışın `response.completed` ile bitmesi ve `LANGUAGE_OS_OK` metninin dönmesidir. Prototipte sabit, sentetik bir cümle kullanılır. Token ve hesap bilgileri diske ya da terminal çıktısına yazılmaz. İş bittiğinde bağlantıyı **Ayarlar → Güvenlik ve giriş → Sign in with ChatGPT** bölümünden kaldırabilirsin.

Prototip bir oturumla sınırlıdır. Yeniden yetkilendirme, token yenileme ve üretim kimlik deposu bu denemenin kapsamı dışındadır. Yetkilendirme bağlantısını, dönüş URL’sini ve kodu paylaşma. Sonuç kaydı için sadece seçilen plan türü, başarı durumu ve varsa hassas olmayan hata kodu yeterlidir.

## B ve C · Yerel MCP

```sh
npm --prefix experiments/chatgpt run mcp
```

Yerel MCP istemcisinden Streamable HTTP ile `http://127.0.0.1:8787/mcp` adresine bağlan. Araçları listele. `get_speaking_context` çağrısında oturum kimliği olarak `72752ef8-871a-4a80-8299-ccfeec0dc4e1` gönder. `stage_speaking_report` aracına `report` alanı içinde [geçerli örneği](../../tests/fixtures/speaking-valid.json) gönder. İlk çağrıda `staged`, aynı rapor tekrarında `already_staged` beklenir. [Geçersiz örnek](../../tests/fixtures/speaking-invalid.json) reddedilir.

Loopback sunucusu tek bir örnek oturum kullanır. Rapor bellekte taslak olarak tutulur ve süreç kapandığında silinir. Bu portu tünelle internete açmadan veya gerçek veriyle kullanmadan önce MCP için kimlik doğrulama ve kullanıcıya bağlı yetkilendirme gerekir. Üretim IndexedDB’sine veri aktarımının tasarımı ve gerçek ChatGPT testi için [fizibilite raporuna](../../docs/CHATGPT_INTEGRATION_FEASIBILITY.md) bak.
