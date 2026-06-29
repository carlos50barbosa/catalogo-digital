# Catálogo Digital — Vitrine + Pedidos por WhatsApp (multi-tenant)

SaaS multi-tenant onde cada cliente é um **mercadinho de bairro**. Cada loja ganha uma
**vitrine digital** acessível por um link próprio (`/{slug}`), o cliente final monta um
carrinho e, no checkout, o pedido é **enviado pro WhatsApp da loja** já formatado.
Cada loja tem também um **painel administrativo** para gerenciar produtos e configurações.

Objetivo: dar ao mercadinho a conveniência de pedidos online **sem comissão de marketplace**.

---

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS**
- **MariaDB / MySQL** + **Prisma** (provider `mysql`, com migrations)
- **Auth.js (NextAuth v5)** — Credentials (e-mail + senha), sessão JWT
- **bcryptjs** (hash de senha), **zod** (validação), **lucide-react** (ícones)
- Build em modo **standalone** (`output: 'standalone'`) — roda atrás de **Nginx + PM2**, sem nada específico da Vercel.

> Observação sobre o `bcrypt`: usamos **bcryptjs** (implementação em JS puro do mesmo
> algoritmo bcrypt). É um drop-in sem dependência nativa (node-gyp), o que evita
> problemas de compilação em VPS e no build standalone.

---

## Arquitetura multi-tenant (resumo)

**Banco único.** Toda tabela de loja tem `storeId`. Roteamento por _path_:

- **Vitrine pública:** `/{slug}` — a loja é resolvida pelo `slug` da URL (só dados públicos).
- **Painel:** `/painel/*` (protegido) — a loja vem **sempre da sessão** (`session.user.storeId`), **nunca** de body/query/param.
- **Login:** `/painel/login`.

O acesso a dados é centralizado em **repositórios** (`lib/data/*`) que recebem `storeId`
como **primeiro argumento obrigatório**. Update/delete usam `updateMany`/`deleteMany` com
`where: { id, storeId }` — assim é impossível, logado numa loja, alterar dados de outra.

```
/app
  /[slug]                      → vitrine pública
  /painel/login                → login (fora do shell autenticado)
  /painel/(app)                → grupo protegido (layout com requireStore)
    /produtos, /categorias, /configuracoes, /importar
  /painel/_actions             → Server Actions (mutations), storeId sempre da sessão
  /api/auth/[...nextauth]       → handler do Auth.js
  /api/uploads/[...path]        → serve uploads em dev (Nginx serve em prod)
/components  (storefront, admin, ui)
/lib
  /data        → repositórios escopados por storeId (camada de isolamento)
  /order/buildWhatsAppMessage.ts
  /storage     → interface FileStorage + LocalDiskStorage
  auth-helpers.ts, prisma.ts, config.ts, validation.ts, serialize.ts, ...
/prisma         → schema.prisma, migrations, seed.ts, seed-data/
/scripts        → create-store.ts
auth.ts, auth.config.ts, proxy.ts   → Auth.js + proteção de rotas
```

---

## Pré-requisitos

- Node.js 20+ (testado com Node 24)
- MariaDB 10.6+ ou MySQL 8+

---

## Instalação (desenvolvimento)

```bash
# 1) Dependências
npm install

# 2) Variáveis de ambiente
cp .env.example .env
#   edite .env e configure DATABASE_URL e NEXTAUTH_SECRET
#   (gere um segredo:  openssl rand -base64 32)

# 3) Banco: aplicar as migrations
npx prisma migrate deploy
#   (em desenvolvimento, você também pode usar: npx prisma migrate dev)

# 4) Popular dados de demonstração (biblioteca + loja demo + usuário)
npm run db:seed

# 5) Rodar em desenvolvimento
npm run dev
```

Acesse:

- Vitrine demo: <http://localhost:3000/mercadinho-demo>
- Painel: <http://localhost:3000/painel/login>

As **credenciais da loja demo** são impressas no console ao rodar o seed:

```
E-mail: dono@mercadinho-demo.com.br
Senha:  demo1234
```

---

## Variáveis de ambiente

