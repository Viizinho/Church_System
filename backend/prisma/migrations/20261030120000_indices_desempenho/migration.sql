-- Índices para as consultas mais frequentes (listagens filtradas, totais por item/meta, agenda por mês).
-- Os nomes seguem o padrão do Prisma, então `prisma migrate dev` não vê diferença com o schema.

CREATE INDEX "membros_status_idx" ON "membros"("status");
CREATE INDEX "membros_nome_completo_idx" ON "membros"("nome_completo");

CREATE INDEX "membro_cargos_cargo_id_idx" ON "membro_cargos"("cargo_id");
CREATE INDEX "membro_categorias_categoria_id_idx" ON "membro_categorias"("categoria_id");
CREATE INDEX "membro_conjuntos_conjunto_id_idx" ON "membro_conjuntos"("conjunto_id");

CREATE INDEX "eventos_inicio_idx" ON "eventos"("inicio");
CREATE INDEX "eventos_evento_pai_id_idx" ON "eventos"("evento_pai_id");

CREATE INDEX "manutencoes_ativo_id_data_idx" ON "manutencoes"("ativo_id", "data");

CREATE INDEX "contribuicoes_item_id_status_idx" ON "contribuicoes"("item_id", "status");
CREATE INDEX "contribuicoes_status_criado_em_idx" ON "contribuicoes"("status", "criado_em");

CREATE INDEX "doacoes_alimentos_meta_cesta_id_status_idx" ON "doacoes_alimentos"("meta_cesta_id", "status");
CREATE INDEX "doacoes_alimentos_membro_id_idx" ON "doacoes_alimentos"("membro_id");
CREATE INDEX "doacoes_alimentos_status_criado_em_idx" ON "doacoes_alimentos"("status", "criado_em");
