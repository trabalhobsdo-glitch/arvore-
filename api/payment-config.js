// Public configuration only. Never expose PAGOU_API_KEY here.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  let shippingByUF = {};
  try { shippingByUF = JSON.parse(process.env.FRETE_POR_UF_JSON || '{}'); }
  catch { return res.status(500).json({ error: 'FRETE_POR_UF_JSON precisa ser um JSON válido na Vercel.' }); }
  const safeShipping = {};
  for (const [uf, cents] of Object.entries(shippingByUF)) {
    if (/^[A-Z]{2}$/.test(uf) && Number.isInteger(cents) && cents >= 0) safeShipping[uf] = cents;
  }
  return res.status(200).json({
    publicKey: process.env.PAGOU_PUBLIC_KEY || '',
    testMode: process.env.PAGOU_TEST_MODE === 'true',
    product: { name: 'Árvore de Natal Pinheiro Verde Cervinia 150 cm', priceCents: 14990 },
    shippingByUF: safeShipping,
    maxInstallments: 12,
    ready: Boolean(process.env.PAGOU_API_KEY && process.env.PAGOU_PUBLIC_KEY && Object.keys(safeShipping).length)
  });
};
