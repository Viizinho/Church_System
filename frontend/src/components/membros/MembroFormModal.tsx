import { useEffect, useState } from 'react'
import { Check, CameraOff } from 'lucide-react'
import api from '@/services/api'
import type { Membro, Cargo, Categoria, ConjuntoMusical } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { mascararTelefone, limparTelefone } from '@/utils/mascaraTelefone'
import { paraInputData } from '@/utils/data'

const formVazio = {
  nomeCompleto: '',
  dataNascimento: '',
  telefone: '',
  email: '',
  endereco: '',
  status: 'ATIVO' as 'ATIVO' | 'INATIVO',
  cargoIds: [] as string[],
  categoriaIds: [] as string[],
  conjuntoIds: [] as string[],
  naoQuerImagemGravada: false,
}

type Tom = 'primary' | 'blue' | 'amber'
const tons: Record<Tom, string> = {
  primary: 'border-primary-500 bg-primary-50 text-primary-600',
  blue: 'border-blue-500 bg-blue-50 text-blue-700',
  amber: 'border-amber-500 bg-amber-50 text-amber-800',
}

/** Opção marcável (check) usada para cargos, categorias e conjuntos */
function Opcao({ ativo, tom, onClick, children }: { ativo: boolean; tom: Tom; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300
        ${ativo ? `${tons[tom]} font-medium` : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
    >
      <span
        aria-hidden
        className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center ${ativo ? 'border-current bg-current' : 'border-gray-300'}`}
      >
        {ativo && <Check size={10} strokeWidth={3.5} className="text-white" />}
      </span>
      {children}
    </button>
  )
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        {descricao && <p className="text-xs text-gray-500 mt-0.5">{descricao}</p>}
      </div>
      {children}
    </section>
  )
}

interface Props {
  open: boolean
  editing: Membro | null
  cargos: Cargo[]
  categorias: Categoria[]
  conjuntos: ConjuntoMusical[]
  onClose: () => void
  onSaved: () => void
}

export default function MembroFormModal({ open, editing, cargos, categorias, conjuntos, onClose, onSaved }: Props) {
  const [form, setForm] = useState(formVazio)
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErro('')
    setForm(
      editing
        ? {
            nomeCompleto: editing.nomeCompleto,
            dataNascimento: editing.dataNascimento ? paraInputData(editing.dataNascimento) : '',
            telefone: editing.telefone ? mascararTelefone(editing.telefone) : '',
            email: editing.email ?? '',
            endereco: editing.endereco ?? '',
            status: editing.status,
            cargoIds: editing.cargos.map((c) => c.cargoId),
            categoriaIds: editing.categorias.map((c) => c.categoriaId),
            conjuntoIds: editing.conjuntos.map((c) => c.conjuntoId),
            naoQuerImagemGravada: editing.naoQuerImagemGravada ?? false,
          }
        : formVazio
    )
  }, [open, editing])

  function alternar(campo: 'cargoIds' | 'categoriaIds' | 'conjuntoIds', id: string) {
    setForm((f) => ({ ...f, [campo]: f[campo].includes(id) ? f[campo].filter((v) => v !== id) : [...f[campo], id] }))
  }

  async function salvar() {
    if (form.nomeCompleto.trim().length < 2) {
      setErro('Informe o nome completo.')
      return
    }
    setErro('')
    setSaving(true)
    const payload = {
      ...form,
      nomeCompleto: form.nomeCompleto.trim(),
      dataNascimento: form.dataNascimento || null,
      telefone: form.telefone ? limparTelefone(form.telefone) : null,
      email: form.email.trim() || null,
      endereco: form.endereco.trim() || null,
    }
    try {
      if (editing) await api.put(`/membros/${editing.id}`, payload)
      else await api.post('/membros', payload)
      onSaved()
    } catch (e) {
      const data = (e as { response?: { data?: { error?: string; detalhes?: string[] } } })?.response?.data
      setErro(data?.detalhes?.[0] ?? data?.error ?? 'Não foi possível salvar o membro. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // Categorias agrupadas (EBD, Louvor, Mídia...)
  const gruposCategoria = categorias.reduce<{ nome: string | null; itens: Categoria[] }[]>((acc, c) => {
    const nome = c.grupo ?? null
    const g = acc.find((x) => x.nome === nome)
    if (g) g.itens.push(c)
    else acc.push({ nome, itens: [c] })
    return acc
  }, [])

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar membro' : 'Novo membro'} width="max-w-2xl">
      <div className="space-y-6">
        <Secao titulo="Dados pessoais">
          <Input label="Nome completo *" value={form.nomeCompleto} onChange={(e) => setForm((f) => ({ ...f, nomeCompleto: e.target.value }))} autoFocus />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Data de nascimento" type="date" value={form.dataNascimento} onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))} />
            <Input
              label="Telefone"
              inputMode="numeric"
              placeholder="(83) 99999-0001"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: mascararTelefone(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Endereço" value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Situação</p>
            <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
              {(['ATIVO', 'INATIVO'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={form.status === s}
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`px-4 py-1 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                    form.status === s ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s === 'ATIVO' ? 'Ativo' : 'Inativo'}
                </button>
              ))}
            </div>
          </div>
        </Secao>

        <Secao titulo="Na igreja" descricao="Marque tudo o que se aplica.">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Cargos</p>
            <div className="flex flex-wrap gap-2">
              {cargos.map((c) => (
                <Opcao key={c.id} ativo={form.cargoIds.includes(c.id)} tom="primary" onClick={() => alternar('cargoIds', c.id)}>{c.nome}</Opcao>
              ))}
              {cargos.length === 0 && <p className="text-sm text-gray-400">Nenhum cargo cadastrado.</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Categorias</p>
            <div className="space-y-2.5">
              {gruposCategoria.map((g) => (
                <div key={g.nome ?? 'sem-grupo'}>
                  {g.nome && <p className="text-xs text-gray-400 mb-1">{g.nome}</p>}
                  <div className="flex flex-wrap gap-2">
                    {g.itens.map((c) => (
                      <Opcao key={c.id} ativo={form.categoriaIds.includes(c.id)} tom="blue" onClick={() => alternar('categoriaIds', c.id)}>{c.nome}</Opcao>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Conjuntos musicais</p>
            <div className="flex flex-wrap gap-2">
              {conjuntos.map((c) => (
                <Opcao key={c.id} ativo={form.conjuntoIds.includes(c.id)} tom="amber" onClick={() => alternar('conjuntoIds', c.id)}>{c.nome}</Opcao>
              ))}
            </div>
          </div>
        </Secao>

        <Secao titulo="Imagem">
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 cursor-pointer hover:border-gray-300 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50">
            <input
              type="checkbox"
              checked={form.naoQuerImagemGravada}
              onChange={(e) => setForm((f) => ({ ...f, naoQuerImagemGravada: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary-500"
            />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium text-gray-900">
                <CameraOff size={14} aria-hidden /> Não quer ter a imagem gravada
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Opcional. Marque se a pessoa não quer ser fotografada ou filmada em cultos e eventos.
              </span>
            </span>
          </label>
        </Secao>

        {erro && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} loading={saving}>{editing ? 'Salvar alterações' : 'Cadastrar membro'}</Button>
        </div>
      </div>
    </Modal>
  )
}
