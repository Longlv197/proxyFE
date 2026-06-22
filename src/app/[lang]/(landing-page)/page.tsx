import dynamic from 'next/dynamic'

import type { Metadata } from 'next'

import { getServerBranding } from '@/utils/getServerBranding'
import Hero from '@/app/[lang]/(landing-page)/components/Hero'

// Below-fold: lazy load để Hero render nhanh hơn
const ProductsSection = dynamic(() => import('@/app/[lang]/(landing-page)/components/ProductsSection'), {
  ssr: true
})

const VietnamCoverageSection = dynamic(
  () => import('@/app/[lang]/(landing-page)/components/VietnamCoverageSection'),
  { ssr: true }
)

const PartnersSection = dynamic(() => import('@/app/[lang]/(landing-page)/components/PartnersSection'), {
  ssr: true
})

const TestimonialsSection = dynamic(() => import('@/app/[lang]/(landing-page)/components/TestimonialsSection'), {
  ssr: true
})

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const branding = await getServerBranding()
  const name = branding.site_name || ''
  const desc = branding.site_description || ''

  // Ưu tiên SEO title do admin đặt (tab Google & Quảng bá) theo ngôn ngữ.
  // Fallback: "Tên - Mô tả" → tên → mô tả → "Proxy Service".
  const seoLang = (branding as any).seo_meta?.[lang]
  const title = seoLang?.title || (name && desc ? `${name} - ${desc}` : name || desc || 'Proxy Service')

  return { title }
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const branding = await getServerBranding()
  const landingPricing = (branding as any).landing_pricing || null

  return (
    <div>
      <Hero />
      <ProductsSection local={lang} landingPricing={landingPricing} />
      <VietnamCoverageSection />
      <PartnersSection />
      <TestimonialsSection />
    </div>
  )
}