| Variável          | Obrigatória | Descrição                                                        |
| ----------------- | ----------- | ---------------------------------------------------------------- |
| `DATABASE_URL`    | ✅          | Conexão MySQL/MariaDB: `mysql://user:pass@host:3306/db`          |
| `NEXTAUTH_SECRET` | ✅          | Segredo do Auth.js (`openssl rand -base64 32`)                   |
| `NEXTAUTH_URL`    | ✅ (prod)   | URL base, ex.: `https://seudominio.com.br`                       |
| `APP_URL`         | ✅          | URL pública usada em links/metadata (ex.: `https://...`)         |
| `UPLOAD_DIR`      | ✅          | Pasta dos uploads, ex.: `/var/www/catalogo/uploads`             |
| `MAX_UPLOAD_MB`   | —           | Tamanho máximo de upload em MB (default 5)                       |
| `SALES_WHATSAPP`  | —           | WhatsApp de vendas (CTAs de upgrade/regularização no painel)    |
| `SETUP_FEE`       | —           | Taxa única de montagem, em R$ (referência; default 250)         |
| `ASAAS_ENV`       | — (Parte B) | `sandbox` ou `production`                                        |
| `ASAAS_API_KEY`   | — (Parte B) | Chave da API do Asaas (vazio = billing semi-manual, sem gateway)|
| `ASAAS_WEBHOOK_TOKEN` | — (B)   | Token do webhook (validado no header `asaas-access-token`)       |
| `ASAAS_BASE_URL`  | —           | Opcional; derivado de `ASAAS_ENV` se omitido                     |
| `SIGNUP_MODE`     | —           | `PAY_TO_ACTIVATE` (padrão) ou `TRIAL`                            |
| `TRIAL_DAYS`      | —           | Dias de teste no modo `TRIAL` (default 7)                        |
| `MIN_PRODUCTS_TO_PUBLISH` | —   | Mínimo de produtos para publicar a loja (default 5)             |
| `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_USER`/`EMAIL_PASS`/`EMAIL_FROM`/`EMAIL_SECURE` | — | SMTP transacional. Sem `EMAIL_HOST`, o link de verificação é logado no console (dev). |

Veja `.env.example`.

---

## Scripts úteis

```bash
npm run dev               # desenvolvimento
npm run build             # prisma generate + next build (standalone)
npm run start             # next start (modo não-standalone)
npm run start:standalone  # node .next/standalone/server.js
npm run db:migrate        # prisma migrate dev
npm run db:deploy         # prisma migrate deploy (produção)
npm run db:seed           # popular biblioteca + loja demo
npm run create-store -- --name "..." --whatsapp ... --email ... --password ...
```

### Criar uma loja nova (sem cadastro self-service)

No MVP as contas são criadas via CLI:

```bash
npm run create-store -- \
  --name "Mercado do Zé" \
  --whatsapp 5582999999999 \
  --email dono@mercadoze.com \
  --password "uma-senha-forte" \
  --slug mercado-do-ze \
  --accent "#16a34a"
```

Cria `Store` + `StoreSettings` + `User (OWNER)` com a senha já hasheada.

--- 

## Importação de produtos por CSV

No painel: **Importar**. A planilha deve ter o cabeçalho:

```csv
nome,categoria,preco,unidade
Arroz Branco 5kg,Mercearia,27.90,UN
Banana Prata,Hortifruti,5.99,KG
```

- Delimitador `,` ou `;` (detectado automaticamente).
- Preço aceita `3,50`, `3.50` ou `R$ 3,50`.
- Unidades: `UN`, `KG`, `L`, `PCT` (default `UN`).
- Categorias inexistentes são criadas automaticamente.
- A tela mostra **prévia** e **relatório de erros** antes de confirmar.

---

## Biblioteca compartilhada (CatalogItem)

Produtos comuns de mercadinho (refrigerante, água, arroz, gás...) são cadastrados **uma vez**
na tabela global `CatalogItem` (sem `storeId`) e reaproveitados por todas as lojas. Ao criar um
produto pela biblioteca, o item herda **nome e foto** (editáveis), mas o **preço é sempre da loja**.

> As imagens reais da biblioteca serão adicionadas depois — o seed usa um placeholder
> (`/placeholders/product.svg`). Produtos com imagem própria (enviada pelo dono em `/uploads`)
> são exibidos normalmente com `next/image`.

---

## Upload de imagens

- Uploads (logo da loja, fotos de produto) vão para `UPLOAD_DIR` (fora de `/public`).
- O armazenamento é abstraído por `lib/storage` (`FileStorage`). A implementação atual é
  `LocalDiskStorage`. Trocar para S3/Object Storage no futuro (FASE 2) é só criar outra
  implementação de `FileStorage`.
