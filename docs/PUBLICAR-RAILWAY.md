# Publicar o sistema no Railway

Guia para colocar o sistema no ar no [Railway](https://railway.com), plano **Hobby** (US$ 5/mês, com US$ 5 de uso incluídos). O sistema roda como **um serviço** (a API também serve o frontend) mais **um PostgreSQL**, no mesmo projeto.

> **E-mail:** o plano Hobby do Railway **bloqueia SMTP** (portas 25, 465, 587 e 2525). Por isso o envio de e-mails (recuperação de senha e alertas de manutenção) usa a **API HTTPS da Brevo**, que tem plano gratuito.

## 0. Antes de começar

- [ ] O código que vai ao ar está na branch `main` do GitHub.
- [ ] Os dados públicos em `frontend/src/config/igreja.ts` estão corretos: links das redes sociais, **WhatsApp de contato** (recebe os comprovantes do Mão Amiga) e **chave Pix do Mão Amiga**. Hoje essa é a fonte desses dados na página inicial.
- [ ] Node.js instalado no seu computador e o projeto rodando localmente (para criar o administrador no passo 6).

## 1. E-mail (Brevo)

1. Crie uma conta gratuita em [brevo.com](https://www.brevo.com).
2. Cadastre o **remetente**: menu *Senders, Domains & Dedicated IPs* → *Senders* → *Add a sender*. Use um e-mail da igreja (pode ser Gmail) e confirme o código que chega nele.
3. Gere a **chave de API**: menu *SMTP & API* → aba *API Keys* → *Generate a new API key*. Copie a chave (`xkeysib-...`); ela só aparece uma vez.

## 2. Projeto no Railway

1. Entre em [railway.com](https://railway.com) com a conta do GitHub e assine o plano **Hobby**.
2. *New Project* → *Deploy from GitHub repo* → escolha `Viizinho/Church_System`. O arquivo `railway.json` faz o Railway usar o `Dockerfile` e conferir a saúde do serviço em `/ready`.
3. No mesmo projeto: *+ New* → *Database* → *PostgreSQL*.

O primeiro deploy do app vai falhar até as variáveis do passo 3 existirem. Isso é esperado.

## 3. Variáveis do serviço do app

No serviço do app → aba *Variables* → *Raw Editor*, cole e complete:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
TRUST_PROXY=1
JWT_SECRET=<cole aqui um segredo aleatório; veja abaixo>
APP_URL=https://<endereço gerado no passo 4>
BREVO_API_KEY=<chave da Brevo>
EMAIL_FROM=Igreja AD Jardim Cidade Universitária <remetente-cadastrado-na-brevo@gmail.com>
```

- `${{Postgres.DATABASE_URL}}` é uma referência: o Railway preenche sozinho com o endereço do banco. Se o serviço do banco tiver outro nome, troque `Postgres` pelo nome dele.
- Para gerar o `JWT_SECRET`, rode no terminal (Windows, Mac ou Linux):
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- Opcional, para alertas por WhatsApp: `WHATSAPP_API_URL` e `WHATSAPP_API_TOKEN`. Sem elas, os alertas saem só por e-mail.
- **Não** defina `PORT`: o Railway injeta a porta e o servidor a usa automaticamente.

## 4. Endereço público (HTTPS)

1. No serviço do app → *Settings* → *Networking* → *Generate Domain*. O Railway cria algo como `https://church-system-production.up.railway.app`, já com HTTPS.
2. Volte em *Variables* e coloque esse endereço em `APP_URL`, sem barra no final. Salvar as variáveis dispara um novo deploy.

O servidor **se recusa a subir** se `APP_URL` não começar com `https://` ou se o `JWT_SECRET` for fraco. A mensagem aparece nos logs do deploy.

## 5. Conferir o deploy

1. Em *Deployments* → *View logs* devem aparecer as migrações aplicadas (`prisma migrate deploy`) e `🚀 Servidor rodando na porta ...`.
2. Abra `https://<seu-endereço>/ready`: deve responder `{"status":"ready"}`.
3. Abra `https://<seu-endereço>/`: deve aparecer a página inicial.

## 6. Criar o administrador

O banco começa vazio. Crie o primeiro usuário **do seu computador**, apontando para o banco do Railway:

1. No serviço *Postgres* → *Variables*, copie `DATABASE_PUBLIC_URL` (o endereço externo do banco).
2. Na pasta `backend` do projeto, rode no **PowerShell**:

```powershell
$env:DATABASE_URL="<DATABASE_PUBLIC_URL>"
$env:ADMIN_NOME="Nome da pessoa"
$env:ADMIN_EMAIL="email@da-pessoa.com"
$env:ADMIN_PASSWORD="UmaSenhaForte123"
npm run db:seed:admin
```

No Git Bash, Mac ou Linux: `DATABASE_URL="..." ADMIN_NOME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." npm run db:seed:admin`.

A senha precisa ter 10 ou mais caracteres, com letras e números. O script também cria os cargos, as categorias e os conjuntos musicais. Feche o terminal depois, para o endereço do banco não ficar na sessão.

3. Entre em `https://<seu-endereço>/login`, teste o *Esqueci minha senha* (confirma que o e-mail chega) e cadastre os itens da campanha com a chave Pix e o WhatsApp do tesoureiro.

## 7. Usar o servidor online na avaliação SUS (antes dos dados reais)

O kit da avaliação usa os **dados de demonstração**. Enquanto os dados reais ainda não tiverem sido cadastrados, dá para usar o próprio servidor online:

1. Do seu computador, com `DATABASE_URL` apontando para o banco do Railway (como no passo 6) e **sem** `NODE_ENV=production`, rode `npm run db:seed:demo -- --sim`.
2. Entre como `admin@igreja.com` / `admin123` e troque a senha em *Alterar senha* por uma forte. O seed de demonstração mantém a senha nas próximas vezes, então o site não fica com a senha de exemplo exposta.
3. Antes de cada participante, rode o seed de demonstração de novo para que todos comecem com os mesmos dados.

> ⚠️ O seed de demonstração **apaga** membros, eventos, manutenções, campanha e Mão Amiga. **Nunca** rode depois que os dados reais forem cadastrados.

**Ao terminar a avaliação**, limpe o banco antes do uso real: com `DATABASE_URL` do Railway, rode `npx prisma migrate reset --skip-seed` na pasta `backend` (apaga **tudo**, inclusive o usuário de demonstração) e repita o passo 6.

## 8. Depois de publicar

- **Backup:** verifique se o serviço Postgres oferece backups no seu plano (aba *Backups*). Se não oferecer, faça cópias periódicas do seu computador com `pg_dump "<DATABASE_PUBLIC_URL>" > backup-AAAA-MM-DD.sql` e guarde-as em local seguro: são dados pessoais (LGPD).
- **Custos:** acompanhe o consumo em *Usage*. Um app pequeno e um banco pequeno costumam ficar perto dos US$ 5 incluídos.
- **Atualizações:** cada push na `main` faz um novo deploy automático, e as migrações novas são aplicadas na subida.
- **Alerta diário de manutenção:** roda todo dia às 8h (horário de Fortaleza) e envia e-mail aos usuários do painel (todos recebem por padrão).
