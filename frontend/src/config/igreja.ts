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
// Para trocar: coloque as fotos reais em frontend/public/fotos/ com os mesmos nomes
// (igreja-1.jpg … igreja-4.jpg) ou edite a lista abaixo. Dá para ter mais ou menos fotos.
// Dicas: formato paisagem (ex.: 1600×1000 px), JPG com até ~300 KB cada, e um texto
// alternativo (alt) que descreva a foto para quem usa leitor de tela.
// As imagens atuais são ilustrações de exemplo.
export const FOTOS_IGREJA: { src: string; alt: string; legenda?: string }[] = [
  { src: '/fotos/igreja-1.jpg', alt: 'Fachada do templo da igreja ao entardecer', legenda: 'Nosso templo' },
  { src: '/fotos/igreja-2.jpg', alt: 'Interior do templo com os bancos e o púlpito', legenda: 'Cultos' },
  { src: '/fotos/igreja-3.jpg', alt: 'Grupo de louvor cantando no altar', legenda: 'Louvor' },
  { src: '/fotos/igreja-4.jpg', alt: 'Cestas básicas do Projeto Mão Amiga sobre a mesa', legenda: 'Projeto Mão Amiga' },
]

// Projeto Mão Amiga (página pública)
export const MAO_AMIGA = {
  chavePix: 'cesta.solidaria@gmail.com',
  // O comprovante do Pix é enviado para o mesmo WhatsApp de contato da igreja
  whatsapp: REDES_FALLBACK.whatsappContato,
  entrega: 'na secretaria da igreja, de segunda a sábado, das 8h às 17h',
}
