const db = require('./db');
const { hashSenha, verificarSenha } = require('./senhas');

function usuarioPublico(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    admin: Boolean(row.admin),
    protegido: Boolean(row.protegido),
    criadoEm: row.criado_em,
  };
}

function buscarPorId(id) {
  return usuarioPublico(db.prepare('SELECT id, nome, admin, protegido, criado_em FROM usuarios WHERE id = ?').get(id));
}

module.exports = {
  autenticar(nome, senha) {
    if (typeof nome !== 'string' || typeof senha !== 'string') return null;
    const row = db.prepare('SELECT id, nome, senha_hash, admin, criado_em FROM usuarios WHERE nome = ?').get(nome.trim());
    if (!row || !verificarSenha(senha, row.senha_hash)) return null;
    return usuarioPublico(row);
  },

  buscarPorId,

  listar() {
    return db.prepare('SELECT id, nome, admin, protegido, criado_em FROM usuarios ORDER BY nome COLLATE NOCASE')
      .all().map(usuarioPublico);
  },

  criar({ nome, senha, admin }) {
    const resultado = db.prepare('INSERT INTO usuarios (nome, senha_hash, admin) VALUES (?, ?, ?)')
      .run(nome, hashSenha(senha), admin ? 1 : 0);
    return buscarPorId(resultado.lastInsertRowid);
  },

  remover(id) {
    return db.prepare('DELETE FROM usuarios WHERE id = ? AND protegido = 0').run(id).changes > 0;
  },
};