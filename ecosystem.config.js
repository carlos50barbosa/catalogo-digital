// Configuração do PM2 para rodar o app em produção numa VPS (DEPLOY ATÔMICO).
// Uso:  pm2 start ecosystem.config.js  &&  pm2 save
//
// O `script` aponta para o symlink `current` (gerenciado pelo deploy.sh), que
// aponta para a RELEASE ativa. Isso permite trocar de versão sem o processo
// antigo tropeçar em chunks que o `next build` regeneraria por baixo dele.
//
// `cwd` continua na raiz do projeto SÓ para o Node resolver `--env-file=.env`
// (o Node lê o .env no startup, antes do server.js dar chdir para a release).
// O servidor standalone do Next NÃO carrega o .env sozinho — daí o --env-file
// (lê de forma literal; chaves com '$', como a do Asaas, não precisam escapar).
//
// ATENÇÃO: como o app roda a partir da pasta de release, o UPLOAD_DIR no .env
// PRECISA ser um caminho ABSOLUTO (ex.: /var/www/catalogo/uploads).

module.exports = {
  apps: [
    {
      name: 'catalogo-digital',
      cwd: '/var/www/catalogo-digital', // onde está o .env (e o git)
      script: '/var/www/catalogo-current/server.js', // symlink -> release ativa
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
