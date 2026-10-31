import rateLimit from 'express-rate-limit'

const mensagem = (texto: string) => ({ error: texto })

/** Tentativas de login: freia força bruta de senha. */
export const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: mensagem('Muitas tentativas de login. Aguarde alguns minutos e tente de novo.'),
})

/** Envios públicos (contribuição, doação): freia spam de pendências. */
export const limiteEnvioPublico = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensagem('Muitos envios em pouco tempo. Tente novamente em alguns minutos.'),
})

/** Leitura pública (landing page, metas): protege o banco de raspagem/abuso. */
export const limiteLeituraPublica = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensagem('Muitas requisições. Tente novamente em instantes.'),
})

/** API administrativa: teto generoso por IP, só para conter abuso de token vazado. */
export const limiteApi = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensagem('Muitas requisições. Tente novamente em instantes.'),
})

/** Pedidos de recuperação de senha: poucos por hora por IP (evita encher a caixa de e-mail de alguém). */
export const limiteRecuperacaoSenha = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensagem('Muitos pedidos de recuperação de senha. Tente novamente mais tarde.'),
})

/** Tentativas de usar o link de redefinição (o token já é impossível de adivinhar; isto é cinto e suspensório). */
export const limiteRedefinicaoSenha = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensagem('Muitas tentativas. Aguarde alguns minutos e tente de novo.'),
})
