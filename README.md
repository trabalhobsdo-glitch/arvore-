# Árvore Cervinia — checkout Pagou.AI + Vercel

Site estático HTML/CSS/JS com funções serverless Vercel para iniciar e consultar transações na API da Pagou.AI. Checkout preparado para Pix e cartão de crédito tokenizado.

## Arquivos adicionados/modificados

- `checkout.html`, `checkout.css`, `checkout.js`: seleção Pix/cartão, tokenização no navegador, retorno do Pix e consulta de status.
- `api/payment-config.js`: entrega somente a chave pública e configuração pública do checkout.
- `api/pagou-create.js`: cria transações no servidor, valida dados e calcula o total no backend (produto R$ 149,90 + frete configurado).
- `api/pagou-status.js`: consulta o estado financeiro diretamente na Pagou.AI.
- `api/pagou-postback.js`: recebe o postback; por segurança, não marca pedido como pago sem reconciliação. O site atual é estático e não tem banco de dados para armazenar pedidos.
- `vercel.json`: configura as funções e cabeçalhos de API.
- `.env.example`: exemplo das variáveis necessárias.

## Configuração obrigatória na Vercel

Em **Project → Settings → Environment Variables**, configure:

- `PAGOU_API_KEY`: chave secreta da Pagou.AI. Nunca coloque no HTML/JS público nem no GitHub.
- `PAGOU_PUBLIC_KEY`: chave pública da empresa usada pela biblioteca de tokenização.
- `PAGOU_TEST_MODE`: `false` para produção; `true` somente para testes com credenciais de teste.
- `PUBLIC_SITE_URL`: URL HTTPS pública do site, por exemplo `https://seu-projeto.vercel.app`.
- `FRETE_POR_UF_JSON`: JSON com o frete em centavos por UF. Exemplo `{"MG":0,"SP":1990}` significa frete grátis em MG e R$ 19,90 em SP. Configure os estados para os quais realmente vende. Estado sem valor configurado é bloqueado, sem criar cobrança.

Depois de alterar variáveis, faça um novo deploy. Use a chave pública e a chave secreta do mesmo ambiente da Pagou.AI.

## Segurança e validação antes de cobrar

1. Confirme no painel Pagou.AI que a conta está ativa e credenciada para cartão de crédito.
2. Confirme com a Pagou.AI que a chave pública/privada e o recurso de tokenização estão habilitados para produção.
3. Primeiro valide o fluxo com credenciais de teste e cartões de teste da própria Pagou.AI. Não use cartão real para teste.
4. Confirme que o Pix retorna código/URL, que o status passa para `paid` somente depois da confirmação do gateway e que cartão recusado aparece como recusado.
5. Só depois mude `PAGOU_TEST_MODE=false` e coloque as credenciais de produção.

A documentação pública consultada usa `https://api.conta.pagou.ai/v1/transactions`, autenticação HTTP Basic com `SECRET_KEY:x`, e tokenização no navegador por `https://api.conta.pagou.ai/v1/js`. A API recebe `amount` em centavos. A função de servidor nunca aceita o preço enviado pelo navegador; usa o preço fixo R$ 149,90 e soma o frete configurado na Vercel.

## Limitações importantes

- O frete estava como “a definir” no projeto original. Nenhuma cobrança é criada para uma UF que não tenha frete configurado; isso evita cobrar um total incorreto.
- O projeto original não possui banco de dados. O status é consultado na Pagou.AI enquanto o checkout está aberto, mas os pedidos não ficam persistidos em um painel próprio. Para guardar pedidos, endereço, status, reenvios e conciliação de forma durável, adicione um banco de dados antes de escalar vendas.
- O postback da documentação legada não descreve assinatura de webhook; por isso o endpoint de postback apenas reconhece a notificação. O status financeiro é consultado novamente na API autenticada da Pagou.AI.
- A integração foi preparada com base na documentação pública e verificada estaticamente; não foi possível realizar transações reais sem as credenciais da conta. Não considere o checkout validado para produção até concluir os testes descritos acima.

## Deploy

1. Suba os arquivos da pasta do projeto para o repositório GitHub.
2. Importe/atualize o projeto na Vercel com Framework Preset `Other`, sem build command.
3. Configure as variáveis de ambiente antes de testar.
4. Faça redeploy e teste primeiro com as credenciais de sandbox da Pagou.AI.
