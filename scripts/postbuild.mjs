// Pós-build do output standalone.
// O Next NÃO copia .next/static nem public/ para .next/standalone automaticamente.
// Sem isso, em produção o CSS/JS e as imagens estáticas voltam 404.
// Este script roda automaticamente após `npm run build` (lifecycle "postbuild").

import { cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const standalone = path.join(root, '.next', 'standalone')

if (!existsSync(standalone)) {
  console.log('[postbuild] .next/standalone não encontrado — output não é standalone? Pulando.')
  process.exit(0)
}

async function copyDir(from, to) {
  if (!existsSync(from)) {
    console.log(`[postbuild] origem inexistente, pulando: ${path.relative(root, from)}`)
    return
  }
  await rm(to, { recursive: true, force: true })
  await cp(from, to, { recursive: true })
  console.log(`[postbuild] ${path.relative(root, from)} -> ${path.relative(root, to)}`)
}

await copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'))
await copyDir(path.join(root, 'public'), path.join(standalone, 'public'))

console.log('[postbuild] standalone pronto para produção.')
