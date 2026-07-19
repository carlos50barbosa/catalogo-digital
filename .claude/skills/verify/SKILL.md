---
name: verify
description: Como subir e dirigir o Catálogo Digital para observar uma mudança rodando de verdade (sem navegador instalado).
---

# Verificar mudanças no Catálogo Digital

Next.js 16 (App Router, Turbopack) + Prisma/MySQL. Não há Playwright/Puppeteer
no projeto — a superfície se dirige por HTTP com `curl`.

## Subir

1. O MySQL do Laragon precisa estar no ar (senão o login dá "E-mail ou senha
   inválidos" e o Prisma dá P1000).
2. `npm run dev` em background, redirecionando para um log; espere `Ready in`.

Credenciais do seed (`prisma/seed.ts`): `dono@mercadinho-demo.com.br` / `demo1234`.
A loja demo é `mercadinho-demo` (ACTIVE). Lojas PENDING não entram no painel —
são redirecionadas para `/cadastro/plano`.

## Dirigir Server Actions com curl

Os formulários usam `useActionState`, mas renderizam o caminho no-JS
(progressive enhancement). Dá para postar exatamente o que o navegador postaria:

```bash
# 1) pegue os campos ocultos da action na página
curl -s -b jar.txt http://localhost:3000/painel/configuracoes > pg.html
AID=$(grep -oE 'id&quot;:&quot;[0-9a-f]{30,}' pg.html | head -1 | sed 's/.*&quot;//')
AKEY=$(grep -oE 'name="\$ACTION_KEY" value="[^"]*"' pg.html | sed 's/.*value="//;s/"//')

# 2) poste com multipart, incluindo TODOS os campos do form
curl -s -b jar.txt -X POST http://localhost:3000/painel/configuracoes \
  --form-string '$ACTION_REF_1=' \
  --form-string "\$ACTION_1:0={\"id\":\"$AID\",\"bound\":\"\$@1\"}" \
  --form-string '$ACTION_1:1=[{}]' \
  --form-string "\$ACTION_KEY=$AKEY" \
  --form-string 'name=...' # + demais campos
```

Erros de validação voltam no HTML re-renderizado:
`grep -oE 'text-red-600">[^<]*'`.

### Pegadinhas

- **Use `--form-string`, nunca `-F`.** O `-F` do curl interpreta `@` e engole
  e-mails (`a@b.com` some), produzindo "E-mail inválido" enganoso.
- **Não extraia o action id com `sed 's/[^0-9a-f]//g'`** — o `d` de `id` entra
  no resultado e o Next responde 500 "Failed to find Server Action".
- O action id **muda a cada recompilação**. Re-extraia depois de editar código.
- Login (`/painel/login`) responde 303 e grava o cookie de sessão; use
  `-c jar.txt -b jar.txt`.
- `⚠ Missing origin header` no log é esperado com curl e não quebra nada.
- Node do Windows não enxerga `/tmp` do Git Bash. Para ler arquivos com
  `node -e`, grave no diretório de scratchpad com caminho `C:/...`.

## Dirigir a vitrine num navegador de verdade

O carrinho é 100% client-side — curl não o exercita. Não há Playwright no
projeto, mas há Chrome instalado na máquina. Instale só a biblioteca (sem
baixar navegador) no diretório de scratchpad:

```bash
npm install playwright-core
```

```js
import { chromium } from 'playwright-core'
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } })
```

Viewport estreito porque a vitrine é feita para celular. Para testar cenários
de carrinho, injete o cookie antes de navegar:

```js
await ctx.addCookies([{
  name: 'cart_mercadinho-demo',
  value: encodeURIComponent(JSON.stringify([{ productId, optionIds: [], quantity: 2 }])),
  url: 'http://localhost:3000',
}])
```

Sempre escute `page.on('pageerror')` — erro de hidratação não aparece na
saída do servidor, só no console do navegador.

## Conferir o banco

```bash
node --env-file=.env -e "
const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
p.store.findMany({select:{slug:true,segment:true}}).then(r=>{console.table(r);return p.\$disconnect()})
"
```

## Migrations

O MySQL local nega a shadow database (P3014), então `prisma migrate dev` falha.
Escreva `prisma/migrations/<timestamp>_<nome>/migration.sql` à mão e rode
`npx prisma migrate deploy`. **Nomes de tabela em PascalCase** (`Store`, não
`store`): o MariaDB de produção é case-sensitive.

## Limpe o que criou

Apague as lojas de teste e restaure o estado da demo ao terminar.
