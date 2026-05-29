import type { NextConfig } from 'next'
import withBundleAnalyzer from '@next/bundle-analyzer'

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true'
})

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 300
    },
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'lucide-react',
      'recharts',
      '@iconify/tools',
      '@iconify/utils',
      '@iconify/types'
    ]
  },
  turbopack: {
    root: process.cwd()
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/photos/**'
      }
    ]
  },

  async redirects() {
    return [
      {
        source: '/', // khi truy cập đúng root domain
        destination: '/vi', // tự động chuyển sang /vi
        permanent: false // 307 tạm thời, đổi thành true nếu muốn 308 vĩnh viễn
      },
      {
        source: '/:path((?!vi$|vi/|en$|en/|cn$|cn/|ko$|ko/|ja$|ja/|robots\\.txt|sitemap\\.xml|manifest\\.json|favicon\\.ico|_next|api|images).*)',
        destination: '/vi/:path',
        permanent: false
      }
    ]
  },

  // Logging: tắt fullUrl fetch log để giảm rối console + bớt overhead stdout.
  // Bật lại khi cần debug API call cụ thể.
  logging: {
    fetches: {
      fullUrl: false
    }
  }
}

export default withAnalyzer(nextConfig)
