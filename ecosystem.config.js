// Configuração do PM2 para rodar o app em produção numa VPS.
// Uso:  pm2 start ecosystem.config.js  &&  pm2 save
//
// O servidor standalone (gerado por `next build` com output: 'standalone')
// fica em .next/standalone/server.js e respeita PORT e HOSTNAME.
//
// IMPORTANTE: o servidor standalone do Next NÃO carrega o .env sozinho.
// Por isso usamos `node_args: '--env-file=.env'` — o Node carrega o .env da raiz
// do projeto (DATABASE_URL, NEXTAUTH_SECRET, ASAAS_*, EMAIL_*, etc.) de forma
// literal (chaves com '$', como a do Asaas, não precisam ser escapadas).

module.exports = {
  apps: [
    {
      name: 'catalogo-digital',
      // Ajuste o cwd para o diretório onde você fez o deploy:
      cwd: '/var/www/catalogo-digital',
      script: '.next/standalone/server.js',
      node_args: '--env-file=.env',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        // Next escuta nesta porta/host; o Nginx faz proxy reverso para cá.
        PORT: 3005,
        HOSTNAME: '127.0.0.1',
      },
    },
  ],
}
