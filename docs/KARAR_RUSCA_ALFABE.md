# Karar bekliyor: Rusça alfabe ünitesi

**Durum:** Bu dal merge edilmeye hazır değil. İçerik büyük ölçüde hazır, ancak rotaya nasıl bağlanacağı için bir karar gerekiyor. Karar, `diagnostic.ts` ve `progress.ts` içindeki köprü mantığını değiştiriyor. Bu dosyalar Bedirhan'ın alanı olduğu için kararı ona bırakıyoruz.

Dal: `codex/ru-alphabet` · taban: `6e4cd16` (CI zaman aşımı düzeltmesi) · içerik commit'i: `0f5b4eb`

## Bu dalda ne var

- `ru.cyrillic` kimliği korunarak 33 harfi kapsayan 5 derslik alfabe ünitesi:
  `ru.cyrillic` → `ru.cyrillic-false-friends` → `ru.cyrillic-new-shapes` → `ru.cyrillic-hushing` → `ru.cyrillic-vowels-signs`
- Her derste Türkçe anlatım, örnekler, alıştırmalar, okuma ve kelime çalışması var.
- 31 yeni MP3 var (`src/content/audio/ru.cyrillic-*.mp3`) ve `docs/RUSSIAN_ALPHABET_AUDIO_TODO.md`.
- Zincir ve kısa kontrol `src/content/curriculum/russian-alphabet.ts` içinde yayın anında kuruluyor.
- Testler: typecheck ve lint geçiyor. `npm test` sonucunda 12 test düşüyor (aşağıda).

## Sorunlar

### 1. Kiril okuyan öğrencinin planı boş kalıyor (12 test düşüyor)

`ru.cyrillic` mevcut kodda **isteğe bağlı köprü ders**:

- `diagnostic.ts` → `bridgeLesson()` Rusça için `ru.cyrillic` döndürüyor.
- `needsBridge()` yalnızca okumada zorlanan öğrenci için `true` dönüyor.
- `progress.ts` → `dailyPlan()` köprü gerekmiyorsa `ru.cyrillic`'i açılan dersler listesinden çıkarıyor (`lesson !== bridge || needsBridge(...)`).

Bu dalda `ru.intro`'nun ön koşulu alfabe zincirinin son dersi yapıldı. Kiril okuyan öğrenci için `ru.cyrillic` gizlendiğinden zincir hiç ilerlemiyor. Plan `{ kind: 'complete' }` dönüyor, yani öğrencinin yapacak işi kalmıyor.

Düşen testler:

- `tests/personal-path.test.ts`
  - 5/15/30/60 dk plan senaryoları ("ru, gün 1/2: expected false to be true")
  - Russian A1 start → B2 ve C2 rotaları (`expected [] to deeply equal ['ru.directions', …]`)
- `tests/review-load.test.ts`: 5/15/30/60 dk, 42 günlük kuyruk senaryoları
- `tests/pedagogy.test.ts` › "uses recognition plus production to shorten the ru path"
- `tests/russian-alphabet.test.ts` › "a reader uses paired placement evidence…"

### 2. Mevcut `ru.cyrillic` içeriği aynı kimliklerle değişti

Dersin başlığı, anlatımı, soruları ve 6 MP3'ü (`ru.cyrillic.model.1/2`, `.retry`, `.diagnostic`, `.word.1`, `ru.cyrillic.mp3`) yeniden yazıldı. Alıştırma kimlikleri ise aynı kaldı. Bu dersi daha önce çözmüş öğrencinin denemeleri artık farklı sorulara karşılık geliyor. `vocabulary.ts` içindeki kurala göre cevap anahtarı değişen içerik yeni kimlik almalı. Pilot ses yuvası `pilot.ru.a1.audio.control` da `ru.cyrillic.listen.detail` kimliğine bağlı.

### 3. Eski tarama yedekleri açılmayabilir

`russianAlphabet()` alfabe kontrol sorularını `course.placement` listesine ekliyor. `parseBackup()` ise eski tarama denemelerinin sayısının `placementCourse.placement.length` ile eşit olmasını bekliyor. Bu yüzden önceden taramayı bitirmiş Rusça profillerin yedekleri reddedilebilir. Seçilen yoldan bağımsız olarak düzeltilmesi gerekiyor: kontrol soruları ayrı bir listede tutulmalı ya da yeni bir içerik sürümü açılmalı.

## Seçenekler

### A · Ünite köprü olarak kalır (önerimiz)

- Alfabe ünitesi yalnızca köprü gereken öğrenciye açılır: okumada zorlanan ya da Kiril bilmediğini söyleyen. Kiril okuyan öğrenci doğrudan `ru.intro`'ya geçer.
- `ru.intro`'nun ön koşulları değişmez.
- `bridgeLesson()` tek ders yerine bir ders listesi (ünite) döndürür. `needsBridge()` ve `dailyPlan()` bütün üniteyi aynı kurala bağlar: "köprü gerekiyorsa ünitenin tamamı, gerekmiyorsa hiçbiri".
- Mevcut `ru.cyrillic` içeriği ve MP3'leri eski hâline döner. Yeni anlatım ya yeni kimliklerle eklenir ya da `ru.cyrillic` ünitenin ilk dersi olarak eski içeriğiyle kalır.
- Etkisi: `diagnostic.ts` (köprü listesi) ve `progress.ts` (tek satırlık köprü filtresi) küçük ölçüde değişir. Mevcut testlerin çoğu değişmeden geçmeli.

### B · Ünite herkese zorunlu olur, Kiril okuyan hızlı geçer

- `ru.intro` alfabe ünitesinden sonra gelir, Kiril okuyan öğrenci her ders için kısa kontrolle ilerler (mevcut `canAccelerate` yolu).
- `ru.cyrillic` köprü olmaktan çıkar. Rusça için `bridgeLesson()` boş döner veya köprü kavramı başka bir derse taşınır.
- Etkisi: bütün Rusça başlangıç rotası ve simülasyon testlerinin beklentileri değişir. Kiril okuyan öğrenci de alfabe ünitesinde birkaç kısa kontrol görür.

## Karar sonrası yapılacaklar

1. Seçilen yol (A veya B) bu dosyada işaretlenir.
2. Sorun 2 ve 3 her iki yolda da düzeltilir.
3. `npm run verify` (birim, müfredat ve Playwright testleri) geçince dal main'e PR olarak açılır.

**Karar:** ☐ A · ☐ B · Not:
