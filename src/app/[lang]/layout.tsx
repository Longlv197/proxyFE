// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'
import 'bootstrap/dist/css/bootstrap.min.css'

// Style Imports - CSS Variables phải được import đầu tiên
import '@/app/css-variables.css'
import '@/app/globals.css'
import '@/app/shared-layout.css' // CSS chung cho cả private và public
import '@/app/root.css'

// import '@/app/figtree.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

import { Suspense } from 'react'

import { Figtree } from 'next/font/google'
import { headers } from 'next/headers'

// Utils
import type { Metadata } from 'next'

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

import { getServerSession } from 'next-auth/next'

// getServerUserData đã bỏ khỏi layout — session.user đã chứa userData từ JWT

import { i18n } from '@/configs/configi18n'

import '@/app/[lang]/(landing-page)/main.css'

import type { Locale } from '@/configs/configi18n'

import type { ChildrenType } from '@core/types'

import TanstackProvider from '@/components/TanstackProvider'

import { getSystemMode } from '@core/utils/serverHelpers'
import TranslationWrapper from '@/hocs/TranslationWrapper'

import { ModalContextProvider } from '@/app/contexts/ModalContext'
import { BrandingProvider } from '@/app/contexts/BrandingContext'
import { TienTeProvider } from '@/app/contexts/TienTeContext'

import { authOptions } from '@/libs/auth'

import I18nextProvider from '@/app/i18n-provider'

import StoreProvider from '@/components/StoreProvider'

import ReferralHandler from '@/components/ReferralHandler'
import { NextAuthProvider } from '@/app/contexts/nextAuthProvider'
import NavigationProgress from '@/components/NavigationProgress'
import FloatingContact from '@/components/FloatingContact'
import ToastProvider from '@/components/ToastProvider'

import { siteConfig } from '@/configs/siteConfig'
import { getServerBranding } from '@/utils/getServerBranding'

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap'
})

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const lang = resolvedParams.lang as string
  const baseUrl = process.env.NEXTAUTH_URL || ''

  // Fetch branding từ DB server-side → SEO đúng cho mỗi site
  const branding = await getServerBranding()

  // Branding hoàn toàn từ DB — không fallback env var
  const isChildSite = branding.site_mode === 'child'
  const siteName = branding.site_name || ''
  const siteDesc = branding.site_description || ''
  const faviconUrl = branding.favicon_url || ''
  const ogImage = branding.og_image_url || ''

  // SEO đa ngôn ngữ — lấy từ DB theo lang
  const seoLang = branding.seo_meta?.[lang]
  const seoTitle = seoLang?.title || (siteName && siteDesc ? `${siteName} - ${siteDesc}` : siteName || siteDesc || 'Proxy Service')
  const seoDescription = seoLang?.description || siteDesc || ''

  const seoKeywords = seoLang?.keywords
    ? seoLang.keywords.split(',').map((k: string) => k.trim())
    : siteName ? ['proxy', siteName] : ['proxy']

  // Google verification
  const verification = branding.google_verification
    ? { google: branding.google_verification }
    : undefined

  return {
    title: {
      default: seoTitle,
      template: siteName ? `%s | ${siteName}` : '%s',
    },
    description: seoDescription,
    keywords: seoKeywords,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false
    },
    metadataBase: baseUrl ? new URL(baseUrl) : undefined,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        vi: '/vi',
        en: '/en',
        ja: '/ja',
        ko: '/ko'
      }
    },
    verification,
    openGraph: {
      type: 'website',
      locale: lang === 'vi' ? 'vi_VN' : lang === 'en' ? 'en_US' : lang === 'ja' ? 'ja_JP' : lang === 'ko' ? 'ko_KR' : 'vi_VN',
      url: `${baseUrl}/${lang}`,
      title: seoTitle,
      description: seoDescription,
      siteName,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: `${siteName} Logo` }] } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      ...(ogImage ? { images: [ogImage] } : {})
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    },
    ...(faviconUrl ? {
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl
      },
    } : {}),
    manifest: '/manifest.json'
  }
}

const RootLayout = async (props: ChildrenType & { params: Promise<{ lang: string }> }) => {
  const { children } = props

  const params = await props.params

  const direction = i18n.langDirection[params.lang as Locale]

  // Fetch song song — không còn blocking API call /me
  const [headersList, systemMode, session, branding] = await Promise.all([
    headers(),
    getSystemMode(),
    getServerSession(authOptions as any) as any,
    getServerBranding()
  ])

  // Dùng userData từ JWT session — không cần gọi API /me (tiết kiệm ~200-500ms)
  const user = session?.user ?? null
  const isChildSite = branding.site_mode === 'child'

  return (
    <TranslationWrapper headersList={headersList} lang={params.lang as Locale}>
      <html id='__next' lang={params.lang} dir={direction} className={figtree.variable} suppressHydrationWarning>
        <head>
          <style
            dangerouslySetInnerHTML={{
              __html: `html:root {
  --primary-hover: ${branding.primary_hover || siteConfig.primaryHover} !important;
  --primary-gradient: ${branding.primary_gradient || siteConfig.primaryGradient} !important;
  --primary-color: ${branding.primary_color || siteConfig.primaryColor};
  --site-logo: ${branding.logo_url ? `url('${branding.logo_url}')` : 'none'};
  --site-name: '${(branding.site_name || '').replace(/'/g, "\\'")}';
  --site-favicon: ${branding.favicon_url ? `url('${branding.favicon_url}')` : 'none'};
}`
            }}
          />
          {/* GTM — server-side inject để tracking từ đầu */}
          {branding.gtm_id && (
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${branding.gtm_id}');`
              }}
            />
          )}
          {/* Head scripts — server-side inject */}
          {branding.head_scripts && (
            <script dangerouslySetInnerHTML={{ __html: branding.head_scripts }} />
          )}
        </head>
        <body
          className='flex is-full min-bs-full flex-auto flex-col'
          data-site-name={branding.site_name || ''}
          data-site-description={branding.site_description || ''}
          data-site-mode={branding.site_mode || 'child'}
          data-footer-text={branding.footer_text || ''}
          data-support-contact={branding.support_contact || ''}
          data-org-phone={branding.organization_phone || ''}
          data-org-email={branding.organization_email || ''}
          data-org-address={branding.organization_address || ''}
        >
          {/* Body scripts — server-side */}
          {branding.body_scripts && (
            <script dangerouslySetInnerHTML={{ __html: branding.body_scripts }} />
          )}
          <NavigationProgress />
          <I18nextProvider locale={params.lang as Locale}>
            <NextAuthProvider
              refetchInterval={60}
              refetchOnWindowFocus={true}
              session={session as any}
              basePath={process.env.BASEPATH ? `${process.env.BASEPATH}/api/auth` : undefined}
            >
              <TanstackProvider>
                <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
                <BrandingProvider initialData={branding}>
                  <TienTeProvider lang={params.lang}>
                  <StoreProvider initialUser={user}>
                    <ModalContextProvider>
                      <Suspense fallback={null}>
                        <ReferralHandler />
                      </Suspense>
                      <div className='relative z-10 main'>{children}</div>
                      <FloatingContact />
                      <ToastProvider />
                    </ModalContextProvider>
                  </StoreProvider>
                  </TienTeProvider>
                </BrandingProvider>
              </TanstackProvider>
            </NextAuthProvider>
          </I18nextProvider>
        </body>
      </html>
    </TranslationWrapper>
  )
}

export default RootLayout
