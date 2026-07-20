'use client'

import { useEffect } from 'react'

/**
 * Abre o diálogo de impressão assim que a comanda carrega (?print=1).
 *
 * O rAF duplo espera o layout assentar: chamar print() antes disso faz o Chrome
 * gerar a pré-visualização com a página ainda sem estilo, e sai uma comanda
 * torta na largura errada.
 */
export function AutoPrint() {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
    return () => cancelAnimationFrame(id)
  }, [])
  return null
}
