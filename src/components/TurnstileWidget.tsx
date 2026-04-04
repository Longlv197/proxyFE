'use client'

import { useEffect, useRef, useCallback } from 'react'

import { useBranding } from '@/app/contexts/BrandingContext'

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, any>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
}

export default function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const { turnstile_enabled, turnstile_site_key } = useBranding()
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)

  onVerifyRef.current = onVerify
  onExpireRef.current = onExpire

  useEffect(() => {
    if (turnstile_enabled !== 'true' || !turnstile_site_key) return

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: turnstile_site_key,
        callback: (token: string) => onVerifyRef.current(token),
        'expired-callback': () => {
          onExpireRef.current?.()
          onVerifyRef.current('')
        },
        'error-callback': () => onVerifyRef.current(''),
        theme: 'light',
        size: 'flexible',
      })
    }

    if (!window.turnstile) {
      const existing = document.querySelector('script[src*="turnstile"]')

      if (!existing) {
        window.onTurnstileLoad = renderWidget
        const script = document.createElement('script')

        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
        script.async = true
        document.head.appendChild(script)
      }
    } else {
      renderWidget()
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [turnstile_enabled, turnstile_site_key])

  if (turnstile_enabled !== 'true' || !turnstile_site_key) return null

  return (
    <div style={{ margin: '8px 0' }}>
      <div ref={containerRef} />
    </div>
  )
}
