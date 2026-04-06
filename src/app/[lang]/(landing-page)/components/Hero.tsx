'use client'

import React from 'react'

import { useParams } from 'next/navigation'

import { Shield, Zap, Globe, Users, ArrowRight, Clock, Star } from 'lucide-react'

import { useTranslation } from 'react-i18next'

import Link from '@/components/Link'
import { useBranding } from '@/app/contexts/BrandingContext'

/* ── Icon map cho admin setting ── */
const HERO_ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe,
  zap: Zap,
  shield: Shield,
  users: Users,
  clock: Clock,
  star: Star
}

const Hero = () => {
  const params = useParams()
  const { lang: locale } = params
  const lang = (locale as string) || 'vi'
  const { t } = useTranslation()
  const branding = useBranding()

  const hero = branding.landing_hero

  console.log(hero)
  /** Lấy text theo locale, fallback vi → en → '' */
  const txt = (obj: Record<string, string> | undefined | null, fallback: string) => {
    if (!obj) return fallback

    return obj[lang] || obj.vi || obj.en || fallback
  }

  // Resolve data
  const titleLine1 = txt(hero?.title_line1, t('landing.hero.title.line1'))
  const titleLine2 = txt(hero?.title_line2, t('landing.hero.title.line2'))
  const subtitle = txt(hero?.subtitle, t('landing.hero.subtitle'))

  const features =
    hero?.features && hero.features.length > 0
      ? hero.features.map(f => ({
          icon: HERO_ICON_MAP[f.icon] || Globe,
          text: txt(f.text, '')
        }))
      : [
          { icon: Globe, text: t('landing.hero.features.coverage') },
          { icon: Zap, text: t('landing.hero.features.speed') },
          { icon: Shield, text: t('landing.hero.features.uptime') },
          { icon: Users, text: t('landing.hero.features.support') }
        ]

  const ctaText = txt(hero?.cta_text, t('landing.hero.actions.buyNow'))
  const ctaLink = hero?.cta_link || `/${locale}/proxy-tinh`

  const trustItems =
    hero?.trust_items && hero.trust_items.length > 0
      ? hero.trust_items.map(item => ({
          number: item.number,
          label: txt(item.label, '')
        }))
      : [
          { number: '5000+', label: t('landing.hero.trust.customers') },
          { number: '99.9%', label: t('landing.hero.trust.uptime') },
          { number: '24/7', label: t('landing.hero.trust.support') }
        ]

  return (
    <section className='hero-main'>
      {/* Animated Background */}
      <div className='hero-background'>
        <div className='network-animation'>
          <div className='network-node node-1'></div>
          <div className='network-node node-2'></div>
          <div className='network-node node-3'></div>
          <div className='network-node node-4'></div>
          <div className='network-node node-5'></div>
          <div className='network-connection connection-1'></div>
          <div className='network-connection connection-2'></div>
          <div className='network-connection connection-3'></div>
          <div className='network-connection connection-4'></div>
        </div>

        <div className='floating-particles'>
          <div className='particle'></div>
          <div className='particle'></div>
          <div className='particle'></div>
          <div className='particle'></div>
          <div className='particle'></div>
          <div className='particle'></div>
        </div>
      </div>

      <div className='container-lg'>
        <div className='row align-items-center min-vh-100'>
          {/* Left Content */}
          <div className='col-lg-6'>
            <div className='hero-content'>
              {/* Main Title */}
              <h1 className='hero-title'>
                <span className='title-line-1'>{titleLine1}</span>
                <span className='title-line-2'>{titleLine2}</span>
              </h1>

              {/* Subtitle */}
              <p className='hero-subtitle'>{subtitle}</p>

              {/* Key Features */}
              <div className='hero-features'>
                {features.map((feat, i) => {
                  const Icon = feat.icon

                  return (
                    <div className='feature-item' key={i}>
                      <div className='feature-icon'>
                        <Icon size={20} />
                      </div>
                      <span className='text-gray-300'>{feat.text}</span>
                    </div>
                  )
                })}
              </div>

              {/* CTA Buttons */}
              <div className='hero-actions'>
                <button className='btn-primary'>
                  <Link href={ctaLink.startsWith('/') ? ctaLink : `/${locale}/${ctaLink}`}>{ctaText}</Link>
                  <ArrowRight size={20} />
                </button>
              </div>

              {/* Trust Indicators */}
              <div className='trust-indicators'>
                {trustItems.map((item, i) => (
                  <div className='trust-item' key={i}>
                    <div className='trust-number'>{item.number}</div>
                    <div className='trust-label'>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Visual */}
          <div className='col-lg-6'>
            <div className='hero-visual'>
              {/* Main Server Illustration */}
              <div className='server-container'>
                <div className='server-main'>
                  <div className='server-screen'>
                    <div className='screen-content'>
                      <div className='status-bar'>
                        <div className='status-dot active'></div>
                        <div className='status-dot active'></div>
                        <div className='status-dot'></div>
                      </div>
                      <div className='data-flow'>
                        <div className='data-line'></div>
                        <div className='data-line'></div>
                        <div className='data-line'></div>
                      </div>
                    </div>
                  </div>
                  <div className='server-base'>
                    <div className='server-light'></div>
                    <div className='server-light'></div>
                    <div className='server-light'></div>
                  </div>
                </div>

                {/* Network Connections */}
                <div className='network-visual'>
                  <div className='connection-point point-1'>
                    <div className='point-pulse'></div>
                    <span>Viettel</span>
                  </div>
                  <div className='connection-point point-2'>
                    <div className='point-pulse'></div>
                    <span>FPT</span>
                  </div>
                  <div className='connection-point point-3'>
                    <div className='point-pulse'></div>
                    <span>VNPT</span>
                  </div>
                </div>

                {/* Floating Cards */}
                <div className='floating-card card-1'>
                  <div className='card-icon'>
                    <Shield size={24} />
                  </div>
                  <div className='card-content'>
                    <div className='card-title'>{t('landing.hero.floatingCards.security.title')}</div>
                    <div className='card-desc'>{t('landing.hero.floatingCards.security.desc')}</div>
                  </div>
                </div>

                <div className='floating-card card-2'>
                  <div className='card-icon'>
                    <Zap size={24} />
                  </div>
                  <div className='card-content'>
                    <div className='card-title'>{t('landing.hero.floatingCards.speed.title')}</div>
                    <div className='card-desc'>{t('landing.hero.floatingCards.speed.desc')}</div>
                  </div>
                </div>

                <div className='floating-card card-3'>
                  <div className='card-icon'>
                    <Globe size={24} />
                  </div>
                  <div className='card-content'>
                    <div className='card-title'>{t('landing.hero.floatingCards.coverage.title')}</div>
                    <div className='card-desc'>{t('landing.hero.floatingCards.coverage.desc')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
