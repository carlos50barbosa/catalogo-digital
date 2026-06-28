// Rate limit simples em memória (janela deslizante), por chave (ex.: IP).
// Suficiente pro MVP rodando em 1 instância (PM2 fork). Para múltiplas
// instâncias/escala, trocar por Redis (FASE 2).

const hits = new Map<string, number[]>()

export function rateLimit(key: string, limit = 8, windowMs = 60_000): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}
