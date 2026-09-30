const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function dataHoraValida(v) {
  if (!DATA_HORA.test(v)) return false;
  return !Number.isNaN(new Date(v).getTime());
}

/** Valida e normaliza o corpo de um pedido. Retorna { dados } ou { erro }. */
function validarPedido(body) {
  if (!body || typeof body !== 'object') return { erro: 'Corpo da requisição inválido.' };

  const cliente = String(body.cliente ?? '').trim();
  if (!cliente) return { erro: 'Informe o nome da cliente.' };
  if (cliente.length > 120) return { erro: 'Nome da cliente muito longo (máx. 120).' };

  if (!dataHoraValida(body.pedidoEm)) return { erro: 'Data/horário do pedido inválido.' };

  let entregaEm = null;
  if (body.entregaEm) {
    if (!dataHoraValida(body.entregaEm)) return { erro: 'Data/horário de entrega inválido.' };
    entregaEm = body.entregaEm;
  }

  if (!Array.isArray(body.itens) || body.itens.length === 0) return { erro: 'Adicione pelo menos um item.' };
  if (body.itens.length > 100) return { erro: 'Máximo de 100 itens por pedido.' };

  const itens = [];
  for (const [i, it] of body.itens.entries()) {
    const n = i + 1;
    const nome = String(it?.nome ?? '').trim();
    const qtd = Number(it?.qtd);
    const valor = Number(it?.valor);
    if (!nome) return { erro: `Item ${n}: informe o nome.` };
    if (nome.length > 240) return { erro: `Item ${n}: nome muito longo (máx. 240).` };
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 9999) return { erro: `Item ${n}: quantidade inválida.` };
    if (!Number.isFinite(valor) || valor < 0 || valor > 999999) return { erro: `Item ${n}: valor inválido.` };
    itens.push({ nome, qtd, valorCentavos: Math.round(valor * 100) });
  }

  return { dados: { cliente, pedidoEm: body.pedidoEm, entregaEm, itens } };
}

const LOGO_MAX = 2 * 1024 * 1024; // caracteres do data URL

/** Valida o corpo da configuração da empresa. */
function validarEmpresa(body) {
  if (!body || typeof body !== 'object') return { erro: 'Corpo da requisição inválido.' };
  const nome = String(body.nome ?? '').trim();
  if (!nome) return { erro: 'Informe o nome da empresa.' };
  if (nome.length > 80) return { erro: 'Nome da empresa muito longo (máx. 80).' };

  const logo = String(body.logo ?? '');
  if (logo) {
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(logo)) return { erro: 'Logo deve ser PNG ou JPG.' };
    if (logo.length > LOGO_MAX) return { erro: 'Logo muito grande (máx. ~1,5 MB).' };
  }
  return { dados: { nome, logo } };
}

module.exports = { validarPedido, validarEmpresa };
