# Arquitetura

Visão do código, contratos, políticas de estado e decisões tomadas. Setup, cenários e comandos estão no [README](README.md).

## Organização

```
src/
  main.tsx              boot: remove ?mockReset da URL, renderiza, sobe o MSW e o tempo real
  routes/               TanStack Router (file-based; _authed = rotas privadas)
  features/<domínio>/   api.ts (queries/mutations/keys) + components/
    auth, catalog, cart, checkout, orders, favorites, profile, wallets, realtime, home
  components/ui         shadcn/ui adaptado aos tokens do Figma
  components/layout     header, footer, tab bar mobile, 404
  lib/                  api (Axios), backend (gate do MSW), session, socket, query-client, eth
  mocks/                "servidor": db, handlers REST, services, realtime (Socket.IO), cenários, controles
  types/api.ts          contratos compartilhados por mock, estado e interface
e2e/                    Playwright (specs por cenário, support/, baselines visuais)
lighthouse/, scripts/   configuração e script da auditoria
```

Regra de dependência: a aplicação não importa `src/mocks` (só `main.tsx`, para subir o mock e ler `?mockReset`). Componentes e hooks não têm respostas fictícias. Tudo passa por Axios → MSW ou `socket.io-client` → MSW.

## Contratos REST

Base `/api`, JSON, autenticação `Authorization: Bearer <token>`. O visitante é identificado por `X-Guest-Id` (UUID no `localStorage`). Os tipos estão em [src/types/api.ts](src/types/api.ts). Valores ETH trafegam como **string decimal** e as contas são feitas em inteiros de 18 casas ([src/lib/eth.ts](src/lib/eth.ts)). Quantidades são inteiras.

