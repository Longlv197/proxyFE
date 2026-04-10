'use client'

import { useState, useMemo } from 'react'

import './styles.css'

import { Filter, Globe, Wifi, X, SearchX, SlidersHorizontal, ShoppingCart, Search, RefreshCw } from 'lucide-react'

import { Box, Grid2, Typography } from '@mui/material'

import Chip from '@mui/material/Chip'

import ProxyCard from '@/app/[lang]/(private)/(client)/components/proxy-card/ProxyCard'
import { shouldHideByTag, getCountryName, fixCountryCode } from '@/configs/tagConfig'

import { useCountries } from '@/hooks/apis/useCountries'

interface StaticProxyPageProps {
  data: any
  onRefresh?: () => void
  isRefreshing?: boolean
}

export default function StaticProxyPage({ data, onRefresh, isRefreshing }: StaticProxyPageProps) {
  const [selectedVersion, setSelectedVersion] = useState('')
  const [selectedProxyType, setSelectedProxyType] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: countries } = useCountries()

  // Auto-extract unique filter values from actual data
  const filterOptions = useMemo(() => {
    if (!data?.length) return { versions: [], proxyTypes: [], countries: [] }

    const versions = [...new Set(data.map((p: any) => p.ip_version?.toLowerCase()).filter(Boolean))]
    const proxyTypes = [...new Set(data.map((p: any) => p.proxy_type?.toLowerCase()).filter(Boolean))]

    const countrySet = new Set<string>()

    data.forEach((p: any) => {
      const raw = (p.country || p.country_code || '').trim()
      if (!raw) return
      raw.split(',').forEach((c: string) => {
        const code = fixCountryCode(c.trim()).toUpperCase()
        if (code.length >= 2) countrySet.add(code)
      })
    })

    const countryOptions = [...countrySet].map(code => ({
      code,
      name: getCountryName(code)
    }))

    return { versions, proxyTypes, countries: countryOptions }
  }, [data])

  const hasActiveFilter = selectedVersion || selectedProxyType || selectedCountry || !showActiveOnly

  // Lọc danh sách provider theo các filter + search
  const filteredProviders = useMemo(
    () =>
      data?.filter((provider: any) => {
        if (shouldHideByTag(provider?.tag)) return false
        if (showActiveOnly && provider?.is_purchasable === false) return false
        if (selectedVersion && provider.ip_version?.toLowerCase() !== selectedVersion.toLowerCase()) return false
        if (selectedProxyType && provider.proxy_type?.toLowerCase() !== selectedProxyType.toLowerCase()) return false

        if (selectedCountry) {
          const raw = (provider.country || provider.country_code || '').trim()
          const codes = raw.split(',').map((c: string) => fixCountryCode(c.trim()).toUpperCase())

          if (!codes.includes(selectedCountry)) return false
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const name = (provider.name || provider.title || '').toLowerCase()
          const code = (provider.code || '').toLowerCase()

          if (!name.includes(q) && !code.includes(q)) return false
        }

        return true
      }),
    [data, selectedVersion, selectedProxyType, selectedCountry, showActiveOnly, searchQuery]
  )

  const clearAllFilters = () => {
    setSelectedVersion('')
    setSelectedProxyType('')
    setSelectedCountry('')
    setShowActiveOnly(true)
    setSearchQuery('')
  }

  const versionLabel = (v: string) => (v === 'ipv4' ? 'IPv4' : v === 'ipv6' ? 'IPv6' : v.toUpperCase())
  const proxyTypeLabel = (t: string) => (t === 'residential' ? 'Dân cư' : t === 'datacenter' ? 'Datacenter' : t)

  return (
    <div className='flex flex-col'>
      {/* Filter bar */}
      <Box
        sx={{
          mb: 2.5,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          background: 'white',
          overflow: 'hidden'
        }}
      >
        {/* Header + Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={16} color='#475569' />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Bộ lọc</span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              ({filteredProviders?.length || 0}/{data?.length || 0})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px',
              background: '#fff', minWidth: 180
            }}>
              <Search size={14} color='#94a3b8' />
              <input
                type='text'
                placeholder='Tìm sản phẩm...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  border: 'none', outline: 'none', fontSize: '13px',
                  background: 'transparent', width: '100%', color: '#1e293b'
                }}
              />
              {searchQuery && (
                <X size={14} color='#94a3b8' style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              )}
            </div>
            {onRefresh && (
              <button
                type='button'
                onClick={() => onRefresh()}
                disabled={isRefreshing}
                title='Tải lại danh sách'
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#fff',
                  cursor: isRefreshing ? 'wait' : 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <RefreshCw
                  size={14}
                  color={isRefreshing ? '#3b82f6' : '#64748b'}
                  style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined}
                />
              </button>
            )}
          </div>
          {hasActiveFilter && (
            <Chip
              icon={<X size={14} />}
              label='Xoá bộ lọc'
              onClick={clearAllFilters}
              size='small'
              sx={{
                fontWeight: 600,
                fontSize: '12px',
                height: '28px',
                borderRadius: '6px',
                bgcolor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                '&:hover': { bgcolor: '#fee2e2' },
                '& .MuiChip-icon': { color: '#dc2626' }
              }}
            />
          )}
        </div>

        {/* Filter groups */}
        <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {filterOptions.versions.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Wifi size={14} color='#64748b' />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Phiên bản IP
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Chip
                  label='Tất cả'
                  variant={!selectedVersion ? 'filled' : 'outlined'}
                  onClick={() => setSelectedVersion('')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    height: '34px',
                    borderRadius: '8px',
                    ...(!selectedVersion
                      ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                      : {
                          borderColor: '#cbd5e1',
                          color: '#334155',
                          '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                        })
                  }}
                />
                {filterOptions.versions.map((v: string) => (
                  <Chip
                    key={v}
                    label={versionLabel(v)}
                    variant={selectedVersion === v ? 'filled' : 'outlined'}
                    onClick={() => setSelectedVersion(selectedVersion === v ? '' : v)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '13px',
                      height: '34px',
                      borderRadius: '8px',
                      ...(selectedVersion === v
                        ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                        : {
                            borderColor: '#cbd5e1',
                            color: '#334155',
                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                          })
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {filterOptions.proxyTypes.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Filter size={14} color='#64748b' />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Loại proxy
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Chip
                  label='Tất cả'
                  variant={!selectedProxyType ? 'filled' : 'outlined'}
                  onClick={() => setSelectedProxyType('')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    height: '34px',
                    borderRadius: '8px',
                    ...(!selectedProxyType
                      ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                      : {
                          borderColor: '#cbd5e1',
                          color: '#334155',
                          '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                        })
                  }}
                />
                {filterOptions.proxyTypes.map((t: string) => (
                  <Chip
                    key={t}
                    label={proxyTypeLabel(t)}
                    variant={selectedProxyType === t ? 'filled' : 'outlined'}
                    onClick={() => setSelectedProxyType(selectedProxyType === t ? '' : t)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '13px',
                      height: '34px',
                      borderRadius: '8px',
                      ...(selectedProxyType === t
                        ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                        : {
                            borderColor: '#cbd5e1',
                            color: '#334155',
                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                          })
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trạng thái */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShoppingCart size={14} color='#64748b' />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Trạng thái
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Chip
                label='Tất cả'
                variant={!showActiveOnly ? 'filled' : 'outlined'}
                onClick={() => setShowActiveOnly(false)}
                sx={{
                  fontWeight: 600,
                  fontSize: '13px',
                  height: '34px',
                  borderRadius: '8px',
                  ...(!showActiveOnly
                    ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                    : {
                        borderColor: '#cbd5e1',
                        color: '#334155',
                        '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                      })
                }}
              />
              <Chip
                label='Đang bán'
                variant={showActiveOnly ? 'filled' : 'outlined'}
                onClick={() => setShowActiveOnly(true)}
                sx={{
                  fontWeight: 600,
                  fontSize: '13px',
                  height: '34px',
                  borderRadius: '8px',
                  ...(showActiveOnly
                    ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                    : {
                        borderColor: '#cbd5e1',
                        color: '#334155',
                        '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                      })
                }}
              />
            </div>
          </div>

          {filterOptions.countries.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Globe size={14} color='#64748b' />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Quốc gia
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Chip
                  label='Tất cả'
                  variant={!selectedCountry ? 'filled' : 'outlined'}
                  onClick={() => setSelectedCountry('')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    height: '34px',
                    borderRadius: '8px',
                    ...(!selectedCountry
                      ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                      : {
                          borderColor: '#cbd5e1',
                          color: '#334155',
                          '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                        })
                  }}
                />
                {filterOptions.countries.map((c: any) => (
                  <Chip
                    key={c.code}
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {c.code.split(',').map((cc: string) => (
                          <img
                            key={cc}
                            src={`https://flagcdn.com/w40/${fixCountryCode(cc.trim())}.png`}
                            alt={cc.trim()}
                            style={{ width: 20, height: 15, objectFit: 'cover', borderRadius: 2 }}
                          />
                        ))}
                        <span>{c.name}</span>
                      </span>
                    }
                    variant={selectedCountry === c.code ? 'filled' : 'outlined'}
                    onClick={() => setSelectedCountry(selectedCountry === c.code ? '' : c.code)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '13px',
                      height: '36px',
                      borderRadius: '20px',
                      ...(selectedCountry === c.code
                        ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                        : {
                            borderColor: '#e2e8f0',
                            color: '#334155',
                            bgcolor: '#fff',
                            '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
                          }),
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Box>

      <Grid2 container columnSpacing={1.5} rowSpacing={2.5} sx={{ mt: 1 }}>
        {filteredProviders?.length > 0 ? (
          filteredProviders.map((provider: any, index: any) => (
            <Grid2 key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <ProxyCard provider={provider} isFirstCard={index === 0} countries={countries} />
            </Grid2>
          ))
        ) : (
          <Grid2 size={{ xs: 12 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '280px',
                p: 4,
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                background: '#f8fafc'
              }}
            >
              <SearchX size={48} color='#94a3b8' strokeWidth={1.5} style={{ marginBottom: '16px' }} />
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Không tìm thấy gói proxy phù hợp
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#94a3b8', mb: 2 }}>
                Thử thay đổi bộ lọc hoặc xoá bộ lọc để xem tất cả
              </Typography>
              {hasActiveFilter && (
                <Chip
                  icon={<X size={14} />}
                  label='Xoá tất cả bộ lọc'
                  onClick={clearAllFilters}
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    height: '36px',
                    borderRadius: '8px',
                    bgcolor: '#1e293b',
                    color: '#fff',
                    '&:hover': { bgcolor: '#334155' },
                    '& .MuiChip-icon': { color: '#fff' }
                  }}
                />
              )}
            </Box>
          </Grid2>
        )}
      </Grid2>
    </div>
  )
}
