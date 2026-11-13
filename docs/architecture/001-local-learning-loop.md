# 001 · Yerel öğrenme döngüsü

Kabul edildi. İlk sürümde tarayıcı içi modüler monolit kullanıyoruz.

- `src/content` sürümlü müfredat paketlerini doğrular.
- `src/domain` puanlama, ilerleme, planlama, tekrar ve konuşma aktarım kurallarını uygular.
- `src/persistence` kullanıcı kayıtlarını IndexedDB işlemleriyle saklar.
- `src/features` React ekranlarını ve etkileşimleri barındırır.

Müfredat uygulama ile dağıtılır. Kullanıcı durumu bir profil kimliğine bağlanır. İlk sürüm tarayıcı başına tek etkin profille çalışır.
