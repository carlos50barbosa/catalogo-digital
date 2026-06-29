'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { requireStore } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { parseNfe } from '@/lib/nfe'
import { findProductsByBarcodes } from '@/lib/data/products'
import { findCatalogItemsByBarcodes } from '@/lib/data/catalog'
import { getOrCreateCategoryByName } from '@/lib/data/categories'
import { findNfeImport, recordNfeImport } from '@/lib/data/nfe'
import { getStoreForPanel, countProducts } from '@/lib/data/stores'
import { productLimit } from '@/lib/plans'
import { decimalToNumber } from '@/lib/format'
import { nfeConfirmSchema } from '@/lib/validation'
import type { NfeAnalyzeResult, NfeReviewItem } from '@/lib/types'

// O XML de uma NF-e tem tipicamente dezenas de KB. Limite generoso de segurança.
const MAX_XML_BYTES = 4 * 1024 * 1024 // 4MB

function formatDateBR(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
}

/**
 * ETAPA 2+3: faz o parse do XML e o MATCH por GTIN, montando as linhas da tela
 * de revisão. NADA é gravado aqui — apenas leitura. storeId vem da sessão.
 */
export async function analyzeNfeAction(xml: string): Promise<NfeAnalyzeResult> {
  const { storeId } = await requireStore()

  if (typeof xml !== 'string' || xml.trim() === '') {
    return { ok: false, error: 'Envie o arquivo XML da NF-e.' }
  }
  if (Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) {
    return { ok: false, error: 'Arquivo muito grande para uma NF-e.' }
  }

  const parsed = parseNfe(xml)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const { accessKey, supplierName, supplierCnpj, items } = parsed.data

  // Dedup: avisa (não bloqueia o preview) se a nota já foi importada.
  const already = await findNfeImport(storeId, accessKey)
  const alreadyImportedAt = already ? formatDateBR(already.createdAt) : null

  // Match por GTIN: prioridade produto da loja (UPDATE) -> biblioteca (LIBRARY) -> Novo.
  const barcodes = Array.from(
    new Set(items.map((i) => i.barcode).filter((b): b is string => !!b)),
  )
  const [storeProducts, catalogItems] = await Promise.all([
    findProductsByBarcodes(storeId, barcodes),
    findCatalogItemsByBarcodes(barcodes),
  ])
  const productByBarcode = new Map(
    storeProducts.filter((p) => p.barcode).map((p) => [p.barcode as string, p]),
  )
  const catalogByBarcode = new Map(
    catalogItems.filter((c) => c.barcode).map((c) => [c.barcode as string, c]),
  )

  const reviewItems: NfeReviewItem[] = items.map((item, idx) => {
    const base = {
      key: String(idx),
      barcode: item.barcode,
      cost: item.vUnCom,
      unit: item.unit,
      qCom: item.qCom,
      uCom: item.uCom,
      productId: null as string | null,
      catalogItemId: null as string | null,
    }

    const existing = item.barcode ? productByBarcode.get(item.barcode) : undefined
    if (existing) {
      // Já existe na loja: só agregamos o custo; nome/preço do dono são preservados.
      return {
        ...base,
        status: 'UPDATE',
        name: existing.name,
        price: decimalToNumber(existing.price),
        unit: existing.unit,
        category: existing.category?.name ?? null, // exibido (read-only) na revisão
        imageUrl: existing.imageUrl,
        productId: existing.id,
      }
    }

    const ci = item.barcode ? catalogByBarcode.get(item.barcode) : undefined
    if (ci) {
      // Da biblioteca: entra completo (nome + foto). A nota agrega o custo.
      return {
        ...base,
        status: 'LIBRARY',
        name: ci.name + (ci.brand ? ` ${ci.brand}` : ''),
        price: null,
        category: ci.suggestedCategory ?? null,
        imageUrl: ci.defaultImageUrl,
        catalogItemId: ci.id,
      }
    }

    // Sem GTIN ou sem correspondência → produto novo (a revisar).
    return {
      ...base,
      status: 'NEW',
      name: item.suggestedName,
      price: null,
      category: null,
      imageUrl: null,
    }
  })

  const store = await getStoreForPanel(storeId)
  const currentCount = await countProducts(storeId)

  return {
    ok: true,
    accessKey,
    supplierName,
    supplierCnpj,
    alreadyImportedAt,
    items: reviewItems,
    plan: {
      maxProducts: store ? productLimit(store.plan) : null,
      currentCount,
    },
  }
}

export type NfeConfirmResult =
  | { ok: true; created: number; updated: number; skipped: number }
  | { ok: false; error: string; alreadyImportedAt?: string }

