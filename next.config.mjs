/** @type {import('next').NextConfig} */
const nextConfig = {
  // Saída standalone: gera um servidor Node auto-contido em .next/standalone,
  // ideal para rodar atrás de Nginx + PM2 numa VPS (sem nada específico da Vercel).
  output: 'standalone',

  experimental: {
    // O XML da NF-e (e o payload de confirmação) trafega como corpo de Server Action.
    // O default é 1MB; abrimos folga para notas grandes (validamos 4MB no servidor).
    serverActions: { bodySizeLimit: '4mb' },
  },

  images: {
    // Uploads (logos/fotos) ficam FORA de /public e são servidos direto pelo Nginx em
    // produção (/uploads/...). As imagens já são comprimidas no cliente (~1000px), então o
    // otimizador do next/image é redundante aqui — e o round-trip dele (o servidor standalone
    // buscando a própria imagem de volta atrás do Nginx) é frágil e deixava a foto "quebrada"
    // (ícone de "?") no celular. Com unoptimized, o <img> aponta para /uploads/... e o Nginx
    // serve direto (o caminho rápido pretendido no README).
    unoptimized: true,
    remotePatterns: [],
  },

  async rewrites() {
    return [
      // Arquivos enviados em runtime ficam fora de /public (UPLOAD_DIR).
      // Em dev, a rota /api/uploads os serve. Em produção, o Nginx serve /uploads/ direto
      // (esta regra continua como fallback caso a requisição chegue ao Next).
      { source: '/uploads/:path*', destination: '/api/uploads/:path*' },
    ]
  },
}

export default nextConfig
