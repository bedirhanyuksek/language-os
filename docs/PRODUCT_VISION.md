# Language OS ürün vizyonu

13 Kasım 2026 · Ürün denetimi ve hedef kapsam

Language OS, İngilizce ve Rusça öğrenen yetişkinler için bilgisayarda çalışan, yerel kayıt tutan açık kaynaklı bir kişisel öğrenme rehberidir. Öğrenci her oturumda neden bu çalışmayı yaptığını, hangi gerçek yaşam görevine hazırlandığını ve önceki denemeye göre neyin değiştiğini anlayabilmeli. Başarı, benzer zorluktaki yeni bir bağlamda iletişim kurabilme ve bunu bir süre sonra yeniden yapabilme üzerinden izlenir.

Rehberlik ilk oturumda hedef belirlemeyle başlar. Kullanıcının önceliği bir sonraki eyleme dönüşür. Yanıt örüntüsü anlatımı, örneği, yardım miktarını veya görevin bağlamını değiştirir. Profil tanımayı, anlamayı, destekli ve bağımsız üretimi, gecikmeli hatırlamayı ayrı gösterir. Kullanıcı hedefi değiştirebilir, gerekçeyi görebilir ve başka bir çalışma seçebilir. Uygulama iletişim örneği ve geri bildirim sunar. Ürün kararları yapay puan ve tamamlama yüzdesi üzerinden alınmaz.

## Learning Experience v1 · Yayımlanan alt kapsam

| Alan | Çalışan davranış | Kanıtın sınırı |
| --- | --- | --- |
| Rota | İngilizcede A2 köprüsü, dört B1 dersi ve bir B2 dersi. Rusçada Kiril köprüsü, dört A1 dersi ve bir A2 dersi. | Dil başına beş ana ders ve bir koşullu köprü. A1–C1 programı veya seviye sertifikası yok. |
| Başlangıç | EN 8, RU 9 ilk görev. Örüntüye göre temel veya ana rota ve iki ek görev: yeni bir metin ve ayrı ses örneği. Ek görev yanıtları tek tek kaydedilir. | Tanılama düşük güvenli, yazı inceleme bekliyor, konuşma başlangıçta ölçülmüyor. Öz beyan yönlendirmeyi belirlemiyor. |
| Rehber ve öğretim | Hedef, gerekçe, açıklama/karşı örnek, rehberli pratik, yeni bağlam, hata sonrası onarım ve gecikmeli kontrol. Ses ve metin hataları ilgili strateji ve ayrı kaynak açıyor. | Bazı hatalar eşlenmiş, görev havuzları sınırlı. Bir alımlama onarımı başarısız olursa eksik kanıt gösterilir ve rota diğer becerilerle devam eder. |
| Üretim | Serbest yazı ve rubrikle yeni sürüm. Yerel sesli prova; destekli derslerde isteğe bağlı Voice talimatı ve onaylı rapor. | Kendi kendine prova puan üretmez. Açık yazı ve dış rapor kesin puan veya seviye vermez. |
| Gelişim ve kayıt | Tanıma, yazılı hatırlama, açık kullanım, okuma/dinleme, kontrollü aktarım ve gecikmeli sonuçlar ayrı. İlk aktarım ve gecikmeli deneme tarih ve yanıtlarıyla karşılaştırılır. Yerel yedek ve çevrimdışı ses korunur. | Kontrollü aktarım başarısı diğer becerilere genellenmez; eşdeğerlik ve öğrenme etkisi öğrenci pilotunda ölçülecek. |

Önceki denetim, alımlamada hatalı yanıtın görevi kapattığını ve gecikmeli sorunun tekrar kullanılabildiğini göstermişti. v1, alımlamada yeni kaynak açar, gecikmeli doğrulamada kullanılmış varyantı yeniden kanıt olarak kabul etmez ve düzey iddiasını ekrana taşımaz. [Güncel senaryolar](EDUCATIONAL_QUALITY_GATES.md) · [Deneyim sınırları](LEARNING_EXPERIENCE_SPEC.md)

## Henüz doğrulanmamış eğitim varsayımları

Yeterli ilk örnekle kısaltılmış rota zaman kazandırırken aktarımı koruyabilir. Belirli hata örüntüleri anlamlı bir ön koşul önerisi üretebilir. Açık bir gerekçe, kullanıcıya kendi eksiklerini keşfetme yükü bindirmeden sonraki işi anlaşılır kılabilir. Sentetik başlangıç sesi ile doğal kayıt arasında kazanım aktarımı olabilir. Bu varsayımlar diller ve başlangıç profilleri ayrı incelenerek öğrenci pilotunda sınanacak.

Ürünün varsayılan akışı yerel ve çevrimdışı çalışır. Hesap bağlantısı 2C kapsamında isteğe bağlıdır. Voice/MCP hakkındaki kararların dayanağı [2A fizibilitesi](CHATGPT_INTEGRATION_FEASIBILITY.md), güncel iş sırası [Uygulama planı](IMPLEMENTATION_PLAN.md).
