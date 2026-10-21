import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye } from 'lucide-react'
import { cn } from 'cn'
import eyeOffIcon from '@/assets/icons/eye-off.svg'

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function AuthField({ label, error, type = 'text', className, ...props }: AuthFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          placeholder={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-[50px] w-full rounded-[10px] border border-border bg-transparent px-4 text-base leading-4 text-foreground outline-none transition-colors placeholder:text-sm placeholder:text-secondary focus:border-primary aria-invalid:border-destructive md:h-10 md:rounded-[5px]',
            isPassword && 'pr-12',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="absolute top-1/2 right-4 grid size-5 -translate-y-1/2 place-items-center text-secondary"
          >
            {visible ? (
              <Eye className="size-[18px]" strokeWidth={1.5} />
            ) : (
              <img src={eyeOffIcon} alt="" width={18.98} height={14.65} />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