/**
 * ETAPA 5: grava a importação em TRANSAÇÃO, tudo escopado por storeId.
 * O payload vem editado do cliente — revalidado por zod e reconferido no servidor
 * (posse do produto, custo da biblioteca, limite de plano, dedup pela chave).
 */
export async function confirmNfeImportAction(input: unknown): Promise<NfeConfirmResult> {
  const { storeId } = await requireStore()

  const parsed = nfeConfirmSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Dados da importação inválidos. Recarregue e tente de novo.' }
  }
  const { accessKey, supplierName, supplierCnpj, items } = parsed.data

  const included = items.filter((i) => i.include)
  if (included.length === 0) {
    return { ok: false, error: 'Selecione ao menos um item para importar.' }
  }

  // Dedup: a mesma nota não entra duas vezes.
  const already = await findNfeImport(storeId, accessKey)
  if (already) {
    return {
      ok: false,
      error: `Esta nota já foi importada em ${formatDateBR(already.createdAt)}.`,
      alreadyImportedAt: formatDateBR(already.createdAt),
    }
  }

  // Limite de plano: contam apenas os itens que CRIAM produto (LIBRARY/NEW).
  const toCreate = included.filter((i) => i.status !== 'UPDATE').length
  const store = await getStoreForPanel(storeId)
  if (store) {
    const limit = productLimit(store.plan)
    if (limit !== null) {
      const count = await countProducts(storeId)
      if (count + toCreate > limit) {
        const left = Math.max(0, limit - count)
        return {
          ok: false,
          error: `Seu plano permite até ${limit} produtos (você já tem ${count}). Esta importação criaria ${toCreate} — desmarque alguns para caber em ${left}, ou fale com a gente para liberar mais.`,
        }
      }
    }
  }

  // Resolve categorias por nome (cria as que faltarem), escopadas na loja.
  const uniqueCats = Array.from(
    new Set(included.map((i) => i.category?.trim()).filter((s): s is string => !!s)),
  )
  const catMap = new Map<string, string>()
  for (const name of uniqueCats) {
    const cat = await getOrCreateCategoryByName(storeId, name)
    if (cat) catMap.set(name.toLowerCase(), cat.id)
  }
  const resolveCategory = (name: string | null | undefined) => {
    const key = name?.trim().toLowerCase()
    return key ? (catMap.get(key) ?? null) : null
  }

  let created = 0
  let updated = 0

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of included) {
        const cost = item.cost ?? null
        const categoryId = resolveCategory(item.category)

        if (item.status === 'UPDATE') {
          if (!item.productId) continue
          // Reconfere a POSSE do produto no servidor (multi-tenant).
          const existing = await tx.product.findFirst({
            where: { id: item.productId, storeId },
          })
          if (!existing) continue
          const data: Prisma.ProductUpdateInput = { cost }
          if (!existing.barcode && item.barcode) data.barcode = item.barcode // preenche se faltava
          if (item.updateName) data.name = item.name // só se o dono editou
          if (item.updatePrice && item.price != null) data.price = item.price
          await tx.product.update({ where: { id: existing.id }, data })
          updated++
          continue
        }

        // CREATE (LIBRARY ou NEW): sem preço → entra indisponível (precificar depois).
        const hasPrice = item.price != null
        let imageUrl: string | null = null
        let catalogItemId: string | null = null

        if (item.status === 'LIBRARY' && item.catalogItemId) {
          // Foto e vínculo vêm da biblioteca (servidor), não do cliente.
          const ci = await tx.catalogItem.findUnique({ where: { id: item.catalogItemId } })
          if (ci) {
            imageUrl = ci.defaultImageUrl
            catalogItemId = ci.id
          }
        }

        await tx.product.create({
          data: {
            storeId,
            name: item.name,
            price: hasPrice ? (item.price as number) : 0,
            cost,
            barcode: item.barcode ?? null,
            unit: item.unit,
            categoryId,
            catalogItemId,
            imageUrl,
            isAvailable: hasPrice,
          },
        })
        created++
      }

      // Registra a importação (guarda de dedup final via índice único).
      await recordNfeImport(tx, {
        storeId,
        accessKey,
        supplierName: supplierName ?? null,
        supplierCnpj: supplierCnpj ?? null,
        itemCount: created + updated,
      })
    })
  } catch (e) {
    // Corrida na dedup: índice único (storeId, accessKey) violado.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, error: 'Esta nota já foi importada.' }
    }
    throw e
  }

  revalidatePath('/painel/produtos')
  revalidatePath('/painel')
  return { ok: true, created, updated, skipped: items.length - included.length }
}
