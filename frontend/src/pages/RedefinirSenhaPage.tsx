import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import api, { mensagemDeErro } from '@/services/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import TelaAcesso from '@/components/ui/TelaAcesso'

export default function RedefinirSenhaPage() {
  usePageTitle('Redefinir senha')
  const navigate = useNavigate()
  // Lido uma única vez, antes de qualquer efeito limpar o endereço (o React executa efeitos 2x em desenvolvimento).
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [pronto, setPronto] = useState(false)

  // O token vem no fragmento da URL (#token=...). Guarda em memória e tira do endereço,
  // para não ficar no histórico do navegador nem em capturas de tela/compartilhamentos.
  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname)
  }, [token])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha !== confirmacao) return setErro('As senhas não conferem.')
    setLoading(true)
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha: senha })
      setPronto(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setLoading(false)
    }
  }

  if (pronto) {
    return (
      <TelaAcesso titulo="Senha alterada">
        <div className="text-center space-y-4" role="status">
          <CheckCircle2 className="mx-auto text-green-600" size={40} />
          <p className="text-sm text-gray-700">Pronto! Entre com a nova senha. Todas as sessões abertas foram encerradas.</p>
          <Link to="/login" className="inline-block text-sm font-medium text-primary-600 hover:underline">Ir para o login</Link>
        </div>
      </TelaAcesso>
    )
  }

  if (!token) {
    return (
      <TelaAcesso titulo="Link inválido">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-700">Este link está incompleto ou já foi usado. Peça um novo link de recuperação.</p>
          <Link to="/esqueci-senha" className="inline-block text-sm font-medium text-primary-600 hover:underline">Pedir novo link</Link>
        </div>
      </TelaAcesso>
    )
  }

  return (
    <TelaAcesso titulo="Nova senha" subtitulo="Mínimo de 10 caracteres, com letras e números">
      <form onSubmit={enviar} className="space-y-4">
        <Input label="Nova senha" type="password" autoComplete="new-password" minLength={10} value={senha} onChange={(e) => setSenha(e.target.value)} required />
        <Input label="Repita a nova senha" type="password" autoComplete="new-password" minLength={10} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
        {erro && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {erro} {/expirado|inválido/i.test(erro) && <Link to="/esqueci-senha" className="underline font-medium">Pedir novo link</Link>}
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full justify-center">Salvar nova senha</Button>
      </form>
    </TelaAcesso>
  )
}
