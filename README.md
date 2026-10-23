# Kurio: marketplace de NFTs

Solução do desafio de frontend descrito em [docs/DESAFIO.md](docs/DESAFIO.md): descoberta, compra e conta do colecionador, em desktop e mobile, com o backend inteiro simulado na camada de rede (MSW + Socket.IO).

Stack: React 19, TypeScript, TanStack Router e Query, Axios, Socket.IO (`socket.io-client` + `@mswjs/socket.io-binding`), Tailwind CSS v4, shadcn/ui, MSW 2, Playwright e Lighthouse. Decisões, contratos e limitações estão em [ARCHITECTURE.md](ARCHITECTURE.md).

- **Repositório:** https://github.com/Mauricio-Chiapetta/nft-marketplace
- **Deploy:** _URL da Vercel (preencher após o deploy)_

## Setup

Requisitos: Node 20+ e pnpm 10.

```bash
pnpm install
pnpm exec playwright install chromium   # navegador dos testes e da auditoria
pnpm dev                                # http://localhost:5173, com mocks
```

### Variáveis de ambiente

Nenhuma. O MSW é o backend da aplicação e sobe sempre, em desenvolvimento, no build de demonstração e no deploy. Não há serviço externo nem chave a configurar.

### Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Vite em modo desenvolvimento, com mocks |
| `pnpm build` | Verificação de tipos + build de produção em `dist/` |
| `pnpm preview` | Serve o build (com mocks) |
| `pnpm typecheck` | `tsc -b` |
| `pnpm lint` | ESLint |
| `pnpm test:e2e` | Playwright (build + preview na porta 4173), desktop e mobile |
| `pnpm test:e2e:ui` | Playwright em modo UI |
| `pnpm test:e2e:update` | Regenera as baselines visuais |
| `pnpm lighthouse` | Build + auditoria Lighthouse (3 medições por página e perfil) |

## Credenciais fictícias

| Usuário | E-mail | Senha | Dados no seed |
| --- | --- | --- | --- |
| Ana Ribeiro | `ana@jungle.dev` | `Jungle@2026` | 2 carteiras, 3 favoritos, 1 pedido confirmado |
| Bruno Costa | `bruno@jungle.dev` | `Jungle@2026` | 1 carteira, 2 favoritos, 1 item no carrinho, 1 pedido recusado |

Cupons: `JUNGLE10` (10%), `WELCOME5` (5%), `SUMMER24` (expirado). Qualquer outro código é inválido.

As senhas são guardadas no mock só como hash com salt; nada sensível vai para o `localStorage`.

## Cenários do mock

O estado do mock (catálogo, usuários, sessões, carrinhos, carteiras, pedidos) fica no `localStorage` (`nft-mock:db`) e sobrevive ao refresh.

- **Reset:** abra qualquer rota com `?mockReset` (ex.: `/?mockReset`). O seed é restaurado integralmente e o parâmetro sai da URL.
- **Cenário:** `?scenario=<nome>` vale para a aba (sessionStorage) até `?scenario=default`.
- **Alvo:** `&target=<MÉTODO> <trecho do path>` restringe cenários de rede a algumas requisições, ex.: `?scenario=error&target=PUT /me/favorites`.
- **Console:** `window.__mock` expõe os controles do "servidor" (reset, cenário, alterar NFT, liquidar pedido, derrubar o socket, reenviar eventos). Os testes usam os mesmos controles.

| Cenário | Efeito |
| --- | --- |
| `default` | Latência curta, tudo responde com sucesso |
| `slow` | Latência fixa de 2,5 s (skeletons) |
| `variable` | Latência variável e determinística; buscas curtas demoram mais (respostas fora de ordem) |
| `error` / `unavailable` | HTTP 500 / 503 |
| `forbidden` | HTTP 403 (acesso não autorizado) |
| `offline` | Falha de conexão |
| `timeout` | A resposta nunca chega; o Axios encerra em 10 s |
| `empty` | Catálogo vazio |
| `session-expired` | Sessões novas expiram em 15 s |
| `payment-declined` | Pagamentos recusados |
| `order-pending` | Pedido fica pendente até `__mock.settleOrder(id, 'confirmed' \| 'declined')` |
| `order-timeout` | Pedido é criado, mas a resposta chega depois do timeout do cliente |
| `wallet-rejected` | A conexão da carteira é recusada |
| `price-change` / `sold-out` | Preço do primeiro item muda / edição esgota logo após a primeira cotação |

### Como reproduzir os fluxos de falha

Entre como Ana, coloque um NFT no carrinho e siga para o pagamento (`/checkout`).

