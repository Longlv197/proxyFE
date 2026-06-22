import type { Metadata } from 'next'

import ContactInfo from '@/app/[lang]/(landing-page)/components/hotline/ContactInfo'
import { getServerBranding } from '@/utils/getServerBranding'
import { interpolateAppName } from '@/utils/interpolateAppName'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const dictionary = await import(`@/locales/${lang}.json`).then(m => m.default)
  const appName = (await getServerBranding()).site_name || ''

  return {
    title: interpolateAppName(dictionary.landing?.header?.menu?.hotline, appName) || 'Contact us',
    description: interpolateAppName(dictionary.landing?.hotline?.hero?.subtitle, appName) || 'We are always ready to support and advise you'
  }
}

export default function PageHotline() {
  return (
    <>
      <ContactInfo />
    </>
  )
}
