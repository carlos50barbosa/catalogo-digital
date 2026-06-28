import { storage } from '@/lib/storage'
import { config } from '@/lib/config'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Valida e grava uma imagem enviada via FormData (Server Action / route handler),
 * devolvendo a URL pública. Validação de tipo e tamanho centralizada aqui.
 */
export async function saveImage(file: File, prefix: string): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error('Nenhum arquivo enviado.')
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Formato inválido. Envie JPG, PNG ou WEBP.')
  }
  if (file.size > config.maxUploadBytes) {
    const mb = Math.round(config.maxUploadBytes / (1024 * 1024))
    throw new Error(`Imagem muito grande (máximo ${mb}MB).`)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { url } = await storage.save(
    { buffer, originalName: file.name, mimeType: file.type },
    { prefix },
  )
  return url
}

/** True se o FormData traz um arquivo de imagem com conteúdo. */
export function hasUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0
}
