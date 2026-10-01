const path = require('path');
const { randomBytes, timingSafeEqual } = require('crypto');
const express = require('express');
const db = require('./db');
const usuarios = require('./usuarios.repo');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const sessions = new Map();
const sessionDuration = 8 * 60 * 60 * 1000;
const sessionCookie = 'doceria_session';

function sessionId(req) {
  const cookie = req.headers.cookie?.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${sessionCookie}=`));
  return cookie?.slice(sessionCookie.length + 1) || '';
}

function authenticated(req) {
  const id = sessionId(req);
  const session = sessions.get(id);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return false;
  }
  req.usuario = usuarios.buscarPorId(session.usuarioId);
  if (!req.usuario) {
    sessions.delete(id);
    return false;
  }
  return true;
}

function equalsSecret(value, secret) {
  if (typeof value !== 'string') return false;
  const input = Buffer.from(value);
  const expected = Buffer.from(secret);
  return input.length === expected.length && timingSafeEqual(input, expected);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '3mb' })); // logo vem em base64

app.get('/login', (req, res) => {
  if (authenticated(req)) return res.redirect('/');
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(publicDir, 'login.html'));
});

app.get('/api/auth/branding', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(db.prepare('SELECT nome, logo FROM empresa WHERE id = 1').get());
});

app.post('/api/auth/login', (req, res) => {
  const usuario = usuarios.autenticar(req.body?.username, req.body?.password);
  if (!usuario) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }

  const id = randomBytes(32).toString('hex');
  sessions.set(id, { usuarioId: usuario.id, expiresAt: Date.now() + sessionDuration });
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${sessionCookie}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionDuration / 1000}${secure}`);
  res.json({ ok: true });
});

app.use((req, res, next) => {
  if (req.method === 'GET' && ['/css/login.css', '/js/login.js'].includes(req.path)) return next();
  if (authenticated(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ erro: 'Autenticação necessária.' });
  if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html')) && req.headers.accept?.includes('text/html')) {
    return res.redirect('/login');
  }
  res.status(401).send('Autenticação necessária.');
});

app.post('/api/auth/logout', (req, res) => {
  sessions.delete(sessionId(req));
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
  res.status(204).end();
});

app.get('/api/auth/me', (req, res) => {
  res.json(req.usuario);
});

app.use(express.static(publicDir));

app.use('/api/empresa', require('./routes/empresa'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'Requisição muito grande.' });
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

module.exports = app;
