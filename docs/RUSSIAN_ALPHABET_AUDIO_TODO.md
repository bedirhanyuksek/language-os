# Rusça alfabe ses üretim listesi

Beş dersin **31 MP3 dosyası üretildi; eksik klip yok**. eSpeak NG ve FFmpeg bu ortamda kullanılabildi. Şemadaki `recording` yolu, `ru-RU`, MIT ve eSpeak NG kaynak bilgisi korunuyor. İlk dersin mevcut dosya adları ve pilot ses yuvaları korunarak içerikle eşleşen sesleri yenilendi. İnsan sesi ve doğallık/vurgu incelemesi ayrıca yapılabilir.

## Üretim

1. `espeak-ng` ve `ffmpeg` PATH üzerinde kullanılabilir olmalı. eSpeak NG WASM için `LANGUAGE_OS_ESPEAK_WASM_DIR` seçeneği de kullanılabilir; FFmpeg yine gerekir.
2. Depo kökünde aşağıdaki komutları çalıştır. `--list` salt okunurdur. Rusça ses **ru**, hız **140**, mono MP3 **48 kb/s** olur. Kaynak metin ve seçeneklerin SHA-256 parmak izi MP3 yorumuna yazılır. Değişmemiş dosyalar atlanır; `--force` yeniden üretir.

```sh
node scripts/curriculum-audio.mjs --list ru-experience.json
npm run curriculum:audio -- ru-experience.json
# Gerekirse:
npm run curriculum:audio -- ru-experience.json --force
```

3. Kaynak `src/content/ru-experience.json` içindeki alfabe derslerinin öğretim modelleri, dinleme/onarım transkriptleri, kelime örnekleri ve ilk dersin ayrı tanılama transkriptidir. Windows'ta Kiril karakterlerini korumak için eSpeak NG'ye metin UTF-8 standart girdiden verilir.
4. Dosyaların tamamı FFmpeg ile çözümlenerek doğrulandı. Metin/parmak izi eşleşmesi `tests/russian-alphabet.test.ts` içinde denetlenir. Ses metni değişince klibi de yeniden üret.
5. `npm run typecheck`, `npm run lint`, `npm run curriculum:check` ve `npm test` çalıştır.

## Dosyalar ve tam metinleri

Dosya adları `src/content/audio/` dizinine göredir. Tablodaki tüm dosyalar mevcuttur; Türkçe açıklamalar seslendirilmez.

| Dosya | Seslendirilecek Rusça metin |
| --- | --- |
| ru.cyrillic.model.1.mp3 | МАМА · КОТ · ТОМ |
| ru.cyrillic.model.2.mp3 | ТЕМА · МЕТРО |
| ru.cyrillic.mp3 | Мама. Том. Кот. |
| ru.cyrillic.retry.mp3 | Кот. Мама. Том. |
| ru.cyrillic.word.1.mp3 | МЕТРО |
| ru.cyrillic.word.2.mp3 | КОТ |
| ru.cyrillic.diagnostic.mp3 | Том. Кот. Мама. |
| ru.cyrillic-false-friends.model.1.mp3 | ВЕРА · НИНА · РОМАН |
| ru.cyrillic-false-friends.model.2.mp3 | САМАРА · ТУР · УХА |
| ru.cyrillic-false-friends.input.mp3 | Вера. Нина. Роман. |
| ru.cyrillic-false-friends.retry.mp3 | Самара. Сок. Уха. |
| ru.cyrillic-false-friends.word.1.mp3 | СОК |
| ru.cyrillic-false-friends.word.2.mp3 | УХА |
| ru.cyrillic-new-shapes.model.1.mp3 | БАНК · ГОРОД · ДОМ · ЗАЛ |
| ru.cyrillic-new-shapes.model.2.mp3 | ИРА · МОЙ · ЛИМА · ПАРК · КОФЕ |
| ru.cyrillic-new-shapes.input.mp3 | Банк. Парк. Кофе. |
| ru.cyrillic-new-shapes.retry.mp3 | Ира. Лима. Дом. |
| ru.cyrillic-new-shapes.word.1.mp3 | КОФЕ |
| ru.cyrillic-new-shapes.word.2.mp3 | ПАРК |
| ru.cyrillic-hushing.model.1.mp3 | ЖУК · ЦЕНТР · ЧАЙ |
| ru.cyrillic-hushing.model.2.mp3 | ШКОЛА · ЩИ |
| ru.cyrillic-hushing.input.mp3 | Чай. Щи. Школа. |
| ru.cyrillic-hushing.retry.mp3 | Жук. Центр. Чай. |
| ru.cyrillic-hushing.word.1.mp3 | ЧАЙ |
| ru.cyrillic-hushing.word.2.mp3 | ЩИ |
| ru.cyrillic-vowels-signs.model.1.mp3 | Я · ЁЛКА · ЮЛЯ · ЭТО · СЫР |
| ru.cyrillic-vowels-signs.model.2.mp3 | МЕНЮ́ · СОЛЬ · ПОДЪЕ́ЗД · МОСКВА́ |
| ru.cyrillic-vowels-signs.input.mp3 | Меню. Сыр. Соль. |
| ru.cyrillic-vowels-signs.retry.mp3 | Юля. Ёлка. Москва. |
| ru.cyrillic-vowels-signs.word.1.mp3 | МЕНЮ |
| ru.cyrillic-vowels-signs.word.2.mp3 | СЫР |
