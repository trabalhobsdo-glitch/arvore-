// ===== CONFIGURAÇÕES DO CHECKOUT (edite aqui) =====
const CONFIG = {
  produto: { nome: "Árvore de Natal Pinheiro Verde Cervinia 150 cm", brinde: "Pisca-pisca LED", precoDe: 289.90, preco: 149.90 },

  // FRETE: preencha por UF (ex.: SP: 29.90). Use null = "a definir".
  // "padrao" vale para UFs não listadas.
  frete: {
    padrao: null,
    SP: null, RJ: null, MG: null, ES: null,
    PR: null, SC: null, RS: null,
    DF: null, GO: null, MT: null, MS: null,
    BA: null, SE: null, AL: null, PE: null, PB: null, RN: null, CE: null, PI: null, MA: null,
    PA: null, AP: null, AM: null, RR: null, AC: null, RO: null, TO: null
  },
  prazoEntrega: "A confirmar",
  parcelasMax: 12,

  // O QUE O BOTÃO FAZ: enquanto não houver gateway de pagamento,
  // o pedido é enviado por WhatsApp (coloque o número com DDI, ex.: "5511999999999").
  whatsapp: "",
  // Para integrar um gateway (Mercado Pago, Stripe, Pagar.me...), edite finalizarPedido() em checkout.js
};
