# Plano de execução

Uma fase por sessão. Ao concluir: marcar aqui, commitar e rodar `/clear`.

## Itens eliminatórios (nunca cortar)
- Uso real de toda a stack (React, TS, TanStack Router/Query, Axios, MSW, socket.io, shadcn/Tailwind, Playwright)
- Compra confirmada só via resposta do mock
- Eventos chegam pelo socket; a UI nunca chama setters diretamente para simular evento
- Isolamento de dados entre usuários
- Testes E2E executáveis

## Transversal (vale para todas as fases)
- Funcionar em 390, 768 e 1440px, sem overflow horizontal nem perda de conteúdo com zoom
- Ações fora do escopo não devem aparentar sucesso
- Estados de carregamento, vazio, erro, sucesso e atualização em segundo plano

## Dia 1: fundação e fluxos de leitura
- [x] **0. Setup**: Vite, Tailwind v4, shadcn/ui, Router e Query, Axios, MSW, socket.io-client + binding, Playwright, estrutura de pastas, `vercel.json`
  - [ ] Deploy na Vercel (importar o repo; build `pnpm build`, output `dist`)
- [x] **1. Contratos + mock DB**: tipos, fixtures (~40 NFTs, 2 usuários), DB do MSW em localStorage com reset, handlers REST
  - [x] Cenários configuráveis e reproduzíveis: sucesso, vazio, latência variável, respostas fora de ordem, offline, 4xx/5xx, sessão expirada, 401/403, conflito de cadastro/validação, cupom inválido e expirado, preço alterado/edição esgotada na compra, timeout após criar pedido, pagamento confirmado e recusado
  - [x] Formato padronizado de erro: validação, sessão inválida, permissão, inexistente, conflito de disponibilidade, falha transitória
  - [x] Idempotency key: mesma tentativa devolve o mesmo pedido; mesma chave com conteúdo diferente responde 409
  - [x] Mudanças no DB do mock publicam o evento no barramento (`src/mocks/events.ts`); o transporte via socket.io entra na fase 4
  - [x] Valores ETH como string decimal (`src/lib/eth.ts`)
- [ ] **2. Layout + Auth**: tokens do Figma, header e footer, login, cadastro, sessão, logout, rotas protegidas com redirect
  - [x] Tokens do Figma (cores, Roboto Mono) em `src/index.css`; header (ativo por rota, divisória só fora do Mercado) e footer
  - [ ] Login e cadastro (modais desktop, telas mobile), sessão, logout, rotas protegidas
  - [ ] Expiração de sessão na navegação e no checkout, preservando o contexto para retomada
  - [ ] Logout/troca de usuário limpa o cache privado do Query e desconecta o socket
  - [ ] Senhas nunca em claro (nem no mock)
  - [ ] Rota 404
- [ ] **3. Início + Detalhe**: busca, filtros, ordenação e paginação na URL, skeletons, detalhe com edições e quantidade, favoritos otimistas com rollback
  - [x] Layout da Início (hero, produtos com dados do mock, sidebar, promos, blog) e do Detalhe (galeria, edições, quantidade, descrição, mais da coleção), conferido em 390/768/1440
  - [ ] Abas, ordenação, filtros, faixa de preço e paginação estão só visuais: ligar à URL
  - [ ] Busca (ícone do header) e favoritos (botão hoje mostra aviso)
  - [ ] Barra de navegação inferior do mobile (frame Mobile / Início) e filtros em drawer no mobile
  - [ ] Cancelar/descartar respostas obsoletas (AbortSignal via Axios + Query)
  - [ ] Mudança de filtro volta para a página 1
  - [x] Detalhe: NFT inexistente, edição indisponível, limite de quantidade
  - [ ] Skeletons com shimmer, sem layout shift, respeitando `prefers-reduced-motion`

## Dia 2: compra, tempo real e entrega
- [ ] **4. Carrinho + Socket**: carrinho no servidor, merge do carrinho do visitante ao logar, cupom, cotação, `nft.updated` com versão e deduplicação
  - [ ] Carrinho do visitante sobrevive ao refresh (local ou guest id)
  - [ ] Eventos com id estável, recurso e versão; ignorar duplicatas e eventos antigos
  - [ ] Reconciliar com a REST após reconexão
  - [ ] Eventos de sessão anterior não afetam outro usuário; liberar listeners ao fim do ciclo de vida
  - [ ] Avisar alterações em tempo real de forma acessível (aria-live)
- [ ] **5. Checkout + Pedido**: formulário, carteira e rede, revisão, revalidação da cotação, idempotency key, `order.updated`, pendente/confirmado/recusado, recibo
  - [ ] Simular conexão, recusa e desconexão da carteira
  - [ ] Mudança na revalidação exige nova confirmação do usuário
  - [ ] Impedir pedidos duplicados em clique repetido ou reenvio após timeout
  - [ ] Recuperar pedido pendente após refresh/reconexão; confirmado e recusado são terminais
  - [ ] Falha preserva os itens; confirmação remove só os itens e quantidades comprados
  - [ ] Confirmação só para pedido confirmado; recibo é snapshot e não muda com o catálogo
- [ ] **6. Perfil + Carteiras**: edição de perfil, avatar e senha, carteiras principal e secundária
  - [ ] Validação de formulários incluindo erros da API; alterações persistem após refresh
  - [ ] Perfil, carteiras e confirmação funcionando em mobile (sem frame no Figma)
- [ ] **7. Testes Playwright**: os 12 cenários, desktop e mobile, baselines visuais
  - [ ] Cada teste parte de estado isolado
  - [ ] Controle de relógio, latência e disparo de eventos nos cenários sensíveis a tempo
  - [ ] Relatório HTML e traces das falhas
  - [ ] Regressão visual de início, detalhe, carrinho e pagamento, com dados estáveis
  - [ ] Tempo real passa pelo `socket.io-client`; REST pelos handlers MSW
- [ ] **8. Lighthouse + docs**: auditoria, README da solução, ARCHITECTURE.md, deploy final
  - [ ] Lighthouse em início e detalhe, mobile e desktop, 3 medições cada, mediana por categoria
  - [ ] Registrar LCP, CLS, TBT, config versionada, versões das ferramentas e ambiente; justificar metas não atingidas
  - [ ] Script `lighthouse`
  - [ ] README: setup, variáveis de ambiente, credenciais fictícias, seleção/reset de cenários, como reproduzir as falhas
  - [ ] ARCHITECTURE.md: contratos REST e eventos, política de sessão, estado do carrinho, cache/retry/sincronização, reconciliação REST × socket, transporte do socket no mock e limitações, desvios do Figma e substituições de assets

## Notas de setup
- `msw` fixado em 2.x por causa do peer de `@mswjs/socket.io-binding`
- MSW roda também em produção (`src/main.tsx`), porque é o backend da aplicação
- Service worker regenerado com `msw init` (2.15.0); refresh e navegação voltaram a funcionar
- `src/routeTree.gen.ts` é versionado (gerado pelo plugin do Vite)
- Alias `@/` aponta para `src/`
- Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test:e2e`, `test:e2e:ui`, `test:e2e:update`