- Em **dev**, os arquivos são servidos por `GET /api/uploads/...`. Em **produção**, o **Nginx**
  serve `/uploads/` diretamente do disco (mais rápido).

---

## Deploy em VPS (Hostinger) — Nginx + PM2 + MariaDB

### 1. Banco

```bash
sudo apt install mariadb-server
sudo mysql_secure_installation

sudo mysql -e "CREATE DATABASE catalogo_digital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'catalogo'@'localhost' IDENTIFIED BY 'senha_forte';"
sudo mysql -e "GRANT ALL PRIVILEGES ON catalogo_digital.* TO 'catalogo'@'localhost'; FLUSH PRIVILEGES;"
```

### 2. App

> **Faça o build NA VPS (Linux).** O Prisma compila/usa um _engine_ binário específico do
> SO. Buildar no Windows/Mac e copiar para a VPS quebra em runtime — sempre rode `npm run build`
> no próprio servidor.

```bash
cd /var/www/catalogo-digital
npm ci
cp .env.example .env      # edite com os valores de produção (DATABASE_URL, NEXTAUTH_SECRET, APP_URL, UPLOAD_DIR...)

mkdir -p /var/www/catalogo/uploads   # mesmo valor de UPLOAD_DIR

npx prisma migrate deploy
npm run db:seed           # opcional (popula a biblioteca compartilhada)
npm run build
```

O `npm run build` gera `.next/standalone/server.js` e, via passo **`postbuild`**, já copia
`.next/static` e `public/` para dentro do standalone automaticamente (sem isso, CSS/JS e
imagens estáticas voltam 404 em produção).

### 3. PM2

Ajuste o `cwd` em `ecosystem.config.js` e:

```bash
npm i -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup     # habilita o boot automático
```

O servidor escuta em `127.0.0.1:3000` (definido no `ecosystem.config.js`).

### 4. Nginx (proxy reverso + arquivos de upload)

`/etc/nginx/sites-available/catalogo`:

```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    client_max_body_size 10M;   # acomoda uploads de imagem

    # Arquivos enviados (logos/fotos) servidos direto do disco
    location /uploads/ {
        alias /var/www/catalogo/uploads/;   # = UPLOAD_DIR (com barra ao final)
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # App Next.js (standalone via PM2)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/catalogo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. HTTPS (por sua conta no servidor)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br
```

Depois do HTTPS, ajuste `NEXTAUTH_URL` e `APP_URL` para `https://...` e reinicie o PM2.

### 6. Backup do banco (por sua conta no servidor)

`mysqldump` via cron, idealmente copiado para fora da VPS:

```bash
# /etc/cron.d/catalogo-backup  (exemplo: todo dia às 3h)
0 3 * * * root mysqldump -u catalogo -p'senha_forte' catalogo_digital | gzip > /var/backups/catalogo_$(date +\%F).sql.gz
```

### Atualizações (redeploy)

Há um script pronto que faz tudo (git pull → `npm ci` → `prisma migrate deploy` → `npm run build`
→ `pm2 reload`):

```bash
chmod +x deploy.sh   # só na primeira vez
./deploy.sh          # ou ./deploy.sh --no-pull
```

Equivalente manual: `git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 reload catalogo-digital`.
O `postbuild` cuida da cópia de `static`/`public`.

---

## Acessibilidade & SEO

- HTML semântico, `aria-label` em ícones/botões, foco visível, contraste AA, navegação por teclado.
- `lang="pt-BR"`, metadata dinâmica por loja, Open Graph e JSON-LD (`GroceryStore`).
- O painel (`/painel/*`) é `noindex`.

---

## Já incluído além do MVP base

- **Registro de pedidos** (order capture): o checkout grava `Order` + `OrderItem` no servidor,
  com **recálculo de valores no backend** (preços do cliente nunca são confiados) e snapshot de
  nome/unidade/preço. Status único `GENERATED` (pedido gerado, não confirmado).
- **Painel:** telas de **Pedidos** (lista/detalhe) e **Clientes**, e cards de estatística no
  dashboard (pedidos gerados / valor / ticket médio nos últimos 30 dias).
- **Base de clientes:** captura de nome + telefone no checkout, com upsert por `(storeId, phone)`.
- **LGPD:** consentimento no checkout + página `/{slug}/privacidade` (modelo a revisar).
- **Produtos por peso (KG):** quantidade decimal e valores marcados como "(aprox.)".
- **Divulgação:** gerador de **QR Code** da loja (cartaz para imprimir / baixar PNG).
- **Foto via câmera** do celular no painel, com **compressão no cliente** antes do upload.
- **Confirmação pós-checkout** com instrução de apertar enviar e botão de reabrir o WhatsApp.