| Recurso | Operações |
| --- | --- |
| Sessão | `POST /auth/register` (201), `POST /auth/login`, `GET /auth/session`, `POST /auth/logout` |
| NFTs | `GET /nfts?q&category&availability&min&max&sort&page&pageSize`, `GET /nfts/facets`, `GET /nfts/:id` |
| Favoritos | `GET /me/favorites`, `PUT /me/favorites/:nftId`, `DELETE /me/favorites/:nftId` |
| Carrinho | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`, `DELETE /cart/items/:itemId`, `PUT /cart/coupon`, `DELETE /cart/coupon`, `POST /cart/merge` |
| Cotação | `POST /quotes` (`{ network }`), `GET /quotes/:id`, `POST /quotes/:id/validate` |
| Pedidos | `POST /orders` (header `Idempotency-Key` obrigatório), `GET /orders`, `GET /orders/:id` |
| Perfil | `GET /me/profile`, `PATCH /me/profile` (dados e `avatarDataUrl`), `POST /me/password` |
| Carteiras | `GET /me/wallets`, `POST /me/wallets`, `PATCH /me/wallets/:id`, `POST /me/wallets/:id/connect`, `DELETE /me/wallets/:id/connection` |

### Erros

Formato único: `{ error: { code, message, fields?, details? } }`.

| Situação | Status / código |
| --- | --- |
| Validação | 422 `VALIDATION_ERROR`, `fields` por campo (mostrados no próprio campo) |
| Credenciais / sessão | 401 `INVALID_CREDENTIALS`, `UNAUTHORIZED` (sem token), `SESSION_EXPIRED` (o interceptor encerra a sessão) |
| Permissão | 403 `FORBIDDEN`: alterar ou conectar a carteira de outra conta; cenário `forbidden` |
| Inexistente | 404 `NOT_FOUND`. Pedido de outro usuário também responde 404, para não revelar que existe |
| Conflito | 409: `EMAIL_TAKEN`, `USERNAME_TAKEN`, carteira duplicada (no campo), `WALLET_SLOT_TAKEN`, `OUT_OF_STOCK`, `QUOTE_STALE`/`QUOTE_EXPIRED` (com a cotação nova em `details.quote`), `IDEMPOTENCY_CONFLICT`, `WALLET_REJECTED`/`WALLET_NOT_CONNECTED` |
| Outros | 422 `QUANTITY_LIMIT`, `CART_EMPTY`; 413 `PAYLOAD_TOO_LARGE` (avatar) |
| Falha transitória | 500 `INTERNAL_ERROR`, 503 `SERVICE_UNAVAILABLE`, erro de rede, timeout (cenários) |

### Idempotência do pedido

O cliente grava `{ key, body }` no `sessionStorage` **antes** do `POST /orders`. A mesma chave com o mesmo corpo devolve o mesmo pedido; a mesma chave com outro corpo responde 409. Se não houver resposta (timeout ou rede), o cliente reenvia uma vez sozinho com a mesma chave e, depois disso, oferece "Verificar pedido". Um refresh durante o envio também retoma a tentativa gravada.

## Eventos (Socket.IO)

Todo evento tem `id` (deduplicação), `type`, `resource { type, id }`, `version` (versão do recurso), `occurredAt` e `data`.

| Evento | Dados | Entrega | Efeito no cliente |
| --- | --- | --- | --- |
| `nft.updated` | `nftId`, edições (`priceEth`, `available`) | todos | Atualiza detalhe e listas em cache; refaz listas ativas; invalida carrinho e cotação; aviso (toast `aria-live` + aviso no item) |
| `order.updated` | `orderId`, `userId`, status, tx, motivo | só o dono, com sessão válida | Atualiza o pedido; confirmado invalida o carrinho |

O cliente descarta eventos com `id` já visto (até 500) e eventos com `version` menor ou igual à última conhecida do recurso, então duplicatas e eventos antigos nunca regridem o estado. Pedidos terminais (confirmado/recusado) não mudam mais.

O mesmo serviço que altera o DB do mock publica o evento ([src/mocks/events.ts](src/mocks/events.ts)), então REST e socket refletem a mesma mudança. Exemplo: `updateNftEditions` incrementa a versão do NFT e publica `nft.updated`.

## Sessão

- `POST /auth/login` devolve `{ token, expiresAt, user }`, com 30 min de validade (15 s no cenário `session-expired`). Fica em `localStorage` (`kurio.session`), sincronizada entre abas, e é revalidada no boot com `GET /auth/session`.
- O fim da sessão tem três gatilhos: timer local até `expiresAt`, 401 de qualquer chamada (interceptor do Axios) e logout em outra aba. Em todos: aviso, `clearPrivateState()` (remove todas as queries não públicas e o MutationCache) e reconexão do socket sem identidade.
- Rotas privadas (`_authed`: checkout, perfil, carteiras, pedidos) redirecionam para `/entrar?redirect=<rota>` e voltam após o login.
- No checkout, o formulário fica em `sessionStorage` por usuário, então a expiração não perde o que foi digitado.
- Senhas: o mock guarda hash SHA-256 com salt. As mutations de auth usam `gcTime: 0`, para as variáveis com a senha não ficarem no cache.

## Carrinho

- O carrinho é **do servidor**: do visitante (por `X-Guest-Id`) ou do usuário. A chave do Query inclui o dono (`['cart', 'guest' | 'user:<id>']`), o que isola os dados por usuário.
- No login ou cadastro, `POST /cart/merge` junta o carrinho do visitante ao do usuário, respeitando estoque e limite por pedido. Ajustes geram aviso. Qualquer `GET /cart` ainda em voo é cancelado antes de gravar o resultado do merge.
- Cada item guarda `addedPriceEth`. Se o preço atual diferir, o item mostra "Preço atualizado: era X, agora Y".
- A cotação (`POST /quotes`) é a referência de valores: subtotal, cupom, taxa de rede e total vêm da API, com chave `['cart', dono, 'quote', rede, versão do carrinho]`. Antes da revisão, `POST /quotes/:id/validate` revalida preço, estoque, cupom e taxa. Se algo mudou, a revisão mostra os dois totais e exige "Aceitar novos valores". O `POST /orders` com cotação desatualizada é recusado (409 com a cotação nova).
- Na confirmação, o servidor remove do carrinho só os itens e quantidades comprados. Numa falha, nada sai do carrinho.

## Cache, retries e sincronização

| Política | Valor |
| --- | --- |
| `staleTime` padrão | 30 s |
| Retry padrão | 1 tentativa (as falhas aparecem rápido, com botão "Tentar novamente") |
| Mutations | Sem retry. O pedido nunca é reenviado automaticamente, exceto o reenvio único com a mesma chave após timeout |
| `refetchOnWindowFocus` | Desligado (a sincronização vem dos eventos) |
| Pedido pendente | Polling de 5 s como reserva do socket; pedido terminal com `staleTime: Infinity` |
| Listas do catálogo | `placeholderData` mantém a página anterior durante a troca; `AbortSignal` cancela buscas obsoletas (respostas fora de ordem são descartadas) |
| Favoritos | Atualização otimista com rollback; mutations em série por NFT (`scope`); reconcilia com a REST ao fim |
| Após mutations | `setQueryData` com a resposta (carrinho, perfil, carteiras) ou `invalidateQueries` do recurso afetado |

### Reconciliação REST × Socket.IO

- Na primeira conexão, o cliente envia o evento `auth` com o token.
- Em toda **reconexão**, `invalidateQueries({ type: 'active' })` refaz pela REST tudo o que está na tela, cobrindo o que mudou enquanto o cliente estava sem conexão.
- Na **troca de sessão**, a conexão é refeita sem herdar a identidade anterior, e as versões de pedidos conhecidas são descartadas.
- Listeners são removidos no cleanup de `installRealtime`.

## Transporte do Socket.IO no mock e limitações

- O WebSocket é interceptado pelo MSW (`ws.link`) e o protocolo Socket.IO é falado pelo `@mswjs/socket.io-binding` ([src/mocks/realtime.ts](src/mocks/realtime.ts)). O cliente é o `socket.io-client` real, sem atalhos para setters ou para o cache.
- O binding só suporta o namespace padrão, sem rooms nem broadcast, e não lê o `auth` do handshake. Por isso o cliente envia o evento `auth` depois de conectar, e o filtro por usuário (`order.updated` só para o dono) é feito no servidor simulado.
- O servidor simulado envia os pings do Engine.IO (senão o cliente cai a cada ~30 s).
- "Sem conexão" (`__mock.setRealtimeOnline(false)`) deixa o handshake sem resposta, como numa rede caída. Fechar o socket antes do handshake trava o Manager do Socket.IO em "connecting".
- O `socket.io-client` é carregado por import dinâmico **depois** do MSW, porque o engine.io guarda a referência a `WebSocket` ao ser avaliado.
- O mock roda na mesma aba. Duas abas têm "servidores" independentes sobre o mesmo `localStorage`, então eventos não atravessam abas (a sessão, sim, é sincronizada).

## Boot e o MSW em produção

O MSW também roda no build publicado, porque ele é o backend. A interface renderiza imediatamente e as requisições do Axios esperam o service worker estar ativo ([src/lib/backend.ts](src/lib/backend.ts)). Isso tirou o boot do MSW do caminho crítico de renderização. O `?mockReset` é retirado da URL num módulo importado antes do router ([src/mocks/url-flags.ts](src/mocks/url-flags.ts)).

## Decisões de UX e desvios do Figma

- **Checkout:** os campos do Figma sem uso na API foram omitidos (Nome do perfil, Código de indicação, Nome ENS). "Tipo de carteira" virou o seletor das carteiras cadastradas, e o provedor (WalletConnect/MetaMask/Coinbase) é só a forma de conexão simulada. Sem carteira cadastrada, o checkout leva ao cadastro.
- **Catálogo:** as abas "Novos lançamentos" e "Em alta" são atalhos de ordenação (recentes / mais favoritados). As estrelas de avaliação do Figma viraram contagem de favoritos. A rede Solana virou Arbitrum (EVM, coerente com endereços 0x).
- **Cadastro:** o campo "Nome de usuário" do Figma grava `name`; o `username` é derivado do e-mail e pode ser editado no perfil.
- **Perfil, carteiras e confirmação** não têm frame no Figma: foram compostos com os campos, cards e tipografia do checkout. No mobile, como o header dá lugar à tab bar, o "Sair" fica nas abas da conta.
- **Fora do escopo** (avisam em vez de simular sucesso): login com Google/Facebook, "Esqueceu a senha?", filtro por rede, lista de favoritos, leitura de QR code e páginas editoriais ("Em breve").
- **Desktop × mobile:** início e detalhe têm composições diferentes no Figma. Só a do viewport atual é renderizada (`useMediaQuery`), para não baixar a imagem principal da outra.

## Acessibilidade

- Foco visível em todos os controles; diálogos e drawers (Radix) prendem o foco e o devolvem ao gatilho.
- Erros ligados aos campos por `aria-describedby` e `aria-invalid`; o envio inválido do checkout foca o primeiro campo com erro.
- Toasts (`aria-live`) para mutations e eventos em tempo real; avisos por item com `role="status"`; contagem de resultados do catálogo anunciada.
- Os estados não dependem só de cor: esgotado tem texto e risco, preço alterado tem texto.
- Ajustes em relação ao layout: os pontos da galeria mobile ganharam área de toque de 24 px em volta do ponto de 7 px do Figma. O slider de preço duplo do desktop mantém os dois `range` sobrepostos (padrão do componente), o que a auditoria `target-size` aponta.

## Assets

As ilustrações do Figma foram exportadas para `assets/source/jungle-*.png` e convertidas em WebP de 480 e 960 px (`public/nfts`). Os 40 NFTs do seed reutilizam essas 4 imagens. Os ícones vêm do Figma em SVG (`src/assets/icons`). A fonte é Roboto Mono via `@fontsource-variable` (local, sem CDN).

## Performance e Lighthouse

Resultados versionados em [lighthouse/reports/summary.md](lighthouse/reports/summary.md): medianas de 3 medições, LCP/CLS/TBT, auditorias reprovadas, versões e ambiente. Configuração em [lighthouse/config.mjs](lighthouse/config.mjs). O perfil mobile é o padrão do Lighthouse (4G lento simulado, CPU 4x); o desktop usa o preset oficial.

Melhorias feitas a partir da auditoria: UI renderizando em paralelo ao boot do MSW; só a composição do viewport renderizada; footer abaixo da dobra enquanto o conteúdo carrega (CLS do detalhe de 0,29 para 0); meta description e `robots.txt`; alvos de toque.

Metas não atingidas e causas:

- **Performance mobile (69–75):** FCP ≈ 3,3 s e LCP ≈ 4,4 s com 4G lento simulado e CPU 4x. A causa principal é o backend simulado no cliente: o chunk do MSW e dos mocks tem ≈ 170 KB gzip e ≈ 0,6 s de CPU, e as primeiras requisições esperam o service worker. Uma aplicação real não enviaria esse código. O restante é o bundle da aplicação (React, Router, Query, Radix: ≈ 115 KB gzip), já dividido por rota. No desktop, Performance fica em 97–99.
- **Best Practices (81–82):** a única auditoria reprovada é `is-on-https`, causada pelo antivírus da máquina de auditoria (Kaspersky), que injeta um script `http://gc.kis.v2.scr.kaspersky-labs.com/...` em toda página aberta pelo Chrome. O bloqueio da URL na configuração não remove a contagem. A aplicação não faz nenhuma requisição insegura. Numa máquina sem esse antivírus, a categoria fica sem reprovações.
- **Accessibility desktop do início (97):** `target-size` do slider de preço duplo (ver Acessibilidade).
