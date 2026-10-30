-- Imagem: o consentimento obrigatório dá lugar à opção "não quer ter a imagem gravada".
-- Quem não tinha consentido passa a constar como "não quer" (postura conservadora).
ALTER TABLE "membros" ADD COLUMN "nao_quer_imagem_gravada" BOOLEAN NOT NULL DEFAULT false;
UPDATE "membros" SET "nao_quer_imagem_gravada" = NOT "consentimento_imagem";
ALTER TABLE "membros" DROP COLUMN "consentimento_imagem",
DROP COLUMN "consentimento_imagem_data";

-- Cargos: saem "Diaconisa" e "Membro" (os vínculos em membro_cargos caem junto,
-- por ON DELETE CASCADE); entram "Auxiliar" e "Secretária".
DELETE FROM "cargos" WHERE "nome" IN ('Diaconisa', 'Membro');

INSERT INTO "cargos" ("id", "nome", "descricao")
SELECT md5(random()::text || clock_timestamp()::text)::uuid::text, v.nome, v.descricao
FROM (VALUES
  ('Auxiliar', 'Auxiliar da congregação'),
  ('Secretária', 'Secretaria da igreja')
) AS v(nome, descricao)
WHERE NOT EXISTS (SELECT 1 FROM "cargos" c WHERE c."nome" = v.nome);
