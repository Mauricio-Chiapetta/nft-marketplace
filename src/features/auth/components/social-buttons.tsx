import { toast } from 'sonner'
import facebookLogo from '@/assets/icons/facebook-logo.svg'
import g1 from '@/assets/icons/google/part-1.svg'
import g2 from '@/assets/icons/google/part-2.svg'
import g3 from '@/assets/icons/google/part-3.svg'
import g4 from '@/assets/icons/google/part-4.svg'
import g5 from '@/assets/icons/google/part-5.svg'
import g6 from '@/assets/icons/google/part-6.svg'
import g7 from '@/assets/icons/google/part-7.svg'

// Partes da marca do Google exportadas do Figma, nas posições originais (20×20).
const GOOGLE_PARTS = [
  { src: g1, inset: 'inset-[57.68%_17.83%_0_7.11%]' },
  { src: g2, inset: 'bottom-0 left-1/2 right-[17.83%] top-[71.33%]' },
  { src: g3, inset: 'inset-[24.69%_75.25%_24.69%_0]' },
  { src: g4, inset: 'inset-[38.28%_0_11.97%_47.07%]' },
  { src: g5, inset: 'bottom-[11.97%] left-1/2 right-0 top-[38.28%]' },
  { src: g6, inset: 'inset-[0_17.01%_57.68%_7.11%]' },
  { src: g7, inset: 'bottom-[70.51%] left-1/2 right-[17.01%] top-0' },
]

function GoogleMark() {
  return (
    <span className="relative size-5 shrink-0 overflow-hidden" aria-hidden>
      {GOOGLE_PARTS.map((part) => (
        <span key={part.src} className={`absolute ${part.inset}`}>
          <img src={part.src} alt="" className="absolute inset-0 block size-full max-w-none" />
        </span>
      ))}
    </span>
  )
}

// Login social fora do escopo: avisa em vez de simular sucesso.
function notAvailable() {
  toast.info('Login social ainda não está disponível. Use e-mail e senha.')
}

export function SocialButtons({ className }: { className?: string }) {
  const button =
    'flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] font-medium leading-4 text-text-secondary transition-colors hover:border-border-soft hover:bg-surface-dark/40'
  return (
    <div className={className}>
      <button type="button" onClick={notAvailable} className={button}>
        <GoogleMark />
        Continuar com Google
      </button>
      <button type="button" onClick={notAvailable} className={button}>
        <img src={facebookLogo} alt="" width={20} height={20} />
        Continuar com Facebook
      </button>
    </div>
  )
}
