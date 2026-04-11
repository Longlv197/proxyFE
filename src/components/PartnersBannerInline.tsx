'use client'

import React, { useState, useEffect, useCallback } from 'react'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { usePublicPartners } from '@/hooks/apis/usePartners'

const DEFAULT_DURATION = 2 // 2s mặc định

const PartnersBannerInline = () => {
  const { data: partners } = usePublicPartners()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hovered, setHovered] = useState(false)

  const activePartners = React.useMemo(() => partners?.filter(p => p.logo_url) ?? [], [partners])

  const len = activePartners.length

  const nextSlide = useCallback(() => {
    if (!len) return

    setCurrentIndex(prev => (prev + 1) % len)
  }, [len])

  const prevSlide = useCallback(() => {
    if (!len) return

    setCurrentIndex(prev => (prev - 1 + len) % len)
  }, [len])

  // Mỗi partner có thời gian hiển thị riêng (display_duration)
  useEffect(() => {
    if (len <= 1 || hovered) return

    const current = activePartners[currentIndex]
    const duration = (current?.display_duration || DEFAULT_DURATION) * 1000

    const timer = setTimeout(nextSlide, duration)

    return () => clearTimeout(timer)
  }, [nextSlide, len, hovered, currentIndex])

  useEffect(() => {
    setCurrentIndex(0)
  }, [partners?.length])

  if (activePartners.length <= 0) return null

  const current = activePartners[currentIndex] || activePartners[0]
  return (
    <div
      className='partners-banner-inline'
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Slides */}
      {activePartners.map((partner, index) => (
        <div
          key={partner.id}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: index === currentIndex ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: index === currentIndex ? 'auto' : 'none',
            cursor: partner.link ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (partner.link) window.open(partner.link, '_blank', 'noopener,noreferrer')
          }}
        >
          <img
            src={partner.logo_url!}
            alt={partner.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      ))}

      {/* Arrow trái — luôn render, hover hiện */}
      <button
        className='banner-arrow banner-arrow-left'
        onClick={e => {
          e.stopPropagation()
          prevSlide()
        }}
      >
        <ChevronLeft size={14} color='#fff' />
      </button>

      {/* Arrow phải */}
      <button
        className='banner-arrow banner-arrow-right'
        onClick={e => {
          e.stopPropagation()
          nextSlide()
        }}
      >
        <ChevronRight size={14} color='#fff' />
      </button>

      {/* Dots */}
      {activePartners.length > 1 && (
        <div className='banner-dots'>
          {activePartners.map((_, i) => (
            <span
              key={i}
              onClick={e => {
                e.stopPropagation()
                setCurrentIndex(i)
              }}
              className={`banner-dot ${i === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .partners-banner-inline {
          width: 100%;
          min-width: 0;
          height: calc(var(--header-height, 64px) - 6px);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          display: block;
        }
        .banner-arrow {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 3;
          padding: 0;
        }
        .banner-arrow-left {
          left: 0;
          background: linear-gradient(90deg, rgba(0,0,0,0.25), transparent);
          border-radius: 10px 0 0 10px;
        }
        .banner-arrow-right {
          right: 0;
          background: linear-gradient(270deg, rgba(0,0,0,0.25), transparent);
          border-radius: 0 10px 10px 0;
        }
        .partners-banner-inline:hover .banner-arrow {
          opacity: 1;
        }
        .banner-arrow:hover {
          background: rgba(0,0,0,0.35);
        }
        .banner-dots {
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          z-index: 3;
        }
        .banner-dot {
          width: 5px;
          height: 5px;
          border-radius: 3px;
          background-color: rgba(203,213,225,0.8);
          transition: all 0.3s;
          cursor: pointer;
        }
        .banner-dot.active {
          width: 14px;
          background-color: var(--primary-color, #6366f1);
        }
        @media (max-width: 768px) {
          .partners-banner-inline {
            display: none !important;
          }
        }
      `
        }}
      />
    </div>
  )
}

export default PartnersBannerInline
