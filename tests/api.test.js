const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// O banco de teste fica numa pasta temporária, criada antes de carregar o app
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'doceria-test-'));
const app = require('../src/app');

let server, base;
let cookie = '';
before(async () => {
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  require('../src/db').close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

const api = (rota, opts = {}) =>
  fetch(base + rota, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

const pedidoValido = () => ({
  cliente: 'Maria Silva',
  pedidoEm: '2026-09-29T10:30',
  entregaEm: '2026-09-30T15:00',
  itens: [
    { nome: 'Brigadeiro gourmet', qtd: 20, valor: 3.5 },
    { nome: 'Bolo de pote', qtd: 2, valor: 12.9 },
  ],
});

test('autenticação: protege a aplicação e libera acesso após login', async () => {
  let r = await fetch(base + '/api/empresa');
  assert.equal(r.status, 401);

  r = await fetch(base + '/api/auth/branding');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(await r.json()).sort(), ['logo', 'nome']);

  r = await fetch(base, { headers: { Accept: 'text/html' }, redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/login');

  r = await api('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'errada' } });
  assert.equal(r.status, 401);

  r = await api('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin' } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie'), /HttpOnly/);
  cookie = r.headers.get('set-cookie').split(';')[0];

  r = await api('/api/empresa');
  assert.equal(r.status, 200);
});

test('usuários: admins gerenciam contas e usuários comuns não acessam configurações', async () => {
  const adminCookie = cookie;
  let r = await api('/api/usuarios');
  const usuariosIniciais = await r.json();
  const adminPrincipal = usuariosIniciais.find(usuario => usuario.protegido);
  assert.ok(adminPrincipal);
  assert.equal((await api(`/api/usuarios/${adminPrincipal.id}`, { method: 'DELETE' })).status, 409);

  r = await api('/api/usuarios', {
    method: 'POST', body: { nome: 'operadora', senha: 'senha123', admin: false },
  });
  assert.equal(r.status, 201);
  const operadora = await r.json();
  assert.equal(operadora.admin, false);

  r = await api('/api/usuarios', {
    method: 'POST', body: { nome: 'operadora', senha: 'senha123', admin: false },
  });
  assert.equal(r.status, 409);

  r = await api('/api/usuarios', {
    method: 'POST', body: { nome: 'curta', senha: '123', admin: false },
  });
  assert.equal(r.status, 400);

  const loginOperadora = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operadora', password: 'senha123' }),
  });
  const operadoraCookie = loginOperadora.headers.get('set-cookie').split(';')[0];
  const cabecalhoOperadora = { Cookie: operadoraCookie };
  assert.equal(loginOperadora.status, 200);

  r = await fetch(base + '/api/auth/me', { headers: cabecalhoOperadora });
  assert.equal((await r.json()).admin, false);
  r = await fetch(base + '/api/usuarios', { headers: cabecalhoOperadora });
  assert.equal(r.status, 403);
  r = await fetch(base + `/api/usuarios/${operadora.id}`, {
    method: 'DELETE', headers: cabecalhoOperadora,
  });
  assert.equal(r.status, 403);
  r = await fetch(base + '/api/usuarios', {
    method: 'POST',
    headers: { ...cabecalhoOperadora, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'bloqueado', senha: 'senha123', admin: true }),
  });
  assert.equal(r.status, 403);
  r = await fetch(base + '/api/pedidos', { headers: cabecalhoOperadora });
  assert.equal(r.status, 200);

  r = await api('/api/usuarios', {
    method: 'POST', body: { nome: 'gestora', senha: 'senha123', admin: true },
  });
  assert.equal(r.status, 201);
  const loginGestora = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'gestora', password: 'senha123' }),
  });
  const gestoraCookie = loginGestora.headers.get('set-cookie').split(';')[0];
  assert.equal(loginGestora.status, 200);
  r = await fetch(base + '/api/usuarios', { headers: { Cookie: gestoraCookie } });
  assert.equal(r.status, 200);
  r = await fetch(base + `/api/usuarios/${operadora.id}`, {
    method: 'DELETE', headers: { Cookie: gestoraCookie },
  });
  assert.equal(r.status, 204);
  r = await fetch(base + `/api/usuarios/${operadora.id}`, {
    method: 'DELETE', headers: { Cookie: gestoraCookie },
  });
  assert.equal(r.status, 404);
  const gestora = await (await fetch(base + '/api/auth/me', { headers: { Cookie: gestoraCookie } })).json();
  r = await fetch(base + `/api/usuarios/${gestora.id}`, {
    method: 'DELETE', headers: { Cookie: gestoraCookie },
  });
  assert.equal(r.status, 409);
  r = await fetch(base + `/api/usuarios/${adminPrincipal.id}`, {
    method: 'DELETE', headers: { Cookie: gestoraCookie },
  });
  assert.equal(r.status, 409);
  cookie = adminCookie;
});

test('empresa: lê padrão e atualiza', async () => {
  let r = await api('/api/empresa');
  assert.equal((await r.json()).nome, 'Minha Doceria');

  r = await api('/api/empresa', { method: 'PUT', body: { nome: 'Doce Sabor', logo: '' } });
  assert.equal(r.status, 200);
  r = await api('/api/empresa');
  assert.equal((await r.json()).nome, 'Doce Sabor');
});

