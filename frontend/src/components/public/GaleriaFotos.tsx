import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface FotoGaleria {
  src: string
  alt: string
  legenda?: string
}

interface Props {
  fotos: FotoGaleria[]
  titulo: string
  texto?: string
  /** Tempo de cada foto, em milissegundos */
  intervalo?: number
}

/**
 * Seção de abertura da página pública: fotos da igreja passando sozinhas (com troca suave),
 * setas, indicadores e gesto de arrastar no celular. A troca automática pausa quando o mouse
 * ou o foco do teclado está sobre a seção e não acontece para quem pediu menos movimento ao sistema.
 */
export default function GaleriaFotos({ fotos, titulo, texto, intervalo = 6000 }: Props) {
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const toqueInicio = useRef<number | null>(null)
  const total = fotos.length

  const irPara = useCallback((i: number) => setAtual(((i % total) + total) % total), [total])
  const proxima = useCallback(() => irPara(atual + 1), [atual, irPara])
  const anterior = useCallback(() => irPara(atual - 1), [atual, irPara])

  useEffect(() => {
    const menosMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (pausado || menosMovimento || total < 2) return
    const id = window.setTimeout(proxima, intervalo)
    return () => window.clearTimeout(id)
  }, [atual, pausado, intervalo, total, proxima])

  function aoTerminarToque(x: number) {
    if (toqueInicio.current === null) return
    const delta = x - toqueInicio.current
    if (Math.abs(delta) > 40) (delta < 0 ? proxima : anterior)()
    toqueInicio.current = null
  }

  if (total === 0) return null
  const legenda = fotos[atual].legenda

  return (
    <section
      id="inicio"
      aria-roledescription="carrossel"
      aria-label="Fotos da igreja"
      className="relative h-[62vh] min-h-[380px] max-h-[680px] overflow-hidden bg-gray-900"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onTouchStart={(e) => (toqueInicio.current = e.touches[0].clientX)}
      onTouchEnd={(e) => aoTerminarToque(e.changedTouches[0].clientX)}
    >
      {fotos.map((foto, i) => (
        <img
          key={foto.src}
          src={foto.src}
          alt={foto.alt}
          aria-hidden={i !== atual}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            i === atual ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Escurece a parte de baixo para o texto ficar legível sobre qualquer foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" aria-hidden />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-14 md:pb-16 text-center text-white">
        <h1 className="text-3xl md:text-5xl font-bold drop-shadow">{titulo}</h1>
        {texto && <p className="mt-3 max-w-2xl mx-auto text-sm md:text-lg text-white/90 drop-shadow">{texto}</p>}
      </div>

      {legenda && (
        <p className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/40 text-white text-xs md:text-sm" aria-live="polite">
          {legenda}
        </p>
      )}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={anterior}
            aria-label="Foto anterior"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={proxima}
            aria-label="Próxima foto"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <ChevronRight size={24} />
          </button>

          <div className="absolute bottom-5 inset-x-0 flex justify-center gap-1">
            {fotos.map((foto, i) => (
              <button
                key={foto.src}
                type="button"
                onClick={() => irPara(i)}
                aria-label={`Ver foto ${i + 1} de ${total}${foto.legenda ? `: ${foto.legenda}` : ''}`}
                aria-current={i === atual}
                className="p-1.5"
              >
                <span
                  className={`block h-2 rounded-full transition-all ${i === atual ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
