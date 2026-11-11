// Dados institucionais exibidos na página pública.
// Os valores vindos da API (/publico/config) têm prioridade; estes são o plano B
// caso o administrador ainda não os tenha cadastrado no banco.
// Preencha com os perfis oficiais da igreja.

export const IGREJA = {
  nome: 'Assembleia de Deus',
  complemento: 'Jardim Cidade Universitária',
  cidade: 'João Pessoa — PB',
}

export const REDES_FALLBACK = {
  instagramUrl: 'https://www.instagram.com/adpb_jcu/',
  facebookUrl: 'https://www.facebook.com/adpb.jcu',
  youtubeUrl: 'https://www.youtube.com/@adpbjardimcidadeuniversitaria',
  whatsappContato: '5583999990010',
}

// Fotos da seção inicial da página pública (carrossel).
// As atuais são FOTOS DE EXEMPLO do Unsplash (licença Unsplash: uso livre, sem atribuição
// obrigatória), carregadas direto do site deles. Substitua pelas fotos reais da igreja:
//   1. coloque os arquivos em frontend/public/fotos/ (ex.: igreja-1.jpg);
//   2. troque o src abaixo por '/fotos/igreja-1.jpg' (e assim por diante).
// Dá para ter mais ou menos fotos. Dicas: formato paisagem (ex.: 1600×1000 px), JPG com até
// ~300 KB cada, e um alt que descreva a foto para quem usa leitor de tela.
// Fotos com pessoas: só de quem autorizou o uso da imagem.
const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=75`

export const FOTOS_IGREJA: { src: string; alt: string; legenda?: string }[] = [
  // Kelly Sikkema — unsplash.com/photos/x8R7fCFbsHs
  { src: unsplash('photo-1728939862879-a1f788974d2c'), alt: 'Pequena igreja branca com torre, cercada de árvores', legenda: 'Nosso templo' },
  // Waldemar Brandt — unsplash.com/photos/FdhQi6engUg
  { src: unsplash('photo-1642150607290-2c7195c98ce1'), alt: 'Interior de uma igreja com fileiras de bancos de madeira', legenda: 'Cultos' },
  // Edward Cisneros — unsplash.com/photos/QSa-uv4WJ0k
  { src: unsplash('photo-1507692049790-de58290a4334'), alt: 'Grupo de louvor ministrando no palco durante um culto', legenda: 'Louvor' },
  // Joel Muniz — unsplash.com/photos/3k3l2brxmwQ
  { src: unsplash('photo-1599059813005-11265ba4b4ce'), alt: 'Voluntários separando alimentos doados', legenda: 'Projeto Mão Amiga' },
]

// Projeto Mão Amiga (página pública)
export const MAO_AMIGA = {
  chavePix: 'cesta.solidaria@gmail.com',
  // O comprovante do Pix é enviado para o mesmo WhatsApp de contato da igreja
  whatsapp: REDES_FALLBACK.whatsappContato,
  entrega: 'na secretaria da igreja, de segunda a sábado, das 8h às 17h',
}
