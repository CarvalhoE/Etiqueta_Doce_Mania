const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dir, { recursive: true });

const db = new Database(path.join(dir, 'doceria.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS empresa (
    id    INTEGER PRIMARY KEY CHECK (id = 1),
    nome  TEXT NOT NULL DEFAULT 'Minha Doceria',
    logo  TEXT NOT NULL DEFAULT ''
  );
  INSERT OR IGNORE INTO empresa (id) VALUES (1);

  CREATE TABLE IF NOT EXISTS pedidos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente        TEXT NOT NULL,
    pedido_em      TEXT NOT NULL,          -- 'YYYY-MM-DDTHH:mm' (horário local)
    entrega_em     TEXT,                   -- idem, opcional
    criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_pedidos_pedido_em ON pedidos (pedido_em);

  CREATE TABLE IF NOT EXISTS itens (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    nome            TEXT NOT NULL,
    qtd             INTEGER NOT NULL CHECK (qtd > 0),
    valor_centavos  INTEGER NOT NULL CHECK (valor_centavos >= 0)
  );
  CREATE INDEX IF NOT EXISTS idx_itens_pedido ON itens (pedido_id);
`);

module.exports = db;
