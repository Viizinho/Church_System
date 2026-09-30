import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { InputTelefone } from '../../../components/InputTelefone'
import { limparTelefone } from '../../../utils/mascaraTelefone'

interface OpcaoSimples {
  id: string
  nome: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function MembroForm() {
  const { id } = useParams()
  const editando = Boolean(id)
  const { token } = useAuth()
  const navigate = useNavigate()

  const [nomeCompleto, setNomeCompleto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cargos, setCargos] = useState<OpcaoSimples[]>([])
  const [categorias, setCategorias] = useState<OpcaoSimples[]>([])
  const [conjuntos, setConjuntos] = useState<OpcaoSimples[]>([])
  const [cargoIds, setCargoIds] = useState<string[]>([])
  const [categoriaIds, setCategoriaIds] = useState<string[]>([])
  const [conjuntoIds, setConjuntoIds] = useState<string[]>([])
  const [consentimentoImagem, setConsentimentoImagem] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` }
    fetch(`${API_URL}/cargos`, { headers }).then((r) => r.json()).then(setCargos)
    fetch(`${API_URL}/membros/categorias`, { headers }).then((r) => r.json()).then(setCategorias)
    fetch(`${API_URL}/membros/conjuntos`, { headers }).then((r) => r.json()).then(setConjuntos)
  }, [token])

  useEffect(() => {
    if (!editando) return
    fetch(`${API_URL}/membros/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((m) => {
        setNomeCompleto(m.nomeCompleto)
        setTelefone(m.telefone ?? '')
        setEmail(m.email ?? '')
        setCargoIds(m.cargos.map((c: any) => c.cargo.id))
        setCategoriaIds(m.categorias.map((c: any) => c.categoria.id))
        setConjuntoIds(m.conjuntos.map((c: any) => c.conjunto.id))
        setConsentimentoImagem(m.consentimentoImagem)
      })
  }, [editando, id, token])

  function alternarSelecao(lista: string[], setLista: (v: string[]) => void, valor: string) {
    setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!consentimentoImagem) {
      setErro('É necessário marcar o Consenso de Uso da Imagem para cadastrar o membro.')
      return
    }

    setSalvando(true)
    try {
      const payload = {
        nomeCompleto,
        telefone: telefone ? limparTelefone(telefone) : null,
        email: email || null,
        cargoIds,
        categoriaIds,
        conjuntoIds,
        consentimentoImagem,
        status: 'ATIVO',
      }

      const resp = await fetch(`${API_URL}/membros${editando ? `/${id}` : ''}`, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error ?? 'Erro ao salvar membro.')
      }

      navigate('/admin/membros')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{editando ? 'Editar membro' : 'Novo membro'}</h1>

      <div>
        <label className="block text-sm font-medium mb-1">Nome completo</label>
        <input
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          required
          minLength={2}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Telefone</label>
          <InputTelefone value={telefone} onChange={setTelefone} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium mb-2">Cargos</legend>
        <div className="flex flex-wrap gap-2">
          {cargos.map((c) => (
            <label key={c.id} className="flex items-center gap-1 border rounded px-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={cargoIds.includes(c.id)}
                onChange={() => alternarSelecao(cargoIds, setCargoIds, c.id)}
              />
              {c.nome}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium mb-2">Categorias (Professor EBD, Músico, Mídia...)</legend>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <label key={c.id} className="flex items-center gap-1 border rounded px-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={categoriaIds.includes(c.id)}
                onChange={() => alternarSelecao(categoriaIds, setCategoriaIds, c.id)}
              />
              {c.nome}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium mb-2">Conjuntos musicais</legend>
        <div className="flex flex-wrap gap-2">
          {conjuntos.map((c) => (
            <label key={c.id} className="flex items-center gap-1 border rounded px-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={conjuntoIds.includes(c.id)}
                onChange={() => alternarSelecao(conjuntoIds, setConjuntoIds, c.id)}
              />
              {c.nome}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
        <input
          type="checkbox"
          checked={consentimentoImagem}
          onChange={(e) => setConsentimentoImagem(e.target.checked)}
          className="mt-1"
        />
        <span>
          Autorizo o uso da minha imagem (fotos e vídeos) em materiais e redes sociais da igreja.
          <strong> Este consentimento é obrigatório para o cadastro.</strong>
        </span>
      </label>

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      <button
        type="submit"
        disabled={salvando}
        className="bg-blue-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Salvar membro'}
      </button>
    </form>
  )
}
