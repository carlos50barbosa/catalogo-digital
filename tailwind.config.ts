import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Definidas via next/font/google em app/layout.tsx
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-jakarta)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // A cor de destaque vem da loja (accentColor) via CSS variable.
        // Permite que cada loja "pareça sua" mantendo a base de design consistente.
        accent: {
          DEFAULT: 'var(--accent)',
          fg: 'var(--accent-fg)',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.08)',
        sheet: '0 -4px 24px rgba(16,24,40,0.12)',
      },
    },
  },
  plugins: [],
}

export default config
