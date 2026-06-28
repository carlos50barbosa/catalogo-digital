import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { CATALOG_ITEMS } from './seed-data/catalog-items'

// Imagem placeholder padrão da biblioteca compartilhada.
// As imagens REAIS dos produtos serão adicionadas depois (upload no painel).
const PLACEHOLDER_IMAGE = '/placeholders/product.svg'

const DEMO_SLUG = 'mercadinho-demo'
const DEMO_EMAIL = 'dono@mercadinho-demo.com.br'
const DEMO_PASSWORD = 'demo1234'

type Unit = 'UN' | 'KG' | 'L' | 'PCT'

// Produtos da loja demo vindos da BIBLIOTECA (herdam nome/foto, preço é da loja).
const DEMO_FROM_CATALOG: {
  name: string
  brand?: string
  price: number
  unit?: Unit
  isAvailable?: boolean
}[] = [
  { name: 'Refrigerante Cola 2L', brand: 'Coca-Cola', price: 9.99 },
  { name: 'Refrigerante Guaraná 2L', brand: 'Antarctica', price: 8.49 },
  { name: 'Água Mineral sem Gás 1,5L', brand: 'Indaiá', price: 2.99 },
  { name: 'Cerveja Pilsen Lata 350ml', brand: 'Skol', price: 3.79 },
  { name: 'Arroz Branco Tipo 1 5kg', brand: 'Tio João', price: 27.9 },
  { name: 'Feijão Carioca 1kg', brand: 'Camil', price: 8.49 },
  { name: 'Açúcar Refinado 1kg', brand: 'União', price: 4.59 },
  { name: 'Café Torrado e Moído 500g', brand: 'Pilão', price: 15.9 },
  { name: 'Óleo de Soja 900ml', brand: 'Soya', price: 7.29 },
  { name: 'Leite Integral 1L', brand: 'Italac', price: 4.99 },
  { name: 'Manteiga com Sal 200g', brand: 'Aviação', price: 9.9 },
  { name: 'Ovos Brancos Dúzia', price: 12.9, unit: 'PCT' },
  { name: 'Banana Prata', price: 5.99, unit: 'KG' },
  { name: 'Tomate', price: 7.49, unit: 'KG' },
  { name: 'Detergente Líquido Neutro 500ml', brand: 'Ypê', price: 2.49 },
  { name: 'Sabão em Pó 1kg', brand: 'Omo', price: 12.9 },
  { name: 'Papel Higiênico 12 rolos', brand: 'Neve', price: 18.9, unit: 'PCT' },
  { name: 'Botijão de Gás 13kg', price: 110.0, unit: 'UN', isAvailable: false }, // demo "Esgotado"
  { name: 'Chocolate ao Leite 90g', brand: 'Lacta', price: 5.49 },
]

// Produtos PERSONALIZADOS (sem item da biblioteca).
const DEMO_CUSTOM: {
  name: string
  description?: string
  price: number
  unit: Unit
  category: string
}[] = [
  {
    name: 'Marmita do Dia',
    description: 'Arroz, feijão, salada e a proteína do dia.',
    price: 18.0,
    unit: 'UN',
    category: 'Pronta Entrega',
  },
  {
    name: 'Pão de Queijo Congelado 1kg',
    description: 'Pacote com aproximadamente 40 unidades.',
    price: 24.9,
    unit: 'PCT',
    category: 'Padaria',
  },
]

