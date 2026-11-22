# İspanyolca ses üretim listesi

İspanyolca A1–A2 başlangıcındaki **54 MP3 uygulamada kullanımda**. Kayıtlar eSpeak NG 1.52 ve FFmpeg ile üretildi. Dokuz dersin her birinde iki model, ilk/onarım dinlemesi ve iki kelime örneği var. Ayrı tanılama sesi yok.

Model, dinleme ve kelime sesleri `recording` nesneleriyle yerel MP3 dosyalarına bağlanır; yerel ayar `es-ES`, lisans MIT, kaynak eSpeak NG ve `synthetic: true` olarak belirtilir. Ek kelime kartlarının kendi `audio` değeri varsa korunur. Cihazda İspanyolca sentez sesi bulunması gerekmez. Kayıt oynatılamazsa kullanıcı metinle devam edebilir; bu işlem dinleme kanıtı üretmez.

Genel medya testleri İspanyolca kayıt dosyalarının varlığını da denetler. İspanyolca testleri aşağıdaki 54 dosyanın model/ilk dinleme/onarım/kelime sırasını, tam metnini ve MP3 içindeki kaynak parmak izini doğrular. **Anadili İspanyolca olan birinin dinleme ve içerik incelemesi hâlâ bekleniyor**; doğallık, vurgu, telaffuz, hız ve pedagojik uygunluk ile öğrenci pilotu ayrıca değerlendirilmeli.

## Üretim

1. `espeak-ng` ve `ffmpeg` komutlarını PATH üzerinde kullanılabilir hâle getir. Alternatif olarak eSpeak NG WASM kurulumu için `LANGUAGE_OS_ESPEAK_WASM_DIR` ayarlanabilir; FFmpeg yine gerekir.
2. Depo kökünde aşağıdaki komutları çalıştır. `--list` salt okunur; araçları gerektirmez. Sentez sesi **es**, hız **140**, mono MP3 **48 kb/s** olur; kaynak metin ve ayarlar SHA-256 parmak iziyle MP3 yorumuna yazılır. Değişmemiş klipler atlanır; `--force` yeniden üretir.

```sh
node scripts/curriculum-audio.mjs --list es.json
npm run curriculum:audio -- es.json
# Gerekirse: npm run curriculum:audio -- es.json --force
```

3. Çıktılar `src/content/audio/` altına yazılır. Liste `src/content/es.json` içindeki sıralı `models[].phrase`, `input.transcript`, `retry.transcript`, `word.example` ve `additionalWords[].example` alanlarından gelir. Metin değiştiğinde aşağıdaki listeyi ve klibi birlikte güncelle.
4. Yeniden üretilen sesleri tam çözümleme ve dinleyerek kontrol et; model, kelime ve transkript eşleşmesini doğrula. `src/content/teaching.ts` içindeki `modelAudio()` ve `src/content/continuity.ts` içindeki `author()` kayıtları kullanır. Metin değişikliklerini ilgili MP3 dosyalarıyla birlikte yayımla; `es-ES`, MIT ve eSpeak NG kaynak metadatasını koru.
5. `npm run typecheck`, `npm run lint`, `npm run curriculum:check` ve `npm test` çalıştır.

## Kullanımdaki dosyalar ve tam metinleri

Dosya adlarının tamamı `src/content/audio/` dizinine göredir. Aşağıdaki metinler senteze aynen verilir; Türkçe açıklamalar seslendirilmez.

