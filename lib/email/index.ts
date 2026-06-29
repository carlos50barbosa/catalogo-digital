import nodemailer, { type Transporter } from 'nodemailer'
import { config } from '@/lib/config'

// E-mail transacional. Abstrai o provedor: SMTP (nodemailer) em produção,
// e fallback que loga no console quando EMAIL_HOST não está configurado (dev).

type Mail = { to: string; subject: string; html: string; text?: string }

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!config.email.host) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
    })
  }
  return transporter
}

export async function sendEmail(mail: Mail): Promise<void> {
  const t = getTransporter()
  if (!t) {
    // Dev: sem SMTP configurado, apenas registra (útil para pegar o link de verificação).
    console.log(
      `\n──────── [email:dev] ────────\nPara: ${mail.to}\nAssunto: ${mail.subject}\n${mail.text ?? mail.html}\n─────────────────────────────\n`,
    )
    return
  }
  await t.sendMail({
    from: config.email.from,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  })
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;background:#f5f7fa;padding:24px;color:#142433">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;padding:28px;border:1px solid #e5e7eb">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${body}
    <p style="margin-top:24px;font-size:12px;color:#8a98a5">Catálogo Digital · cataloggo.app.br</p>
  </div></body></html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${label}</a>`
}

export async function sendVerificationEmail(to: string, link: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Confirme seu e-mail — Catálogo Digital',
    text: `Confirme seu e-mail para continuar: ${link}`,
    html: layout(
      'Confirme seu e-mail',
      `<p>Falta pouco! Confirme seu e-mail para escolher seu plano e ativar sua loja.</p>
       <p style="margin:20px 0">${button(link, 'Confirmar e-mail')}</p>
       <p style="font-size:13px;color:#5a7184">Se o botão não funcionar, copie e cole este link:<br>${link}</p>
       <p style="font-size:13px;color:#5a7184">O link expira em 24 horas.</p>`,
    ),
  })
}

export async function sendWelcomeEmail(to: string, storeName: string, panelUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Sua loja ${storeName} está ativa! 🎉`,
    text: `Pagamento confirmado! Acesse seu painel: ${panelUrl}`,
    html: layout(
      'Pagamento confirmado! 🎉',
      `<p>Tudo certo com o pagamento — a loja <strong>${storeName}</strong> está ativa.</p>
       <p>Agora é só montar seu catálogo e começar a vender pelo WhatsApp.</p>
       <p style="margin:20px 0">${button(panelUrl, 'Acessar meu painel')}</p>`,
    ),
  })
}
