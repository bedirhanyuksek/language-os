# Ders sesi

Bu MP3’ler Language OS’un özgün ders metinleri ve örnek cümlelerinden üretildi. Dosyalar proje MIT lisansıyla dağıtılır. Ses üretiminde İngilizce ve Rusça için eSpeak NG’nin espeak-ng 1.0.2 WASM derlemesi, İspanyolca için eSpeak NG 1.52 ve MP3 dönüşümü için FFmpeg kullanıldı. Üretim araçları uygulama paketiyle dağıtılmaz.

Dinleme metinleri dil başına `*-pedagogy.json` ve `*-experience.json` dosyalarında `listening.transcript` alanındadır. Ek tanılama ve onarım aynı alanı kendi bağlamlarında kullanır. Kelime sesi, dersin `vocabulary.example` metninden gelir. Dosya adını ilgili ses nesnesindeki `src` ile eşleştir. Üretim parametreleri İngilizce için `-b 1 -v en-us -s 150`, Rusça için `-b 1 -v ru -s 130`. MP3 mono ve 48 kb/s. Metin veya ses değiştiğinde dosya ile transkript birlikte incelenir.

[eSpeak NG](https://github.com/espeak-ng/espeak-ng) · [GPL metni ve program çıktısı hükmü](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING)

Ders örneklerinin metni `../teaching.ts` içindeki sıralı `models[].phrase` alanıdır. Model sesi adı `<lessonId>.model.<1 tabanlı sıra>.mp3` biçimindedir. Metni düzenleyince klibi aynı üretim parametreleriyle yeniden oluştur. Yerelde `espeak-ng -b 1 -v en-us -s 150 -w model.wav 'örnek'` ve `ffmpeg -i model.wav -codec:a libmp3lame -b:a 48k çıktı.mp3` aynı üretim adımlarını uygular. Rusça için `-v ru -s 130` kullan. Paketleme Vite üzerinden yapılır. Chrome’un cihaz sesine ihtiyaç olmadan çevrimdışı oynatılır.

Yayın öncesi FFprobe ile tek ses kanalı ve süre, FFmpeg ile tam çözümleme ve seviye kontrol edilir. Dinleme sorusunu transkriptle karşılaştır ve dil uzmanı değerlendirmesinde vurgu, telaffuz, hız ve anlaşılırlığı ayrı kaydet. Teknik kontrollerden geçen sentetik klipler doğal konuşma incelemesi bekliyor olarak gösterilir.

Milestone 5 partilerinde model metni `curriculum/en.ts` veya `curriculum/ru.ts` içindeki `models[].phrase`, dinleme metinleri `input.transcript` ve `retry.transcript`, kelime sesi `word.example` alanındadır. Dosyalar sırasıyla `<id>.model.<sıra>.mp3`, `<id>.input.mp3`, `<id>.retry.mp3` ve `<id>.word.1.mp3` olarak paketlenir.

JSON paketlerindeki model, kart ve transkriptler için `npm run curriculum:audio -- paket.json` kullan. Yeni paket hızı EN 153 ve RU 140; MP3 48 kb/s. Ses kaynağı veya ayarları değişince komut klibi günceller. [Paket üretim akışı](../../../docs/MILESTONE_5_SCALABLE.md)

Aşama 2 değerlendirme kayıtlarının metinleri `../assessment/bank.ts` içindeki `transcript` değerleridir. Dosya adı `<madde kimliği>.mp3`. İngilizce için `-b 1 -v en-us -s 150`, Rusça için `-b 1 -v ru -s 135` kullanıldı. MP3 etiketindeki kaynak özeti, bu parametrelerle ve değişmemiş transkriptle eşleşmelidir. `tests/adaptive-placement.test.ts` bu eşleşmeyi doğrular.

İspanyolca başlangıç paketinin 54 MP3 dosyası `../es.json` içindeki sıralı `models[].phrase`, `input.transcript`, `retry.transcript`, `word.example` ve `additionalWords[].example` alanlarından üretildi. Dosya adları `<id>.model.<sıra>.mp3`, `<id>.input.mp3`, `<id>.retry.mp3` ve `<id>.word.<sıra>.mp3` biçimindedir; sıra 1’den başlar. Parametreler `-b 1 -v es -s 140`, mono MP3 48 kb/s. `modelAudio()` ve `author()` bu kayıtları `recording`, `es-ES`, `license: MIT`, eSpeak NG kaynak adresi ve `synthetic: true` metadatasıyla kullanır. Ek kelime kartının kendi `audio` değeri varsa önceliklidir. Yeniden üretim için `npm run curriculum:audio -- es.json` kullan; MP3 yorumundaki SHA-256 parmak izi kaynak metin ve parametrelerle eşleşmelidir. Dosya ve metin listesi ile bekleyen anadili incelemesi [İspanyolca ses kaydında](../../../docs/SPANISH_AUDIO_TODO.md) izlenir.
