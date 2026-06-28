import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { slugify } from '../lib/utils'

/**
 * CLI para criar uma nova loja (Store + StoreSettings + User OWNER).
 * No MVP não há cadastro self-service: as contas são criadas por aqui.
 *
 * Uso:
 *   npm run create-store -- --name "Mercado do Zé" --whatsapp 5582999999999 \
 *     --email dono@loja.com --password "senha-forte" [--slug mercado-do-ze] [--accent "#16a34a"]
 */

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        out[key] = next
        i++
      } else {
        out[key] = 'true'
      }
    }
  }
  return out
}

function usage(msg?: string): never {
  if (msg) console.error(`\n❌ ${msg}`)
  console.error(`
Uso:
  npm run create-store -- --name "Mercado do Zé" --whatsapp 5582999999999 \\
    --email dono@loja.com --password "senha-forte" [--slug mercado-do-ze] [--accent "#16a34a"]

Argumentos:
  --name       Nome da loja (obrigatório)
  --whatsapp   Número com DDI+DDD, só dígitos, ex.: 5582999999999 (obrigatório)
  --email      E-mail de login do dono (obrigatório)
  --password   Senha do dono, mín. 6 caracteres (obrigatório)
  --slug       Identificador na URL /{slug} (opcional; derivado do nome)
  --accent     Cor de destaque hex, ex.: #16a34a (opcional)
`)
  process.exit(1)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const name = args.name?.trim()
  const whatsapp = args.whatsapp?.replace(/\D/g, '')
  const email = args.email?.trim().toLowerCase()
  const password = args.password
  const accent = args.accent?.trim()
  const slug = (args.slug?.trim() || (name ? slugify(name) : '')) ?? ''

  if (!name) usage('Informe --name.')
  if (!whatsapp || whatsapp.length < 10) usage('Informe --whatsapp válido (só dígitos, com DDI+DDD).')
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) usage('Informe --email válido.')
  if (!password || password.length < 6) usage('Informe --password com pelo menos 6 caracteres.')
  if (!slug) usage('Não foi possível derivar o slug — informe --slug.')
  if (accent && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent)) usage('--accent deve ser hex, ex.: #16a34a')

  // Checagem de duplicidade.
  const [slugTaken, emailTaken] = await Promise.all([
    prisma.store.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email } }),
  ])
  if (slugTaken) usage(`O slug "${slug}" já está em uso.`)
  if (emailTaken) usage(`O e-mail "${email}" já está em uso.`)

  const passwordHash = await bcrypt.hash(password, 10)

  const store = await prisma.store.create({
    data: {
      slug,
      name,
      whatsappNumber: whatsapp,
      accentColor: accent ?? null,
      isActive: true,
      settings: { create: {} }, // cria StoreSettings com defaults
      users: {
        create: {
          email,
          passwordHash,
          name: 'Dono da Loja',
          role: 'OWNER',
        },
      },
    },
  })

  console.log('\n✅ Loja criada com sucesso!')
  console.log('────────────────────────────────────────')
  console.log('  Vitrine:  /' + store.slug)
  console.log('  Painel:   /painel/login')
  console.log('  E-mail:   ' + email)
  console.log('────────────────────────────────────────')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro ao criar loja:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
