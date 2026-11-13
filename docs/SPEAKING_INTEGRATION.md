# ChatGPT Voice

1. Günlük planda konuşma görevini aç. Hedefler ve seçim gerekçesi ekranda görünür.
2. Talimatı kopyala, ChatGPT’yi aç ve talimatı yapıştır. ChatGPT’de ses modunu elle başlat.
3. Çalışmayı bitirince aynı sohbette JSON raporunu iste. JSON’u Language OS’a yapıştır, alıntıları oturumunla karşılaştır ve onayla.

İngilizce oturumunda sorular ağırlıklı İngilizcedir. Önemli hatalar için kısa Türkçe açıklama, düzeltilmiş İngilizce örnek, sesli tekrar ve daha sonra farklı bir soru istenir. Talimat dersin iletişim hedefini, yerel denemeleri, önceki konuşma gözlemlerini ve hedef kalıpları kullanır. Sesli prova hesap olmadan yapılabilir. [ChatGPT Learn · Voice](https://learn.chatgpt.com/docs/features/voice)

Rapor v2 bağımsız doğru kullanım, gözlenen hata, öğretmen yardımıyla düzeltme, düzeltmeden sonra tekrar, yeni bağlamda bağımsız kullanım ve yetersiz kanıtı ayrı saklar. Alıntıya, oturuma ve hedef kimliğine ilişkin tutarlılık kontrolleri uygulanır. Gerçek transkript eşleşmesi önizlemede öğrenci tarafından kontrol edilir. V1 raporları ve önceki yedekler kendi biçimleriyle okunur. V1’de yardım düzeyi belirtilmediği için eski başarı bildirimlerinden bağımsız kullanım çıkarılmaz.

Eşleşen gramer hatası açıklama ve mevcut bir aktarım alıştırması açar. Eşleşen kelime ve kalıplar tekrar sırasına alınır. Aynı hedefte tekrarlanan sorunlar öncelik kazanır. Müfredatta karşılığı olmayan hatalar raporda kalır. Bağımsız sözlü kullanım gözlemi beceri profiline eklenir. Ders geçişi ve kalıcılık için mevcut ölçütler uygulanır. Aynı oturuma ikinci rapor kaydedilemez.

[Örnek v2 raporu](../tests/fixtures/speaking-coach.json) ve [örnek v1 raporu](../tests/fixtures/speaking-valid.json) sentetik test verisidir. Gerçek hesapla İngilizce soru ve Türkçe açıklamanın akışı, yeni bağlamda yardım düzeyi ve JSON alıntılarının konuşmayla eşleşmesi ayrıca denenmelidir.
