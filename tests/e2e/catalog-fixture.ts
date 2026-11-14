import { readdirSync, readFileSync } from 'node:fs'
import { createCatalog } from '../../src/content/catalog'
import { loadPacks } from '../../src/content/curriculum/packs'

const directory = new URL('../../src/content/packs/', import.meta.url)
const files = readdirSync(directory).filter((name) => name.endsWith('.json'))
export const catalog = createCatalog(loadPacks(Object.fromEntries(files.map((name) =>
  [name, JSON.parse(readFileSync(new URL(name, directory), 'utf8'))]))))
