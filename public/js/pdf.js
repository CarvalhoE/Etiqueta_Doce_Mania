import { fmtDT, brl, totalDe } from './utils.js';

function carregarImagem(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Desenha o ticket no PDF e devolve a altura usada (mm). */
function desenhar(doc, p, empresa, largura, img) {
  const M = 3, W = largura, U = W - 2 * M;
  const fs = largura === 48 ? 7 : 9;
  const lh = fs * 0.42;
  let y = M;

  const separador = () => {
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
    doc.setLineDashPattern([], 0);
    y += lh;
  };

  doc.setFont('courier', 'normal');
  doc.setFontSize(fs);
  doc.setTextColor(0);

  if (img) {
    const r = Math.min((U * 0.6) / img.naturalWidth, (largura === 48 ? 14 : 18) / img.naturalHeight);
    const w = img.naturalWidth * r, h = img.naturalHeight * r;
    const fmt = empresa.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(empresa.logo, fmt, (W - w) / 2, y, w, h);
    y += h + 2;
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(fs + 3);
  doc.splitTextToSize(empresa.nome || 'Doceria', U).forEach(l => {
    y += lh + 1;
    doc.text(l, W / 2, y - 1, { align: 'center' });
  });
  y += 1;
  doc.setFontSize(fs);
  separador();

  const campo = (rotulo, valor) => {
    doc.setFont('courier', 'bold');
    doc.text(rotulo, M, y + lh - 1);
    const recuo = doc.getTextWidth(rotulo + ' ');
    doc.setFont('courier', 'normal');
    doc.splitTextToSize(valor, U - recuo).forEach(l => {
      doc.text(l, M + recuo, y + lh - 1);
      y += lh;
    });
  };
  campo('Cliente:', p.cliente || '-');
  campo('Pedido:', fmtDT(p.pedidoEm));
  campo('Entrega:', fmtDT(p.entregaEm));
  separador();

  const xQtd = W - M - (largura === 48 ? 15 : 22);
  const xVal = W - M;
  doc.setFont('courier', 'bold');
  doc.text('Item', M, y + lh - 1);
  doc.text('Qtd', xQtd, y + lh - 1, { align: 'right' });
  doc.text('Valor', xVal, y + lh - 1, { align: 'right' });
  y += lh;

  doc.setFont('courier', 'normal');
  const larguraNome = xQtd - M - (largura === 48 ? 7 : 8);
  p.itens.forEach(i => {
    doc.splitTextToSize(i.nome || '-', larguraNome).forEach((l, k) => {
      doc.text(l, M, y + lh - 1);
      if (k === 0) {
        doc.text(String(i.qtd), xQtd, y + lh - 1, { align: 'right' });
        doc.text(brl(i.qtd * i.valor), xVal, y + lh - 1, { align: 'right' });
      }
      y += lh;
    });
  });
  separador();

  doc.setFont('courier', 'bold');
  doc.setFontSize(fs + 1);
  doc.text('TOTAL', M, y + lh - 1);
  doc.text(brl(totalDe(p)), xVal, y + lh - 1, { align: 'right' });
  y += lh + 1;
  doc.setFontSize(fs);
  separador();

  doc.setFont('courier', 'normal');
  doc.text('Obrigado pela preferencia!', W / 2, y + lh - 1, { align: 'center' });
  y += lh;

  return y + M;
}

/** Gera e baixa o PDF do pedido na largura da bobina (48 ou 80 mm). */
export async function exportarPDF(pedido, empresa, largura) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('Biblioteca de PDF não carregou.');

  const img = await carregarImagem(empresa.logo);

  // 1ª passada mede a altura; 2ª gera o PDF com a altura exata
  const medida = new jsPDF({ unit: 'mm', format: [largura, 2000] });
  const altura = desenhar(medida, pedido, empresa, largura, img);

  // Se a altura ficar menor que a largura, o jsPDF inverteria as medidas
  // sozinho; a orientação explícita garante que a largura seja sempre a da bobina.
  const alturaFinal = Math.max(altura, 40);
  const orientation = alturaFinal > largura ? 'portrait' : 'landscape';
  const doc = new jsPDF({ orientation, unit: 'mm', format: [largura, alturaFinal] });
  desenhar(doc, pedido, empresa, largura, img);

  const nome = (pedido.cliente || 'pedido')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '_');
  doc.save(`pedido_${nome}_${largura}mm.pdf`);
}
