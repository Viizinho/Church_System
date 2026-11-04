# Publicação gratuita (provisória): Render + Neon

Opção sem custo para mostrar o sistema ao cliente, fazer a avaliação SUS e apresentar o TCC. Quando a igreja quiser usar o sistema no dia a dia, é só migrar para um plano pago (veja o final do guia). O código é o mesmo e muda apenas a hospedagem.

| Peça | Serviço | Custo | Limitação que importa |
|---|---|---|---|
| Sistema (API + páginas) | [Render](https://render.com), instância *Free* | US$ 0 | **Dorme após 15 min sem acesso.** O próximo acesso leva cerca de 1 minuto para abrir. |
| Banco PostgreSQL | [Neon](https://neon.com), plano *Free* | US$ 0 | Não expira. Armazenamento pequeno (0,5 a 1 GB), mais que suficiente aqui. Pausa sozinho quando ocioso e volta em menos de um segundo. |
| E-mail | [Brevo](https://www.brevo.com), plano gratuito | US$ 0 | O Render gratuito bloqueia SMTP. Por isso o envio é pela API HTTPS da Brevo. |

> Por que não usar o Postgres gratuito do próprio Render? Ele **expira em 30 dias** e depois é apagado. O do Neon é permanente.

## 0. Antes de começar

- [ ] O código está na branch `main` do GitHub, incluindo o `render.yaml` da raiz.
- [ ] Os dados públicos em `frontend/src/config/igreja.ts` estão certos: redes sociais, **WhatsApp de contato** (recebe os comprovantes do Mão Amiga) e **chave Pix do Mão Amiga**.
- [ ] Node.js instalado e o projeto rodando no seu computador (para criar o administrador no passo 5).

## 1. Banco no Neon

1. Crie a conta em [neon.com](https://neon.com) com o GitHub ou o Google.
2. *New Project*, com nome `igreja-gestao`, Postgres 16 e região **AWS US East (N. Virginia)**, a mesma do servidor no Render, para as consultas serem rápidas.
3. Clique em *Connect*, **desligue** a opção *Connection pooling* e copie a string de conexão. Ela não tem `-pooler` no endereço e termina com `?sslmode=require`. Essa conexão direta é a que o sistema usa e a que as migrações exigem.

## 2. E-mail na Brevo

1. Crie a conta gratuita em [brevo.com](https://www.brevo.com).
2. Cadastre o remetente: *Senders, Domains & Dedicated IPs* → *Senders* → *Add a sender*, com um e-mail da igreja. Confirme o código que chega nele.
3. Gere a chave: *SMTP & API* → *API Keys* → *Generate a new API key*. Copie a chave `xkeysib-...`.

Sem a Brevo o sistema funciona, mas o *Esqueci minha senha* e os alertas por e-mail não saem.

## 3. Sistema no Render

1. Crie a conta em [render.com](https://render.com) com o GitHub.
2. *New* → *Blueprint* → escolha o repositório `Viizinho/Church_System`. O Render lê o `render.yaml` e propõe o serviço `igreja-gestao` no plano *Free*.
3. Preencha as três variáveis que ele pede:
   - `DATABASE_URL`: a string do Neon (passo 1).
   - `BREVO_API_KEY`: a chave da Brevo.
   - `EMAIL_FROM`: `Igreja AD Jardim Cidade Universitária <remetente-cadastrado@gmail.com>`.

   O `JWT_SECRET` é gerado automaticamente. O endereço público (`APP_URL`) vem sozinho do Render (`https://igreja-gestao.onrender.com` ou parecido).
4. *Apply*. O primeiro build leva alguns minutos. Nos logs devem aparecer as migrações aplicadas e `🚀 Servidor rodando`.
5. Confira se `https://<seu-endereço>/ready` responde `{"status":"ready"}` e se `https://<seu-endereço>/` abre a página inicial.

## 4. Primeiro acesso mais lento (o "sono")

Depois de 15 minutos sem visitas, o Render desliga o serviço. A próxima visita mostra uma tela de carregamento por cerca de 1 minuto. Para **reuniões com o cliente, sessões da avaliação SUS e a banca**:

- **Simples:** abra o site 2 ou 3 minutos antes de começar e deixe uma aba aberta.
- **Para dias seguidos de uso:** crie um monitor gratuito no [UptimeRobot](https://uptimerobot.com) que acesse `https://<seu-endereço>/health` a cada 5 minutos. Assim o serviço fica acordado e o alerta diário das 8h roda. Use o `/health`, e não o `/ready`: ele não consulta o banco, que pode continuar pausando no Neon. Uma única instância acordada o mês inteiro cabe nas 750 horas gratuitas do Render. Desligue o monitor quando não precisar mais.

## 5. Criar o administrador

Do seu computador, na pasta `backend`, no **PowerShell**:

```powershell
$env:DATABASE_URL="<string do Neon>"
$env:ADMIN_NOME="Nome da pessoa"
$env:ADMIN_EMAIL="email@da-pessoa.com"
$env:ADMIN_PASSWORD="UmaSenhaForte123"
npm run db:seed:admin
```

A senha precisa ter 10 ou mais caracteres, com letras e números. O script também cria cargos, categorias e conjuntos. Feche o terminal depois.

## 6. Avaliação SUS e demonstração com dados de exemplo

1. Com `DATABASE_URL` apontando para o Neon, como no passo 5, rode `npm run db:seed:demo -- --sim` na pasta `backend`.
2. Entre como `admin@igreja.com` / `admin123` e troque a senha em *Alterar senha* por uma forte. O seed de demonstração mantém a senha nas próximas vezes.
3. Antes de cada participante, rode o seed de demonstração de novo.

> ⚠️ O seed de demonstração **apaga** membros, eventos, manutenções, campanha e Mão Amiga. **Nunca** rode depois de cadastrar dados reais.

**Para começar o uso real**, limpe tudo com `npx prisma migrate reset --skip-seed` (com `DATABASE_URL` do Neon, na pasta `backend`) e repita o passo 5.

## 7. Quando for publicar "para valer"

O sistema não muda. Só a hospedagem:

| Caminho | Custo aproximado | O que fazer |
|---|---|---|
| Manter Render + Neon, tirando o "sono" | US$ 7/mês | No Render, mude o serviço de *Free* para *Starter*. O banco continua no Neon. |
| Railway (app + banco no mesmo lugar) | US$ 5/mês (plano Hobby) | Siga o [guia do Railway](./PUBLICAR-RAILWAY.md) e leve os dados com `pg_dump "<string do Neon>" > backup.sql` e `psql "<novo banco>" < backup.sql`. |

Antes do uso real, em qualquer caminho: backup periódico do banco (dados pessoais, LGPD), domínio próprio se a igreja quiser (ex.: `sistema.suaigreja.org`) e o texto de privacidade revisado pela liderança.
