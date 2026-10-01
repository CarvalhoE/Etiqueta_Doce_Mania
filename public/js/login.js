const form = document.querySelector('#loginForm');
const mensagem = document.querySelector('#loginErro');
const botao = document.querySelector('#entrar');
const nomeEmpresa = document.querySelector('#loginSobretitulo');
const logoEmpresa = document.querySelector('#loginMarca');
const fallbackMarca = document.querySelector('#loginMarcaFallback');

async function carregarMarca() {
  try {
    const resposta = await fetch('/api/auth/branding', { cache: 'no-store' });
    if (!resposta.ok) return;

    const empresa = await resposta.json();
    if (empresa.nome) nomeEmpresa.textContent = empresa.nome;
    if (!empresa.logo) return;

    logoEmpresa.addEventListener('load', () => {
      logoEmpresa.hidden = false;
      fallbackMarca.hidden = true;
    }, { once: true });
    logoEmpresa.src = empresa.logo;
  } catch {
    // Mantém a marca padrão se o serviço de dados estiver indisponível.
  }
}

carregarMarca();

form.addEventListener('submit', async event => {
  event.preventDefault();
  mensagem.hidden = true;
  botao.disabled = true;

  try {
    const resposta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.elements.username.value,
        password: form.elements.password.value,
      }),
    });

    if (!resposta.ok) throw new Error('Usuário ou senha inválidos.');
    location.replace('/');
  } catch (erro) {
    mensagem.textContent = erro.message || 'Não foi possível entrar. Tente novamente.';
    mensagem.hidden = false;
  } finally {
    botao.disabled = false;
  }
});