import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { config } from '@/lib/config'
import { resolveUploadDir } from '@/lib/upload-path'
import type { FileStorage, SavedFile, UploadFile } from './types'

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** Armazenamento em disco local. Grava em config.uploadDir e serve via /uploads. */
export class LocalDiskStorage implements FileStorage {
  async save(file: UploadFile, opts?: { prefix?: string }): Promise<SavedFile> {
    const ext = EXT_BY_MIME[file.mimeType] ?? 'bin'
    // sanitiza o prefixo (subpasta) para evitar path traversal
    const prefix = (opts?.prefix ?? 'misc').replace(/[^a-z0-9/_-]/gi, '')
    const name = `${crypto.randomUUID()}.${ext}`
    const key = path.posix.join(prefix, name)

    const dest = path.join(resolveUploadDir(), prefix, name)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.writeFile(dest, file.buffer)

    return {
      url: path.posix.join(config.uploadPublicPath, key),
      key,
    }
  }

  async delete(key: string): Promise<void> {
    // impede que key suba de diretório
    const safeKey = key.replace(/\.\.(\/|\\)/g, '')
    const target = path.join(resolveUploadDir(), safeKey)
    try {
      await fs.unlink(target)
    } catch {
      // arquivo já inexistente: ignora
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    const safe = prefix.replace(/\.\.(\/|\\)/g, '')
    if (!safe) return // nunca apagar a raiz de uploads
    const target = path.join(resolveUploadDir(), safe)
    try {
      await fs.rm(target, { recursive: true, force: true })
    } catch {
      // pasta já inexistente: ignora
    }
  }
}
