const { Router } = require('express');
const db = require('../db');
const { validarEmpresa } = require('../validacao');

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT nome, logo FROM empresa WHERE id = 1').get());
});

router.put('/', (req, res) => {
  const { dados, erro } = validarEmpresa(req.body);
  if (erro) return res.status(400).json({ erro });
  db.prepare('UPDATE empresa SET nome = @nome, logo = @logo WHERE id = 1').run(dados);
  res.json(dados);
});

module.exports = router;
