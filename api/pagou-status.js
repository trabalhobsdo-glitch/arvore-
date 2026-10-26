const API_BASE = 'https://api.conta.pagou.ai/v1';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  if (!process.env.PAGOU_API_KEY) return res.status(503).json({ error: 'Gateway não configurado.' });
  const id = String(req.query.id || '');
  if (!/^\d{1,15}$/.test(id)) return res.status(400).json({ error: 'ID de transação inválido.' });
  try {
    const auth = Buffer.from(`${process.env.PAGOU_API_KEY}:x`).toString('base64');
    const response = await fetch(`${API_BASE}/transactions?id=${encodeURIComponent(id)}`, {
      headers: { authorization: `Basic ${auth}`, accept: 'application/json' }
    });
    if (!response.ok) return res.status(502).json({ error: 'Não foi possível consultar o status agora.' });
    const result = await response.json();
    const item = Array.isArray(result) ? result[0] : (result.data && Array.isArray(result.data) ? result.data[0] : (result.data || result.transaction || result));
    if (!item || String(item.id) !== id) return res.status(404).json({ error: 'Transação não encontrada.' });
    return res.status(200).json({ id: item.id, status: item.status || 'processing', paidAmount: Number(item.paidAmount || 0) });
  } catch {
    return res.status(502).json({ error: 'Falha ao consultar a transação.' });
  }
};
