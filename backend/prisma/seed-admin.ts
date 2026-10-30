/**
 * Preparação para PRODUÇÃO: cria o administrador e o catálogo básico (cargos, categorias,
 * conjuntos). Pode rodar várias vezes — não duplica nada e não troca a senha de quem já existe.
 *
 *   ADMIN_EMAIL=pastor@igreja.org ADMIN_PASSWORD='uma-senha-forte-123' npm run db:seed:admin
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CARGOS: [string, string][] = [
  ['Pastor', 'Líder pastoral da igreja'],
  ['Presbítero', 'Ancião da congregação'],
  ['Diácono', 'Servo da congregação'],
  ['Coord. Mocidade', 'Coordenador(a) do ministério de jovens'],
  ['Auxiliar', 'Auxiliar da congregação'],
  ['Secretária', 'Secretaria da igreja'],
]
const CATEGORIAS: [string, string][] = [
  ['Professor(a) EBD — Irmãs', 'EBD'],
  ['Professor(a) EBD — Irmãos', 'EBD'],
  ['Professor(a) EBD — Juvenis', 'EBD'],
  ['Professor(a) EBD — Crianças', 'EBD'],
  ['Professor(a) EBD — Jovens', 'EBD'],
  ['Músico', 'Louvor'],
  ['Mídia', 'Mídia'],
]
const CONJUNTOS = ['Lírios dos Vales', 'Colunas de Prata', 'Filhas de Jerusalém', 'Oráculos de Deus']

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const senha = process.env.ADMIN_PASSWORD
  if (!email || !senha) {
    console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD (a senha não fica salva em lugar nenhum além do hash no banco).')
    process.exit(1)
  }
  if (senha.length < 10 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) {
    console.error('ADMIN_PASSWORD precisa ter 10+ caracteres, com letras e números.')
    process.exit(1)
  }

  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) {
    console.log(`ℹ️  ${email} já existe — senha mantida.`)
  } else {
    await prisma.usuario.create({
      data: { nome: process.env.ADMIN_NOME ?? 'Administrador', email, senhaHash: await bcrypt.hash(senha, 12) },
    })
    console.log(`✅ Administrador criado: ${email}`)
  }

  for (const [nome, descricao] of CARGOS) await prisma.cargo.upsert({ where: { nome }, update: {}, create: { nome, descricao } })
  for (const [nome, grupo] of CATEGORIAS) await prisma.categoria.upsert({ where: { nome }, update: {}, create: { nome, grupo } })
  for (const nome of CONJUNTOS) await prisma.conjuntoMusical.upsert({ where: { nome }, update: {}, create: { nome } })
  console.log('✅ Catálogo (cargos, categorias e conjuntos) em dia.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
