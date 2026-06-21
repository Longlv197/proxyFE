import { MetadataRoute } from 'next'

import { i18n } from '@/configs/configi18n'

export default function robots(): MetadataRoute.Robots {
  // Per-site domain — không hardcode (site con tự đúng domain của mình)
  const baseUrl = process.env.NEXTAUTH_URL || ''

  // URL admin có prefix ngôn ngữ (/vi/admin/, /en/admin/, ...) → chặn theo từng locale.
  // Giữ thêm '/admin/' phòng path không prefix.
  const adminPaths = i18n.locales.map(locale => `/${locale}/admin/`)

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', ...adminPaths, '/api/']
    },
    sitemap: baseUrl ? `${baseUrl}/sitemap.xml` : undefined
  }
}
