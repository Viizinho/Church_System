-- Recuperação de senha por e-mail + invalidação de sessões antigas ao trocar a senha.
ALTER TABLE "usuarios" ADD COLUMN "senha_alterada_em" TIMESTAMP(3);

CREATE TABLE "tokens_recuperacao_senha" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tokens_recuperacao_senha_token_hash_key" ON "tokens_recuperacao_senha"("token_hash");
CREATE INDEX "tokens_recuperacao_senha_usuario_id_criado_em_idx" ON "tokens_recuperacao_senha"("usuario_id", "criado_em");

ALTER TABLE "tokens_recuperacao_senha" ADD CONSTRAINT "tokens_recuperacao_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
