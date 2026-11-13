# ChatGPT Voice

1. Günlük planda konuşma görevini aç. Hedefler, senaryo ve oturum kimliği ekranda görünür.
2. Talimatı kopyala, ChatGPT’yi aç ve talimatı yapıştır. ChatGPT’de ses modunu elle başlat.
3. Çalışmayı bitirince aynı sohbette JSON raporunu iste. JSON’u Language OS’a yapıştır, önizlemeyi kontrol et ve onayla.

Ses modu erişimi ve kullanım kotası hesap, plan ve çalışma alanı ayarlarına bağlıdır. Transkript konuşmayı her zaman kelimesi kelimesine yansıtmayabilir. Yerel uygulama yalnızca senin kopyaladığın talimatı ve içe aldığın raporu işler. [OpenAI Help Center · ChatGPT Voice](https://help.openai.com/en/articles/20001274-chatgpt-voice)

Rapor v1, oturum kimliği, dil ve ders eşleşmesini, içerik kimliklerini ve her gözlemin alıntı referansını doğrular. Aynı oturumun ikinci raporu işlem içinde reddedilir. Önerilen tekrarlar raporda korunur. Alıntıya bağlı gözlemler planı güncelleyebilir. [Geçerli örnek](../tests/fixtures/speaking-valid.json) ve [geçersiz örnek](../tests/fixtures/speaking-invalid.json) testlerde kullanılır. Elle denemek için örnekteki oturum kimliğini ekrandaki kimlikle değiştir.

Uygulamanın talimat ve rapor aktarımı, örnek JSON verileriyle yerelde test edildi. Hesaba bağlı gerçek ses oturumu ve özel MCP ile okuma/yazma doğrulanmadı. İkincisi bağımsız bir prototip ve kimliği doğrulanmış sunucu köprüsü gerektirir.
