import { LocalDiskStorage } from './local-disk'
import type { FileStorage } from './types'

export type { FileStorage, SavedFile, UploadFile } from './types'

// Ponto único de acesso ao storage. Para migrar a S3 no futuro (FASE 2),
// basta retornar outra implementação de FileStorage aqui.
export const storage: FileStorage = new LocalDiskStorage()
