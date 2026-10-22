import { useId, type ReactNode } from 'react'
import { cn } from 'cn'
import selectArrow from '@/assets/icons/select-arrow.svg'

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: ReactNode
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string; 'aria-required'?: true }) => ReactNode
  className?: string
}

/** Rótulo com asterisco do Figma, erro associado ao campo por aria-describedby. */
export function Field({ label, required, error, hint, children, className }: FieldProps) {
  const id = useId()
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={id} className="flex items-center gap-1 text-[15px]/[29px] text-foreground">
        {label}
        {required && (
          <span aria-hidden className="text-[22px]/[29px] text-[#f0805f]">
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? true : undefined,
      })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputClass =
  'h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-sm text-foreground outline-none transition-colors placeholder:text-secondary focus:border-primary aria-invalid:border-destructive read-only:text-text-secondary'

export function SelectBox(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(inputClass, 'appearance-none pr-9 invalid:text-secondary [&>option]:bg-surface-card [&>option]:text-foreground', props.className)}
      />
      <img src={selectArrow} alt="" width={18} height={18} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2" />
    </div>
  )
}
