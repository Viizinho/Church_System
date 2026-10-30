import { z } from 'zod'

/** URL externa segura: só http(s) — bloqueia `javascript:`, `data:` etc., que virariam XSS em um <a href>. */
export const urlHttp = z
  .string()
  .trim()
  .max(2048, 'URL muito longa.')
  .url('URL inválida.')
  .refine((u) => /^https?:\/\//i.test(u), 'Use um endereço http:// ou https://.')

/** Texto curto de formulário (nomes, itens). */
export const textoCurto = (min = 2, max = 120) => z.string().trim().min(min).max(max)

/** Texto longo opcional (descrições, motivos). Vazio vira null. */
export const textoLongo = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))

/** Telefone/WhatsApp: dígitos, espaços, parênteses, hífen e "+". */
export const telefone = z
  .string()
  .trim()
  .max(25)
  .regex(/^[0-9+()\-\s]*$/, 'Telefone inválido.')

/** Lê um enum de query string; valor desconhecido é ignorado. */
export function enumQuery<T extends string>(valor: unknown, validos: readonly T[]): T | undefined {
  return typeof valor === 'string' && (validos as readonly string[]).includes(valor) ? (valor as T) : undefined
}
