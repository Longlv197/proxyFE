'use client'

import { useEffect, useMemo, useState } from 'react'

import { Box, Button, Typography } from '@mui/material'
import { ChevronRight } from 'lucide-react'

import type { LocationTreeValue } from './LocationTreePickerModal'

/**
 * T1 tree view (read-only) for already-configured location data.
 *
 * Pure render from `LocationTreeValue` (state đã ở parent — KHÔNG fetch API).
 * Dùng ở box "Cấu hình vị trí" trong ServiceFormModal để admin thấy NGAY cấu hình
 * hiện tại dạng cây phân cấp Country → Region → City, không phải open modal mới biết.
 *
 * Convention semantic:
 *   - country có trong `countries` + KHÔNG có entry trong `regions[code]` → "tất cả region"
 *   - region có trong `regions[code]` + KHÔNG có entry trong `cities[regionName]` → "tất cả city"
 *   - city luôn là leaf
 *
 * Bấm "Sửa cấu hình" → callback `onEdit()` (parent mở `LocationTreePickerModal`).
 */

type Props = {
  value: LocationTreeValue
  onEdit: () => void
  disabled?: boolean
}

const COLORS = {
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  bg: '#f8fafc',
  text: '#0f172a',
  textSub: '#64748b',
  textFaint: '#94a3b8',
  primary: '#6366f1',
  primarySoft: '#eef2ff',
  primaryLine: '#c7d2fe',
  success: '#10b981',
  successSoft: '#ecfdf5',
  warning: '#f59e0b',
  warningSoft: '#fffbeb'
}

