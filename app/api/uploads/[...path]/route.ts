import type { NextRequest } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { resolveUploadDir } from '@/lib/upload-path'

export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

/**
 * Serve arquivos do UPLOAD_DIR. Em produção o Nginx serve /uploads/ direto;
 * esta rota é o caminho usado em dev (e fallback em prod).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params
  const rel = parts.join('/')

  // bloqueia path traversal
  if (rel.includes('..') || rel.includes('\0')) {
    return new Response('Not found', { status: 404 })
  }

  const filePath = path.join(resolveUploadDir(), rel)
  try {
    const data = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
