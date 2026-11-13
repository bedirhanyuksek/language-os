import type { MigrationIssue } from './migration'

export type StorageOperation = 'open' | 'read' | 'validate' | 'upgrade'
export type StorageIssue = { operation: StorageOperation; type: string; innerType?: string; advice: string; issues?: MigrationIssue[] }

const advice: Record<string, string> = {
  BlockedError: 'Bu adresteki diğer Language OS sekmelerini kapat. Ardından yeniden dene.',
  MissingAPIError: 'Bu tarayıcı oturumunda IndexedDB kullanılamıyor. Uygulamayı normal bir Chrome penceresinde aç.',
  SecurityError: 'Chrome bu adres için yerel depolama erişimini engelliyor. Site izinlerini kontrol et.',
  InvalidStateError: 'Chrome yerel depolamayı bu oturumda açamadı. Aynı Chrome profilinde normal bir pencere açıp yeniden dene.',
  VersionError: 'Kayıt daha yeni bir veritabanı sürümüne ait. Bu adreste en güncel Language OS sürümünü aç.',
  NotFoundError: 'Beklenen kayıt tablosu bulunamadı. Teknik ayrıntıları paylaşarak sürüm uyumluluğunu kontrol ettir.',
  ZodError: 'Kayıt biçimi doğrulanamadı. Teknik ayrıntıları paylaşarak uyumluluğu kontrol ettir.',
  UpgradeError: 'Kayıt güncellemesi tamamlanamadı. Teknik ayrıntıları paylaşarak güncellemeyi kontrol ettir.',
  QuotaExceededError: 'Chrome yerel depolama sınırına ulaştı. Diskte boş alan açıp yeniden dene.',
  UnknownError: 'Chrome veritabanını açamadı. Chrome’u tamamen kapatıp aynı profilde tekrar aç. Hata sürerse teknik ayrıntıları paylaş.',
}

function errorName(error: unknown) {
  const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : undefined
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(name) ? name : undefined
}

export class StorageAccessError extends Error {
  constructor(readonly operation: StorageOperation, cause: unknown, readonly issues?: MigrationIssue[]) {
    super('Yerel depolama işlemi başarısız.', { cause })
  }
}

export function storageIssue(operation: StorageOperation, error: unknown, issues?: MigrationIssue[]): StorageIssue {
  const type = errorName(error) ?? 'UnknownError'
  const innerType = typeof error === 'object' && error !== null && 'inner' in error ? errorName(error.inner) : undefined
  const key = innerType && Object.hasOwn(advice, innerType) ? innerType : type
  return { operation, type, issues, innerType: innerType !== type ? innerType : undefined,
    advice: Object.hasOwn(advice, key) ? advice[key] : 'Aynı Chrome profilinde sayfayı yeniden yükle. Hata sürerse teknik ayrıntıları paylaş.' }
}