export default function LocationTreeViewer({ value, onEdit, disabled }: Props) {
  // Auto-expand mọi country/region CÓ children theo data ngay khi mở Viewer — để admin
  // thấy NGAY tree đầy đủ, không phải click từng node mới biết region/city có hay không.
  // User vẫn có thể tự collapse khi muốn.
  const autoOpenCountries = useMemo(
    () => new Set(value.countries.filter(c => (value.regions[c.key.toLowerCase()] || []).length > 0).map(c => c.key.toLowerCase())),
    [value]
  )
  const autoOpenRegions = useMemo(
    () => new Set(
      Object.entries(value.regions).flatMap(([, list]) =>
        list.filter(r => (value.cities[r.key] || []).length > 0).map(r => r.key)
      )
    ),
    [value]
  )

  const [openCountries, setOpenCountries] = useState<Set<string>>(autoOpenCountries)
  const [openRegions, setOpenRegions] = useState<Set<string>>(autoOpenRegions)

  // Khi value đổi (vd: user save modal xong) → reset về auto-expanded mới
  // (giữ collapse-by-user trong cùng session là edge case, ưu tiên hiển thị data mới đầy đủ)
  useEffect(() => {
    setOpenCountries(autoOpenCountries)
    setOpenRegions(autoOpenRegions)
  }, [autoOpenCountries, autoOpenRegions])

  const counts = useMemo(() => {
    const countryCount = value.countries.length
    const regionCount = Object.values(value.regions).reduce((s, l) => s + l.length, 0)
    const cityCount = Object.values(value.cities).reduce((s, l) => s + l.length, 0)

    return { countryCount, regionCount, cityCount }
  }, [value])

  const isEmpty = counts.countryCount === 0

  // ============================ Empty state ============================
  if (isEmpty) {
    return (
      <Box
        sx={{
          border: `2px solid ${COLORS.warning}`,
          borderRadius: 2,
          background: COLORS.warningSoft,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box>
          <Typography fontWeight={700} fontSize={14}>🌍 Cấu hình vị trí (Country / Region / City)</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
            Chưa cấu hình. Click bên phải để chọn country → region → city trên cùng 1 picker dạng cây.
          </Typography>
        </Box>
        <Button
          variant='contained'
          size='small'
          onClick={onEdit}
          disabled={disabled}
          sx={{ background: COLORS.warning, whiteSpace: 'nowrap', '&:hover': { background: '#d97706' } }}
        >
          + Cấu hình ngay
        </Button>
      </Box>
    )
  }

  // ============================ Tree view T1 ============================
  const toggleCountry = (code: string) =>
    setOpenCountries(prev => {
      const n = new Set(prev)
      n.has(code) ? n.delete(code) : n.add(code)

      return n
    })

  const toggleRegion = (key: string) =>
    setOpenRegions(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)

      return n
    })

  return (
    <Box
      sx={{
        border: `2px solid ${COLORS.success}`,
        borderRadius: 2,
        background: '#f0fdf4',
        p: 1.5
      }}
    >
      {/* Header với badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
        <Typography fontWeight={700} fontSize={13.5}>🌍 Vị trí đã cấu hình</Typography>
        <Badge variant='primary'>{counts.countryCount} country</Badge>
        {(counts.regionCount > 0 || counts.cityCount > 0) && (
          <Badge variant='success'>
            {counts.regionCount} region{counts.cityCount > 0 ? ` · ${counts.cityCount} city` : ''}
          </Badge>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant='outlined'
          size='small'
          onClick={onEdit}
          disabled={disabled}
          sx={{ height: 28, fontSize: 12, textTransform: 'none', borderColor: COLORS.borderStrong, color: COLORS.text }}
        >
          ✎ Sửa cấu hình
        </Button>
      </Box>

      {/* Tree T1 */}
      <Box
        sx={{
          background: '#fff',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 1.5,
          py: 0.5,
          maxHeight: 320,
          overflow: 'auto'
        }}
      >
        {value.countries.map(country => {
          const code = country.key.toLowerCase()
          const flagCode = country.flag || code
          const regionList = value.regions[code] || []
          const hasRegions = regionList.length > 0
          const cityCountInCountry = regionList.reduce((s, r) => s + (value.cities[r.key]?.length || 0), 0)
          const isCountryOpen = openCountries.has(code)

          return (
            <Box key={code} sx={{ position: 'relative' }}>
              {/* Country row (level 0) */}
              <NodeRow
                depth={0}
                onClick={() => hasRegions && toggleCountry(code)}
                clickable={hasRegions}
              >
                <Caret open={isCountryOpen} visible={hasRegions} />
                <img
                  src={`https://flagcdn.com/w40/${flagCode}.png`}
                  alt=''
                  style={{ width: 22, height: 15, objectFit: 'cover', borderRadius: 2, boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }}
                />
                <Typography fontWeight={600} fontSize={13.5} color={COLORS.text}>{country.label}</Typography>
                <Typography fontSize={11} fontWeight={500} color={COLORS.textSub}>{country.key.toUpperCase()}</Typography>
                <Box sx={{ flexGrow: 1 }} />
                {hasRegions ? (
                  <>
                    <Badge variant='primary' compact>{regionList.length}R</Badge>
                    {cityCountInCountry > 0 && <Badge variant='success' compact>{cityCountInCountry}C</Badge>}
                  </>
                ) : (
                  <Badge>tất cả region</Badge>
                )}
              </NodeRow>

              {/* Region children (level 1) — guide line dọc */}
              {hasRegions && isCountryOpen && (
                <Box sx={{ position: 'relative' }}>
                  {/* vertical guide */}
                  <Box sx={{ position: 'absolute', left: 17, top: 0, bottom: 6, width: '1px', background: COLORS.border }} />
                  {regionList.map(region => {
                    const cityList = value.cities[region.key] || []
                    const hasCities = cityList.length > 0
                    const isRegionOpen = openRegions.has(region.key)

                    return (
                      <Box key={region.key}>
                        <NodeRow
                          depth={1}
                          onClick={() => hasCities && toggleRegion(region.key)}
                          clickable={hasCities}
                          guideHorizontal
                        >
                          <Caret open={isRegionOpen} visible={hasCities} small />
                          <Typography fontWeight={500} fontSize={13} color={COLORS.text}>{region.label}</Typography>
                          <Box sx={{ flexGrow: 1 }} />
                          {hasCities ? (
                            <Badge variant='success' compact>{cityList.length}C</Badge>
                          ) : (
                            <Badge>tất cả city</Badge>
                          )}
                        </NodeRow>

                        {/* City children (level 2) */}
                        {hasCities && isRegionOpen && (
                          <Box sx={{ position: 'relative' }}>
                            <Box sx={{ position: 'absolute', left: 41, top: 0, bottom: 4, width: '1px', background: COLORS.border }} />
                            {cityList.map(city => (
                              <Box
                                key={city.key}
                                sx={{
                                  display: 'flex', alignItems: 'center', gap: 0.75,
                                  pl: '54px', pr: 1, py: '3px'
                                }}
                              >
                                <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.primaryLine, flexShrink: 0 }} />
                                <Typography fontSize={12.5} color={COLORS.textSub}>{city.label}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

// ============================ Sub-components ============================

function Caret({ open, visible, small }: { open: boolean; visible: boolean; small?: boolean }) {
  const size = small ? 13 : 15

  return (
    <Box
      sx={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, flexShrink: 0,
        color: COLORS.textFaint,
        visibility: visible ? 'visible' : 'hidden',
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.15s'
      }}
    >
      <ChevronRight size={size} />
    </Box>
  )
}

function NodeRow({
  depth, onClick, clickable, guideHorizontal, children
}: {
  depth: number
  onClick?: () => void
  clickable?: boolean
  guideHorizontal?: boolean
  children: React.ReactNode
}) {
  const paddingLeft = depth === 0 ? '6px' : '30px'

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: '5px',
        pl: paddingLeft,
        pr: 1,
        borderRadius: 1,
        cursor: clickable ? 'pointer' : 'default',
        '&:hover': clickable ? { background: COLORS.bg } : {},
        // horizontal guide line (level 1)
        ...(guideHorizontal && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: '17px',
            top: '50%',
            width: '11px',
            height: '1px',
            background: COLORS.border
          }
        })
      }}
    >
      {children}
    </Box>
  )
}

function Badge({
  children, variant, compact
}: {
  children: React.ReactNode
  variant?: 'primary' | 'success'
  compact?: boolean
}) {
  const colorMap = {
    primary: { bg: COLORS.primarySoft, fg: COLORS.primary },
    success: { bg: COLORS.successSoft, fg: COLORS.success }
  }
  const { bg, fg } = variant ? colorMap[variant] : { bg: COLORS.bg, fg: COLORS.textSub }

  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex', alignItems: 'center',
        px: compact ? '6px' : '8px', py: '1px',
        borderRadius: '99px',
        fontSize: 11,
        fontWeight: 500,
        background: bg,
        color: fg,
        border: variant ? 'none' : `1px solid ${COLORS.border}`,
        lineHeight: 1.5,
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </Box>
  )
}
