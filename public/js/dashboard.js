import { $, brl } from './utils.js';
import { api } from './api.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LIMITE_MESES = 120;
let mesesAtuais = null;

function valorMes(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function lerMes(valor) {
  const [ano, mes] = valor.split('-').map(Number);
  if (!ano || mes < 1 || mes > 12) return null;
  return { ano, mes };
}

function dataIso(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function mesesNoPeriodo(inicio, fim) {
  const quantidade = (fim.ano - inicio.ano) * 12 + fim.mes - inicio.mes + 1;
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(inicio.ano, inicio.mes - 1 + indice, 1);
    const chave = valorMes(data);
    return {
      chave,
      rotulo: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      ano: String(data.getFullYear()),
      nome: data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      pedidos: 0,
      total: 0,
    };
  });
}

function elementoSvg(nome, atributos = {}, texto = '') {
  const elemento = document.createElementNS(SVG_NS, nome);
  Object.entries(atributos).forEach(([chave, valor]) => elemento.setAttribute(chave, valor));
  if (texto) elemento.textContent = texto;
  return elemento;
}

function valorEixo(valor, dinheiro) {
  if (!dinheiro) return String(Math.round(valor));
  if (valor >= 1000000) return `R$ ${(valor / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (valor >= 1000) return `R$ ${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return brl(valor);
}

function desenharGrafico(svg, meses, chave, dinheiro) {
  svg.replaceChildren();
  const altura = 250;
  const margem = { topo: 14, direita: 12, baixo: 48, esquerda: dinheiro ? 58 : 38 };
  const area = svg.parentElement.clientWidth || 480;
  const largura = Math.max(area, meses.length * 44 + margem.esquerda + margem.direita);
  const larguraPlot = largura - margem.esquerda - margem.direita;
  const alturaPlot = altura - margem.topo - margem.baixo;
  const base = margem.topo + alturaPlot;
  const maximo = Math.max(1, ...meses.map(mes => mes[chave]));
  const passoEixo = dinheiro ? maximo / 4 : Math.max(1, Math.ceil(maximo / 4));
  const maximoEixo = dinheiro ? maximo : Math.ceil(maximo / passoEixo) * passoEixo;
  const quantidadePassos = dinheiro ? 4 : maximoEixo / passoEixo;

  svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
  svg.setAttribute('width', largura);
  svg.setAttribute('height', altura);

  for (let passo = 0; passo <= quantidadePassos; passo += 1) {
    const y = margem.topo + alturaPlot * passo / quantidadePassos;
    const valor = maximoEixo * (quantidadePassos - passo) / quantidadePassos;
    svg.appendChild(elementoSvg('line', {
      x1: margem.esquerda, y1: y, x2: largura - margem.direita, y2: y, class: 'chart-grid',
    }));
    svg.appendChild(elementoSvg('text', {
      x: margem.esquerda - 7, y: y + 4, 'text-anchor': 'end', class: 'chart-axis',
    }, valorEixo(valor, dinheiro)));
  }

  const espaco = larguraPlot / meses.length;
  const barraLargura = Math.min(30, espaco * 0.58);
  meses.forEach((mes, indice) => {
    const valor = mes[chave];
    const barraAltura = alturaPlot * valor / maximoEixo;
    const x = margem.esquerda + espaco * indice + (espaco - barraLargura) / 2;
    const grupo = elementoSvg('g');
    const barra = elementoSvg('rect', {
      x, y: base - barraAltura, width: barraLargura, height: barraAltura,
      rx: 3, class: dinheiro ? 'chart-bar-vendas' : 'chart-bar-pedidos',
    });
    const descricao = dinheiro
      ? `${mes.nome}: ${brl(valor)} em pedidos`
      : `${mes.nome}: ${valor} pedido${valor === 1 ? '' : 's'}`;
    barra.appendChild(elementoSvg('title', {}, descricao));
    grupo.appendChild(barra);

    const rotulo = elementoSvg('text', {
      x: x + barraLargura / 2, y: base + 17, 'text-anchor': 'middle', class: 'chart-axis',
    });
    rotulo.appendChild(elementoSvg('tspan', { x: x + barraLargura / 2 }, mes.rotulo));
    rotulo.appendChild(elementoSvg('tspan', { x: x + barraLargura / 2, dy: 13 }, mes.ano));
    grupo.appendChild(rotulo);
    svg.appendChild(grupo);
  });
}

function redesenharGraficos() {
  if (!mesesAtuais) return;
  desenharGrafico($('#graficoPedidos'), mesesAtuais, 'pedidos', false);
  desenharGrafico($('#graficoVendas'), mesesAtuais, 'total', true);
}

function exibirErro(mensagem = '') {
  const erro = $('#graficoErro');
  erro.textContent = mensagem;
  erro.hidden = !mensagem;
}

export async function carregarDashboard() {
  const inicio = lerMes($('#graficoDe').value);
  const fim = lerMes($('#graficoAte').value);
  if (!inicio || !fim) return;

  const quantidadeMeses = (fim.ano - inicio.ano) * 12 + fim.mes - inicio.mes + 1;
  if (quantidadeMeses < 1) {
    exibirErro('A data inicial precisa ser anterior à data final.');
    return;
  }
  if (quantidadeMeses > LIMITE_MESES) {
    exibirErro('Selecione um intervalo de até 10 anos.');
    return;
  }

  exibirErro();
  const primeiroDia = dataIso(inicio.ano, inicio.mes, 1);
  const ultimoDia = dataIso(fim.ano, fim.mes, new Date(fim.ano, fim.mes, 0).getDate());
  try {
    const pedidos = await api.pedidos.listar(primeiroDia, ultimoDia, 'pedido');
    const meses = mesesNoPeriodo(inicio, fim);
    const porMes = new Map(meses.map(mes => [mes.chave, mes]));
    pedidos.forEach(pedido => {
      const mes = porMes.get(pedido.pedidoEm.slice(0, 7));
      if (!mes) return;
      mes.pedidos += 1;
      mes.total += pedido.total;
    });
    mesesAtuais = meses;

    $('#totalPedidos').textContent = String(pedidos.length);
    $('#totalVendas').textContent = brl(pedidos.reduce((soma, pedido) => soma + pedido.total, 0));
    $('#graficoVazio').hidden = pedidos.length > 0;
    const periodo = `${meses[0].nome} a ${meses[meses.length - 1].nome}`;
    $('#periodoPedidos').textContent = periodo;
    $('#periodoVendas').textContent = periodo;
    redesenharGraficos();
  } catch (erro) {
    exibirErro(erro.message);
  }
}

export function iniciarDashboard() {
  const atual = new Date();
  const inicio = new Date(atual.getFullYear(), atual.getMonth() - 11, 1);
  $('#graficoDe').value = valorMes(inicio);
  $('#graficoAte').value = valorMes(atual);
  $('#graficoFiltros').addEventListener('submit', evento => {
    evento.preventDefault();
    carregarDashboard();
  });
  window.addEventListener('resize', () => {
    if ($('#view-inicio').classList.contains('ativa')) redesenharGraficos();
  });
}