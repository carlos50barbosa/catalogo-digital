// Interface de armazenamento de arquivos. A implementação atual grava em disco
// local (LocalDiskStorage). Trocar para S3/Object Storage no futuro (FASE 2)
// significa apenas criar outra classe que implemente FileStorage.

export type UploadFile = {
  buffer: Buffer
  originalName: string
  mimeType: string
}

export type SavedFile = {
  /** URL pública para servir o arquivo (ex.: /uploads/products/uuid.jpg). */
  url: string
  /** Chave/caminho relativo dentro do storage (ex.: products/uuid.jpg). */
  key: string
}

export interface FileStorage {
  save(file: UploadFile, opts?: { prefix?: string }): Promise<SavedFile>
  delete(key: string): Promise<void>
  /** Remove recursivamente tudo sob um prefixo (ex.: apagar a pasta da loja). */
  deletePrefix(prefix: string): Promise<void>
}
