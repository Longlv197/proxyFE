import type { Metadata } from 'next'

import Services from '../components/cooperate/Services'
import Agency from '../components/cooperate/Agency'
import About from '../components/cooperate/About'
import { getServerBranding } from '@/utils/getServerBranding'
import { interpolateAppName } from '@/utils/interpolateAppName'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const dictionary = await import(`@/locales/${lang}.json`).then(m => m.default)
  const appName = (await getServerBranding()).site_name || ''

  return {
    title: interpolateAppName(dictionary.landing?.header?.menu?.cooperate, appName) || 'Cooperate with us',
    description: interpolateAppName(dictionary.landing?.cooperate?.about?.subtitle, appName) || 'Join us as an agent and enjoy preferential policies'
  }
}

export default function CooperatePage() {
  return (
    <div className='min-h-screen relative'>
      <div className='relative'>
        <Services />
        <Agency />
        <About />
      </div>
    </div>
  )
}
