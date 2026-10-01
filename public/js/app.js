import { $, $$ } from './utils.js';
import { iniciarEmpresa } from './empresa.js';
import { iniciarCriar, render } from './criar.js';
import { iniciarHistorico, carregar as carregarHistorico } from './historico.js';
import { iniciarDashboard, carregarDashboard } from './dashboard.js';
import { iniciarConfiguracoes, carregar as carregarUsuarios } from './configuracoes.js';

const VIEWS = ['inicio', 'criar', 'historico', 'configuracoes'];
let usuarioAtual = null;

function mostrar(nome) {
  if (!VIEWS.includes(nome) || (nome === 'configuracoes' && !usuarioAtual?.admin)) nome = 'inicio';
  $$('.navbar button[data-view]').forEach(b => b.classList.toggle('ativo', b.dataset.view === nome));
  $$('.view').forEach(v => v.classList.toggle('ativa', v.id === `view-${nome}`));
  if (nome === 'inicio') carregarDashboard();
  if (nome === 'historico') carregarHistorico(); // sempre mostra dados atualizados
  if (nome === 'configuracoes') carregarUsuarios();
}

async function iniciar() {
  const resposta = await fetch('/api/auth/me');
  if (!resposta.ok) return location.replace('/login');
  usuarioAtual = await resposta.json();
  $('#navConfiguracoes').hidden = !usuarioAtual.admin;

  iniciarCriar();
  iniciarHistorico();
  iniciarDashboard();
  if (usuarioAtual.admin) iniciarConfiguracoes();
  await iniciarEmpresa(render);

  $$('.navbar button[data-view]').forEach(b =>
    b.addEventListener('click', () => { location.hash = b.dataset.view; }));
  $('#logout').addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      location.replace('/login');
    }
  });
  window.addEventListener('hashchange', () => mostrar(location.hash.slice(1)));
  mostrar(location.hash.slice(1));
}

iniciar();
