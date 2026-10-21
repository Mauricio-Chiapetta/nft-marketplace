# Plano de execução

Uma fase por sessão. Ao concluir: marcar aqui, commitar e rodar `/clear`.

## Itens eliminatórios (nunca cortar)
- Uso real de toda a stack (React, TS, TanStack Router/Query, Axios, MSW, socket.io, shadcn/Tailwind, Playwright)
- Compra confirmada só via resposta do mock
- Eventos chegam pelo socket; a UI nunca chama setters diretamente para simular evento
- Isolamento de dados entre usuários
- Testes E2E executáveis

## Dia 1: fundação e fluxos de leitura
- [x] **0. Setup**: Vite, Tailwind v4, shadcn/ui, Router e Query, Axios, MSW, socket.io-client + binding, Playwright, estrutura de pastas, `vercel.json`
  - [ ] Deploy na Vercel (importar o repo; build `pnpm build`, output `dist`)
- [ ] **1. Contratos + mock DB**: tipos, fixtures (~40 NFTs, 2 usuários), DB do MSW em localStorage com reset, cenários `?scenario=slow|error|timeout`, handlers REST
- [ ] **2. Layout + Auth**: tokens do Figma, header e footer, login, cadastro, sessão, logout, rotas protegidas com redirect
- [ ] **3. Início + Detalhe**: busca, filtros, ordenação e paginação na URL, skeletons, detalhe com edições e quantidade, favoritos otimistas com rollback

## Dia 2: compra, tempo real e entrega
- [ ] **4. Carrinho + Socket**: carrinho no servidor, merge do carrinho do visitante ao logar, cupom, cotação, `nft.updated` com versão e deduplicação
- [ ] **5. Checkout + Pedido**: formulário, carteira e rede, revisão, revalidação da cotação, idempotency key, `order.updated`, pendente/confirmado/recusado, recibo
- [ ] **6. Perfil + Carteiras**: edição de perfil, avatar e senha, carteiras principal e secundária
- [ ] **7. Testes Playwright**: os 12 cenários, desktop e mobile, baselines visuais
- [ ] **8. Lighthouse + docs**: auditoria, README da solução, ARCHITECTURE.md, deploy final

## Notas de setup
- `msw` fixado em 2.x por causa do peer de `@mswjs/socket.io-binding`
- MSW roda também em produção (`src/main.tsx`), porque é o backend da aplicação
- `src/routeTree.gen.ts` é versionado (gerado pelo plugin do Vite)
- Alias `@/` aponta para `src/`
- Scripts: `dev`, `build`, `lint`, `typecheck`, `test:e2e`, `test:e2e:ui`, `test:e2e:update`
