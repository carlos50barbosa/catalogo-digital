// Estado de retorno padrão das Server Actions usadas com useActionState.
export type ActionState = {
  ok?: boolean
  error?: string
  fieldErrors?: Record<string, string>
  message?: string
}

export const initialActionState: ActionState = {}

/** Converte "" em null (campos opcionais de formulário). */
export function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : ''
  return s === '' ? null : s
}