test('empresa: rejeita logo que não é PNG/JPG', async () => {
  const r = await api('/api/empresa', { method: 'PUT', body: { nome: 'X', logo: 'data:text/html;base64,AAAA' } });
  assert.equal(r.status, 400);
});

test('pedidos: CRUD completo com total correto', async () => {
  let r = await api('/api/pedidos', { method: 'POST', body: pedidoValido() });
  assert.equal(r.status, 201);
  const criado = await r.json();
  assert.equal(criado.cliente, 'Maria Silva');
  assert.equal(criado.itens.length, 2);
  assert.equal(criado.total, 95.8); // 20*3,50 + 2*12,90

  r = await api(`/api/pedidos/${criado.id}`);
  assert.equal((await r.json()).id, criado.id);

  const alterado = { ...pedidoValido(), cliente: 'Maria S.', itens: [{ nome: 'Trufa', qtd: 10, valor: 4 }] };
  r = await api(`/api/pedidos/${criado.id}`, { method: 'PUT', body: alterado });
  const atualizado = await r.json();
  assert.equal(atualizado.cliente, 'Maria S.');
  assert.equal(atualizado.itens.length, 1);
  assert.equal(atualizado.total, 40);

  r = await api(`/api/pedidos/${criado.id}`, { method: 'DELETE' });
  assert.equal(r.status, 204);
  r = await api(`/api/pedidos/${criado.id}`);
  assert.equal(r.status, 404);
});

test('pedidos: filtro por período e ordem decrescente', async () => {
  await api('/api/pedidos', { method: 'POST', body: { ...pedidoValido(), pedidoEm: '2026-01-10T09:00' } });
  await api('/api/pedidos', { method: 'POST', body: { ...pedidoValido(), pedidoEm: '2026-01-20T09:00' } });
  await api('/api/pedidos', { method: 'POST', body: { ...pedidoValido(), pedidoEm: '2026-02-05T09:00' } });

  let r = await api('/api/pedidos?de=2026-01-01&ate=2026-01-31');
  let lista = await r.json();
  assert.equal(lista.length, 2);
  assert.equal(lista[0].pedidoEm, '2026-01-20T09:00');

  r = await api('/api/pedidos?de=2026-01-20&ate=2026-01-20');
  assert.equal((await r.json()).length, 1); // limite inclusivo

  r = await api('/api/pedidos?de=ontem&ate=hoje');
  assert.equal(r.status, 400);
});

test('pedidos: filtro pela data da entrega ignora pedidos sem entrega', async () => {
  const base = { ...pedidoValido(), cliente: 'Filtro Entrega' };
  await api('/api/pedidos', { method: 'POST', body: { ...base, pedidoEm: '2026-03-01T08:00', entregaEm: '2026-03-15T10:00' } });
  const semEntrega = { ...base, pedidoEm: '2026-03-15T08:00' }; delete semEntrega.entregaEm;
  await api('/api/pedidos', { method: 'POST', body: semEntrega });

  let r = await api('/api/pedidos?de=2026-03-15&ate=2026-03-15&campo=entrega');
  let lista = await r.json();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].entregaEm, '2026-03-15T10:00');

  // pela data do pedido, o mesmo dia traz o pedido sem entrega
  r = await api('/api/pedidos?de=2026-03-15&ate=2026-03-15&campo=pedido');
  lista = await r.json();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].entregaEm, '');

  r = await api('/api/pedidos?de=2026-03-01&ate=2026-03-31&campo=outro');
  assert.equal(r.status, 400);
});

test('pedidos: validações', async () => {
  const casos = [
    { ...pedidoValido(), cliente: '  ' },
    { ...pedidoValido(), pedidoEm: '29/09/2026' },
    { ...pedidoValido(), entregaEm: 'amanhã' },
    { ...pedidoValido(), itens: [] },
    { ...pedidoValido(), itens: [{ nome: 'X', qtd: 0, valor: 1 }] },
    { ...pedidoValido(), itens: [{ nome: 'X', qtd: 1, valor: -1 }] },
    { ...pedidoValido(), itens: [{ nome: '', qtd: 1, valor: 1 }] },
  ];
  for (const corpo of casos) {
    const r = await api('/api/pedidos', { method: 'POST', body: corpo });
    assert.equal(r.status, 400, JSON.stringify(corpo));
  }
});

test('pedidos: entrega é opcional e IDs inválidos/inexistentes', async () => {
  const semEntrega = { ...pedidoValido() }; delete semEntrega.entregaEm;
  let r = await api('/api/pedidos', { method: 'POST', body: semEntrega });
  assert.equal(r.status, 201);
  assert.equal((await r.json()).entregaEm, '');

  assert.equal((await api('/api/pedidos/abc')).status, 400);
  assert.equal((await api('/api/pedidos/99999')).status, 404);
  assert.equal((await api('/api/pedidos/99999', { method: 'PUT', body: pedidoValido() })).status, 404);
  assert.equal((await api('/api/pedidos/99999', { method: 'DELETE' })).status, 404);
});

test('JSON inválido retorna 400 e rota /api desconhecida 404', async () => {
  let r = await fetch(base + '/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
  assert.equal(r.status, 400);
  r = await api('/api/nada');
  assert.equal(r.status, 404);

  r = await api('/api/auth/logout', { method: 'POST' });
  assert.equal(r.status, 204);
  r = await api('/api/empresa');
  assert.equal(r.status, 401);
});
