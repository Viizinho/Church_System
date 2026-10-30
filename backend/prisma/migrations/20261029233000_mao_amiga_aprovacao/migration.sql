-- AlterTable
ALTER TABLE "doacoes_alimentos" ADD COLUMN     "confirmado_em" TIMESTAMP(3),
ADD COLUMN     "confirmado_por" TEXT,
ADD COLUMN     "motivo_recusa" TEXT;
