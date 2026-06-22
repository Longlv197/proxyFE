import React from 'react'

import type { Metadata } from 'next'

import AboutHero from '@/app/[lang]/(landing-page)/components/abount/AboutHero'
import CompanyInfo from '@/app/[lang]/(landing-page)/components/abount/CompanyInfo'
import TeamSection from '@/app/[lang]/(landing-page)/components/abount/TeamSection'
import MissionVision from '@/app/[lang]/(landing-page)/components/abount/MissionVision'
import { getServerBranding } from '@/utils/getServerBranding'
import { interpolateAppName } from '@/utils/interpolateAppName'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params

  // Import dictionary based on language
  const dictionary = await import(`@/locales/${lang}.json`).then(m => m.default)

  // SSR đọc JSON thô → phải tự thay {{appName}} bằng tên site (i18n chỉ thay ở component)
  const appName = (await getServerBranding()).site_name || ''

  return {
    title: interpolateAppName(dictionary.landing?.header?.menu?.about, appName) || 'About Us',
    description: interpolateAppName(dictionary.landing?.about?.companyInfo?.description, appName) || 'Learn more about our company'
  }
}

export default function PageAbount() {
  return (
    <>
      <AboutHero />
      <CompanyInfo />
      <TeamSection />
      <MissionVision />
    </>
  )
}
