import nodemailer from 'nodemailer'
import axios from 'axios'

// ─── E-mail ────────────────────────────────────────────────────────────────
// Configuração via variáveis de ambiente (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
// Em desenvolvimento sem SMTP configurado, apenas loga no console (não quebra o cron).

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
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

export async function enviarEmail(destinatario: string, assunto: string, corpo: string) {
  const t = getTransporter()
  if (!t) {
    console.log(`[email:simulado] Para: ${destinatario} | Assunto: ${assunto}\n${corpo}`)
    return
  }
  await t.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
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
