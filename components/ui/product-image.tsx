import Image from 'next/image'
import { ShoppingBasket } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Imagem de produto com fallback.
 * - Imagens reais (enviadas pelo dono, em /uploads) usam next/image otimizado.
 * - Sem imagem real (ou placeholder da biblioteca) mostramos um ícone neutro.
 *   As imagens reais da biblioteca serão adicionadas depois.
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes,
  iconClassName,
}: {
  src: string | null
  alt: string
  className?: string
  sizes?: string
  iconClassName?: string
}) {
  const isReal = !!src && src.startsWith('/uploads')
  return (
    <div className={cn('relative overflow-hidden bg-neutral-100', className)}>
      {isReal ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 640px) 45vw, 220px'}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-300">
          <ShoppingBasket className={cn('h-10 w-10', iconClassName)} aria-hidden />
        </div>
      )}
    </div>
  )
}