async function main() {
  console.log('🌱 Iniciando seed...')

  // 1) Biblioteca compartilhada (global). Só popula se estiver vazia.
  const catalogCount = await prisma.catalogItem.count()
  if (catalogCount === 0) {
    await prisma.catalogItem.createMany({
      data: CATALOG_ITEMS.map((c) => ({
        name: c.name,
        brand: c.brand ?? null,
        suggestedCategory: c.suggestedCategory,
        defaultImageUrl: PLACEHOLDER_IMAGE,
      })),
    })
    console.log(`📚 ${CATALOG_ITEMS.length} itens adicionados à biblioteca compartilhada.`)
  } else {
    console.log(`📚 Biblioteca já tem ${catalogCount} itens — pulando.`)
  }

  // 2) Loja de demonstração (idempotente por slug).
  const store = await prisma.store.upsert({
    where: { slug: DEMO_SLUG },
    update: {},
    create: {
      slug: DEMO_SLUG,
      name: 'Mercadinho Demo',
      whatsappNumber: '5582999999999',
      accentColor: '#16a34a',
      plan: 'PROFISSIONAL',
      isActive: true,
    },
  })

  // 3) Configurações da loja.
  await prisma.storeSettings.upsert({
    where: { storeId: store.id },
    update: {},
    create: {
      storeId: store.id,
      address: 'Rua das Flores, 123 - Centro',
      deliveryFee: 5.0,
      minOrderValue: 20.0,
      pixKey: 'mercadinho-demo@pix.com.br',
      fulfillment: 'DELIVERY_AND_PICKUP',
      deliveryZones: ['Centro', 'Farol', 'Jatiúca', 'Ponta Verde'],
      openingHours: {
        '0': null, // domingo fechado
        '1': { open: '08:00', close: '20:00' },
        '2': { open: '08:00', close: '20:00' },
        '3': { open: '08:00', close: '20:00' },
        '4': { open: '08:00', close: '20:00' },
        '5': { open: '08:00', close: '20:00' },
        '6': { open: '08:00', close: '14:00' },
      },
      showOutOfStock: true,
    },
  })

  // 4) Usuário OWNER.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      storeId: store.id,
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Dono do Mercadinho',
      role: 'OWNER',
    },
  })

  // 5) Produtos — só cria se a loja ainda não tiver nenhum.
  const productCount = await prisma.product.count({ where: { storeId: store.id } })
  if (productCount === 0) {
    // Garante as categorias necessárias (escopadas na loja).
    const categoryNames = new Set<string>()
    for (const p of DEMO_FROM_CATALOG) {
      const item = CATALOG_ITEMS.find(
        (c) => c.name === p.name && (p.brand ? c.brand === p.brand : true),
      )
      if (item) categoryNames.add(item.suggestedCategory)
    }
    for (const p of DEMO_CUSTOM) categoryNames.add(p.category)

    const categoryByName = new Map<string, string>()
    let order = 0
    for (const name of categoryNames) {
      const cat = await prisma.category.create({
        data: { storeId: store.id, name, sortOrder: order++ },
      })
      categoryByName.set(name, cat.id)
    }

    let sort = 0
    // Produtos vindos da biblioteca.
    for (const p of DEMO_FROM_CATALOG) {
      const item = await prisma.catalogItem.findFirst({
        where: { name: p.name, ...(p.brand ? { brand: p.brand } : {}) },
      })
      if (!item) continue
      const displayName = item.brand ? `${item.name} ${item.brand}` : item.name
      await prisma.product.create({
        data: {
          storeId: store.id,
          catalogItemId: item.id,
          categoryId: categoryByName.get(item.suggestedCategory ?? '') ?? null,
          name: displayName,
          price: p.price,
          unit: p.unit ?? 'UN',
          imageUrl: item.defaultImageUrl,
          isAvailable: p.isAvailable ?? true,
          sortOrder: sort++,
        },
      })
    }

    // Produtos personalizados.
    for (const p of DEMO_CUSTOM) {
      await prisma.product.create({
        data: {
          storeId: store.id,
          categoryId: categoryByName.get(p.category) ?? null,
          name: p.name,
          description: p.description ?? null,
          price: p.price,
          unit: p.unit,
          sortOrder: sort++,
        },
      })
    }
    console.log(`🛒 ${sort} produtos criados na loja demo.`)
  } else {
    console.log(`🛒 Loja demo já tem ${productCount} produtos — pulando.`)
  }

  console.log('\n✅ Seed concluído!')
  console.log('────────────────────────────────────────')
  console.log('  Loja demo (vitrine):  /' + DEMO_SLUG)
  console.log('  Painel:               /painel/login')
  console.log('  E-mail:               ' + DEMO_EMAIL)
  console.log('  Senha:                ' + DEMO_PASSWORD)
  console.log('────────────────────────────────────────')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro no seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