| Fluxo | Como reproduzir | Resultado esperado |
| --- | --- | --- |
| Pagamento recusado | `/checkout?scenario=payment-declined` e confirme a compra | "Pagamento recusado"; os itens continuam no carrinho |
| Pedido pendente e reconexão | `?scenario=order-pending`, confirme; no console: `__mock.setRealtimeOnline(false)`, `__mock.settleOrder('<id>', 'confirmed')`, `__mock.setRealtimeOnline(true)` | Ao reconectar, o pedido aparece confirmado, sem nova compra |
| Timeout com recuperação | `?scenario=order-timeout` e confirme | Reenvio automático com a mesma Idempotency-Key; um único pedido |
| Clique repetido | Clique várias vezes em "Confirmar compra" | Um único pedido |
| Preço muda durante o checkout | Com a revisão aberta: `__mock.updateNft('nft_001', [{ editionId: 'nft_001-std', priceEth: '0.7' }])` e confirme | Envio recusado; "Aceitar novos valores" é obrigatório |
| Esgotado / preço alterado na revalidação | `?scenario=sold-out` ou `?scenario=price-change` e revise | Revisão mostra a mudança e bloqueia ou exige aceite |
| Carteira recusada | `?scenario=wallet-rejected` e "Conectar carteira" | Mensagem de recusa; nada é conectado |
| Sessão expirada | Logado, no console `__mock.expireSessions()` e navegue (ou `?scenario=session-expired` antes de entrar) | Aviso, volta ao login com `?redirect=` e retomada; no checkout o formulário é preservado |
| Falha de favoritos | `?scenario=error&target=PUT /me/favorites` e favorite | Marcação otimista desfeita e aviso |
| Catálogo fora do ar | `/?scenario=error&target=GET /api/nfts`, depois `?scenario=default` e "Tentar novamente" | Erro com nova tentativa |
| Carregamento lento | `/?scenario=slow` | Skeletons com shimmer |

## Testes (Playwright)

```bash
pnpm test:e2e                      # todos, desktop (Desktop Chrome) e mobile (Pixel 7)
pnpm exec playwright show-report   # relatório HTML
```

Cada teste roda num contexto de navegador novo e abre o app com `?mockReset`. O REST passa pelos handlers do MSW e o tempo real pelo `socket.io-client`. Traces e screenshots ficam guardados nas falhas (`test-results/`).

| # | Cenário do enunciado | Arquivo |
| --- | --- | --- |
| 1, 2 | Busca, filtros, ordenação, paginação, histórico; detalhe direto e inexistente | `e2e/catalog.spec.ts` |
| 3 | Cadastro, login, expiração, logout e troca de usuário | `e2e/auth.spec.ts` |
| 4 | Favoritos com falha e recuperação | `e2e/favorites.spec.ts` |
| 5 | Carrinho, cupom, refresh e merge no login | `e2e/cart.spec.ts` |
| 6, 7 | Compra completa; recusa, clique repetido e timeout | `e2e/checkout.spec.ts` |
| 8 | Perfil, avatar, senha e carteiras | `e2e/account.spec.ts` |
| 9, 10 | Socket.IO no checkout; duplicatas, queda e pedido pendente | `e2e/realtime.spec.ts` |
| 11, 12 | Teclado, foco e validação; skeletons, falha e nova tentativa | `e2e/a11y-states.spec.ts` |
| Visual | Início, detalhe, carrinho e pagamento | `e2e/visual.spec.ts` |
| Contratos | REST do mock (filtros, erros, idempotência, isolamento) | `e2e/mock-contracts.spec.ts` |

O tempo é controlado com `page.clock`: a liquidação do pedido e o timeout de 10 s são adiantados, e as capturas usam data fixa. A latência é controlada pelo cenário `slow`, e os eventos pelos controles do mock.

As baselines visuais (`e2e/__screenshots__`) foram geradas no Windows com o Chromium do Playwright. A renderização de fontes muda entre sistemas operacionais: em outro SO, gere de novo com `pnpm test:e2e:update` antes de comparar.

## Lighthouse

`pnpm lighthouse` gera o build, sobe o `vite preview` e mede início (`/`) e detalhe (`/nfts/nft_001`) nos perfis mobile e desktop, 3 vezes cada, com Chrome limpo a cada medição. A configuração está em [lighthouse/config.mjs](lighthouse/config.mjs). Relatórios HTML/JSON, medianas, LCP/CLS/TBT, auditorias reprovadas e ambiente ficam em [lighthouse/reports](lighthouse/reports/summary.md). A análise dos resultados está em [ARCHITECTURE.md](ARCHITECTURE.md#performance-e-lighthouse).

## Deploy

Vercel, com build `pnpm build` e saída `dist`. O `vercel.json` reescreve todas as rotas para `index.html`, então acesso direto e refresh funcionam em qualquer tela. O service worker do MSW (`public/mockServiceWorker.js`) é publicado junto, e os mocks e o tempo real funcionam no ambiente publicado.
