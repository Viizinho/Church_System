import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Church, Lock, MapPin } from 'lucide-react'
import api from '@/services/api'
import { IGREJA, REDES_FALLBACK } from '@/config/igreja'
import MenuDrawer from '@/components/public/MenuDrawer'
import EventosPublicosSection from '@/components/public/EventosPublicosSection'
import RedesSociaisSection from '@/components/public/RedesSociaisSection'
import CampanhaPublicaPage from './CampanhaPublicaPage'
import MaoAmigaPublicaPage from './MaoAmigaPublicaPage'

interface ConfiguracaoIgreja {
  sobre: string | null
  endereco: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  whatsappContato: string | null
}

function Secao({
  id,
  titulo,
  subtitulo,
  fundo = 'bg-white',
  children,
}: {
  id: string
  titulo: string
  subtitulo?: string
  fundo?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={`scroll-mt-16 px-4 py-14 ${fundo}`}>
      <div className="text-center mb-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900">{titulo}</h2>
        {subtitulo && <p className="mt-2 text-sm text-gray-500">{subtitulo}</p>}
      </div>
      {children}
    </section>
  )
}

export default function LandingPage() {
  const [config, setConfig] = useState<ConfiguracaoIgreja | null>(null)

  useEffect(() => {
    api
      .get('/publico/config')
      .then((r) => setConfig(r.data))
      .catch(() => setConfig(null))
  }, [])

  // Valores cadastrados no sistema têm prioridade; senão usa o plano B de config/igreja.ts
  const redes = {
    instagramUrl: config?.instagramUrl || REDES_FALLBACK.instagramUrl,
    facebookUrl: config?.facebookUrl || REDES_FALLBACK.facebookUrl,
    youtubeUrl: REDES_FALLBACK.youtubeUrl,
    whatsappContato: config?.whatsappContato || REDES_FALLBACK.whatsappContato,
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur flex items-center justify-between px-4 md:px-8 h-16 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <Church className="text-primary-500 flex-shrink-0" size={26} />
          <span className="font-semibold text-gray-900 text-sm md:text-base truncate">
            {IGREJA.nome} — {IGREJA.complemento}
          </span>
        </Link>
        <MenuDrawer />
      </header>

      <section className="px-4 py-16 md:py-24 text-center bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <h1 className="text-3xl md:text-5xl font-bold">Bem-vindo(a) à nossa igreja</h1>
        <p className="mt-4 max-w-2xl mx-auto text-primary-100">
          {config?.sobre ?? 'Uma comunidade de fé, acolhimento e serviço.'}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#mao-amiga" className="px-6 py-3 rounded-xl bg-white text-primary-700 font-semibold hover:bg-primary-50 transition-colors">
            Doar no Projeto Mão Amiga
          </a>
          <a href="#campanha" className="px-6 py-3 rounded-xl border border-white/60 text-white font-semibold hover:bg-white/10 transition-colors">
            Contribuir com a Campanha
          </a>
        </div>
      </section>

      <Secao
        id="redes-sociais"
        titulo="Siga a nossa igreja"
        subtitulo="Acompanhe avisos, cultos e novidades pelas nossas redes."
        fundo="bg-gray-50"
      >
        <RedesSociaisSection redes={redes} />
      </Secao>

      <Secao id="eventos" titulo="Programação" subtitulo="Próximos cultos, reuniões e eventos especiais.">
        <EventosPublicosSection />
      </Secao>

      <Secao
        id="campanha"
        titulo="Campanha Jardim Cidade Universitária"
        subtitulo="Cada contribuição ajuda a equipar nossa igreja. Escolha um item e colabore com o valor que puder."
        fundo="bg-gray-50"
      >
        <CampanhaPublicaPage embedded />
      </Secao>

      <Secao
        id="mao-amiga"
        titulo="Projeto Mão Amiga"
        subtitulo="Ajudamos famílias em situação de vulnerabilidade com doações de alimentos."
      >
        <MaoAmigaPublicaPage embedded />
      </Secao>

      <footer id="contato" className="px-4 py-10 bg-gray-900 text-gray-300 text-sm text-center">
        <p className="font-semibold text-white">
          {IGREJA.nome} — {IGREJA.complemento}
        </p>
        {(config?.endereco || IGREJA.cidade) && (
          <p className="mt-1 inline-flex items-center gap-1">
            <MapPin size={14} /> {config?.endereco ?? IGREJA.cidade}
          </p>
        )}
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <Lock size={14} /> Login ADM
          </Link>
        </div>
      </footer>
    </div>
  )
}
