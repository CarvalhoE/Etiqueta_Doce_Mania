async function requisitar(url, { method = 'GET', body } = {}) {
  let resp;
  try {
    resp = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor.');
  }
  if (resp.status === 204) return null;
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || `Erro ${resp.status}`);
  return dados;
}

export const api = {
  empresa: {
    obter: () => requisitar('/api/empresa'),
    salvar: dados => requisitar('/api/empresa', { method: 'PUT', body: dados }),
  },
  pedidos: {
    listar: (de, ate, campo = 'pedido') => {
      const q = new URLSearchParams();
      if (de && ate) { q.set('de', de); q.set('ate', ate); q.set('campo', campo); }
      const texto = q.toString();
      return requisitar('/api/pedidos' + (texto ? `?${texto}` : ''));
    },
    obter: id => requisitar(`/api/pedidos/${id}`),
    criar: dados => requisitar('/api/pedidos', { method: 'POST', body: dados }),
    atualizar: (id, dados) => requisitar(`/api/pedidos/${id}`, { method: 'PUT', body: dados }),
    apagar: id => requisitar(`/api/pedidos/${id}`, { method: 'DELETE' }),
  },
};
