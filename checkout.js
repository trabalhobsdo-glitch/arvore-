const $ = id => document.getElementById(id);
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const so = s => String(s || '').replace(/\D/g, '');
let frete = null;
let paymentConfig = null;
let pollTimer = null;

function resumo() {
  const p = CONFIG.produto;
  $('r-nome').textContent = p.nome;
  $('r-brinde').textContent = p.brinde ? '+ ' + p.brinde + ' de brinde' : '';
  $('r-preco').textContent = brl(p.preco);
  $('r-de').textContent = brl(p.precoDe);
  $('r-off').textContent = Math.round((1 - p.preco / p.precoDe) * 100) + '% OFF';
  $('r-prazo').textContent = CONFIG.prazoEntrega;
  $('r-frete').textContent = frete === null ? (so($('cep').value).length === 8 ? 'Frete não configurado para esta UF' : 'Informe o CEP') : (frete === 0 ? 'Grátis' : brl(frete));
  const total = p.preco + (frete || 0);
  $('r-total').textContent = brl(total);
  $('r-parc').textContent = `ou até ${CONFIG.parcelasMax}x de ${brl(total / CONFIG.parcelasMax)} no cartão`;
  return total;
}

async function carregarConfiguracao() {
  try {
    const response = await fetch('/api/payment-config', { cache: 'no-store' });
    if (!response.ok) throw new Error('Configuração indisponível');
    paymentConfig = await response.json();
    if (paymentConfig.publicKey && window.Pagou) {
      Pagou.setPublicKey(paymentConfig.publicKey);
      Pagou.setTestMode(Boolean(paymentConfig.testMode));
    }
    CONFIG.frete = Object.fromEntries(Object.entries(paymentConfig.shippingByUF || {}).map(([uf, cents]) => [uf, cents / 100]));
    CONFIG.frete.padrao = null;
    calcFrete();
    if (!paymentConfig.ready) {
      $('aviso').textContent = 'Checkout ainda não está pronto para produção. Configure as variáveis da Pagou.AI e o frete na Vercel antes de receber pagamentos.';
      $('aviso').style.display = 'block';
    }
  } catch {
    $('aviso').textContent = 'Não foi possível carregar a configuração de pagamento. Atualize a página ou tente mais tarde.';
    $('aviso').style.display = 'block';
  }
}

$('cpf').addEventListener('input', e => {
  let v = so(e.target.value).slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  e.target.value = v;
});
$('cep').addEventListener('input', e => {
  let v = so(e.target.value).slice(0, 8);
  e.target.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
  if (v.length === 8) buscaCep(v);
});
$('tel').addEventListener('input', e => {
  let v = so(e.target.value).slice(0, 11);
  v = v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  e.target.value = v;
});
$('uf').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); calcFrete(); });
$('card-number').addEventListener('input', e => { e.target.value = so(e.target.value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim(); });
$('card-month').addEventListener('input', e => { e.target.value = so(e.target.value).slice(0, 2); });
$('card-year').addEventListener('input', e => { e.target.value = so(e.target.value).slice(0, 4); });
$('card-cvv').addEventListener('input', e => { e.target.value = so(e.target.value).slice(0, 4); });

document.querySelectorAll('input[name="paymentMethod"]').forEach(input => input.addEventListener('change', () => {
  const card = input.value === 'credit_card' && input.checked;
  $('card-fields').hidden = !card;
  $('btn').textContent = card ? 'Pagar com cartão' : 'Gerar Pix';
  $('aviso').style.display = 'none';
}));

function calcFrete() {
  const uf = $('uf').value.toUpperCase();
  const t = CONFIG.frete || {};
  frete = Object.prototype.hasOwnProperty.call(t, uf) && t[uf] !== null && t[uf] !== undefined ? Number(t[uf]) : null;
  resumo();
}
async function buscaCep(cep) {
  const m = $('cep').parentElement.querySelector('.msg');
  m.textContent = 'Buscando...';
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (d.erro) throw new Error('CEP inválido');
    $('rua').value = d.logradouro || $('rua').value;
    $('bairro').value = d.bairro || $('bairro').value;
    $('cidade').value = d.localidade;
    $('uf').value = d.uf;
    m.textContent = '';
    calcFrete();
    $(d.logradouro ? 'numero' : 'rua').focus();
  } catch {
    m.textContent = 'CEP não encontrado. Preencha o endereço manualmente.';
    calcFrete();
  }
}

