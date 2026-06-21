import { MetadataRoute } from 'next'

import { i18n } from '@/configs/configi18n'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL || ''
  
  // Tạo sitemap cho tất cả các ngôn ngữ
  const sitemap: MetadataRoute.Sitemap = []
  
  // Thêm trang chủ cho mỗi ngôn ngữ
  i18n.locales.forEach((locale) => {
    sitemap.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
      alternates: {
        languages: Object.fromEntries(
          i18n.locales.map((lang) => [lang, `${baseUrl}/${lang}`])
        ),
      },
    })
  })
  
  // Trang công khai thật (ngoài nhóm (private)) — tránh đưa URL 404/cần-đăng-nhập vào sitemap
  const importantPages = [
    'about',
    'cooperate',
    'hotline',
    'pricing',
    'docs'
  ]
  
  importantPages.forEach((page) => {
    i18n.locales.forEach((locale) => {
      sitemap.push({
        url: `${baseUrl}/${locale}/${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            i18n.locales.map((lang) => [lang, `${baseUrl}/${lang}/${page}`])
          ),
        },
      })
    })
  })
  
  return sitemap
}
