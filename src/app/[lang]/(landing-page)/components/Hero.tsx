'use client'

import React from 'react'

import { useParams } from 'next/navigation'

import { Shield, Zap, Globe, Users, ArrowRight } from 'lucide-react'

import { useTranslation } from 'react-i18next'

import Link from '@/components/Link'

const Hero = () => {
  const params = useParams()
  const { lang: locale } = params
  const { t } = useTranslation()

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
              {/* Badge */}
              {/* <div className='hero-badge'>
                <Shield size={16} />
                <span>Dịch vụ Proxy #1 Việt Nam</span>
              </div> */}

              {/* Main Title */}
              <h1 className='hero-title'>
                <span className='title-line-1'>{t('landing.hero.title.line1')}</span>
                <span className='title-line-2'>{t('landing.hero.title.line2')}</span>
              </h1>

              {/* Subtitle */}
              <p className='hero-subtitle'>
                {t('landing.hero.subtitle')}
              </p>

              {/* Key Features */}
              <div className='hero-features'>
                <div className='feature-item'>
                  <div className='feature-icon'>
                    <Globe size={20} />
                  </div>
                  <span className='text-gray-300'>{t('landing.hero.features.coverage')}</span>
                </div>
                <div className='feature-item'>
                  <div className='feature-icon'>
                    <Zap size={20} />
                  </div>
                  <span className='text-gray-300'>{t('landing.hero.features.speed')}</span>
                </div>
                <div className='feature-item'>
                  <div className='feature-icon'>
                    <Shield size={20} />
                  </div>
                  <span className='text-gray-300'>{t('landing.hero.features.uptime')}</span>
                </div>
                <div className='feature-item'>
                  <div className='feature-icon'>
                    <Users size={20} />
                  </div>
                  <span className='text-gray-300'>{t('landing.hero.features.support')}</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className='hero-actions'>
                <button className='btn-primary'>
                  <Link href={`/${locale}/proxy-tinh`}>
                    {t('landing.hero.actions.buyNow')}
                  </Link>
                  <ArrowRight size={20} />
                </button>
              </div>

              {/* Trust Indicators */}
              <div className='trust-indicators'>
                <div className='trust-item'>
                  <div className='trust-number'>5000+</div>
                  <div className='trust-label'>{t('landing.hero.trust.customers')}</div>
                </div>
                <div className='trust-item'>
                  <div className='trust-number'>99.9%</div>
                  <div className='trust-label'>{t('landing.hero.trust.uptime')}</div>
                </div>
                <div className='trust-item'>
                  <div className='trust-number'>24/7</div>
                  <div className='trust-label'>{t('landing.hero.trust.support')}</div>
                </div>
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
