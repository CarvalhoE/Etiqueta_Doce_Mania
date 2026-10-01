import { $, esc } from './utils.js';

async function carregar() {
  const tabela = $('#tabelaUsuarios');
  const vazio = $('#usuariosVazio');

  try {
    const resposta = await fetch('/api/usuarios');
    const usuarios = await resposta.json();
    if (!resposta.ok) throw new Error(usuarios.erro || 'Não foi possível carregar os usuários.');

    tabela.innerHTML = usuarios.map(usuario => `
      <tr>
        <td>${esc(usuario.nome)}</td>
        <td>${usuario.admin ? 'Administrador' : 'Usuário'}</td>
        <td>${usuario.protegido
          ? '<span class="usuario-protegido">Admin principal</span>'
          : `<button type="button" class="btn perigo usuario-apagar" data-apagar-usuario="${usuario.id}">Apagar</button>`}</td>
      </tr>`).join('');
    vazio.hidden = usuarios.length > 0;
  } catch (erro) {
    tabela.innerHTML = '';
    vazio.hidden = false;
    vazio.textContent = erro.message;
  }
}

function iniciarConfiguracoes() {
  $('#tabelaUsuarios').addEventListener('click', async event => {
    const botao = event.target.closest('[data-apagar-usuario]');
    if (!botao) return;

    const nome = botao.closest('tr').querySelector('td').textContent;
    if (!window.confirm(`Apagar o usuário "${nome}"?`)) return;

    const status = $('#usuarioStatus');
    botao.disabled = true;
    status.hidden = true;
    try {
      const resposta = await fetch(`/api/usuarios/${botao.dataset.apagarUsuario}`, { method: 'DELETE' });
      const resultado = resposta.status === 204 ? {} : await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível apagar o usuário.');

      status.textContent = `Usuário "${nome}" apagado.`;
      status.hidden = false;
      await carregar();
    } catch (erro) {
      status.textContent = erro.message;
      status.hidden = false;
    } finally {
      botao.disabled = false;
    }
  });

  $('#formUsuario').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    const status = $('#usuarioStatus');
    status.hidden = true;
    botao.disabled = true;

    try {
      const resposta = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.elements.nome.value,
          senha: form.elements.senha.value,
          admin: form.elements.admin.checked,
        }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível adicionar o usuário.');

      form.reset();
      status.textContent = `Usuário "${resultado.nome}" adicionado.`;
      status.hidden = false;
      await carregar();
    } catch (erro) {
      status.textContent = erro.message;
      status.hidden = false;
    } finally {
      botao.disabled = false;
    }
  });

  carregar();
}

export { iniciarConfiguracoes, carregar };