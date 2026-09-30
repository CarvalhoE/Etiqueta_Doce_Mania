const db = require('./db');

const stmts = {
  listar: db.prepare(`SELECT * FROM pedidos ORDER BY pedido_em DESC, id DESC`),
  listarPeriodo: db.prepare(`
    SELECT * FROM pedidos
    WHERE substr(pedido_em, 1, 10) BETWEEN @de AND @ate
    ORDER BY pedido_em DESC, id DESC`),
  listarPeriodoEntrega: db.prepare(`
    SELECT * FROM pedidos
    WHERE entrega_em IS NOT NULL AND substr(entrega_em, 1, 10) BETWEEN @de AND @ate
    ORDER BY entrega_em DESC, id DESC`),
  buscar: db.prepare(`SELECT * FROM pedidos WHERE id = ?`),
  itens: db.prepare(`SELECT nome, qtd, valor_centavos FROM itens WHERE pedido_id = ? ORDER BY id`),
  inserirPedido: db.prepare(`INSERT INTO pedidos (cliente, pedido_em, entrega_em) VALUES (@cliente, @pedidoEm, @entregaEm)`),
  atualizarPedido: db.prepare(`
    UPDATE pedidos SET cliente=@cliente, pedido_em=@pedidoEm, entrega_em=@entregaEm,
    atualizado_em=datetime('now') WHERE id=@id`),
  inserirItem: db.prepare(`INSERT INTO itens (pedido_id, nome, qtd, valor_centavos) VALUES (?, ?, ?, ?)`),
  apagarItens: db.prepare(`DELETE FROM itens WHERE pedido_id = ?`),
  apagarPedido: db.prepare(`DELETE FROM pedidos WHERE id = ?`),
};

function montar(row) {
  if (!row) return null;
  const rows = stmts.itens.all(row.id);
  const itens = rows.map(i => ({ nome: i.nome, qtd: i.qtd, valor: i.valor_centavos / 100 }));
  const totalCentavos = rows.reduce((s, i) => s + i.qtd * i.valor_centavos, 0);
  return {
    id: row.id,
    cliente: row.cliente,
    pedidoEm: row.pedido_em,
    entregaEm: row.entrega_em || '',
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    itens,
    total: totalCentavos / 100,
  };
}

function gravarItens(pedidoId, itens) {
  for (const it of itens) stmts.inserirItem.run(pedidoId, it.nome, it.qtd, it.valorCentavos);
}

const criar = db.transaction(dados => {
  const { lastInsertRowid } = stmts.inserirPedido.run(dados);
  gravarItens(lastInsertRowid, dados.itens);
  return montar(stmts.buscar.get(lastInsertRowid));
});

const atualizar = db.transaction((id, dados) => {
  const info = stmts.atualizarPedido.run({ ...dados, id });
  if (info.changes === 0) return null;
  stmts.apagarItens.run(id);
  gravarItens(id, dados.itens);
  return montar(stmts.buscar.get(id));
});

module.exports = {
  /** campo: 'pedido' (padrão) ou 'entrega' define qual data o período filtra. */
  listar({ de, ate, campo = 'pedido' } = {}) {
    let rows;
    if (de && ate) {
      const stmt = campo === 'entrega' ? stmts.listarPeriodoEntrega : stmts.listarPeriodo;
      rows = stmt.all({ de, ate });
    } else {
      rows = stmts.listar.all();
    }
    return rows.map(montar);
  },
  buscar: id => montar(stmts.buscar.get(id)),
  criar,
  atualizar,
  remover: id => stmts.apagarPedido.run(id).changes > 0,
};
