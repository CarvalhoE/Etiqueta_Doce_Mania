import { $, $$, esc, brl, fmtDT, toast, isoData, somarDias, rotuloDia, imprimirTicket } from './utils.js';
import { api } from './api.js';
import { empresa } from './empresa.js';
import { renderTicket } from './ticket.js';
import { exportarPDF } from './pdf.js';
import { exportarPNG } from './png.js';
import { carregarPedido } from './criar.js';
import { ticketHTML } from './ticket.js';

const estado = {
  periodo: 'mes',   // chip ativo, ou '' quando as datas foram digitadas à mão
  pedidos: [],
  atual: null,      // pedido aberto no popup
  selecionados: new Set(),
};

/* ---------- Períodos rápidos ---------- */
function intervalo(periodo) {
  const hoje = new Date();
  switch (periodo) {
    case 'hoje':   return [isoData(hoje), isoData(hoje)];
    case 'amanha': { const a = isoData(somarDias(hoje, 1)); return [a, a]; }
    case 'semana': {
      const dia = (hoje.getDay() + 6) % 7; // segunda = 0
      const seg = somarDias(hoje, -dia);
      return [isoData(seg), isoData(somarDias(seg, 6))];
    }
    case 'mes': {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      return [isoData(ini), isoData(fim)];
    }
    default: return ['', ''];
  }
}

function marcarChip() {
  $$('#chipsPeriodo .chip').forEach(c => c.classList.toggle('ativo', c.dataset.periodo === estado.periodo));
}

function aplicarPeriodo(periodo) {
  estado.periodo = periodo;
  const [de, ate] = intervalo(periodo);
  $('#fDe').value = de;
  $('#fAte').value = ate;
  marcarChip();
  carregar();
}

/* ---------- Carregar e desenhar a tabela ---------- */
export async function carregar() {
  estado.selecionados.clear();
  // Com só uma das datas preenchida, a outra fica aberta
  const de = $('#fDe').value, ate = $('#fAte').value;
  const usarPeriodo = de || ate;
  try {
    estado.pedidos = await api.pedidos.listar(
      usarPeriodo ? (de || '0001-01-01') : '',
      usarPeriodo ? (ate || '9999-12-31') : '',
      $('#fCampo').value,
    );
  } catch (e) {
    estado.pedidos = [];
    toast(e.message);
  }
  desenhar();
}

