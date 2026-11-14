# Usar o sistema no celular sem publicar (avaliação SUS)

O sistema roda no **notebook** como no desenvolvimento, e o celular acessa o notebook. Há dois jeitos. Antes de cada participante, rode `npm run db:seed:demo` (pasta `backend`), como manda o kit.

> **Antes de tudo:** se existir o arquivo `frontend/.env`, apague dele a linha `VITE_API_URL=...` (ou comente com `#`) e reinicie o `npm run dev` do frontend. Com essa linha, tudo funciona em `localhost`, mas pelo celular ou pelo túnel as seções públicas aparecem **vazias**: a página procura os dados no "localhost" do aparelho de quem acessa.

## Opção A: túnel do Cloudflare (recomendada para o perfil B)

Gera um endereço `https://...trycloudflare.com` que abre em **qualquer celular com internet**, inclusive no do próprio participante, no 4G. É gratuito e não precisa de conta.

1. Instale o `cloudflared` uma vez. No PowerShell: `winget install --id Cloudflare.cloudflared` (feche e abra o terminal depois).
2. Terminal 1, na pasta `backend`: `npm run dev`
3. Terminal 2, na pasta `frontend`: `npm run dev`
4. Terminal 3: `cloudflared tunnel --url http://localhost:5173`
5. Copie o endereço `https://<palavras-aleatórias>.trycloudflare.com` que aparece no terminal 3 e abra no celular. Para o participante não precisar digitar, gere um QR code desse endereço (o Chrome faz isso: menu → *Compartilhar* → *QR code*).

Cuidados:
- O notebook precisa de internet (Wi-Fi ou roteamento do seu celular) e não pode dormir durante a sessão. Ligue na tomada e desative a suspensão.
- O endereço muda toda vez que o túnel é aberto. Gere o QR code no dia.
- Enquanto o túnel está aberto, qualquer pessoa com o endereço chega à página. Os dados são de demonstração, mas troque a senha do `admin@igreja.com` (*Alterar senha*) se for usar o túnel. O seed de demonstração mantém a senha trocada. Feche o túnel (Ctrl+C) ao terminar.
- O primeiro acesso pode levar alguns segundos, porque o modo de desenvolvimento prepara as páginas na hora.

## Opção B: mesma rede Wi-Fi (não precisa de internet)

O celular abre o sistema pelo IP do notebook. Funciona até sem internet, por exemplo com o notebook conectado ao roteador do seu celular. Nesse caso, as fotos de exemplo da página inicial, que vêm da internet, não aparecem.

1. Notebook e celular na **mesma rede** (Wi-Fi da igreja, ou o notebook conectado ao roteador do celular).
2. Terminal 1, na pasta `backend`: `npm run dev`
3. Terminal 2, na pasta `frontend`: `npm run dev:rede`. Ele mostra uma linha `Network: http://192.168.x.x:5173/`.
4. Abra esse endereço no celular. Se não abrir, permita o Node.js no Firewall do Windows para **redes privadas** (o Windows pergunta na primeira vez) e confira se a rede do notebook está marcada como *Privada*.

Para o perfil B, o participante pode usar **o seu celular**, já conectado. No relatório, registre que o aparelho foi o do avaliador.

## Perfil A (painel)

Nada muda: o participante usa o próprio notebook em `http://localhost:5173`.
