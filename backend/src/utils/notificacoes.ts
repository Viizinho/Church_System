import nodemailer, { Transporter } from 'nodemailer'
import axios from 'axios'

// ─── E-mail ────────────────────────────────────────────────────────────────
// Dois jeitos de enviar, escolhidos pelas variáveis de ambiente:
//  1. API HTTPS da Brevo (BREVO_API_KEY + EMAIL_FROM) — funciona em hospedagens que bloqueiam
//     SMTP, como o plano Hobby do Railway (portas 25/465/587/2525 fechadas).
//  2. SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
// Sem nenhum dos dois, em desenvolvimento só escreve no console (não quebra o cron).

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

/** Há algum meio real de envio configurado (API ou SMTP)? */
export function emailConfigurado(): boolean {
  return Boolean(process.env.BREVO_API_KEY || process.env.SMTP_HOST)
}

/** "Nome <email@x.com>" ou só "email@x.com" → { name, email } */
function remetente(): { name?: string; email: string } {
  const bruto = (process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '').trim()
  const m = bruto.match(/^(.*)<([^>]+)>$/)
  return m ? { name: m[1].trim().replace(/^"|"$/g, '') || undefined, email: m[2].trim() } : { email: bruto }
}

async function enviarViaBrevo(destinatario: string, assunto: string, corpo: string) {
  const from = remetente()
  if (!from.email) throw new Error('EMAIL_FROM não configurado (remetente verificado na Brevo).')
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    { sender: from, to: [{ email: destinatario }], subject: assunto, textContent: corpo },
    { headers: { 'api-key': process.env.BREVO_API_KEY!, accept: 'application/json' }, timeout: 15_000 }
  )
}

export async function enviarEmail(destinatario: string, assunto: string, corpo: string) {
  if (process.env.BREVO_API_KEY) return enviarViaBrevo(destinatario, assunto, corpo)

  const t = getTransporter()
  if (!t) {
    if (process.env.NODE_ENV === 'production') {
      // Nunca escreve o corpo em produção: pode conter link de recuperação de senha.
      console.error(`[email] nenhum envio configurado (BREVO_API_KEY ou SMTP_HOST): "${assunto}" não foi enviado.`)
      return
    }
    console.log(`[email:simulado] Para: ${destinatario} | Assunto: ${assunto}\n${corpo}`)
    return
  }
  await t.sendMail({
    from: process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: destinatario,
    subject: assunto,
    text: corpo,
  })
}

// ─── WhatsApp ──────────────────────────────────────────────────────────────
// Integração genérica via API HTTP (ex: WhatsApp Cloud API da Meta, ou provedor
// equivalente). URL e token configuráveis por env para não travar o código a um provedor.

export async function enviarWhatsApp(telefone: string, mensagem: string) {
  const apiUrl = process.env.WHATSAPP_API_URL
  const apiToken = process.env.WHATSAPP_API_TOKEN

  if (!apiUrl || !apiToken) {
    console.log(`[whatsapp:simulado] Para: ${telefone}\n${mensagem}`)
    return
  }

  await axios.post(
    apiUrl,
    {
      messaging_product: 'whatsapp',
      to: telefone.replace(/\D/g, ''),
      type: 'text',
      text: { body: mensagem },
    },
    { headers: { Authorization: `Bearer ${apiToken}` } }
  )
}
