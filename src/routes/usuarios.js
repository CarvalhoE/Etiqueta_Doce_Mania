const { Router } = require('express');
const repo = require('../usuarios.repo');

const router = Router();

router.use((req, res, next) => {
  if (!req.usuario?.admin) return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
  next();
});

router.get('/', (req, res) => {
  res.json(repo.listar());
});

router.post('/', (req, res) => {
  const nome = String(req.body?.nome ?? '').trim();
  const senha = req.body?.senha;
  const admin = req.body?.admin === true;

  if (!nome) return res.status(400).json({ erro: 'Informe o nome do usuário.' });
  if (nome.length > 80) return res.status(400).json({ erro: 'O nome pode ter até 80 caracteres.' });
  if (typeof senha !== 'string' || senha.length < 6 || senha.length > 128) {
    return res.status(400).json({ erro: 'A senha deve ter entre 6 e 128 caracteres.' });
  }

  try {
    res.status(201).json(repo.criar({ nome, senha, admin }));
  } catch (erro) {
    if (erro.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ erro: 'Já existe um usuário com esse nome.' });
    }
    throw erro;
  }
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ erro: 'ID inválido.' });

  const usuario = repo.buscarPorId(id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (usuario.protegido) return res.status(409).json({ erro: 'O administrador principal não pode ser apagado.' });
  if (req.usuario.id === id) return res.status(409).json({ erro: 'Você não pode apagar seu próprio usuário.' });
  if (!repo.remover(id)) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  res.status(204).end();
});

module.exports = router;