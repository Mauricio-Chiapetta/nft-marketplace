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
  - [x] Deploy na Vercel (build `pnpm build`, output `dist`)
- [x] **1. Contratos + mock DB**: tipos, fixtures (~40 NFTs, 2 usuários), DB do MSW em localStorage com reset, handlers REST
  - [x] Cenários configuráveis e reproduzíveis: sucesso, vazio, latência variável, respostas fora de ordem, offline, 4xx/5xx, sessão expirada, 401/403, conflito de cadastro/validação, cupom inválido e expirado, preço alterado/edição esgotada na compra, timeout após criar pedido, pagamento confirmado e recusado
  - [x] Formato padronizado de erro: validação, sessão inválida, permissão, inexistente, conflito de disponibilidade, falha transitória
  - [x] Idempotency key: mesma tentativa devolve o mesmo pedido; mesma chave com conteúdo diferente responde 409
  - [x] Mudanças no DB do mock publicam o evento no barramento (`src/mocks/events.ts`); o transporte via socket.io entra na fase 4
  - [x] Valores ETH como string decimal (`src/lib/eth.ts`)
- [x] **2. Layout + Auth**: tokens do Figma, header e footer, login, cadastro, sessão, logout, rotas protegidas com redirect
  - [x] Tokens do Figma (cores, Roboto Mono) em `src/index.css`; header (ativo por rota, divisória só fora do Mercado) e footer
  - [x] Login e cadastro (`/entrar`, `/criar-conta`: modal sobre a Início no desktop, tela cheia no mobile), validação local + erros da API por campo
  - [x] Sessão em `src/lib/session.ts` (token + validade, sincronizada entre abas), revalidada no boot; 401 encerra via interceptor do Axios
  - [x] Logout pelo menu do usuário no header; rota protegida `_authed` com `?redirect=` (placeholder `/perfil` até a fase 6)
  - [x] Google, Facebook e "Esqueceu a senha?" fora do escopo: avisam que não estão disponíveis
  - [x] Expiração de sessão na navegação: aviso + volta ao login com `?redirect=` e retomada após entrar
  - [x] Expiração no checkout preservando o formulário (rascunho em sessionStorage por usuário)
  - [x] Logout/troca de usuário limpa o cache privado do Query (e o MutationCache); o socket reconecta com a nova identidade
  - [x] Senhas nunca em claro: hash com salt no mock, nada no localStorage, mutations de auth com `gcTime: 0`
  - [x] Rota 404
- [x] **3. Início + Detalhe**: busca, filtros, ordenação e paginação na URL, skeletons, detalhe com edições e quantidade, favoritos otimistas com rollback
  - [x] Layout da Início (hero, produtos com dados do mock, sidebar, promos, blog) e do Detalhe (galeria, edições, quantidade, descrição, mais da coleção), conferido em 390/768/1440
  - [x] Abas (atalhos de ordenação), ordenação, categorias, faixa de preço e paginação na URL (`src/features/catalog/search.ts`)
  - [x] Busca no header (desktop) e "Explorar coleções" (mobile) com `?q=` e debounce
  - [x] Favoritos otimistas com rollback e cache por usuário (detalhe e cards do mobile)
  - [x] Filtro por rede e lista de favoritos: fora do escopo (avisam em vez de simular)
  - [x] Mobile: tab bar, topo com busca e filtros em drawer, cards escalonados, detalhe com barra de compra
  - [x] Cancelar/descartar respostas obsoletas (AbortSignal via Axios + Query)
  - [x] Mudança de filtro volta para a página 1
  - [x] Detalhe: NFT inexistente, edição indisponível, limite de quantidade
  - [x] Skeletons com shimmer, sem layout shift, respeitando `prefers-reduced-motion`

## Dia 2: compra, tempo real e entrega
- [x] **4. Carrinho + Socket**: carrinho no servidor, merge do carrinho do visitante ao logar, cupom, cotação, `nft.updated` com versão e deduplicação
  - [x] Carrinho do visitante no servidor via `X-Guest-Id` (localStorage); sobrevive ao refresh
  - [x] Merge no login/cadastro por `POST /cart/merge` com o guest id (não depende do cache limpo); ajustes de quantidade avisados
  - [x] Servidor Socket.IO no MSW (`src/mocks/realtime.ts`); cliente ignora duplicatas e versões antigas (`src/features/realtime`)
  - [x] Reconciliar com a REST após reconexão (invalida queries ativas); queda e rede caída via `__mock.dropRealtime`/`setRealtimeOnline`
  - [x] `order.updated` só para o dono (servidor) e conferido no cliente; nova conexão a cada troca de sessão; cleanup dos listeners
  - [x] Avisar alterações em tempo real de forma acessível (toasts com aria-live, avisos por item no carrinho)
