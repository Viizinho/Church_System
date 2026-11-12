/**
 * Banco PostgreSQL REAL para os testes de integração.
 *
 * Por segurança, só roda se o nome do banco em DATABASE_URL tiver "test" (ex.: igreja_teste):
 * os testes apagam todas as tabelas antes de cada caso.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const url = process.env.DATABASE_URL ?? ''
const nomeBanco = url.split('/').pop()?.split('?')[0] ?? ''
if (!/test/i.test(nomeBanco)) {
  throw new Error(
    `Os testes de integração APAGAM o banco. Use um banco só para testes (o nome precisa conter "test", ex.: igreja_teste). Recebido: "${nomeBanco}".`
  )
}

export const prisma = new PrismaClient()

const TABELAS = [
  'tokens_recuperacao_senha', 'notificacoes_manutencao', 'manutencoes', 'ativos',
  'membro_cargos', 'membro_categorias', 'membro_conjuntos', 'membros', 'cargos', 'categorias', 'conjuntos_musicais',
  'eventos', 'contribuicoes', 'itens_campanha', 'doacoes_alimentos', 'metas_cesta', 'configuracao_igreja', 'usuarios',
]

/** Esvazia todas as tabelas. */
export async function limparBanco() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABELAS.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`)
}

export const ADMIN_REAL = { nome: 'Admin', email: 'admin@igreja.com', senha: 'SenhaForte123' }

export async function criarAdmin() {
  return prisma.usuario.create({
    data: { nome: ADMIN_REAL.nome, email: ADMIN_REAL.email, senhaHash: await bcrypt.hash(ADMIN_REAL.senha, 4) },
  })
}
