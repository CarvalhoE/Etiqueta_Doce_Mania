import { $, $$ } from './utils.js';
import { iniciarEmpresa } from './empresa.js';
import { iniciarCriar, render } from './criar.js';
import { iniciarHistorico, carregar as carregarHistorico } from './historico.js';

const VIEWS = ['criar', 'historico'];

function mostrar(nome) {
  if (!VIEWS.includes(nome)) nome = 'criar';
  $$('.navbar button').forEach(b => b.classList.toggle('ativo', b.dataset.view === nome));
  $$('.view').forEach(v => v.classList.toggle('ativa', v.id === `view-${nome}`));
  if (nome === 'historico') carregarHistorico(); // sempre mostra dados atualizados
}

async function iniciar() {
  iniciarCriar();
  iniciarHistorico();
  await iniciarEmpresa(render);

  $$('.navbar button').forEach(b =>
    b.addEventListener('click', () => { location.hash = b.dataset.view; }));
  window.addEventListener('hashchange', () => mostrar(location.hash.slice(1)));
  mostrar(location.hash.slice(1));
}

iniciar();
