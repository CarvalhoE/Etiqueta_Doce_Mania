const path = require('path');
const express = require('express');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '3mb' })); // logo vem em base64

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/empresa', require('./routes/empresa'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'Requisição muito grande.' });
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

module.exports = app;
