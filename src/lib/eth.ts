// Aritmética de ETH sem ponto flutuante. Valores trafegam como strings decimais
// ("0.125") e são convertidos para wei (bigint, 18 casas) só durante o cálculo.
// Usado tanto pelo mock (servidor) quanto pela interface.

const DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function isEthAmount(value: unknown): value is string {
  return typeof value === 'string' && ETH_PATTERN.test(value)
}

export function toWei(eth: string): bigint {
  if (!isEthAmount(eth)) throw new Error(`Valor ETH inválido: ${eth}`)
  const [whole, fraction = ''] = eth.split('.')
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, '0'))
}

export function fromWei(wei: bigint): string {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const whole = abs / WEI_PER_ETH
  const fraction = (abs % WEI_PER_ETH).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

export function ethAdd(...values: string[]): string {
  return fromWei(values.reduce((sum, v) => sum + toWei(v), 0n))
}

export function ethSub(a: string, b: string): string {
  return fromWei(toWei(a) - toWei(b))
}

export function ethMul(eth: string, quantity: number): string {
  if (!Number.isInteger(quantity)) throw new Error('Quantidade deve ser inteira')
  return fromWei(toWei(eth) * BigInt(quantity))
}

/** Percentual inteiro (ex.: 10 = 10%), arredondado para baixo em wei. */
export function ethPercent(eth: string, percent: number): string {
  return fromWei((toWei(eth) * BigInt(percent)) / 100n)
}

export function ethCompare(a: string, b: string): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

export function ethMin(...values: string[]): string {
  return values.reduce((min, v) => (ethCompare(v, min) < 0 ? v : min))
}

export function ethMax(...values: string[]): string {
  return values.reduce((max, v) => (ethCompare(v, max) > 0 ? v : max))
}

/** Formatação para exibição, com no máximo `maxDecimals` casas (truncadas). */
export function formatEth(eth: string, maxDecimals = 8): string {
  const [whole, fraction = ''] = eth.replace(/^-/, '').split('.')
  const cut = fraction.slice(0, maxDecimals).replace(/0+$/, '')
  return `${eth.startsWith('-') ? '-' : ''}${whole}${cut ? `.${cut}` : ''} ETH`
}
