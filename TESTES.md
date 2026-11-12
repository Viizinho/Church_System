# Testes automatizados

O sistema tem **186 testes automatizados** em três níveis. Eles rodam sozinhos a cada push e a cada pull request no GitHub Actions (`.github/workflows/ci.yml`).

| Nível | Ferramentas | Onde fica | O que verifica | Testes |
|---|---|---|---|---|
| Unidade (backend) | Vitest | `backend/tests/unit` | Regras de negócio puras: recorrência de eventos, cálculo de aniversário, situação da manutenção, validações de entrada | 42 |
| API (backend) | Vitest + Supertest, banco em memória | `backend/tests/api` | O servidor Express de verdade (rotas, autenticação JWT, validação, limites de tentativas, cabeçalhos de segurança, regras da campanha e da Mão Amiga, recuperação de senha), sem precisar de PostgreSQL | 76 |
| Integração (backend) | Vitest + Supertest + **PostgreSQL real** | `backend/tests/integracao` | Os fluxos completos gravando e lendo do banco: membros e cargos, eventos recorrentes, manutenção, campanha (inclusive aprovações simultâneas), Mão Amiga, dashboard e "esqueci minha senha" | 21 |
| Frontend | Vitest + React Testing Library + jsdom | `frontend/src/**/*.test.ts(x)` | Funções de data/ordenação/calendário, componentes (calendário, alternador de visão, ordenação) e páginas (Login, Eventos, Aniversários) do jeito que o usuário usa: clicando e digitando | 47 |

## Como rodar

Na raiz do projeto:

```bash
npm test                 # unidade + API (backend) e frontend
npm run test:cobertura   # o mesmo, gerando o relatório de cobertura
```

Em cada pasta (`backend` ou `frontend`) também funcionam `npm test`, `npm run test:watch` (fica rodando enquanto você edita) e `npm run test:cobertura`.

O relatório de cobertura em HTML fica em `backend/coverage/index.html` e `frontend/coverage/index.html`. No GitHub, cada execução do CI também guarda os relatórios: na página da execução, procure a seção **Artifacts**.

### Testes de integração (precisam de PostgreSQL)

Os testes **apagam todas as tabelas** antes de cada caso. Por isso, só rodam se o nome do banco tiver `test` (ex.: `igreja_teste`), e o banco de verdade (`igreja_db`) fica protegido.

1. No pgAdmin, crie um banco chamado `igreja_teste`.
2. No PowerShell, dentro de `backend`:

```powershell
$env:DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/igreja_teste"
npx prisma migrate deploy
npm run test:integracao
```

No CI isso acontece sozinho, com um PostgreSQL 16 temporário.

## Cobertura atual

Medida no CI em 12/11/2026 (% de linhas do código executadas pelos testes):

| Parte | Linhas cobertas |
|---|---|
| Backend: unidade + API | 59,8% |
| Backend: integração | 57,7% |
| Frontend | 23,6% |

No frontend, as páginas com mais regras (Eventos, Aniversários, Login) e os componentes novos têm testes. As demais páginas ainda não têm.

## Exemplos do que os testes garantem

- **RN-05:** o valor arrecadado de um item da campanha nunca passa do valor total, nem quando duas aprovações chegam ao mesmo tempo (testado no banco real).
- O valor arrecadado é **calculado** (soma das contribuições confirmadas), nunca gravado.
- A situação da manutenção (em dia / próxima / vencida / sem registro) é derivada da data da última manutenção, com aviso a partir de 30 dias.
- Recuperação de senha: a resposta é igual para e-mail cadastrado e não cadastrado, o link vale uma vez só e por 30 minutos, o banco guarda só o hash do token, e as sessões abertas caem depois da troca.
- Segurança: rotas do painel exigem login; tokens adulterados (`alg: none`, outro algoritmo, vencidos) são recusados; links `javascript:` e `data:` são bloqueados; há limite de tentativas no login e nos envios públicos.
- Datas: aniversários e manutenções não "voltam um dia" por causa do fuso de Brasília.
- Eventos: a aba "Esta semana" vai de domingo a sábado; "Passados" vem do mais recente para o mais antigo.
