function nomeArquivo(pedido, largura) {
  const nome = (pedido.cliente || 'pedido')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '_');
  return `pedido_${nome}_${largura}mm.png`;
}

/** Exporta a pré-visualização do ticket como PNG. */
export async function exportarPNG(ticket, pedido, largura) {
  if (!window.html2canvas) throw new Error('Biblioteca de imagens não carregou.');
  const canvas = await window.html2canvas(ticket, { scale: 3, backgroundColor: '#fff' });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Não foi possível gerar a imagem PNG.');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo(pedido, largura);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}