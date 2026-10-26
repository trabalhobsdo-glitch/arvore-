
 // Configuração pública do checkout. Nunca exponha PAGOU_API_KEY neste endpoint.
const BRAZIL_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO'
];

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // Frete grátis em todos os estados e no Distrito Federal.
  const shippingByUF = Object.fromEntries(
    BRAZIL_UFS.map(uf => [uf, 0])
  );

  return res.status(200).json({
    publicKey: process.env.PAGOU_PUBLIC_KEY || '',
    testMode: process.env.PAGOU_TEST_MODE === 'true',
    product: {
      name: 'Árvore de Natal Pinheiro Verde Cervinia 150 cm',
      priceCents: 14990
    },
    shippingByUF,
    maxInstallments: 12,
    ready: Boolean(
      process.env.PAGOU_API_KEY &&
      process.env.PAGOU_PUBLIC_KEY
    )
  });
};
