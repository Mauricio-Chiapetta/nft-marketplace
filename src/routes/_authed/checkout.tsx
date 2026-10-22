import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/checkout')({
  component: () => <p className="py-16 text-text-secondary">Checkout em construção.</p>,
})
