'use client'

import React from 'react'

import Image from 'next/image'

import { Shield, Star, CheckCircle, ArrowRight } from 'lucide-react'

import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'

import Link from '@components/Link'

interface LandingPricingItem {
  price?: string; originalPrice?: string; discount?: string; period?: string | Record<string, string>
}

interface LandingPricing {
  viettel?: LandingPricingItem
  fpt?: LandingPricingItem
  vnpt?: LandingPricingItem
}

function getPeriod(item: LandingPricingItem | undefined, locale: string): string {
  if (!item?.period) return ''
  if (typeof item.period === 'string') return item.period
  return item.period[locale] || item.period['vi'] || ''
}

export default function ProductsSection({ local, landingPricing }: { local: string; landingPricing?: LandingPricing | null }) {
  const { t } = useTranslation()
  const searchParams = useSearchParams()

  // Preview mode: đọc pricing từ sessionStorage khi có ?preview=1
  const previewPricing = React.useMemo(() => {
    if (searchParams.get('preview') !== '1' || typeof window === 'undefined') return null

    try {
      const raw = sessionStorage.getItem('landing_preview')

      return raw ? JSON.parse(raw)?.landing_pricing : null
    } catch { return null }
  }, [searchParams])

  const p = previewPricing || landingPricing || {}

  const products = [
    {
      id: 1,
      name: t('landing.products.cards.viettel.name'),
      provider: 'Viettel',
      img: '/images/softwares/viettel.png',
      price: p.viettel?.price || '18.000',
      originalPrice: p.viettel?.originalPrice || '25.000',
      period: getPeriod(p.viettel, local),
      discount: p.viettel?.discount || '28%',
      features: (t('landing.products.cards.viettel.features', { returnObjects: true }) as string[] || []),
      color: '#e53e3e',
      popular: false,
      badge: t('landing.products.cards.viettel.badge')
    },
    {
      id: 2,
      name: t('landing.products.cards.fpt.name'),
      provider: 'FPT',
      img: '/images/softwares/fpt.png',
      price: p.fpt?.price || '18.000',
      originalPrice: p.fpt?.originalPrice || '24.000',
      period: getPeriod(p.fpt, local),
      discount: p.fpt?.discount || '25%',
      features: (t('landing.products.cards.fpt.features', { returnObjects: true }) as string[] || []),
      color: '#f56500',
      popular: true,
      badge: t('landing.products.cards.fpt.badge')
    },
    {
      id: 3,
      name: t('landing.products.cards.vnpt.name'),
      provider: 'VNPT',
      img: '/images/softwares/vnpt.png',
      price: p.vnpt?.price || '18.000',
      originalPrice: p.vnpt?.originalPrice || '26.000',
      period: getPeriod(p.vnpt, local),
      discount: p.vnpt?.discount || '31%',
      features: (t('landing.products.cards.vnpt.features', { returnObjects: true }) as string[] || []),
      color: '#3182ce',
      popular: false,
      badge: t('landing.products.cards.vnpt.badge')
    }
  ]

  return (
    <section className='products-section-new'>
      <div className='container-lg'>
        {/* Header */}
        <div className='section-header'>
          <h2 className='section-title'>{t('landing.products.title')}</h2>
          <p className='section-subtitle'>{t('landing.products.subtitle')}</p>
        </div>

        {/* Products Grid */}
        <div className='products-grid-new'>
          <div className='row justify-content-center gap-4 gap-lg-0'>
            {products.map((product, index) => (
              <div key={product.id} className='col-lg-4 col-md-6 mb-4'>
                <div
                  className={`product-card-modern ${product.popular ? 'popular' : ''}`}
                  style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
                >
                  {/* Popular Badge */}
                  {product.popular && (
                    <div className='popular-badge'>
                      <Star size={16} fill='white' />
                      <span>{t('landing.products.actions.popular')}</span>
                    </div>
                  )}

                  {/* Discount Badge */}
                  <div className='discount-badge'>-{product.discount}</div>

                  {/* Card Header */}
                  <div className='card-header'>
                    <div className='provider-info'>
                      <Image className='mb-3' src={product.img} alt={product.name} width={100} height={40} />
                      <h3 className='product-name'>{product.name}</h3>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className='pricing'>
                    <div className='price-old'>{product.originalPrice}đ</div>
                    <div className='price-current'>
                      <span className='price-amount'>{product.price}đ</span>
                      {product.period && <span className='price-period'>/{product.period}</span>}
                    </div>
                  </div>

                  {/* Features */}
                  <div className='features-list'>
                    {product.features.map((feature, idx) => (
                      <div key={idx} className='feature-item'>
                        <CheckCircle size={16} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Link href={`/${local}/proxy-tinh`} className='buy-button'>
                    <span>{t('landing.products.actions.buyNow')}</span>
                    <ArrowRight size={18} />
                  </Link>

                  {/* Guarantee */}
                  <div className='guarantee'>
                    <Shield size={14} />
                    <span>{t('landing.products.actions.guarantee')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className='section-cta'>
          <div className='cta-content'>
            <h3>{t('landing.products.cta.title')}</h3>
            <p>{t('landing.products.cta.description')}</p>
            <button className='btn-contact'>
              <span>{t('landing.products.cta.button')}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
