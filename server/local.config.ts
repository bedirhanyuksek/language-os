import { homedir } from 'node:os'
import { join } from 'node:path'
import { credentialStore } from './credentials'
import { localTutor } from './local-tutor'

export default {
  plugins: [{
    name: 'language-os-local-tutor',
    configurePreviewServer(server: import('vite').PreviewServer) {
      const { host, port, strictPort } = server.config.preview
      if (host === '127.0.0.1' && port === 4173 && strictPort) {
        server.middlewares.use(localTutor(port, credentialStore(join(homedir(), '.language-os'))))
      }
    },
  }],
}
