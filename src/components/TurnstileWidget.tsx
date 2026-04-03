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

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !turnstile_site_key) return
    if (widgetIdRef.current) return // da render roi

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: turnstile_site_key,
      callback: (token: string) => onVerify(token),
      'expired-callback': () => {
        onExpire?.()
        onVerify('')
      },
      'error-callback': () => {
        onVerify('')
      },
      theme: 'light',
      size: 'flexible',
    })
  }, [turnstile_site_key, onVerify, onExpire])

  useEffect(() => {
    if (turnstile_enabled !== 'true' || !turnstile_site_key) return

    // Load script neu chua co
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
  }, [turnstile_enabled, turnstile_site_key, renderWidget])

  if (turnstile_enabled !== 'true' || !turnstile_site_key) return null

  return (
    <div style={{ margin: '8px 0' }}>
      <div ref={containerRef} />
    </div>
  )
}
