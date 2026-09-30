export const $ = seletor => document.querySelector(seletor);
export const $$ = seletor => [...document.querySelectorAll(seletor)];

export const brl = n =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function imprimirTicket(seletor, largura) {
  if (!$(seletor)) return;

  const estilo = document.createElement('style');
  estilo.media = 'print';
  estilo.textContent = `
    @page { size: ${largura}mm auto; margin: 0; }
    body.imprimindo-ticket { margin: 0; background: #fff; }
    body.imprimindo-ticket * { visibility: hidden !important; }
    body.imprimindo-ticket ${seletor},
    body.imprimindo-ticket ${seletor} * { visibility: visible !important; }
    body.imprimindo-ticket .prev-fundo { display: block; padding: 0; overflow: visible; }
    body.imprimindo-ticket ${seletor} {
      position: fixed; top: 0; left: 0; width: ${largura}mm !important;
      box-shadow: none;
    }
  `;
  const finalizar = () => {
    document.body.classList.remove('imprimindo-ticket');
    estilo.remove();
  };
  window.addEventListener('afterprint', finalizar, { once: true });
  document.head.appendChild(estilo);
  document.body.classList.add('imprimindo-ticket');
  window.print();
}

/** '2026-09-29T14:30' -> '29/09/2026 14:30' */
export function fmtDT(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString('pt-BR') + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Data/hora atual no formato do input datetime-local. */
export function agoraLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export const totalDe = p => p.itens.reduce((s, i) => s + i.qtd * i.valor, 0);

/** Date -> 'AAAA-MM-DD' no horário local. */
export function isoData(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Soma dias a uma data (sem alterar a original). */
export function somarDias(d, dias) {
  const nova = new Date(d);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

/** '2026-09-29' -> 'terça-feira, 29/09/2026' */
export function rotuloDia(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(a, m - 1, d);
  const texto = data.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
  return texto.replace(/^(.)/, c => c.toUpperCase());
}

let timerToast;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => t.classList.remove('on'), 2800);
}
