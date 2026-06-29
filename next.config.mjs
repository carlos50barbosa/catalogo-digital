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
    // Uploads são servidos pela mesma origem (via Nginx em produção, via rota /api/uploads em dev),
    // então não precisamos liberar domínios remotos no MVP.
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
