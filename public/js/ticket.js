import { esc, fmtDT, brl, totalDe } from './utils.js';

/** HTML do ticket (usado na pré-visualização e, depois, no popup do histórico). */
export function ticketHTML(pedido, empresa) {
  const linhas = pedido.itens.length
    ? pedido.itens.map(i =>
        `<div class="it"><span>${esc(i.nome || '-')}</span><span>${i.qtd}</span><span>${brl(i.qtd * i.valor)}</span></div>`
      ).join('')
    : '<div class="vazio-itens">(sem itens)</div>';

  return `
    ${empresa.logo ? `<img class="logo" src="${empresa.logo}" alt="">` : ''}
    <div class="nome">${esc(empresa.nome || 'Doceria')}</div>
    <hr>
    <div><b>Cliente:</b> ${esc(pedido.cliente || '-')}</div>
    <div><b>Pedido:</b> ${fmtDT(pedido.pedidoEm)}</div>
    <div><b>Entrega:</b> ${fmtDT(pedido.entregaEm)}</div>
    <hr>
    <div class="it cab"><span>Item</span><span>Qtd</span><span>Valor</span></div>
    ${linhas}
    <hr>
    <div class="tot"><span>TOTAL</span><span>${brl(totalDe(pedido))}</span></div>
    <hr>
    <div class="centro">Obrigado pela preferência!</div>`;
}

/** Desenha o ticket dentro de um elemento, na largura escolhida (48 ou 80). */
export function renderTicket(el, pedido, empresa, largura) {
  el.className = `ticket w${largura}`;
  el.innerHTML = ticketHTML(pedido, empresa);
}
