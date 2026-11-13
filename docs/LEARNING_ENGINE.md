# Öğrenme motoru

Etkin v2 öğrenme döngüsü, adaptif kararlar ve gecikmeli kanıt için [pedagojik mimariye](PEDAGOGICAL_ARCHITECTURE.md) bak. Aşağıdaki kurallar v1 içerik paketlerinin davranışını açıklar.

1. Plan, tarayıcının saat dilimindeki çalışma gününü ve kalan tahmini süreyi hesaplar.
2. Zamanı gelmiş kartlar bütçeye sığdığı ölçüde önce sunulur.
3. Alıştırma hatası veya kanıta bağlı konuşma hatası, yalnızca ilgili konuyu yeniden çalışmaya açar. Motor o konu için sıradaki varyantı seçer.
4. İlk İngilizce dersinin konuşma görevi tamamlanabilir veya ertelenebilir.
5. Ön koşulu hazır ve hedef seviyeye uygun dersler arasından tarama eksikleri, sonra hedef örtüşmesi ve paket sırası kullanılır.

Bir gün kaçırmak kayıtlı sırayı değiştirmez. Süreler plan tahminidir. Bir sonraki dersin açılması için ilgili konuların her birinde en az bir başarılı kesin yanıt gerekir. Bu durum `ready` olarak izlenir. Gecikmeli kelime hatırlama ve konuşma gözlemi ayrı kaydedilir. Küçük soru bankası nedeniyle hedefli varyantlar tekrar kullanılabilir.

Kelime planı iki öz bildirimle çalışır. Hatırlama, 1, 3, 7, 14 ve 30 günlük aralıkları kullanır. Zorlanma kartı ilk basamağa alıp 10 dakika sonrasına koyar. Gecikmeli hatırlama için kartın sunulmasından en az 24 saat geçmesi gerekir. Bu milestone’da iki değerlendirme seçeneğine uygun kademeli aralıklar seçildi. SM-2’nin kolaylık çarpanı ve FSRS’nin bellek parametreleri, ayrıntılı kart geçmişi ve daha zengin değerlendirme toplandığında karşılaştırılabilir. [FSRS optimizasyon açıklaması](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-mechanism-of-optimization)
