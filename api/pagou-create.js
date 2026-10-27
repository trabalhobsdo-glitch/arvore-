const API_BASE = 'https://api.conta.pagou.ai/v1';

const PRODUCT = {
  name: 'Árvore de Natal Pinheiro Verde Cervinia 150 cm',
  priceCents: 14990
};

const BRAZIL_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO'
]);

const digits = value =>
  String(value || '').replace(/\D/g, '');

const clean = value =>
  String(value || '').trim().slice(0, 200);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido.'
    });
  }

  if (
    !process.env.PAGOU_API_KEY ||
    !process.env.PAGOU_PUBLIC_KEY
  ) {
    return res.status(503).json({
      error: 'O pagamento ainda não está configurado na Vercel.'
    });
  }

  const body = req.body || {};
  const method = body.paymentMethod;

  if (!['pix', 'credit_card'].includes(method)) {
    return res.status(400).json({
      error: 'Forma de pagamento inválida.'
    });
  }

  const customerIn = body.customer || {};
  const addressIn = body.shipping || {};

  const name = clean(customerIn.name);
  const email = clean(customerIn.email);
  const cpf = digits(customerIn.cpf);
  const phone = digits(customerIn.phone);
  const uf = clean(addressIn.state).toUpperCase();

  if (
    name.split(/\s+/).length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    cpf.length !== 11 ||
    phone.length < 10
  ) {
    return res.status(400).json({
      error: 'Confira nome, e-mail, CPF e telefone.'
    });
  }

  if (!BRAZIL_UFS.has(uf)) {
    return res.status(400).json({
      error: 'Informe uma UF válida do Brasil.'
    });
  }

  const requiredAddress = [
    'street',
    'streetNumber',
    'neighborhood',
    'city',
    'zipCode'
  ];

  if (
    requiredAddress.some(key => !clean(addressIn[key])) ||
    digits(addressIn.zipCode).length !== 8
  ) {
    return res.status(400).json({
      error: 'Confira o endereço de entrega.'
    });
  }

  // Frete grátis para todo o Brasil.
  const shippingCents = 0;
  const totalCents = PRODUCT.priceCents + shippingCents;

  if (
    !process.env.PUBLIC_SITE_URL ||
    !/^https:\/\//i.test(process.env.PUBLIC_SITE_URL)
  ) {
    return res.status(503).json({
      error: 'Configure PUBLIC_SITE_URL com o endereço HTTPS publicado na Vercel.'
    });
  }

  const payload = {
    amount: totalCents,
    paymentMethod: method,

    customer: {
      name,
      email,
      phone,
      document: {
        number: cpf,
        type: 'cpf'
      }
    },

    shipping: {
      fee: shippingCents,
      address: {
        street: clean(addressIn.street),
        streetNumber: clean(addressIn.streetNumber),
        complement: clean(addressIn.complement),
        zipCode: digits(addressIn.zipCode),
        neighborhood: clean(addressIn.neighborhood),
        city: clean(addressIn.city),
        state: uf,
        country: 'BR'
      }
    },

    items: [
      {
        title: PRODUCT.name,
        unitPrice: PRODUCT.priceCents,
        quantity: 1,
        tangible: true
      }
    ],

    postbackUrl:
      `${process.env.PUBLIC_SITE_URL.replace(/\/$/, '')}/api/pagou-postback`,

    metadata: JSON.stringify({
      store: 'arvore-cervinia',
      shippingCents
    })
  };

  if (method === 'credit_card') {
    const token = clean(body.cardToken);
    const installments = Number(body.installments);

    if (!token || token.length < 10) {
      return res.status(400).json({
        error: 'Não foi possível tokenizar o cartão. Confira os dados e tente novamente.'
      });
    }

    if (
      !Number.isInteger(installments) ||
      installments < 1 ||
      installments > 12
    ) {
      return res.status(400).json({
        error: 'Quantidade de parcelas inválida.'
      });
    }

    payload.card = { token };
    payload.installments = installments;
  }

  try {
    const auth = Buffer.from(
      `${process.env.PAGOU_API_KEY}:x`
    ).toString('base64');

    const response = await fetch(
      `${API_BASE}/transactions`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${auth}`,
          accept: 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }

    if (!response.ok) {
      // Extrai a mensagem de erro sem retornar a resposta inteira.
      const getGatewayMessage = value => {
        if (typeof value === 'string') return value;

        if (Array.isArray(value)) {
          return value
            .map(getGatewayMessage)
            .filter(Boolean)
            .join('; ');
        }

        if (value && typeof value === 'object') {
          const parts = [];

          for (const key of [
            'message',
            'error',
            'detail',
            'description',
            'code'
          ]) {
            if (
              typeof value[key] === 'string' ||
              typeof value[key] === 'number'
            ) {
              parts.push(String(value[key]));
            }
          }

          if (!parts.length && value.errors) {
            parts.push(getGatewayMessage(value.errors));
          }

          return parts.join(' — ');
        }

        return '';
      };

      let gatewayMessage = getGatewayMessage(data);

      // Oculta dados pessoais que eventualmente apareçam no erro.
      gatewayMessage = gatewayMessage
        .replace(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
          '[e-mail ocultado]'
        )
        .replace(/\b\d{11}\b/g, '[documento ocultado]')
        .replace(/\b\d{10,}\b/g, '[número ocultado]')
        .slice(0, 500);

      const gatewayStatus = response.status;

      const publicMessage = gatewayMessage
        ? `A Pagou.AI recusou a transação (HTTP ${gatewayStatus}): ${gatewayMessage}`
        : `A Pagou.AI recusou a transação (HTTP ${gatewayStatus}) e não enviou um motivo legível.`;

      return res.status(
        gatewayStatus >= 400 && gatewayStatus < 500
          ? 422
          : 502
      ).json({
        error: publicMessage,
        gatewayStatus
      });
    }

    const transaction =
      data.data || data.transaction || data;

    if (!transaction || transaction.id == null) {
      return res.status(502).json({
        error: 'A Pagou.AI retornou uma resposta inesperada. Verifique o painel antes de tentar novamente.'
      });
    }

    return res.status(200).json({
      id: transaction.id,
      status: transaction.status || 'processing',
      paymentMethod: transaction.paymentMethod || method,
      amount: totalCents,

      pix: method === 'pix' && transaction.pix
        ? {
            qrcode: transaction.pix.qrcode || '',
            url: transaction.pix.url || '',
            expirationDate:
              transaction.pix.expirationDate || ''
          }
        : null,

      secureUrl: transaction.secureUrl || null
    });

  } catch {
    return res.status(502).json({
      error: 'Não foi possível confirmar a resposta da Pagou.AI. Verifique o painel antes de tentar novamente para evitar cobrança duplicada.'
    });
  }
};
