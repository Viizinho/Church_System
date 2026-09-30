-- CreateEnum
CREATE TYPE "StatusMembro" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CULTO', 'REUNIAO', 'ESPECIAL');

-- CreateEnum
CREATE TYPE "RecorrenciaEvento" AS ENUM ('NENHUMA', 'SEMANAL', 'MENSAL');

-- CreateEnum
CREATE TYPE "StatusContribuicao" AS ENUM ('PENDENTE', 'CONFIRMADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "TipoDoacao" AS ENUM ('FISICA', 'PIX');

-- CreateEnum
CREATE TYPE "StatusDoacao" AS ENUM ('PENDENTE', 'CONFIRMADO', 'RECUSADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros" (
    "id" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "data_nascimento" DATE,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "foto_url" TEXT,
    "status" "StatusMembro" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membro_cargos" (
    "membro_id" TEXT NOT NULL,
    "cargo_id" TEXT NOT NULL,
    "atribuido_em" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membro_cargos_pkey" PRIMARY KEY ("membro_id","cargo_id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "recorrencia" "RecorrenciaEvento" NOT NULL DEFAULT 'NENHUMA',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ativos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "periodicidade_dias" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manutencoes" (
    "id" TEXT NOT NULL,
    "ativo_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "realizada_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manutencoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_campanha" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "chave_pix" TEXT NOT NULL,
    "whatsapp_tesoureiro" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_campanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribuicoes" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "nome_contribuidor" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "comprovante_url" TEXT,
    "status" "StatusContribuicao" NOT NULL DEFAULT 'PENDENTE',
    "motivo_recusa" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribuicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doacoes_alimentos" (
    "id" TEXT NOT NULL,
    "membro_id" TEXT,
    "nome_doador" TEXT,
    "data" DATE NOT NULL,
    "item_doado" TEXT NOT NULL,
    "quantidade" TEXT NOT NULL,
    "tipo" "TipoDoacao" NOT NULL,
    "comprovante_url" TEXT,
    "status" "StatusDoacao" NOT NULL DEFAULT 'CONFIRMADO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doacoes_alimentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_nome_key" ON "cargos"("nome");

-- AddForeignKey
ALTER TABLE "membro_cargos" ADD CONSTRAINT "membro_cargos_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membro_cargos" ADD CONSTRAINT "membro_cargos_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_ativo_id_fkey" FOREIGN KEY ("ativo_id") REFERENCES "ativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_realizada_por_fkey" FOREIGN KEY ("realizada_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribuicoes" ADD CONSTRAINT "contribuicoes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens_campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacoes_alimentos" ADD CONSTRAINT "doacoes_alimentos_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;
