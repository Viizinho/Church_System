/**
 * Formata progressivamente um telefone brasileiro no padrão (XX) 9XXXX-XXXX
 * enquanto o usuário digita.
 */
export function mascararTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)

  if (digitos.length === 0) return ''
  if (digitos.length <= 2) return `(${digitos}`
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

export function limparTelefone(valor: string): string {
  return valor.replace(/\D/g, '')
}