## Planos, limites e assinatura (Asaas)

- **Planos** (`lib/plans.ts`, fonte única): limites e recursos por plano (limite de produtos,
  ofertas, branding, suporte, conteúdo gerenciado). Checks centralizados em `can()` / `productLimit()`.
- **Limite de produtos** aplicado **no servidor** (criação e importação CSV), com mensagem de upgrade.
- **Status da loja** (`Store.status`: `TRIALING|ACTIVE|PAST_DUE|SUSPENDED|CANCELED`) com efeitos
  centralizados (`lib/store-status.ts`): vitrine tolera `PAST_DUE`, mostra "indisponível" em
  `SUSPENDED`, some em `CANCELED`; painel mostra aviso/restringe à tela de assinatura.
- **Painel da loja → "Meu plano"** (`/painel/assinatura`): uso vs limite, status, próxima cobrança,
  regularização e "mudar plano" (via WhatsApp de vendas — modelo assistido).
- **Painel da plataforma** (`/admin-plataforma`, papel **SUPERADMIN**): lista todas as lojas,
  filtros por status, MRR estimado, e ações de criar/mudar/cancelar assinatura + **override manual
  de status**. OWNER/STAFF nunca acessam.
- **Cobrança (Asaas)**: o gateway é abstraído em `lib/billing/` (`BillingGateway` + `AsaasGateway`).
  Sem `ASAAS_API_KEY`, o billing roda **semi-manual** (assinatura local + override de status). Com a
  chave, a ação de criar assinatura cria cliente + assinatura recorrente + a taxa de montagem
  (cobrança avulsa) no Asaas (sandbox/produção via `ASAAS_ENV`).
- **Webhook**: configure no painel do Asaas a URL `https://SEU_DOMINIO/api/webhooks/asaas` e um token;
  coloque o mesmo token em `ASAAS_WEBHOOK_TOKEN`. O endpoint valida o header `asaas-access-token`, é
  idempotente (tabela `BillingEvent`) e mapeia os eventos `PAYMENT_*` para o status da loja.
  O produto **não** guarda dados de cartão.

> Acesso de teste após o seed — Plataforma: `admin@plataforma.com` / `admin1234` (`/admin-plataforma`).

## Cadastro self-service (dono se cadastra sozinho)

Caminho alternativo ao onboarding manual (os dois coexistem, mesma camada de billing):

1. **`/cadastro`** — cria `Store` (status `PENDING`, não publicada) + `User` OWNER + `StoreSettings`,
   com slug único e **verificação de e-mail** (link enviado; em dev vai pro console).
2. **`/cadastro/plano`** (após verificar o e-mail) — escolhe plano + forma de pagamento + CPF/CNPJ,
   cria cliente + assinatura no Asaas e **redireciona ao checkout hospedado** (cartão nunca passa
   pelo servidor). Modo via `SIGNUP_MODE`: `PAY_TO_ACTIVATE` (publica só após pagar) ou `TRIAL`.
3. **Webhook** (`/api/webhooks/asaas`) ativa a loja automaticamente (`PENDING`/`TRIALING` → `ACTIVE`)
   e dispara o **e-mail de boas-vindas**. `/cadastro/aguardando` faz polling para PIX/boleto.
4. **`/painel/onboarding`** — assistente guiado (marca → entrega → produtos → publicar). Exige um
   mínimo de produtos (`MIN_PRODUCTS_TO_PUBLISH`) para o "Publicar" liberar a vitrine.
5. **`/painel/assinatura`** — self-service de **upgrade/downgrade**, atualizar pagamento e **cancelar**.

A vitrine só fica pública quando `status` é `ACTIVE`/`TRIALING` **e** `published = true`.

## Fora do escopo do MVP (FASE 2)

Fluxo de **status/confirmação** de pedido (no MVP o pedido é só "gerado") · estoque numérico e
variações · dashboard de métricas avançado · domínio/subdomínio próprio por loja · storage S3 (a
interface já está pronta) · fidelidade/promoções para a base de clientes · cupons/indicações ·
cancelamento de assinatura no **fim do ciclo** (hoje é imediato; precisa de cron) · API oficial do
WhatsApp (no MVP é `wa.me`).
```
