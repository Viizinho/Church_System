import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function Dashboard() {
  const { token } = useAuth()
  const [resumo, setResumo] = useState<any>(null)

  useEffect(() => {
    fetch(`${API_URL}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setResumo)
  }, [token])

  if (!resumo) return <p>Carregando...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card titulo="Membros ativos" valor={resumo.membros.total} />
        <Card titulo="Contribuições pendentes" valor={resumo.contribuicoesPendentes} />
        <Card titulo="Doações pendentes" valor={resumo.doacoesPendentes} />
        <Card titulo="Alertas de manutenção" valor={resumo.manutencao.alertas} />
      </div>
    </div>
  )
}

function Card({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="text-2xl font-bold text-slate-800">{valor}</p>
    </div>
  )
}
