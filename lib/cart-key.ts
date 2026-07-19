/**
 * Identidade de uma LINHA do carrinho.
 *
 * Antes dos complementos o carrinho deduplicava por productId — dois X-Burguer
 * montados diferente colapsavam num só e o cliente recebia o pedido errado.
 * A linha passa a ser identificada por produto + opções + observação.
 *
 * Os ids são ordenados para a chave não depender da ordem de clique: marcar
 * bacon-depois-ovo tem que somar com ovo-depois-bacon.
 */
export function lineKey(productId: string, optionIds: string[], notes?: string): string {
  return [productId, [...optionIds].sort().join(','), (notes ?? '').trim()].join('|')
}
