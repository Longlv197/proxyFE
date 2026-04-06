/**
 * Brand icons thật từ react-icons (SimpleIcons + FontAwesome)
 * Wrapped trong nền tròn có màu brand chính thức
 */

import { SiZalo, SiFacebook, SiTelegram, SiYoutube, SiTiktok, SiInstagram } from 'react-icons/si'
import { ExternalLink } from 'lucide-react'

interface IconProps {
  size?: number
  className?: string
}

const BrandIcon = ({ icon: Icon, bg, color = '#fff', size = 24 }: { icon: React.ElementType; bg: string; color?: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <Icon size={size * 0.5} color={color} />
  </div>
)

export const ZaloIcon = ({ size = 24 }: IconProps) => <BrandIcon icon={SiZalo} bg='#0068FF' size={size} />
export const FacebookIcon = ({ size = 24 }: IconProps) => <BrandIcon icon={SiFacebook} bg='#1877F2' size={size} />
export const TelegramIcon = ({ size = 24 }: IconProps) => <BrandIcon icon={SiTelegram} bg='#26A5E4' size={size} />
export const YoutubeIcon = ({ size = 24 }: IconProps) => <BrandIcon icon={SiYoutube} bg='#FF0000' size={size} />
export const TiktokIcon = ({ size = 24 }: IconProps) => <BrandIcon icon={SiTiktok} bg='#000000' size={size} />
export const InstagramIcon = ({ size = 24 }: IconProps) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: 'linear-gradient(135deg, #F58529, #DD2A7B, #8134AF, #515BD4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <SiInstagram size={size * 0.5} color='#fff' />
  </div>
)

export const FallbackIcon = ({ size = 24, color = '#64748b' }: IconProps & { color?: string }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <ExternalLink size={size * 0.45} color='#fff' />
  </div>
)

export const SOCIAL_ICON_MAP: Record<string, React.FC<IconProps>> = {
  zalo: ZaloIcon,
  facebook: FacebookIcon,
  telegram: TelegramIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
  instagram: InstagramIcon,
}
