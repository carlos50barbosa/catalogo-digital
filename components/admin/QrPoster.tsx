'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Download, Printer, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function QrPoster({
  url,
  storeName,
  logoUrl,
}: {
  url: string
  storeName: string
  logoUrl: string | null
}) {
  const [qr, setQr] = useState<string>('')

  useEffect(() => {
    // Correção de erro alta (H) para suportar logo no centro sem quebrar a leitura.
    QRCode.toDataURL(url, { errorCorrectionLevel: 'H', width: 600, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [url])

  async function downloadPng() {
    if (!qr) return
    const size = 600
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    const qrImg = await loadImage(qr)
    ctx.drawImage(qrImg, 0, 0, size, size)

    // logo no centro (opcional, com fundo branco para não atrapalhar a leitura)
    if (logoUrl) {
      try {
        const logo = await loadImage(logoUrl)
        const box = size * 0.2
        const pad = box * 0.12
        const x = (size - box) / 2
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x - pad, x - pad, box + pad * 2, box + pad * 2)
        ctx.drawImage(logo, x, x, box, box)
      } catch {
        // logo falhou: mantém só o QR
      }
    }

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'qrcode-loja.png'
    link.click()
  }

  return (
    <div className="space-y-4">
      {/* Cartaz (área de impressão) */}
      <div className="print-area mx-auto max-w-sm">
        <div className="rounded-3xl border-2 border-accent bg-white p-8 text-center shadow-card">
          {logoUrl && (
            <div className="relative mx-auto mb-3 h-16 w-16 overflow-hidden rounded-2xl">
              <Image src={logoUrl} alt={storeName} fill className="object-cover" sizes="64px" />
            </div>
          )}
          <h2 className="font-display text-2xl font-bold text-neutral-900">{storeName}</h2>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-accent">
            <Smartphone className="h-4 w-4" /> Faça seu pedido pelo celular
          </p>

          <div className="mx-auto mt-5 w-full max-w-[260px]">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR Code da loja" className="h-auto w-full rounded-xl" />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-xl bg-neutral-100" />
            )}
          </div>

          <p className="mt-4 text-xs text-neutral-500">Aponte a câmera do celular para o código</p>
          <p className="mt-1 break-all font-mono text-[11px] text-neutral-400">{url}</p>
        </div>
      </div>

      {/* Ações (não imprimem) */}
      <div className="no-print flex flex-wrap justify-center gap-2">
        <Button onClick={downloadPng} disabled={!qr}>
          <Download className="h-4 w-4" /> Baixar PNG
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>
    </div>
  )
}
