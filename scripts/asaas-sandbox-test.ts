/**
 * Teste de integração da assinatura contra o SANDBOX do Asaas.
 *
 * Rode com:  npm run asaas:test
 * (precisa de ASAAS_ENV="sandbox" + ASAAS_API_KEY de sandbox no .env)
 *
 * Exercita o fluxo real do gateway (cliente → assinatura → checkout → taxa) SEM
 * tocar no banco local. Aborta se a baseUrl não for de sandbox (proteção contra
 * criar dados em produção). A assinatura de teste é cancelada no fim (limpeza).
 */
import { config } from '@/lib/config'
import { gateway } from '@/lib/billing'
import { PLANS } from '@/lib/plans'

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log('=== Config Asaas ===')
  console.log('env     :', config.asaas.env)
  console.log('baseUrl :', config.asaas.baseUrl)
  console.log(
    'apiKey  :',
    config.asaas.apiKey
      ? `definida (len=${config.asaas.apiKey.length}, prefixo="${config.asaas.apiKey.slice(0, 11)}")`
      : 'VAZIA',
  )
  if (!config.asaas.apiKey) {
    console.log('\n❌ ASAAS_API_KEY vazia — defina a chave de sandbox no .env.')
    process.exitCode = 1
    return
  }
  if (!config.asaas.baseUrl.includes('sandbox')) {
    console.log('\n⛔ baseUrl NÃO é de sandbox — abortando para não criar dados em produção.')
    process.exitCode = 1
    return
  }

  const plan = 'PROFISSIONAL' as const
  const value = PLANS[plan].value

  console.log('\n=== 1) Criar cliente ===')
  const customer = await gateway.createCustomer({
    name: `Loja Teste Sandbox ${ymd(new Date())}`,
    cpfCnpj: '11144477735', // CPF válido para testes
    email: 'teste-sandbox@cataloggo.app.br',
    externalReference: 'sandbox-test',
  })
  console.log('customerId:', customer.id)

  console.log('\n=== 2) Criar assinatura (BOLETO, mensal, R$', value, ') ===')
  const sub = await gateway.createSubscription({
    customerId: customer.id,
    billingType: 'BOLETO',
    value,
    nextDueDate: ymd(new Date()),
    description: `Assinatura ${PLANS[plan].label} — TESTE SANDBOX`,
    externalReference: 'sandbox-test',
  })
  console.log('subscriptionId:', sub.id, '| status:', sub.status, '| nextDueDate:', sub.nextDueDate)

  console.log('\n=== 3) URL de pagamento da 1ª cobrança (checkout hospedado) ===')
  console.log('invoiceUrl:', await gateway.getSubscriptionPaymentUrl(sub.id))

  console.log('\n=== 4) Cobrança avulsa (primitivo do gateway, R$ 25 de teste) ===')
  const charge = await gateway.createOneOffCharge({
    customerId: customer.id,
    billingType: 'BOLETO',
    value: 25,
    dueDate: ymd(new Date()),
    description: 'Cobrança avulsa — TESTE SANDBOX',
  })
  console.log('chargeId:', charge.id, '| invoiceUrl:', charge.invoiceUrl)

  console.log('\n=== 5) Cancelar a assinatura de teste (limpeza) ===')
  await gateway.cancelSubscription(sub.id)
  console.log('assinatura', sub.id, 'cancelada no sandbox.')

  console.log('\n✅ Fluxo de assinatura no SANDBOX OK de ponta a ponta.')
}

main().catch((e) => {
  console.error('\n❌ ERRO:', e instanceof Error ? e.message : e)
  process.exitCode = 1
})
