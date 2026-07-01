/**
 * Limpeza de estornos DUPLICADOS de fiado (pré-requisito da migration que põe
 * @unique em FiadoEntry.reversesEntryId).
 *
 * Se o TOCTOU antigo permitiu dois estornos do MESMO lançamento, o saldo da
 * conta foi abatido em dobro. Este script mantém o 1º estorno de cada grupo e,
 * para cada estorno EXTRA, DESFAZ o efeito dele no saldo e apaga o registro —
 * tudo por conta, em transação.
 *
 * Uso:
 *   node --env-file=.env --import tsx scripts/dedupe-fiado-reversals.ts          # dry-run (só relatório)
 *   node --env-file=.env --import tsx scripts/dedupe-fiado-reversals.ts --apply  # aplica de fato
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

async function main() {
  const reversals = await prisma.fiadoEntry.findMany({
    where: { reversesEntryId: { not: null } },
    select: { id: true, reversesEntryId: true, fiadoAccountId: true, type: true, amount: true },
    orderBy: { createdAt: 'asc' },
  })

  // Agrupa por lançamento estornado; grupos com >1 são estornos em duplicidade.
  const byOriginal = new Map<string, typeof reversals>()
  for (const r of reversals) {
    const k = r.reversesEntryId as string
    const arr = byOriginal.get(k) ?? []
    arr.push(r)
    byOriginal.set(k, arr)
  }
  const dupeGroups = [...byOriginal.values()].filter((g) => g.length > 1)

  if (dupeGroups.length === 0) {
    console.log('✅ Nenhum estorno duplicado. A migration @unique pode ser aplicada sem risco.')
    return
  }

  console.log(`⚠️  ${dupeGroups.length} lançamento(s) com estorno em duplicidade.`)
  console.log(APPLY ? '>> MODO APPLY: aplicando correções...\n' : '>> DRY-RUN (use --apply para executar)\n')

  let removed = 0
  for (const group of dupeGroups) {
    const [keep, ...extras] = group
    console.log(
      `original ${keep.reversesEntryId}: mantém ${keep.id}, remove ${extras.length} extra(s)`,
    )
    for (const extra of extras) {
      const amount = round2(Number(extra.amount))
      // Estorno tipo DEBIT aplicou +amount; tipo CREDIT aplicou -amount.
      // Desfazer = incrementar pelo oposto.
      const undo = extra.type === 'DEBIT' ? -amount : amount
      console.log(`   - apaga ${extra.id} (${extra.type} R$${amount}) e ajusta saldo em ${undo}`)
      if (APPLY) {
        await prisma.$transaction([
          prisma.fiadoAccount.update({
            where: { id: extra.fiadoAccountId },
            data: { balance: { increment: undo } },
          }),
          prisma.fiadoEntry.delete({ where: { id: extra.id } }),
        ])
      }
      removed++
    }
  }

  console.log(`\n${APPLY ? '✅ Removidos' : '(dry-run) removeria'} ${removed} estorno(s) duplicado(s).`)
  if (!APPLY) console.log('Rode de novo com --apply para aplicar.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
