import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { config } from '@/lib/config'
import { Toaster } from '@/components/ui/toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  // Base para resolver URLs relativas de OG/Twitter (em produção = domínio da loja).
  // Sem isto, o Next usa http://localhost:<porta> e as imagens de compartilhamento saem erradas.
  metadataBase: new URL(config.appUrl),
  title: 'Catálogo Digital',
  description: 'Vitrine digital e pedidos por WhatsApp para mercadinhos de bairro.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
