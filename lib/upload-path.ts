import path from 'node:path'
import { config } from '@/lib/config'

/**
 * Resolve o UPLOAD_DIR para um caminho ABSOLUTO estável.
 *
 * Por que isto existe: o servidor standalone do Next faz `process.chdir(__dirname)`,
 * então em produção o CWD vira `.next/standalone`. Um `UPLOAD_DIR` relativo (ex.: o
 * default "./uploads") cairia em `.next/standalone/uploads` — que o `npm run build`
 * REGENERA a cada deploy, APAGANDO os uploads. Aqui ancoramos caminhos relativos na
 * RAIZ do projeto (subindo de `.next/standalone`), que o build não toca e o .gitignore
 * já ignora. Caminho absoluto em UPLOAD_DIR é respeitado como está (recomendado em prod).
 */
export function resolveUploadDir(): string {
  const raw = config.uploadDir
  if (path.isAbsolute(raw)) return raw

  let base = process.cwd()
  const standaloneSuffix = path.join('.next', 'standalone')
  if (base.endsWith(standaloneSuffix)) {
    base = path.join(base, '..', '..') // .next/standalone -> raiz do projeto
  }
  return path.resolve(base, raw)
}
