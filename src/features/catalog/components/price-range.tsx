import { useState } from 'react'
import { ethCompare, formatEth } from '@/lib/eth'

const STEP = 0.025

// O controle trabalha em "passos" inteiros para evitar ponto flutuante; a URL
// e a API recebem strings ETH.
const toSteps = (eth: string) => Math.round(Number(eth) / STEP)
const fromSteps = (steps: number) => (steps * STEP).toFixed(3).replace(/\.?0+$/, '')

export function PriceRange({
  bounds,
  min,
  max,
  onApply,
}: {
  bounds: { min: string; max: string }
  min?: string
  max?: string
  onApply: (range: { min?: string; max?: string }) => void
}) {
  const lo = toSteps(bounds.min)
  const hi = Math.max(toSteps(bounds.max), lo + 1)
  const [draft, setDraft] = useState(() => [min ? toSteps(min) : lo, max ? toSteps(max) : hi] as const)
  const [from, to] = [Math.max(lo, Math.min(draft[0], hi)), Math.max(lo, Math.min(draft[1], hi))]
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100

  function apply() {
    const nextMin = fromSteps(from)
    const nextMax = fromSteps(to)
    onApply({
      min: ethCompare(nextMin, bounds.min) > 0 ? nextMin : undefined,
      max: ethCompare(nextMax, bounds.max) < 0 ? nextMax : undefined,
    })
  }

  const thumb =
    'pointer-events-none absolute inset-0 h-[15px] w-full appearance-none bg-transparent outline-none ' +
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-primary ' +
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-primary ' +
    'focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring'

  return (
    <div className="flex flex-col gap-3 pl-3">
      <div className="relative h-[15px]">
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
        <span
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${pct(from)}%`, right: `${100 - pct(to)}%` }}
        />
        <input
          type="range"
          aria-label="Preço mínimo"
          min={lo}
          max={hi}
          value={from}
          aria-valuetext={formatEth(fromSteps(from))}
          onChange={(e) => setDraft([Math.min(Number(e.target.value), to), to])}
          className={thumb}
        />
        <input
          type="range"
          aria-label="Preço máximo"
          min={lo}
          max={hi}
          value={to}
          aria-valuetext={formatEth(fromSteps(to))}
          onChange={(e) => setDraft([from, Math.max(Number(e.target.value), from)])}
          className={thumb}
        />
      </div>
      <p className="text-[15px] text-foreground">
        Preço: {fromSteps(from).replace('.', ',')} - {fromSteps(to).replace('.', ',')} ETH
      </p>
      <button
        type="button"
        onClick={apply}
        className="self-start rounded-md bg-primary px-3 py-2 text-base font-bold leading-5 text-ink transition-colors hover:bg-text-accent"
      >
        Aplicar
      </button>
    </div>
  )
}
