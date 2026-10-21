import { createFileRoute } from '@tanstack/react-router'
import { CatalogProducts } from '@/features/catalog/components/catalog-products'
import { HomeBlog } from '@/features/home/home-blog'
import { HomeHero } from '@/features/home/home-hero'
import { HomePromos } from '@/features/home/home-promos'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex flex-col gap-16 pb-16 lg:gap-24 lg:pb-24">
      <HomeHero />
      <CatalogProducts />
      <HomePromos />
      <HomeBlog />
    </div>
  )
}
