import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import api, { mensagemDeErro } from '@/services/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import TelaAcesso from '@/components/ui/TelaAcesso'

export default function EsqueciSenhaPage() {
  usePageTitle('Esqueci minha senha')
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await api.post('/auth/esqueci-senha', { email })
      setEnviado(true)
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <TelaAcesso titulo="Esqueci minha senha" subtitulo="Enviaremos um link para o seu e-mail">
      {enviado ? (
        <div className="text-center space-y-4" role="status">
          <MailCheck className="mx-auto text-primary-500" size={40} />
          <p className="text-sm text-gray-700">
            Se o e-mail <strong className="break-all">{email}</strong> estiver cadastrado, você receberá um link para criar uma nova senha. Ele vale por 30 minutos.
          </p>
          <p className="text-xs text-gray-500">Não chegou? Veja a caixa de spam ou aguarde 2 minutos e peça de novo.</p>
          <Link to="/login" className="inline-block text-sm font-medium text-primary-600 hover:underline">Voltar ao login</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <Input label="E-mail da conta" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@igreja.com" required />
          {erro && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <Button type="submit" loading={loading} className="w-full justify-center">Enviar link</Button>
        </form>
      )}
    </TelaAcesso>
  )
}