const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function desenhar() {
  const campo = $('#fCampo').value === 'entrega' ? 'entregaEm' : 'pedidoEm';
  const busca = semAcento($('#fBusca').value.trim());
  const lista = estado.pedidos.filter(p => !busca || semAcento(p.cliente).includes(busca));

  // Agrupa pelo dia da data escolhida
  const grupos = new Map();
  for (const p of lista) {
    const dia = p[campo] ? p[campo].slice(0, 10) : 'sem-data';
    if (!grupos.has(dia)) grupos.set(dia, []);
    grupos.get(dia).push(p);
  }
  // Dias mais recentes primeiro; "sem data" por último. Dentro do dia, em ordem de horário.
  const dias = [...grupos.keys()].sort((a, b) =>
    a === 'sem-data' ? 1 : b === 'sem-data' ? -1 : b.localeCompare(a));

  const linhas = dias.map(dia => {
    const pedidos = grupos.get(dia).sort((a, b) => (a[campo] || '').localeCompare(b[campo] || '') || a.id - b.id);
    const soma = pedidos.reduce((s, p) => s + p.total, 0);
    const titulo = dia === 'sem-data' ? 'Sem data de entrega' : rotuloDia(dia);
    const info = `${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''} · ${brl(soma)}`;
    return `<tr class="grupo"><td colspan="7">${esc(titulo)}<span class="grupo-info">${info}</span></td></tr>` +
      pedidos.map(p => `
        <tr class="linha" data-id="${p.id}" tabindex="0">
          <td class="col-selecao"><input class="selecao-pedido" type="checkbox" data-id="${p.id}" aria-label="Selecionar pedido #${p.id}" ${estado.selecionados.has(p.id) ? 'checked' : ''}></td>
          <td class="col-num">#${p.id}</td>
          <td class="cliente">${esc(p.cliente)}</td>
          <td>${fmtDT(p.pedidoEm)}</td>
          <td>${fmtDT(p.entregaEm)}</td>
          <td class="col-dir">${p.itens.reduce((s, i) => s + i.qtd, 0)}</td>
          <td class="col-dir">${brl(p.total)}</td>
        </tr>`).join('');
  }).join('');

  $('#tabelaPedidos').innerHTML = linhas;
  const selecionarTodos = $('#selecionarTodosPedidos');
  const marcadosVisiveis = lista.filter(p => estado.selecionados.has(p.id)).length;
  selecionarTodos.checked = lista.length > 0 && marcadosVisiveis === lista.length;
  selecionarTodos.indeterminate = marcadosVisiveis > 0 && marcadosVisiveis < lista.length;

  const total = lista.reduce((s, p) => s + p.total, 0);
  $('#histResumo').innerHTML = lista.length
    ? `<strong>${lista.length}</strong> pedido${lista.length > 1 ? 's' : ''} · total <strong>${brl(total)}</strong>`
    : '';

  const vazio = $('#histVazio');
  vazio.hidden = lista.length > 0;
  vazio.textContent = estado.pedidos.length && busca
    ? 'Nenhum pedido encontrado para essa busca.'
    : 'Nenhum pedido neste período.';
  $('.tabela-wrap').hidden = lista.length === 0;
}

/* ---------- Popup ---------- */
function mostrarConfirmacao(sim) {
  $('#acoesNormais').hidden = sim;
  $('#acoesConfirma').hidden = !sim;
}

function renderModal() {
  renderTicket($('#modalTicket'), estado.atual, empresa, $('#modalLargura').value);
}

function abrirPedido(id) {
  const p = estado.pedidos.find(x => x.id === id);
  if (!p) return;
  estado.atual = p;
  $('#modalTitulo').textContent = `Pedido #${p.id}`;
  mostrarConfirmacao(false);
  renderModal();
  $('#modalPedido').showModal();
}

async function exportar() {
  try {
    if ($('#modalFormato').value === 'png') {
      await exportarPNG($('#modalTicket'), estado.atual, parseInt($('#modalLargura').value));
    } else {
      await exportarPDF(estado.atual, empresa, parseInt($('#modalLargura').value));
    }
  } catch (e) {
    toast(e.message);
  }
}

function imprimir() {
  imprimirTicket('#modalTicket', parseInt($('#modalLargura').value));
}

function imprimirSelecionados() {
  const pedidos = estado.pedidos.filter(p => estado.selecionados.has(p.id));
  if (!pedidos.length) {
    toast('É necessário selecionar ao menos 1 pedido para impressão.');
    return;
  }

  const formato = $('#histFormato').value;
  const largura = formato === 'a4' ? 80 : parseInt(formato, 10);
  const area = $('#impressaoMultipla');
  area.innerHTML = pedidos.map(p => `<div class="ticket w${largura}">${ticketHTML(p, empresa)}</div>`).join('');
  area.hidden = false;

  const estilo = document.createElement('style');
  estilo.media = 'print';
  const regrasFormato = formato === 'a4'
    ? `
      @page { size: A4 portrait; margin: 10mm; }
      body.imprimindo-multiplos #impressaoMultipla {
        display: grid !important; grid-template-columns: repeat(2, 80mm);
        justify-content: center; align-content: start; gap: 8mm 10mm; width: 100%;
      }
      body.imprimindo-multiplos #impressaoMultipla .ticket {
        break-inside: avoid; page-break-inside: avoid;
      }
    `
    : `
      @page { size: ${largura}mm auto; margin: 0; }
      body.imprimindo-multiplos #impressaoMultipla .ticket { break-after: page; page-break-after: always; }
      body.imprimindo-multiplos #impressaoMultipla .ticket:last-child { break-after: auto; page-break-after: auto; }
    `;
  estilo.textContent = `
    body.imprimindo-multiplos * { visibility: hidden !important; }
    body.imprimindo-multiplos #impressaoMultipla,
    body.imprimindo-multiplos #impressaoMultipla * { visibility: visible !important; }
    body.imprimindo-multiplos #impressaoMultipla { display: block !important; position: absolute; top: 0; left: 0; }
    body.imprimindo-multiplos #impressaoMultipla .ticket { box-shadow: none; }
    ${regrasFormato}
  `;
  const finalizar = () => {
    document.body.classList.remove('imprimindo-multiplos');
    area.innerHTML = '';
    area.hidden = true;
    estilo.remove();
  };
  window.addEventListener('afterprint', finalizar, { once: true });
  document.head.appendChild(estilo);
  document.body.classList.add('imprimindo-multiplos');
  window.print();
}

