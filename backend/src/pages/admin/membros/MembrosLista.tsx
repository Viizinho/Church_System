import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

interface Cargo {
  id: string
  nome: string
}
interface Categoria {
  id: string
  nome: string
  grupo: string | null
}
interface Membro {
  id: string
  nomeCompleto: string
  telefone: string | null
  status: 'ATIVO' | 'INATIVO'
  cargos: { cargo: Cargo }[]
  categorias: { categoria: Categoria }[]
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function MembrosLista() {
  const { token } = useAuth()
  const [membros, setMembros] = useState<Membro[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` }
    fetch(`${API_URL}/cargos`, { headers }).then((r) => r.json()).then(setCargos)
    fetch(`${API_URL}/membros/categorias`, { headers }).then((r) => r.json()).then(setCategorias)
  }, [token])

  useEffect(() => {
    const params = new URLSearchParams()
    if (busca) params.set('busca', busca)
    if (filtroCargo) params.set('cargoId', filtroCargo)
    if (filtroCategoria) params.set('categoriaId', filtroCategoria)

    fetch(`${API_URL}/membros?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setMembros)
  }, [token, busca, filtroCargo, filtroCategoria])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Membros</h1>
        <Link to="/admin/membros/novo" className="bg-blue-600 text-white px-4 py-2 rounded">
          Novo membro
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          placeholder="Buscar por nome, e-mail ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border rounded px-3 py-2 flex-1 min-w-[220px]"
        />

        <select value={filtroCargo} onChange={(e) => setFiltroCargo(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Todos os cargos</option>
          {cargos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full text-sm bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Telefone</th>
            <th className="p-3">Cargos</th>
            <th className="p-3">Categorias</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {membros.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="p-3">
                <Link to={`/admin/membros/${m.id}`} className="text-blue-700">
                  {m.nomeCompleto}
                </Link>
              </td>
              <td className="p-3">{m.telefone ?? '—'}</td>
              <td className="p-3">{m.cargos.map((c) => c.cargo.nome).join(', ') || '—'}</td>
              <td className="p-3">{m.categorias.map((c) => c.categoria.nome).join(', ') || '—'}</td>
              <td className="p-3">{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
