// Configuração do PM2 para rodar o app em produção numa VPS.
// Uso:  pm2 start ecosystem.config.js  &&  pm2 save
//
// O servidor standalone (gerado por `next build` com output: 'standalone')
// fica em .next/standalone/server.js e respeita PORT e HOSTNAME.
// As demais variáveis (DATABASE_URL, NEXTAUTH_SECRET, etc.) são lidas do
// arquivo .env na raiz do projeto (carregado automaticamente pelo Next).

module.exports = {
  apps: [
    {
      name: 'catalogo-digital',
      // Ajuste o cwd para o diretório onde você fez o deploy:
      cwd: '/var/www/catalogo-digital',
      script: '.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        // Next escuta nesta porta/host; o Nginx faz proxy reverso para cá.
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
    },
  ],
}