- [x] **5. Checkout + Pedido**: formulário, carteira e rede, revisão, revalidação da cotação, idempotency key, `order.updated`, pendente/confirmado/recusado, recibo
  - [x] Simular conexão, recusa (`?scenario=wallet-rejected`) e desconexão da carteira
  - [x] Mudança na revalidação (409 com cotação nova) exige "Aceitar novos valores"
  - [x] Idempotency-Key gravada antes do POST: clique repetido, timeout (reenvio automático) e refresh recuperam o mesmo pedido
  - [x] Pedido pendente recuperado após refresh/reconexão (`order.updated` + polling de reserva); terminais não mudam
  - [x] Falha preserva os itens; confirmação remove só os itens e quantidades comprados
  - [x] Confirmação só para pedido confirmado; recibo é snapshot e não muda com o catálogo
- [x] **6. Perfil + Carteiras**: edição de perfil, avatar e senha, carteiras principal e secundária
  - [x] `/perfil`: nome, usuário e bio (e-mail só leitura), avatar PNG/JPEG/WebP até 300 KB com remoção, alteração de senha (encerra as outras sessões)
  - [x] `/carteiras`: cadastro da principal e da secundária, edição de apelido/endereço/papel (trocar o papel inverte as duas)
  - [x] Validação de formulários incluindo erros da API (usuário em uso, senha atual incorreta, carteira duplicada); alterações persistem após refresh
  - [x] Perfil, carteiras e confirmação funcionando em mobile (sem frame no Figma: seguem o padrão do checkout)
  - [x] Avatar no menu do usuário; checkout sem carteira leva ao cadastro
- [x] **7. Testes Playwright**: os 12 cenários, desktop e mobile, baselines visuais
  - [x] Cada teste parte de estado isolado (contexto novo + `?mockReset`); specs por cenário em `e2e/*.spec.ts`, helpers em `e2e/support`
  - [x] Controle de relógio (`page.clock` na liquidação e no timeout do pedido), latência (`slow`) e disparo de eventos (`__mock.updateNft/settleOrder/replayEvent`)
  - [x] Relatório HTML e traces/screenshots das falhas (`retain-on-failure`)
  - [x] Regressão visual de início, detalhe, carrinho e pagamento (`e2e/__screenshots__`, relógio fixo; baselines geradas no Windows/Chromium)
  - [x] Tempo real passa pelo `socket.io-client`; REST pelos handlers MSW
  - [x] Correções achadas pelos testes: foco no primeiro campo inválido do checkout, merge do carrinho sobrescrito por GET em voo, logout no mobile
- [x] **8. Lighthouse + docs**: auditoria, README da solução, ARCHITECTURE.md, deploy final
  - [x] Lighthouse em início e detalhe, mobile e desktop, 3 medições cada, mediana por categoria (`lighthouse/reports`)
  - [x] LCP, CLS, TBT, config versionada (`lighthouse/config.mjs`), versões e ambiente; metas não atingidas justificadas no ARCHITECTURE.md
  - [x] Script `pnpm lighthouse` (Lighthouse 12.8.2: a 13 exige Node 22)
  - [x] Só a composição do viewport é renderizada (não baixa a imagem oculta); UI renderiza em paralelo ao boot do MSW
  - [x] README: setup, variáveis, credenciais, cenários e reset, fluxos de falha (enunciado em docs/DESAFIO.md)
  - [x] ARCHITECTURE.md: contratos, eventos, sessão, carrinho, cache/retry, reconciliação, transporte do socket, desvios do Figma e assets
  - [x] 403 `FORBIDDEN` (carteira de outra conta) e cenário `forbidden`
  - [x] Deploy na Vercel (https://nft-marketplace-iota-coral.vercel.app): rotas diretas, refresh, mocks, login e Socket.IO conferidos

## Notas de setup
- `msw` fixado em 2.x por causa do peer de `@mswjs/socket.io-binding`
- MSW roda também em produção (`src/main.tsx`), porque é o backend da aplicação
- Service worker regenerado com `msw init` (2.15.0); refresh e navegação voltaram a funcionar
- `src/routeTree.gen.ts` é versionado (gerado pelo plugin do Vite)
- Alias `@/` aponta para `src/`
- Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test:e2e`, `test:e2e:ui`, `test:e2e:update`
