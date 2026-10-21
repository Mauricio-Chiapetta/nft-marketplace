import { CatalogProducts } from '@/features/catalog/components/catalog-products'
import { HomeBlog } from './home-blog'
import { HomeHero } from './home-hero'
import { HomePromos } from './home-promos'
import { MobileHomeTop } from './mobile-home-top'

export function HomePage() {
  return (
    <div className="flex flex-col gap-4 pb-16 md:gap-16 lg:gap-24 lg:pb-24">
      <MobileHomeTop />
      <HomeHero />
      <CatalogProducts />
      <HomePromos />
      <HomeBlog />
    </div>
  )
}
