// Pagou.AI postback receiver. The API documentation does not describe a signature
// header for this legacy postback format. Treat it as a notification only; the
// authoritative status is re-queried from Pagou.AI by /api/pagou-status.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const event = req.body || {};
  const tx = event.data || event;
  if (event.type !== 'transaction' || tx.id == null || typeof tx.status !== 'string') {
    return res.status(400).json({ error: 'Evento inválido.' });
  }
  // No payment is marked as paid here; no order database exists in this static site.
  // Do not log payloads because they can contain personal data.
  return res.status(200).json({ received: true });
};
