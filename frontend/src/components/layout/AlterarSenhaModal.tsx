import { FormEvent, useState } from 'react'
import api, { mensagemDeErro } from '@/services/api'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function AlterarSenhaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [saving, setSaving] = useState(false)

  function fechar() {
    setAtual(''); setNova(''); setConfirma(''); setErro(''); setOk(false)
    onClose()
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (nova !== confirma) return setErro('A confirmação não confere com a nova senha.')
    setSaving(true)
    try {
      await api.put('/auth/senha', { senhaAtual: atual, novaSenha: nova })
      setOk(true)
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível alterar a senha.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={fechar} title="Alterar senha" width="max-w-sm">
      {ok ? (
        <div className="space-y-4 text-sm text-gray-700">
          <p className="bg-green-50 text-green-800 rounded-lg px-3 py-2">Senha alterada com sucesso.</p>
          <div className="flex justify-end"><Button onClick={fechar}>Fechar</Button></div>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Senha atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} required />
          <Input label="Nova senha" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} required minLength={10} />
          <p className="text-xs text-gray-500 -mt-1">Mínimo de 10 caracteres, com letras e números.</p>
          <Input label="Repita a nova senha" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required />
          {erro && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={fechar}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
