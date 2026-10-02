# Gerenciamento Empresa
Aplicação web para acompanhar pedidos da doceria, gerar tickets para bobinas térmicas e manter os dados salvos em um banco SQLite local. Os tickets podem ser exportados em PDF ou PNG, ou enviados para impressão. O histórico permite imprimir vários pedidos em bobina térmica ou em folha A4, lado a lado.
=======
Aplicação web para acompanhar pedidos, gerar tickets para bobinas térmicas e manter os dados salvos em um banco SQLite local. Os tickets podem ser exportados em PDF ou PNG, ou enviados para impressão.

## Como rodar

Requisitos: Node.js 18 ou superior.

```bash
npm install
npm start
```

Abra http://localhost:3000 no navegador. Para desenvolvimento, use `npm run dev`; o servidor reinicia quando os arquivos do backend mudam.

O banco sem usuários é inicializado com o usuário `admin` e a senha `admin`. Para definir outras credenciais iniciais, configure `ADMIN_USERNAME` e `ADMIN_PASSWORD` antes de criar o banco. Troque os valores padrão antes de disponibilizar a aplicação em uma rede.

Para executar os testes automatizados da API:

```bash
npm test
```

Por padrão, o servidor usa a porta 3000. Para escolher outra porta, defina a variável `PORT` antes de iniciar. No PowerShell: `$env:PORT=4000; npm start`. Em shells Unix: `PORT=4000 npm start`.

## Telas

- **Visão geral:** acompanha a quantidade e o valor dos pedidos por mês, com gráficos e seleção do período analisado.
- **Criar Pedido:** permite informar cliente, datas, itens e dados da empresa, incluindo uma logo PNG ou JPG. Mostra o ticket em tempo real, permite salvar o pedido e escolher a largura da bobina (80 mm ou 48 mm) e o formato de exportação (PDF ou PNG). Também é possível imprimir o ticket.
- **Histórico de Pedidos:** exibe os pedidos agrupados por data, com atalhos para Hoje, Amanhã, Esta semana, Este mês ou Todos. Permite filtrar pela data do pedido ou da entrega, definir um período e buscar por cliente. É possível selecionar pedidos individualmente ou todos os exibidos e imprimir em bobina de 80 mm ou 48 mm, ou em folha A4 com dois tickets lado a lado. Ao abrir um pedido, também é possível alterar os dados, exportar ou imprimir o ticket e apagar o registro.
- **Configurações:** disponível apenas para administradores. Permite cadastrar e apagar usuários, definir quais contas são administradoras e consultar a lista de usuários. O administrador principal é protegido e nenhum usuário pode apagar a própria conta. Usuários comuns acessam somente Visão geral, Criar Pedido e Histórico de Pedidos.

## Estrutura

```
server.js              inicia o servidor HTTP
package.json           comandos e dependências do projeto
src/
  app.js               configuração do Express e arquivos estáticos
  db.js                inicialização do SQLite e criação das tabelas
  validacao.js         validação dos pedidos e dados da empresa
  senhas.js            hash e verificação segura de senhas
  pedidos.repo.js      operações de pedidos no banco
  usuarios.repo.js     autenticação e acesso aos usuários
  routes/
    empresa.js         rotas dos dados da empresa
    pedidos.js         rotas dos pedidos
    usuarios.js        rotas administrativas de usuários
public/
  index.html           estrutura das telas
  css/style.css        estilos da aplicação
  js/                  navegação, dashboard, criação, histórico, ticket,
                       configurações, login, exportação PDF/PNG, empresa, API
  login.html           página de autenticação
  vendor/              bibliotecas locais jsPDF e html2canvas e suas licenças
tests/
  api.test.js          testes automatizados da API (npm test)
data/
  GerenciamentoDB.db   banco SQLite criado automaticamente
```

## API

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/empresa` | Consulta nome e logo da empresa |
| PUT | `/api/empresa` | Atualiza nome e logo da empresa |
| GET | `/api/auth/branding` | Consulta pública do nome e logo exibidos na tela de login |
| POST | `/api/auth/login` | Inicia sessão com nome de usuário e senha |
| POST | `/api/auth/logout` | Encerra a sessão atual |
| GET | `/api/auth/me` | Consulta o usuário e sua permissão na sessão atual |
| GET | `/api/usuarios` | Lista usuários (somente administradores) |
| POST | `/api/usuarios` | Cadastra usuário (somente administradores) |
| DELETE | `/api/usuarios/:id` | Apaga usuário (somente administradores; protege o administrador principal e impede autoexclusão) |
| GET | `/api/pedidos` | Lista pedidos; aceita filtros por período e tipo de data |
| GET | `/api/pedidos/:id` | Consulta um pedido pelo ID |
| POST | `/api/pedidos` | Cria um pedido |
| PUT | `/api/pedidos/:id` | Atualiza um pedido e seus itens |
| DELETE | `/api/pedidos/:id` | Remove um pedido |

Para filtrar a listagem por período, envie `de` e `ate` juntos no formato `AAAA-MM-DD`. O parâmetro opcional `campo` aceita `pedido` (padrão) ou `entrega`; por exemplo: `/api/pedidos?de=2026-09-01&ate=2026-09-30&campo=entrega`.

Formato do pedido:

```json
{
  "cliente": "Maria Silva",
  "pedidoEm": "2026-09-29T10:30",
  "entregaEm": "2026-09-30T15:00",
  "itens": [{ "nome": "Brigadeiro", "qtd": 20, "valor": 3.5 }]
}
```

`pedidoEm` deve usar o formato `AAAA-MM-DDTHH:mm`. `entregaEm` é opcional. Cada pedido deve ter ao menos um item, com nome, quantidade inteira positiva e valor unitário não negativo. `valor` é informado em reais e armazenado em centavos; o `total` é calculado pelo servidor. As rotas de empresa recebem `nome` e `logo`; a logo deve ser uma imagem PNG ou JPG codificada como Data URL.

## Backup

Pedidos, usuários e dados da empresa ficam no arquivo `data/GerenciamentoDB.db`, criado automaticamente na primeira execução. Se `data/doceria.db` existir, ele e seus arquivos auxiliares SQLite serão renomeados na inicialização, preservando os dados. As senhas são armazenadas como hashes. Para fazer backup, pare o servidor e copie esse arquivo. O diretório pode ser alterado pela variável de ambiente `DATA_DIR`.
