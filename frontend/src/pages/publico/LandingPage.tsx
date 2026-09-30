import { useEffect, useState } from 'react'
import { MenuDrawer } from '../../components/MenuDrawer'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { EventosPublicos } from './EventosPublicos'
import { CampanhaPublica } from './CampanhaPublica'
import { MaoAmigaPublica } from './MaoAmigaPublica'

interface Configuracao {
  sobre: string | null
  endereco: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  whatsappContato: string | null
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function LandingPage() {
  const [config, setConfig] = useState<Configuracao | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/publico/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-bold text-lg text-slate-800">Assembleia de Deus — Jardim Cidade Universitária</span>
        <MenuDrawer />
      </header>

      <section className="px-6 py-16 text-center bg-slate-50">
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900">Bem-vindo(a) à nossa igreja</h1>
        <p className="mt-4 max-w-2xl mx-auto text-slate-600">
          {config?.sobre ?? 'Uma comunidade de fé, acolhimento e serviço.'}
        </p>
      </section>

      <section id="eventos" className="px-6 py-12">
        <h2 className="text-2xl font-semibold mb-6">Programação</h2>
        <ErrorBoundary fallbackTitulo="Não foi possível carregar os eventos.">
          <EventosPublicos />
        </ErrorBoundary>
      </section>

      <section id="campanha" className="px-6 py-12 bg-slate-50">
        <h2 className="text-2xl font-semibold mb-6">Campanha Jardim Cidade Universitária</h2>
        <ErrorBoundary fallbackTitulo="Não foi possível carregar a campanha.">
          <CampanhaPublica />
        </ErrorBoundary>
      </section>

      <section id="mao-amiga" className="px-6 py-12">
        <h2 className="text-2xl font-semibold mb-6">Projeto Mão Amiga</h2>
        <ErrorBoundary fallbackTitulo="Não foi possível carregar o Mão Amiga.">
          <MaoAmigaPublica />
        </ErrorBoundary>
      </section>

      <footer id="contato" className="px-6 py-10 bg-slate-900 text-slate-300 text-sm">
        <p>{config?.endereco ?? ''}</p>
        <div className="flex gap-4 mt-3">
          {config?.instagramUrl && <a href={config.instagramUrl}>Instagram</a>}
          {config?.facebookUrl && <a href={config.facebookUrl}>Facebook</a>}
          {config?.whatsappContato && <a href={`https://wa.me/${config.whatsappContato}`}>WhatsApp</a>}
        </div>
      </footer>
    </div>
  )
}
