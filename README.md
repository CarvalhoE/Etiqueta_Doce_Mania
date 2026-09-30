# Etiquetas da Doceria

Sistema para criar pedidos, imprimir a etiqueta em bobina (80mm ou 48mm) e guardar tudo em banco de dados.

## Como rodar

```bash
npm install
npm start
```

Abra http://localhost:3000. Para desenvolvimento (reinicia ao salvar): `npm run dev`.

Requisitos: Node.js 18 ou superior. Porta diferente: `PORT=4000 npm start`.

## Telas

- **Criar Pedido:** formulário com pré-visualização do ticket em tempo real, salvar no banco e exportar PDF (80mm ou 48mm).
- **Histórico de Pedidos:** tabela agrupada por dia, com atalhos (Hoje, Amanhã, Esta semana, Este mês, Todos), filtro por data do pedido ou da entrega, período livre e busca por cliente. Clicar em um pedido abre o popup com o ticket para reimprimir, alterar os dados ou apagar.

## Estrutura

```
server.js              inicia o servidor
src/
  app.js               configuração do Express
  db.js                conexão SQLite e criação das tabelas
  validacao.js         regras de validação dos dados recebidos
  pedidos.repo.js      acesso ao banco (pedidos e itens)
  routes/              rotas da API (empresa, pedidos)
public/
  index.html           página
  css/style.css        estilos
  js/                  app, criar (tela de pedido), historico, ticket (preview),
                       pdf (exportação), empresa, api, utils
  vendor/jspdf/        biblioteca de PDF (jsPDF 4.2.1), arquivo local
tests/api.test.js      testes automatizados da API (npm test)
data/doceria.db        banco (criado automaticamente, fora do git)
```

## API

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/empresa` | Nome e logo |
| PUT | `/api/empresa` | Atualiza nome e logo |
| GET | `/api/pedidos` | Lista (opcional: `?de=AAAA-MM-DD&ate=AAAA-MM-DD&campo=pedido\|entrega`) |
| GET | `/api/pedidos/:id` | Um pedido |
| POST | `/api/pedidos` | Cria |
| PUT | `/api/pedidos/:id` | Altera |
| DELETE | `/api/pedidos/:id` | Apaga |

Formato do pedido:

```json
{
  "cliente": "Maria Silva",
  "pedidoEm": "2026-09-29T10:30",
  "entregaEm": "2026-09-30T15:00",
  "itens": [{ "nome": "Brigadeiro", "qtd": 20, "valor": 3.5 }]
}
```

`valor` é o valor unitário em reais (guardado em centavos no banco). O `total` é calculado pelo servidor.

## Backup

Todo o banco é o arquivo `data/doceria.db`. Para fazer backup, copie esse arquivo com o servidor parado.
