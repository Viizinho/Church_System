import { useEffect, useState } from 'react'

interface MetaPublica {
  id: string
  nomeItem: string
  unidade: string
  restante: number
  completo: boolean
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function MaoAmigaPublica() {
  const [metas, setMetas] = useState<MetaPublica[]>([])

  useEffect(() => {
    fetch(`${API_URL}/publico/mao-amiga/metas`)
      .then((r) => r.json())
      .then((data) => setMetas(Array.isArray(data) ? data : []))
      .catch(() => setMetas([]))
  }, [])

  return (
    <div>
      <p className="text-slate-600 mb-4">
        Ajude a montar nossas cestas básicas doando os itens que ainda faltam:
      </p>
      <div className="grid md:grid-cols-4 gap-4">
        {metas.map((meta) => (
          <div
            key={meta.id}
            className={`border rounded-lg p-4 text-center ${
              meta.completo ? 'bg-emerald-50 border-emerald-300' : 'bg-white'
            }`}
          >
            <p className="font-medium text-slate-800">{meta.nomeItem}</p>
            {meta.completo ? (
              <p className="text-sm text-emerald-600 mt-1">Meta atingida! 🎉</p>
            ) : (
              <p className="text-sm text-slate-500 mt-1">
                Faltam {meta.restante} {meta.unidade}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
