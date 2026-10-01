const { randomBytes, scryptSync, timingSafeEqual } = require('crypto');

function hashSenha(senha) {
  const sal = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, sal, 64).toString('hex');
  return `${sal}:${hash}`;
}

function verificarSenha(senha, armazenada) {
  const [sal, hashHex] = String(armazenada).split(':');
  if (!sal || !hashHex) return false;

  const esperado = Buffer.from(hashHex, 'hex');
  const recebido = scryptSync(senha, sal, esperado.length);
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

module.exports = { hashSenha, verificarSenha };