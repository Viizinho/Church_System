import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { IGREJA } from '@/config/igreja'

/** Aviso de privacidade (LGPD — Lei nº 13.709/2018) exibido a partir da página inicial. */

const ATUALIZADO_EM = 'novembro de 2026'

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
      <div className="mt-2 space-y-2 text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacidadePage() {
  usePageTitle('Privacidade')
  const igreja = `${IGREJA.nome} ${IGREJA.complemento}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
          <ArrowLeft size={16} aria-hidden /> Voltar à página inicial
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <ShieldCheck className="text-primary-600" size={28} aria-hidden />
          <h1 className="text-2xl font-bold text-gray-900">Aviso de privacidade</h1>
        </div>
        <p className="mt-2 text-sm text-gray-500">Atualizado em {ATUALIZADO_EM}.</p>

        <p className="mt-6 text-gray-700 leading-relaxed">
          Este aviso explica quais dados pessoais o sistema da {igreja} ({IGREJA.cidade}) guarda, para quê, quem
          tem acesso e como você pode exercer seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº
          13.709/2018). A igreja é a responsável pelos dados.
        </p>

        <Secao titulo="Quais dados guardamos">
          <p>
            <strong>Membros:</strong> nome completo, data de nascimento, telefone, e-mail, endereço, foto (opcional),
            cargos, áreas de atuação, conjuntos musicais, situação (ativo ou inativo) e se a pessoa prefere não ter a
            imagem gravada. Esses dados são cadastrados pela secretaria.
          </p>
          <p>
            <strong>Contribuições e doações feitas por esta página:</strong> o nome informado, o valor ou o item doado,
            a data e, se você enviar, o link do comprovante. Não pedimos CPF, dados bancários nem senha.
          </p>
        </Secao>

        <Secao titulo="Para que usamos">
          <p>
            Para a organização interna da igreja: manter o cadastro de membros, lembrar aniversários, montar escalas e
            programação, conferir e agradecer as contribuições e doações e prestar contas da campanha e do Projeto Mão
            Amiga. Os dados não são usados para propaganda.
          </p>
        </Secao>

        <Secao titulo="Quem tem acesso">
          <p>
            Apenas a liderança autorizada, com usuário e senha pessoais. Como o cadastro revela o vínculo de cada pessoa
            com a igreja, o que a LGPD considera dado sensível (convicção religiosa), o acesso é restrito e não
            vendemos nem compartilhamos esses dados.
          </p>
          <p>
            O sistema funciona em serviços contratados para hospedagem e envio de e-mails, que apenas armazenam ou
            transmitem as informações em nome da igreja.
          </p>
          <p>
            Na página pública aparecem somente informações da igreja, a programação e o total arrecadado de cada item.
            O nome de quem contribuiu não é exibido ao público.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo">
          <p>
            Os dados de membros ficam guardados enquanto a pessoa fizer parte da igreja ou até ela pedir a exclusão. Os
            registros de contribuições e doações ficam pelo tempo necessário à prestação de contas.
          </p>
        </Secao>

        <Secao titulo="Segurança">
          <p>
            O acesso é feito por conexão criptografada (HTTPS), as senhas são guardadas de forma irreversível e há limite
            de tentativas de login. O sistema não usa cookies de rastreamento nem ferramentas de publicidade.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            Você pode pedir, a qualquer momento, para confirmar se temos dados seus, ver quais são, corrigi-los, pedir que
            sejam apagados ou retirar uma autorização que tenha dado (art. 18 da LGPD). Para isso, fale com a secretaria
            da igreja pessoalmente ou pelos contatos oficiais da página inicial.
          </p>
        </Secao>
      </div>
    </div>
  )
}
