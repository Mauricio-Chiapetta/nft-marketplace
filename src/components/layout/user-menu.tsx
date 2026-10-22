import { Link } from '@tanstack/react-router'
import { LogOut, User, Wallet as WalletIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/features/auth/api'

export function UserMenu({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const logout = useLogout()
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta de ${name}`}
        className="flex h-[35px] items-center gap-2 rounded-md border border-primary pr-3 pl-1 text-sm font-medium text-text-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" width={28} height={28} className="size-7 rounded-full object-cover" />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-primary text-sm font-bold text-ink">{initial}</span>
        )}
        <span className="hidden max-w-[120px] truncate sm:inline">{name.split(' ')[0]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <User />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/carteiras">
            <WalletIcon />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOut />
          {logout.isPending ? 'Saindo…' : 'Sair'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
