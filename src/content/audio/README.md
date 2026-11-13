# Ders sesi

Bu MP3’ler Language OS’un özgün ders metinleri ve örnek cümlelerinden üretildi. Dosyalar proje MIT lisansıyla dağıtılır. Ses üretiminde eSpeak NG’nin espeak-ng 1.0.2 WASM derlemesi ve MP3 dönüşümü için FFmpeg kullanıldı. Üretim araçları uygulama paketiyle dağıtılmaz.

Dinleme metinleri dil başına `*-pedagogy.json` ve `*-experience.json` dosyalarında `listening.transcript` alanındadır. Ek tanılama ve onarım aynı alanı kendi bağlamlarında kullanır. Kelime sesi, dersin `vocabulary.example` metninden gelir. Dosya adını ilgili ses nesnesindeki `src` ile eşleştir. Üretim parametreleri İngilizce için `-b 1 -v en-us -s 150`, Rusça için `-b 1 -v ru -s 130`. MP3 mono ve 48 kb/s. Metin veya ses değiştiğinde dosya ile transkript birlikte incelenir.

[eSpeak NG](https://github.com/espeak-ng/espeak-ng) · [GPL metni ve program çıktısı hükmü](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING)
