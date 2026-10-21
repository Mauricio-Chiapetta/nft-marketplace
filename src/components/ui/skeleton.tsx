import { cn } from "cn"

// Brilho que atravessa o bloco; com prefers-reduced-motion fica estático.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_ease-in-out_infinite] after:bg-linear-to-r after:from-transparent after:via-foreground/8 after:to-transparent",
        "motion-reduce:after:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
