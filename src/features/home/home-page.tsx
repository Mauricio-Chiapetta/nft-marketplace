import { CatalogProducts } from '@/features/catalog/components/catalog-products'
import { HomeBlog } from './home-blog'
import { HomeHero } from './home-hero'
import { HomePromos } from './home-promos'

export function HomePage() {
  return (
    <div className="flex flex-col gap-16 pb-16 lg:gap-24 lg:pb-24">
      <HomeHero />
      <CatalogProducts />
      <HomePromos />
      <HomeBlog />
    </div>
  )
}
