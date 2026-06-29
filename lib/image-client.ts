// Processamento de imagem NO NAVEGADOR (antes do upload): recorte quadrado +
// redimensionamento + compressão. Roda só no cliente (usa canvas).

type Mode = 'cover' | 'contain'

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      // fallback abaixo
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function rect(w: number, h: number, size: number, mode: Mode) {
  if (mode === 'cover') {
    // recorta o centro num quadrado e preenche todo o canvas
    const s = Math.min(w, h)
    return { sx: (w - s) / 2, sy: (h - s) / 2, sw: s, sh: s, dx: 0, dy: 0, dw: size, dh: size }
  }
  // contain: encaixa a imagem inteira no quadrado (com "sobra" transparente)
  const scale = Math.min(size / w, size / h)
  const dw = w * scale
  const dh = h * scale
  return { sx: 0, sy: 0, sw: w, sh: h, dx: (size - dw) / 2, dy: (size - dh) / 2, dw, dh }
}

/**
 * Gera um quadrado (size×size) a partir do arquivo.
 * - mode 'cover': recorta o centro (ideal p/ foto de produto).
 * - mode 'contain': encaixa inteiro com fundo transparente (ideal p/ logo).
 * type 'image/webp' preserva transparência; 'image/jpeg' usa fundo branco.
 */
export async function processSquareImage(
  file: File,
  opts: { size: number; mode: Mode; type?: 'image/jpeg' | 'image/webp'; quality?: number },
): Promise<File> {
  const size = opts.size
  const type = opts.type ?? 'image/jpeg'
  const quality = opts.quality ?? 0.82

  const bmp = await loadBitmap(file)
  const w = bmp.width
  const h = bmp.height

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')

  if (type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff' // JPEG não tem transparência
    ctx.fillRect(0, 0, size, size)
  }

  const r = rect(w, h, size, opts.mode)
  ctx.drawImage(bmp as CanvasImageSource, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh)
  if ('close' in bmp && typeof bmp.close === 'function') bmp.close()

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality))
  if (!blob) throw new Error('Falha ao processar a imagem')

  const ext = type === 'image/webp' ? 'webp' : 'jpg'
  const base = (file.name.replace(/\.[^.]+$/, '') || 'imagem').slice(0, 40)
  return new File([blob], `${base}.${ext}`, { type })
}
