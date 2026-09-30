import { $, toast } from './utils.js';
import { api } from './api.js';

/** Dados da empresa em memória (fonte da verdade é o banco). */
export const empresa = { nome: 'Minha Empresa', logo: '' };

let aoMudar = () => {};

function aplicar() {
  $('#empNome').value = empresa.nome;
  $('#navNome').textContent = empresa.nome || 'Empresa';
  const img = $('#navLogo');
  if (empresa.logo) { img.src = empresa.logo; img.hidden = false; } else { img.hidden = true; }
  aoMudar();
}

async function persistir() {
  try {
    await api.empresa.salvar({ nome: empresa.nome, logo: empresa.logo });
  } catch (e) {
    toast(e.message);
  }
}

export async function iniciarEmpresa(callbackMudanca) {
  aoMudar = callbackMudanca;

  try {
    Object.assign(empresa, await api.empresa.obter());
  } catch (e) {
    toast(e.message);
  }
  aplicar();

  let timer;
  $('#empNome').addEventListener('input', e => {
    empresa.nome = e.target.value;
    $('#navNome').textContent = empresa.nome || 'Empresa';
    aoMudar();
    clearTimeout(timer);
    timer = setTimeout(() => { if (empresa.nome.trim()) persistir(); }, 500);
  });

  $('#empLogo').addEventListener('change', e => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    if (arquivo.size > 1.5 * 1024 * 1024) {
      toast('Imagem muito grande (máx. 1,5 MB).');
      e.target.value = '';
      return;
    }
    const leitor = new FileReader();
    leitor.onload = async () => {
      empresa.logo = leitor.result;
      aplicar();
      await persistir();
    };
    leitor.readAsDataURL(arquivo);
  });

  $('#removerLogo').addEventListener('click', async () => {
    empresa.logo = '';
    $('#empLogo').value = '';
    aplicar();
    await persistir();
  });
}
