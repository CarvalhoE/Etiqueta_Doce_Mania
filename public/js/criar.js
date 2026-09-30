import { $, $$, esc, agoraLocal, toast } from './utils.js';
import { api } from './api.js';
import { empresa } from './empresa.js';
import { renderTicket } from './ticket.js';
import { exportarPDF } from './pdf.js';

let pedidoId = null; // preenchido depois de salvar (ou ao editar do histórico)

/* ---------- Itens ---------- */
function novaLinhaItem(item = { nome: '', qtd: 1, valor: '' }) {
  const linha = document.createElement('div');
  linha.className = 'item';
  linha.innerHTML = `
    <input class="i-nome" maxlength="240" placeholder="Ex.: Brigadeiro gourmet" value="${esc(item.nome)}">
    <input class="i-qtd" type="number" min="1" step="1" value="${item.qtd}">
    <input class="i-valor" type="number" min="0" step="0.01" placeholder="0,00" value="${item.valor}">
    <button class="rem" type="button" title="Remover item">✕</button>`;

  linha.querySelectorAll('input').forEach(i => i.addEventListener('input', render));
  linha.querySelector('.rem').addEventListener('click', () => {
    if ($$('#itens .item').length > 1) {
      linha.remove();
    } else {
      linha.querySelector('.i-nome').value = '';
      linha.querySelector('.i-qtd').value = 1;
      linha.querySelector('.i-valor').value = '';
    }
    render();
  });
  $('#itens').appendChild(linha);
}

/* ---------- Leitura do formulário ---------- */
export function lerPedido() {
  const itens = $$('#itens .item').map(l => ({
    nome: l.querySelector('.i-nome').value.trim(),
    qtd: parseInt(l.querySelector('.i-qtd').value) || 0,
    valor: parseFloat(l.querySelector('.i-valor').value) || 0,
  })).filter(i => i.nome || i.valor);

  return {
    cliente: $('#cliente').value.trim(),
    pedidoEm: $('#dtPedido').value,
    entregaEm: $('#dtEntrega').value,
    itens,
  };
}

/** Mensagem de erro de preenchimento, ou null se estiver ok. */
function validar(p) {
  if (!p.cliente) return 'Informe o nome da cliente.';
  if (!p.pedidoEm) return 'Informe a data e o horário do pedido.';
  if (!p.itens.length) return 'Adicione pelo menos um item.';
  if (p.itens.some(i => !i.nome)) return 'Todos os itens precisam de nome.';
  if (p.itens.some(i => i.qtd < 1)) return 'A quantidade mínima é 1.';
  return null;
}

/* ---------- Pré-visualização ---------- */
export function render() {
  renderTicket($('#ticket'), lerPedido(), empresa, $('#largura').value);
}

function atualizarBadge() {
  const b = $('#badgeEdicao');
  b.hidden = pedidoId === null;
  b.textContent = pedidoId ? `Pedido #${pedidoId}` : '';
}

/* ---------- Ações ---------- */
function novoPedido() {
  pedidoId = null;
  $('#cliente').value = '';
  $('#dtPedido').value = agoraLocal();
  $('#dtEntrega').value = '';
  $('#itens').innerHTML = '';
  novaLinhaItem();
  atualizarBadge();
  render();
}

/** Carrega um pedido existente no formulário (usado pelo histórico para "alterar"). */
export function carregarPedido(p) {
  pedidoId = p.id;
  $('#cliente').value = p.cliente;
  $('#dtPedido').value = p.pedidoEm;
  $('#dtEntrega').value = p.entregaEm || '';
  $('#itens').innerHTML = '';
  p.itens.forEach(novaLinhaItem);
  atualizarBadge();
  render();
}

async function salvar() {
  const p = lerPedido();
  const erro = validar(p);
  if (erro) return toast(erro);

  const botao = $('#salvar');
  botao.disabled = true;
  try {
    const salvo = pedidoId ? await api.pedidos.atualizar(pedidoId, p) : await api.pedidos.criar(p);
    const novo = pedidoId === null;
    pedidoId = salvo.id;
    atualizarBadge();
    toast(novo ? `Pedido #${salvo.id} salvo!` : `Pedido #${salvo.id} atualizado!`);
  } catch (e) {
    toast(e.message);
  } finally {
    botao.disabled = false;
  }
}

async function exportar() {
  const p = lerPedido();
  const erro = validar(p);
  if (erro) return toast(erro);
  try {
    await exportarPDF(p, empresa, parseInt($('#largura').value));
  } catch (e) {
    toast(e.message);
  }
}

function imprimir() {
  const erro = validar(lerPedido());
  if (erro) return toast(erro);

  const largura = parseInt($('#largura').value);
  const estilo = document.createElement('style');
  estilo.media = 'print';
  estilo.textContent = `
    @page { size: ${largura}mm auto; margin: 0; }
    body.imprimindo-ticket { margin: 0; background: #fff; }
    body.imprimindo-ticket * { visibility: hidden !important; }
    body.imprimindo-ticket #ticket,
    body.imprimindo-ticket #ticket * { visibility: visible !important; }
    body.imprimindo-ticket .prev-fundo { display: block; padding: 0; overflow: visible; }
    body.imprimindo-ticket #ticket {
      position: fixed; top: 0; left: 0; width: ${largura}mm !important;
      box-shadow: none;
    }
  `;
  const finalizar = () => {
    document.body.classList.remove('imprimindo-ticket');
    estilo.remove();
  };
  window.addEventListener('afterprint', finalizar, { once: true });
  document.head.appendChild(estilo);
  document.body.classList.add('imprimindo-ticket');
  window.print();
}

export function iniciarCriar() {
  ['#cliente', '#dtPedido', '#dtEntrega', '#largura'].forEach(s => $(s).addEventListener('input', render));
  $('#addItem').addEventListener('click', () => { novaLinhaItem(); render(); });
  $('#limpar').addEventListener('click', novoPedido);
  $('#salvar').addEventListener('click', salvar);
  $('#exportar').addEventListener('click', exportar);
  $('#imprimir').addEventListener('click', imprimir);
  novoPedido();
}