function alterar() {
  const p = estado.atual;
  $('#modalPedido').close();
  carregarPedido(p);
  location.hash = 'criar';
  toast(`Editando o pedido #${p.id}.`);
}

async function apagar() {
  const p = estado.atual;
  const botao = $('#modalConfirmarApagar');
  botao.disabled = true;
  try {
    await api.pedidos.apagar(p.id);
    $('#modalPedido').close();
    toast(`Pedido #${p.id} apagado.`);
    await carregar();
  } catch (e) {
    toast(e.message);
  } finally {
    botao.disabled = false;
  }
}

/* ---------- Início ---------- */
export function iniciarHistorico() {
  $$('#chipsPeriodo .chip').forEach(c => c.addEventListener('click', () => aplicarPeriodo(c.dataset.periodo)));

  ['#fDe', '#fAte'].forEach(s => $(s).addEventListener('change', () => {
    estado.periodo = '';
    marcarChip();
    carregar();
  }));
  $('#fCampo').addEventListener('change', carregar);
  $('#fBusca').addEventListener('input', desenhar);

  const abrirDaLinha = e => {
    if (e.target.closest('.selecao-pedido')) return;
    const linha = e.target.closest('tr.linha');
    if (linha) abrirPedido(Number(linha.dataset.id));
  };
  $('#tabelaPedidos').addEventListener('click', abrirDaLinha);
  $('#tabelaPedidos').addEventListener('keydown', e => { if (e.key === 'Enter') abrirDaLinha(e); });
  $('#tabelaPedidos').addEventListener('change', e => {
    const checkbox = e.target.closest('.selecao-pedido');
    if (!checkbox) return;
    const id = Number(checkbox.dataset.id);
    if (checkbox.checked) estado.selecionados.add(id);
    else estado.selecionados.delete(id);
    desenhar();
  });
  $('#selecionarTodosPedidos').addEventListener('change', e => {
    const busca = semAcento($('#fBusca').value.trim());
    const visiveis = estado.pedidos.filter(p => !busca || semAcento(p.cliente).includes(busca));
    visiveis.forEach(p => e.target.checked ? estado.selecionados.add(p.id) : estado.selecionados.delete(p.id));
    desenhar();
  });
  $('#imprimirSelecionados').addEventListener('click', imprimirSelecionados);

  const modal = $('#modalPedido');
  $('#modalFechar').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); }); // clique fora
  $('#modalLargura').addEventListener('change', renderModal);
  $('#modalExportar').addEventListener('click', exportar);
  $('#modalImprimir').addEventListener('click', imprimir);
  $('#modalAlterar').addEventListener('click', alterar);
  $('#modalApagar').addEventListener('click', () => mostrarConfirmacao(true));
  $('#modalCancelarApagar').addEventListener('click', () => mostrarConfirmacao(false));
  $('#modalConfirmarApagar').addEventListener('click', apagar);

  aplicarPeriodo(estado.periodo);
}
