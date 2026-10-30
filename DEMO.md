# Roteiro de demonstração

```bash
cd backend
npm run db:seed:demo        # apaga membros/eventos/manutenções/campanha/Mão Amiga e recria com exemplos
```

Login: `admin@igreja.com` / `admin123`. Todas as datas são relativas a **hoje**, então o roteiro vale em qualquer dia.

| Tela | O que mostrar |
|---|---|
| **Membros** | 16 membros: Pastor/Presbítero, Diácono, Auxiliar, Secretária, Coord. Mocidade e alguns **sem cargo**; 3 **inativos** (filtro de situação); 2 com “não quer ter a imagem gravada”; filtros combinados por cargo, categoria e conjunto (ex.: *Músico* + *Filhas de Jerusalém*) |
| **Aniversários** | Maria Rodrigues faz aniversário **hoje** (aparece em “Esta semana”, destacada); João Pedro **amanhã**; outros nos próximos dias/semanas; inativos não aparecem |
| **Eventos** | Escola Bíblica, cultos de celebração e de oração recorrentes (ocorrências semanais), evento único, especial, mensal e um culto já realizado |
| **Manutenção** | Ar-condicionado **vencido**, Bomba d’água **próxima**, Extintores/Caixa d’água/Gerador **em dia**, Instalação elétrica **sem registro**; no *Relatório* dá para editar/excluir manutenções individuais |
| **Campanha** | Geladeira (em andamento, com 2 **pendentes** e 1 **recusada**), TV (**meta atingida**), Caixa de som (só pendente), Ventiladores (parcial + recusada), Projetor (não iniciado). Só contribuições aprovadas entram no total |
| **Mão Amiga** | 6 metas (Óleo **atingida**, Leite em pó sem doações), doações **aprovadas**, **5 pendentes** (físicas e Pix) e 2 **recusadas** com motivo; ao aprovar/recusar a meta atualiza |
| **Página pública** | Metas com “reservado” (pendentes), progresso da campanha e formulário de doação |
