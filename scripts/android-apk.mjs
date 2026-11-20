import { spawnSync } from 'node:child_process'
import console from 'node:console'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

// Run the wrapper from the Android project on both Windows and Unix.
const windows = process.platform === 'win32'
const result = spawnSync(windows ? 'cmd.exe' : './gradlew',
  windows ? ['/d', '/s', '/c', '.\\gradlew.bat assembleDebug'] : ['assembleDebug'], {
    cwd: fileURLToPath(new URL('../android/', import.meta.url)),
    stdio: 'inherit',
  })

if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
