/**
 * Backfill do `cpfCnpj` nas Subscriptions existentes, lendo o cliente no Asaas.
 *
 * A partir da migration `20260702120000_subscription_cpfcnpj`, o cpfCnpj passou a
 * ser gravado no provisionamento. Assinaturas ANTIGAS ficaram com cpfCnpj null —
 * então o badge "CPF repetido" no /admin-plataforma não marca as duplicatas já
 * existentes. Este script busca cada cliente no Asaas (pelo gatewayCustomerId) e
 * preenche o cpfCnpj (só dígitos), habilitando o aviso para as lojas antigas.
 *
 * Uso (na VPS, com o banco via socket e ASAAS_API_KEY no .env):
 *   node --env-file=.env --import tsx scripts/backfill-cpfcnpj.ts          # dry-run (só relatório)
 *   node --env-file=.env --import tsx scripts/backfill-cpfcnpj.ts --apply  # grava de fato
 */
import { PrismaClient } from '@prisma/client'
import { config } from '../lib/config'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Busca o CPF/CNPJ (só dígitos) de um cliente no Asaas. null se não achar. */
async function getAsaasCpf(customerId: string): Promise<string | null> {
  const res = await fetch(`${config.asaas.baseUrl}/customers/${customerId}`, {
    headers: { access_token: config.asaas.apiKey },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as { cpfCnpj?: string }
  const digits = (json.cpfCnpj ?? '').replace(/\D/g, '')
  return digits || null
}

async function main() {
  if (!config.asaas.apiKey) {
    console.error('ASAAS_API_KEY não configurado — impossível buscar clientes no Asaas.')
    process.exitCode = 1
    return
  }

  // Assinaturas com cliente no gateway mas ainda sem cpfCnpj local.
  const subs = await prisma.subscription.findMany({
    where: { gatewayCustomerId: { not: null }, cpfCnpj: null },
    select: {
      id: true,
      storeId: true,
      gatewayCustomerId: true,
      store: { select: { name: true } },
    },
  })

  if (subs.length === 0) {
    console.log('✅ Nada a preencher (toda assinatura com cliente já tem cpfCnpj).')
    return
  }

  console.log(`${subs.length} assinatura(s) sem cpfCnpj. ${APPLY ? '>> MODO APPLY' : '>> DRY-RUN (use --apply)'}\n`)

  let filled = 0
  let missing = 0
  for (const s of subs) {
    const cpf = await getAsaasCpf(s.gatewayCustomerId as string)
    const label = s.store?.name ?? s.storeId
    if (!cpf) {
      missing++
      console.log(`- ${label}: cliente ${s.gatewayCustomerId} sem CPF no Asaas (pulado)`)
    } else {
      filled++
      console.log(`- ${label}: ${cpf}`)
      if (APPLY) {
        await prisma.subscription.update({ where: { id: s.id }, data: { cpfCnpj: cpf } })
      }
    }
    await sleep(250) // gentileza com o rate limit do Asaas
  }

  console.log(
    `\n${APPLY ? '✅ Preenchidos' : '(dry-run) preencheria'} ${filled}. Sem CPF no Asaas: ${missing}.`,
  )
  if (!APPLY) console.log('Rode de novo com --apply para gravar.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
