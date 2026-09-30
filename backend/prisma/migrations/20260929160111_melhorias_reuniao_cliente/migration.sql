-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('EMAIL', 'WHATSAPP');

-- AlterEnum
ALTER TYPE "RecorrenciaEvento" ADD VALUE 'PERSONALIZADA';

-- AlterTable
ALTER TABLE "contribuicoes" ADD COLUMN     "confirmado_em" TIMESTAMP(3),
ADD COLUMN     "confirmado_por" TEXT;

-- AlterTable
ALTER TABLE "doacoes_alimentos" ADD COLUMN     "meta_cesta_id" TEXT,
ADD COLUMN     "quantidade_numerica" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "evento_pai_id" TEXT,
ADD COLUMN     "regra_recorrencia" JSONB;

-- AlterTable
ALTER TABLE "membros" ADD COLUMN     "consentimento_imagem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentimento_imagem_data" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "receber_alertas" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telefone" TEXT;

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo" TEXT,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membro_categorias" (
    "membro_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,

    CONSTRAINT "membro_categorias_pkey" PRIMARY KEY ("membro_id","categoria_id")
);

-- CreateTable
CREATE TABLE "conjuntos_musicais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "conjuntos_musicais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membro_conjuntos" (
    "membro_id" TEXT NOT NULL,
    "conjunto_id" TEXT NOT NULL,

    CONSTRAINT "membro_conjuntos_pkey" PRIMARY KEY ("membro_id","conjunto_id")
);

-- CreateTable
CREATE TABLE "notificacoes_manutencao" (
    "id" TEXT NOT NULL,
    "ativo_id" TEXT NOT NULL,
    "canal" "CanalNotificacao" NOT NULL,
    "status" TEXT NOT NULL,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_cesta" (
    "id" TEXT NOT NULL,
    "nome_item" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'kg',
    "quantidade_necessaria" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_cesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_igreja" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "sobre" TEXT,
    "endereco" TEXT,
    "instagram_url" TEXT,
    "facebook_url" TEXT,
    "whatsapp_contato" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_igreja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nome_key" ON "categorias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "conjuntos_musicais_nome_key" ON "conjuntos_musicais"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_manutencao_ativo_id_status_canal_key" ON "notificacoes_manutencao"("ativo_id", "status", "canal");

-- AddForeignKey
ALTER TABLE "membro_categorias" ADD CONSTRAINT "membro_categorias_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membro_categorias" ADD CONSTRAINT "membro_categorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membro_conjuntos" ADD CONSTRAINT "membro_conjuntos_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membro_conjuntos" ADD CONSTRAINT "membro_conjuntos_conjunto_id_fkey" FOREIGN KEY ("conjunto_id") REFERENCES "conjuntos_musicais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_evento_pai_id_fkey" FOREIGN KEY ("evento_pai_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_manutencao" ADD CONSTRAINT "notificacoes_manutencao_ativo_id_fkey" FOREIGN KEY ("ativo_id") REFERENCES "ativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacoes_alimentos" ADD CONSTRAINT "doacoes_alimentos_meta_cesta_id_fkey" FOREIGN KEY ("meta_cesta_id") REFERENCES "metas_cesta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
