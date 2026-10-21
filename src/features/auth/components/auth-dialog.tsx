import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from 'cn'
import { toast } from 'sonner'
import closeIcon from '@/assets/icons/close.svg'
import { toApiError } from '@/lib/api-error'
import { useLogin, useRegister } from '../api'
import { isProtectedPath } from '../redirect'
import { AuthField } from './auth-field'
import { SocialButtons } from './social-buttons'

type Mode = 'login' | 'register'
type Fields = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Mesmas regras do servidor, para responder antes do request.
function validate(mode: Mode, values: Record<string, string>): Fields {
  const errors: Fields = {}
  if (mode === 'register' && values.name.trim().length < 2) errors.name = 'Informe seu nome de usuário.'
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (mode === 'login') {
    if (!values.password) errors.password = 'Informe sua senha.'
  } else {
    if (values.password.length < 8) errors.password = 'A senha deve ter ao menos 8 caracteres.'
    else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password))
      errors.password = 'Use letras e números na senha.'
    if (values.confirm !== values.password) errors.confirm = 'As senhas não coincidem.'
  }
  return errors
}

const COPY = {
  login: {
    title: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    submit: 'Entrar',
    pending: 'Entrando…',
  },
  register: {
    title: 'Criar conta',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    submit: 'Criar conta',
    pending: 'Criando conta…',
  },
}

export function AuthDialog({ mode, redirect }: { mode: Mode; redirect?: string }) {
  const navigate = useNavigate()
  const login = useLogin()
  const register = useRegister()
  const mutation = mode === 'login' ? login : register
  const copy = COPY[mode]

  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
  const [fieldErrors, setFieldErrors] = useState<Fields>({})
  const [formError, setFormError] = useState<string | null>(null)

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setFieldErrors((errs) => ({ ...errs, [key]: undefined }))
  }

  function close() {
    // Fechar sem entrar não pode cair de novo numa rota protegida.
    const target = redirect && !isProtectedPath(redirect) ? redirect : '/'
    navigate({ href: target })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (mutation.isPending) return
    setFormError(null)
    const errors = validate(mode, values)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    const email = values.email.trim()
    const onError = (error: unknown) => {
      const apiError = toApiError(error)
      if (apiError.fields) setFieldErrors(apiError.fields as Fields)
      setFormError(apiError.message)
    }
    const onSuccess = () => {
      toast.success(mode === 'login' ? 'Bem-vindo de volta!' : 'Conta criada. Boas-vindas à Kurio!')
      navigate({ href: redirect ?? '/' })
    }
    if (mode === 'login') {
      login.mutate({ email, password: values.password }, { onError, onSuccess })
    } else {
      register.mutate({ name: values.name.trim(), email, password: values.password }, { onError, onSuccess })
    }
  }

  const otherMode = mode === 'login' ? '/criar-conta' : '/entrar'
  const search = redirect ? { redirect } : {}

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/80 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby="auth-description"
          className={cn(
            'fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink px-7 pt-20 pb-6 outline-none',
            'md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[calc(100dvh-2rem)] md:w-[500px] md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-y-auto md:rounded-lg md:bg-surface-card md:px-0 md:pt-12 md:pb-[66px]',
            'data-open:animate-in data-open:fade-in-0 md:data-open:zoom-in-95',
          )}
        >
          <DialogPrimitive.Close
            aria-label="Fechar"
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-sm md:top-[11px] md:right-3"
          >
            <img src={closeIcon} alt="" width={18} height={18} />
          </DialogPrimitive.Close>

          {/* Mobile: marca + título, como nas telas Mobile / Login e Cadastro */}
          <div className="flex h-[136px] items-center justify-center md:hidden">
            <p className="text-[32px] font-bold tracking-[3.2px] text-foreground" aria-hidden>
              KURIO
            </p>
          </div>

          <header className="mt-10 flex flex-col items-center gap-10 md:mt-0 md:px-12">
            <DialogPrimitive.Title className="text-xl font-bold leading-4 text-foreground md:sr-only">
              {copy.title}
            </DialogPrimitive.Title>
            <nav aria-label="Acesso" className="hidden items-center gap-2 text-xl font-medium leading-4 md:flex">
              <Link
                to="/entrar"
                search={search}
                replace
                className={mode === 'login' ? 'text-text-accent' : 'text-foreground hover:text-text-accent'}
                aria-current={mode === 'login' ? 'page' : undefined}
              >
                Entrar
              </Link>
              <span className="h-5 w-px bg-[#f0805f]" aria-hidden />
              <Link
                to="/criar-conta"
                search={search}
                replace
                className={mode === 'register' ? 'text-text-accent' : 'text-foreground hover:text-text-accent'}
                aria-current={mode === 'register' ? 'page' : undefined}
              >
                Criar conta
              </Link>
            </nav>
            <DialogPrimitive.Description id="auth-description" className="hidden text-center text-[13px] leading-4 text-foreground md:block">
              {copy.description}
            </DialogPrimitive.Description>
          </header>

          <form onSubmit={onSubmit} noValidate className="mt-10 flex flex-col md:mt-6 md:px-20">
            <div className="flex flex-col gap-3">
              {mode === 'register' && (
                <AuthField
                  label="Nome de usuário"
                  autoComplete="name"
                  value={values.name}
                  onChange={set('name')}
                  error={fieldErrors.name}
                />
              )}
              <AuthField
                label="E-mail"
                placeholder={mode === 'login' ? 'contato@email.com' : 'Digite seu e-mail'}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={values.email}
                onChange={set('email')}
                error={fieldErrors.email}
                autoFocus
              />
              <AuthField
                label="Senha"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={values.password}
                onChange={set('password')}
                error={fieldErrors.password}
              />
              {mode === 'register' && (
                <AuthField
                  label="Confirmar senha"
                  type="password"
                  autoComplete="new-password"
                  value={values.confirm}
                  onChange={set('confirm')}
                  error={fieldErrors.confirm}
                />
              )}
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => toast.info('A recuperação de senha ainda não está disponível.')}
                  className="self-end text-sm leading-4 text-text-accent hover:underline"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>

            {formError && (
              <p role="alert" className="mt-4 rounded-[5px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-10 h-[60px] rounded-[10px] bg-primary text-base font-bold leading-4 text-ink transition-colors hover:bg-text-accent disabled:cursor-wait disabled:opacity-70 md:mt-6 md:h-[45px] md:rounded-[5px]"
            >
              {mutation.isPending ? copy.pending : copy.submit}
            </button>
          </form>

          <div className="mt-10 flex flex-col gap-3 md:mt-6">
            <div className="flex items-center gap-3 text-[13px] leading-4 text-foreground">
              <span className="h-px flex-1 bg-border" />
              Ou continue com
              <span className="h-px flex-1 bg-border" />
            </div>
            <SocialButtons className="flex flex-col gap-4 md:gap-3 md:px-20" />
          </div>

          <p className="mt-10 text-center text-[15px] text-text-secondary md:hidden">
            {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem conta? '}
            <Link to={otherMode} search={search} replace className="text-text-accent underline-offset-4 hover:underline">
              {mode === 'login' ? 'Crie uma conta' : 'Entre'}
            </Link>
          </p>

          <span className="absolute inset-x-0 bottom-0 hidden h-2.5 bg-primary md:block" aria-hidden />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