| Dosya | Seslendirilecek İspanyolca metin |
| --- | --- |
| es.saludos.model.1.mp3 | Hola, me llamo Ana. |
| es.saludos.model.2.mp3 | ¿Cómo te llamas? — Me llamo Luis. Mucho gusto. |
| es.saludos.input.mp3 | Buenos días. Me llamo Diego. ¿Cómo te llamas? |
| es.saludos.retry.mp3 | Hola, me llamo Rosa. Mucho gusto. |
| es.saludos.word.1.mp3 | Hola, soy Eva. |
| es.saludos.word.2.mp3 | Me llamo Pablo. Mucho gusto. |
| es.ser-estar.model.1.mp3 | Soy estudiante. Mi amiga es médica. |
| es.ser-estar.model.2.mp3 | Estoy bien. La escuela está en el centro. |
| es.ser-estar.input.mp3 | Hola, soy Marcos. Soy profesor. Hoy estoy en casa y estoy bien. |
| es.ser-estar.retry.mp3 | Soy Andrés, estudiante. Hoy estoy en la escuela. Estoy muy bien. |
| es.ser-estar.word.1.mp3 | Mi hermano es estudiante. |
| es.ser-estar.word.2.mp3 | Hoy estoy bien. |
| es.numeros.model.1.mp3 | ¿Cuánto cuesta el pan? — Cuesta dos euros. |
| es.numeros.model.2.mp3 | Los dos cuadernos cuestan diez euros. |
| es.numeros.input.mp3 | Buenos días. El cuaderno cuesta seis euros. El libro cuesta once euros. |
| es.numeros.retry.mp3 | El mapa cuesta cuatro euros. Los dos cuadernos cuestan quince euros. |
| es.numeros.word.1.mp3 | El mapa cuesta un euro. |
| es.numeros.word.2.mp3 | ¿Cuánto cuesta el libro? |
| es.familia.model.1.mp3 | Esta es mi madre. Estos son mis hermanos. |
| es.familia.model.2.mp3 | Tengo veinte años. Mi hermana tiene doce años. |
| es.familia.input.mp3 | Me llamo Eva. Mi hermano se llama Tomás. Tiene dieciocho años. Mi madre es médica. |
| es.familia.retry.mp3 | Soy Pablo. Esta es mi hermana, Julia. Tiene trece años. Mi padre es cocinero. |
| es.familia.word.1.mp3 | Mi hermana tiene dieciséis años. |
| es.familia.word.2.mp3 | Mi padre tiene cuarenta años. |
| es.rutina.model.1.mp3 | Trabajo por la mañana y estudio por la tarde. |
| es.rutina.model.2.mp3 | Mi hermana come en casa y vive en Madrid. |
| es.rutina.input.mp3 | Vivo en Valencia. Trabajo en una escuela. Como con mis amigos y estudio por la noche. |
| es.rutina.retry.mp3 | Somos Ana y Luis. Vivimos en Granada. Comemos en casa y estudiamos por la tarde. |
| es.rutina.word.1.mp3 | Trabajo por la mañana. |
| es.rutina.word.2.mp3 | Comemos en casa por la tarde. |
| es.cafe.model.1.mp3 | Quisiera un café con leche, por favor. |
| es.cafe.model.2.mp3 | Un té sin azúcar, por favor. La cuenta, por favor. |
| es.cafe.input.mp3 | Buenos días. Quisiera un té sin azúcar y una botella de agua, por favor. |
| es.cafe.retry.mp3 | Un café con leche, por favor. ¿Cuánto cuesta? ¿Tres euros? Gracias. La cuenta, por favor. |
| es.cafe.word.1.mp3 | La cuenta, por favor. |
| es.cafe.word.2.mp3 | Quisiera un té sin azúcar. |
| es.direcciones.model.1.mp3 | ¿Dónde está la farmacia? — Está al lado del banco. |
| es.direcciones.model.2.mp3 | Sigue recto y gira a la izquierda. El café está enfrente de la plaza. |
| es.direcciones.input.mp3 | Para ir al museo, sigue recto. Después gira a la izquierda. El museo está enfrente de la escuela. |
| es.direcciones.retry.mp3 | La estación está al lado del hospital. Sigue recto y gira a la derecha. Está a la izquierda. |
| es.direcciones.word.1.mp3 | Gira a la derecha en la plaza. |
| es.direcciones.word.2.mp3 | La farmacia está al lado de la escuela. |
| es.gustos.model.1.mp3 | Me gusta el té, pero no me gusta el café. |
| es.gustos.model.2.mp3 | ¿Te gustan los libros? — Sí, me gusta leer. |
| es.gustos.input.mp3 | Me llamo Sofía. Me gusta leer y me gustan las películas. No me gusta el café. |
| es.gustos.retry.mp3 | Soy Daniel. Me gusta cocinar. Me gustan las manzanas, pero no me gusta el té. |
| es.gustos.word.1.mp3 | Me gusta leer por la noche. |
| es.gustos.word.2.mp3 | A mí también me gusta la música. |
| es.perfect.model.1.mp3 | Hoy he estudiado español y he comido en casa. |
| es.perfect.model.2.mp3 | ¿Has hecho la tarea? — Sí, ya la he hecho. |
| es.perfect.input.mp3 | Hoy he preparado un café. He comido con mi hermana. Todavía no he hecho la tarea. |
| es.perfect.retry.mp3 | Esta semana he comprado un libro. Ya he leído dos páginas. Hoy no he preparado la cena. |
| es.perfect.word.1.mp3 | Hoy he trabajado en casa. |
| es.perfect.word.2.mp3 | Todavía no he hecho la tarea. |
