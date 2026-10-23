// Cenários de rede e de negócio do mock. Selecionados por `?scenario=<nome>`
// (opcionalmente `&target=<método> <trecho do path>`) e mantidos na aba via
// sessionStorage. `?scenario=default` volta ao normal.

export const SCENARIOS = [
  /** Latência curta e respostas de sucesso. */
  'default',
  /** Latência alta e fixa (2,5 s). */
  'slow',
  /** Latência variável e determinística; buscas curtas demoram mais (respostas fora de ordem). */
  'variable',
  /** HTTP 500. */
  'error',
  /** HTTP 403 (acesso não autorizado). */
  'forbidden',
  /** HTTP 503. */
  'unavailable',
  /** Falha de conexão (erro de rede). */
  'offline',
  /** A resposta nunca chega; o Axios encerra por timeout. */
  'timeout',
  /** Catálogo sem resultados. */
  'empty',
  /** Sessões novas expiram em poucos segundos. */
  'session-expired',
  /** Pagamentos são recusados. */
  'payment-declined',
  /** Pedidos ficam pendentes até liquidação manual (`__mock.settleOrder`). */
  'order-pending',
  /** O pedido é criado, mas a resposta só chega depois do timeout do cliente. */
  'order-timeout',
  /** A conexão com a carteira é recusada. */
  'wallet-rejected',
  /** O preço do primeiro item muda logo após a primeira cotação. */
  'price-change',
  /** A edição do primeiro item esgota logo após a primeira cotação. */
  'sold-out',
] as const

export type ScenarioName = (typeof SCENARIOS)[number]

export interface ScenarioState {
  name: ScenarioName
  /** Restringe cenários de rede a requisições que casam com o alvo. */
  target: string | null
}

const STORAGE_KEY = 'nft-mock:scenario'
const DEFAULT_STATE: ScenarioState = { name: 'default', target: null }

function isScenario(value: unknown): value is ScenarioName {
  return typeof value === 'string' && (SCENARIOS as readonly string[]).includes(value)
}

function readStored(): ScenarioState {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as ScenarioState | null
    if (parsed && isScenario(parsed.name)) return parsed
  } catch {
    // ignora valor inválido
  }
  return DEFAULT_STATE
}

function store(state: ScenarioState) {
  try {
    if (state.name === 'default' && !state.target) sessionStorage.removeItem(STORAGE_KEY)
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // sem sessionStorage o cenário vale só para esta carga
  }
}

let current: ScenarioState = readStored()
const changeListeners = new Set<(state: ScenarioState) => void>()

/** Lê o cenário da URL da página na inicialização do mock. */
export function initScenarioFromUrl(search: string) {
  const params = new URLSearchParams(search)
  const name = params.get('scenario')
  if (isScenario(name)) setScenario(name, params.get('target'))
}

export function getScenario(): ScenarioState {
  return current
}

export function setScenario(name: ScenarioName, target: string | null = null) {
  if (!isScenario(name)) throw new Error(`Cenário desconhecido: ${String(name)}`)
  current = { name, target: target || null }
  store(current)
  for (const listener of changeListeners) listener(current)
}

export function onScenarioChange(listener: (state: ScenarioState) => void): () => void {
  changeListeners.add(listener)
  return () => changeListeners.delete(listener)
}

export function scenarioIs(name: ScenarioName): boolean {
  return current.name === name
}

/** O alvo aceita "trecho" ou "MÉTODO trecho", ex.: "PUT /favorites". */
export function targetMatches(request: Request): boolean {
  if (!current.target) return true
  const [first, ...rest] = current.target.trim().split(/\s+/)
  const hasMethod = rest.length > 0 && /^[A-Z]+$/.test(first)
  const method = hasMethod ? first : null
  const fragment = hasMethod ? rest.join(' ') : current.target.trim()
  const { pathname } = new URL(request.url)
  return (!method || request.method === method) && pathname.includes(fragment)
}
