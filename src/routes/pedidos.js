const { Router } = require('express');
const repo = require('../pedidos.repo');
const { validarPedido } = require('../validacao');

const router = Router();
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function lerId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ erro: 'ID inválido.' });
    return null;
  }
  return id;
}

// GET /api/pedidos?de=YYYY-MM-DD&ate=YYYY-MM-DD&campo=pedido|entrega
router.get('/', (req, res) => {
  const { de, ate, campo = 'pedido' } = req.query;
  if ((de || ate) && !(DATA.test(de) && DATA.test(ate))) {
    return res.status(400).json({ erro: 'Use os parâmetros "de" e "ate" no formato AAAA-MM-DD.' });
  }
  if (!['pedido', 'entrega'].includes(campo)) {
    return res.status(400).json({ erro: 'O parâmetro "campo" deve ser "pedido" ou "entrega".' });
  }
  res.json(repo.listar({ de, ate, campo }));
});

router.get('/:id', (req, res) => {
  const id = lerId(req, res); if (!id) return;
  const pedido = repo.buscar(id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  res.json(pedido);
});

router.post('/', (req, res) => {
  const { dados, erro } = validarPedido(req.body);
  if (erro) return res.status(400).json({ erro });
  res.status(201).json(repo.criar(dados));
});

router.put('/:id', (req, res) => {
  const id = lerId(req, res); if (!id) return;
  const { dados, erro } = validarPedido(req.body);
  if (erro) return res.status(400).json({ erro });
  const pedido = repo.atualizar(id, dados);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  res.json(pedido);
});

router.delete('/:id', (req, res) => {
  const id = lerId(req, res); if (!id) return;
  if (!repo.remover(id)) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  res.status(204).end();
});

module.exports = router;
