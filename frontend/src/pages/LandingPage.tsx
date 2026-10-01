import { useEffect, useState } from 'react'
import api from '@/services/api'
import MenuDrawer from '@/components/public/MenuDrawer'
import EventosPublicosSection from '@/components/public/EventosPublicosSection'
import CampanhaPublicaPage from './CampanhaPublicaPage'
import MaoAmigaPublicaPage from './MaoAmigaPublicaPage'

interface ConfiguracaoIgreja {
  sobre: string | null
  endereco: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  whatsappContato: string | null
}

export default function LandingPage() {
  const [config, setConfig] = useState<ConfiguracaoIgreja | null>(null)

  useEffect(() => {
    api
      .get('/publico/config')
      .then((r) => setConfig(r.data))
      .catch(() => setConfig(null))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⛪</span>
          <span className="font-semibold text-gray-900">Assembleia de Deus — Jardim Cidade Universitária</span>
        </div>
        <MenuDrawer />
      </header>

      <section className="px-6 py-16 text-center bg-gray-50">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900">Bem-vindo(a) à nossa igreja</h1>
        <p className="mt-4 max-w-2xl mx-auto text-gray-600">
          {config?.sobre ?? 'Uma comunidade de fé, acolhimento e serviço.'}
        </p>
      </section>

      <section id="eventos" className="px-6 py-14">
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-900">Programação</h2>
        <EventosPublicosSection />
      </section>

      <section id="campanha">
        <CampanhaPublicaPage />
      </section>

      <section id="mao-amiga">
        <MaoAmigaPublicaPage />
      </section>

      <footer className="px-6 py-10 bg-gray-900 text-gray-300 text-sm text-center">
        {config?.endereco && <p>{config.endereco}</p>}
        <div className="flex justify-center gap-4 mt-3">
          {config?.instagramUrl && (
            <a href={config.instagramUrl} target="_blank" rel="noreferrer">
              Instagram
            </a>
          )}
          {config?.facebookUrl && (
            <a href={config.facebookUrl} target="_blank" rel="noreferrer">
              Facebook
            </a>
          )}
          {config?.whatsappContato && (
            <a href={`https://wa.me/${config.whatsappContato}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
        </div>
      </footer>
    </div>
  )
}