function cpfValido(c) {
  c = so(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}
const regras = {
  nome: v => v.trim().split(/\s+/).length >= 2 || 'Informe nome e sobrenome',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail inválido',
  cpf: v => cpfValido(v) || 'CPF inválido',
  tel: v => so(v).length >= 10 || 'Telefone inválido',
  cep: v => so(v).length === 8 || 'CEP inválido',
  rua: v => v.trim() !== '' || 'Obrigatório',
  bairro: v => v.trim() !== '' || 'Obrigatório',
  numero: v => v.trim() !== '' || 'Obrigatório',
  cidade: v => v.trim() !== '' || 'Obrigatório',
  uf: v => v.length === 2 || 'UF inválida'
};
function valida() {
  let ok = true, primeiro = null;
  for (const [id, fn] of Object.entries(regras)) {
    const el = $(id), r = fn(el.value), m = el.parentElement.querySelector('.msg');
    el.classList.toggle('erro', r !== true);
    if (m) m.textContent = r === true ? '' : r;
    if (r !== true) { ok = false; primeiro = primeiro || el; }
  }
  if (primeiro) primeiro.focus();
  return ok;
}
function erro(message) {
  $('aviso').textContent = message;
  $('aviso').style.display = 'block';
}
function mostrarResultado(html) {
  $('payment-result').innerHTML = html;
  $('payment-result').hidden = false;
  $('payment-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function criarPagamento(pedido, method) {
  if (!paymentConfig || !paymentConfig.ready) throw new Error('O gateway ainda não está configurado. Confira as variáveis de ambiente e o frete na Vercel.');
  if (frete === null) throw new Error('O frete para esta UF ainda não está configurado. A loja precisa configurar o valor antes de cobrar.');
  const body = {
    paymentMethod: method,
    customer: { name: pedido.cliente.nome, email: pedido.cliente.email, cpf: so(pedido.cliente.cpf), phone: so(pedido.cliente.tel) },
    shipping: { zipCode: so(pedido.entrega.cep), street: pedido.entrega.rua, streetNumber: pedido.entrega.numero, complement: pedido.entrega.comp, neighborhood: pedido.entrega.bairro, city: pedido.entrega.cidade, state: pedido.entrega.uf }
  };
  if (method === 'credit_card') {
    if (!window.Pagou || typeof Pagou.encrypt !== 'function') throw new Error('A biblioteca de tokenização da Pagou.AI não carregou. Atualize a página e tente novamente.');
    const holder = $('card-holder').value.trim();
    const number = so($('card-number').value);
    const month = Number($('card-month').value);
    let year = $('card-year').value.trim();
    const cvv = so($('card-cvv').value);
    if (holder.length < 3 || number.length < 13 || number.length > 19 || month < 1 || month > 12 || !/^\d{2}(\d{2})?$/.test(year) || cvv.length < 3) throw new Error('Confira os dados do cartão antes de continuar.');
    if (year.length === 2) year = `20${year}`;
    const token = await Pagou.encrypt({ number, holderName: holder, expMonth: month, expYear: Number(year), cvv });
    $('card-number').value = '';
    $('card-cvv').value = '';
    const cardToken = typeof token === 'string' ? token : (token && (token.token || token.hash));
    if (!cardToken) throw new Error('A Pagou.AI não retornou um token válido para o cartão.');
    body.cardToken = cardToken;
    body.installments = Number($('installments').value);
  }
  const response = await fetch('/api/pagou-create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
  return data;
}
function iniciarConsulta(id) {
  if (pollTimer) clearInterval(pollTimer);
  let tries = 0;
  pollTimer = setInterval(async () => {
    tries++;
    try {
      const response = await fetch(`/api/pagou-status?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.status === 'paid') {
        clearInterval(pollTimer); pollTimer = null;
        mostrarResultado(`<h2>Pagamento confirmado!</h2><p>O pagamento da sua compra foi confirmado pela Pagou.AI.</p><p>Pedido de referência: ${String(id).replace(/[^\d]/g, '')}</p>`);
      } else if (response.ok && ['refused', 'canceled', 'refunded', 'chargedback'].includes(data.status)) {
        clearInterval(pollTimer); pollTimer = null;
        mostrarResultado(`<h2>Pagamento não concluído</h2><p>Status informado pela Pagou.AI: ${data.status}. Se precisar, tente outro meio de pagamento.</p>`);
      }
    } catch { /* A próxima consulta tenta novamente. */ }
    if (tries >= 60 && pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }, 5000);
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  $('aviso').style.display = 'none';
  if (!valida()) return;
  const method = document.querySelector('input[name="paymentMethod"]:checked').value;
  if (method === 'credit_card') {
    for (const id of ['card-holder', 'card-number', 'card-month', 'card-year', 'card-cvv']) {
      if (!$(`${id}`).value.trim()) { errorField(id, 'Obrigatório'); return; }
    }
  }
  if (frete === null) { erro('O frete para esta UF ainda não está configurado. Não será feita nenhuma cobrança até o valor ser definido.'); return; }
  const button = $('btn'); button.disabled = true; button.textContent = 'Processando com segurança...';
  const g = id => $(id).value.trim();
  const pedido = {
    cliente: { nome: g('nome'), email: g('email'), cpf: g('cpf'), tel: g('tel') },
    entrega: { cep: g('cep'), rua: g('rua'), numero: g('numero'), comp: g('comp'), bairro: g('bairro'), cidade: g('cidade'), uf: g('uf') }
  };
  try {
    const data = await criarPagamento(pedido, method);
    $('form').querySelectorAll('input,select,button').forEach(el => { if (el.id !== 'payment-result') el.disabled = true; });
    if (method === 'pix') {
      const qrcode = data.pix && data.pix.qrcode ? String(data.pix.qrcode) : '';
      const url = data.pix && data.pix.url ? String(data.pix.url) : '';
      if (qrcode) {
        mostrarResultado(`<h2>Pix gerado</h2><p>Abra o aplicativo do seu banco e use o código Pix abaixo. O pedido só será confirmado após a Pagou.AI informar o pagamento.</p><textarea class="pix-code" id="pix-copy" readonly></textarea><button type="button" class="copy-pix" id="copy-pix">Copiar código Pix</button><p id="pix-status">Aguardando pagamento...</p>`);
        $('pix-copy').value = qrcode;
        $('copy-pix').addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(qrcode); $('copy-pix').textContent = 'Código copiado!'; }
          catch { $('pix-copy').select(); document.execCommand('copy'); $('copy-pix').textContent = 'Código copiado!'; }
        });
      } else if (url) {
        mostrarResultado(`<h2>Pix gerado</h2><p>Use o link seguro para visualizar os dados do Pix.</p><p><a href="${url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">Abrir Pix</a></p><p id="pix-status">Aguardando pagamento...</p>`);
      } else {
        mostrarResultado('<h2>Pix criado</h2><p>A transação foi criada, mas a Pagou.AI não retornou o código Pix. Verifique o painel antes de tentar novamente para evitar duplicidade.</p>');
      }
    } else {
      const status = data.status || 'processing';
      if (status === 'paid') mostrarResultado(`<h2>Pagamento confirmado!</h2><p>A Pagou.AI confirmou a compra.</p><p>Referência: ${String(data.id).replace(/[^\d]/g, '')}</p>`);
      else mostrarResultado(`<h2>Transação enviada</h2><p>Status atual: ${status}. A confirmação depende do retorno da Pagou.AI.</p><p>Referência: ${String(data.id).replace(/[^\d]/g, '')}</p>`);
    }
    if (data.status !== 'paid') iniciarConsulta(data.id);
  } catch (err) {
    const message = err.message || 'Não foi possível iniciar o pagamento.';
    erro(message);
    // If the gateway response is uncertain, do not allow an immediate duplicate charge.
    if (/verifique o painel|resposta da Pagou\.AI|evitar cobrança duplicada/i.test(message)) {
      button.disabled = true;
      button.textContent = 'Verifique o painel da Pagou.AI';
    } else {
      button.disabled = false;
      button.textContent = method === 'credit_card' ? 'Pagar com cartão' : 'Gerar Pix';
    }
  }
});
function errorField(id, message) {
  const el = $(id); const msg = el.parentElement.querySelector('.msg');
  if (msg) msg.textContent = message;
  el.classList.add('erro'); el.focus();
}
resumo();
carregarConfiguracao();
