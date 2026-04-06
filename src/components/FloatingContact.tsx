'use client'

import { useState } from 'react'

import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { X, MessageCircle, ExternalLink } from 'lucide-react'

import { PUBLIC_API_URL } from '@/config/api'
import { SOCIAL_ICON_MAP } from '@/components/icons/SocialIcons'

import './FloatingContact.css'

export default function FloatingContact() {
  const [hidden, setHidden] = useState(false)

  const { data: links = [] } = useQuery({
    queryKey: ['floating-contact-links'],
    queryFn: async () => {
      const res = await axios.get(`${PUBLIC_API_URL}/get-sidebar-settings`)

      return res?.data?.data?.support_links ?? []
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  if (links.length === 0) return null

  return (
    <div className='floating-contact'>
      <div className={`floating-links ${hidden ? '' : 'open'}`}>
        {links.map((link: any, i: number) => {
          const SvgIcon = SOCIAL_ICON_MAP[link.icon]

          return (
            <a
              key={i}
              href={link.url}
              target='_blank'
              rel='noopener noreferrer'
              className='floating-link-item'
              title={link.label}
              style={{ transitionDelay: hidden ? '0ms' : `${(links.length - 1 - i) * 60}ms` }}
            >
              {SvgIcon ? <SvgIcon size={46} /> : (
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: link.color || '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ExternalLink size={20} color='#fff' />
                </div>
              )}
            </a>
          )
        })}
      </div>

      <button
        className={`floating-trigger ${hidden ? '' : 'open'}`}
        onClick={() => setHidden(v => !v)}
        aria-label={hidden ? 'Hiện liên hệ' : 'Ẩn liên hệ'}
      >
        {hidden ? <MessageCircle size={22} /> : <X size={20} />}
      </button>
    </div>
  )
}
