'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import {
  Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent,
  IconButton, InputAdornment, Popover, Stack, TextField, Typography
} from '@mui/material'
import { ChevronRight, Globe, RefreshCw, Search, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import {
  providerCodeToSlug,
  residentialAdminKeys,
  residentialAdminPersist,
  useResidentialCountries
} from '@/hooks/apis/useResidentialProviderAdmin'

/**
 * Modal 3-level tree picker cho admin cấu hình country → region → city của SP residential.
 *
 * v2 (2026-05-28):
 *   - Visual T1 — đồng bộ với LocationTreeViewer (color, badge, indent, guide line)
 *   - Layout 2 zone — "Đã chọn" (top, auto-expand) + "Country khác" (filter/scroll)
 *   - Perf — React.memo + useCallback + hoist sx, mỗi country row chỉ re-render khi DATA
 *     của country đó đổi (không re-render toàn list khi tick 1 cái)
 *   - Cache — Tanstack Query 24h countries / 1h regions+cities (Phase 2)
 *
 * Lưu state theo cây nhưng output dạng phẳng 3 fields tương thích schema cũ:
 *   { countries:[{key,label,flag}], regions:{us:[{key,label}]}, cities:{Alabama:[{key,label}]} }
 *
 * Trade-off đã chấp nhận:
 *   - city dùng region_name làm parent_key (collision nếu 2 country có region trùng tên).
 *     Use-case Proxyma không gặp nên simple hơn parent_compound_key.
 *   - Skip virtualization (no react-virtual dep) — 250 rows với memo render <50ms ổn.
 */

// ============================ Types ============================
type Country = { code: string; name: string }
type LeafOption = {
  key: string
  label: string
  flag?: string
  /**
   * i18n override admin nhập tay. KHÔNG có = "Giống value" (mọi locale dùng label gốc).
   * Có entry = "Custom" — FE pick locale → fallback label.
   * Empty {} = mode Custom nhưng chưa nhập gì → treated as "Giống value".
   */
  label_i18n?: Record<string, string>
}

export type LocationTreeValue = {
  countries: LeafOption[]
  regions: Record<string, LeafOption[]>   // key = country_code lowercase
  cities: Record<string, LeafOption[]>    // key = region_name
}

// Locales FE hỗ trợ — đồng bộ với configi18n.ts
const I18N_LOCALES: Array<{ code: string; label: string; flag: string }> = [
  { code: 'vi', label: 'VI', flag: '🇻🇳' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ko', label: 'KO', flag: '🇰🇷' },
  { code: 'ja', label: 'JA', flag: '🇯🇵' },
  { code: 'cn', label: 'CN', flag: '🇨🇳' }
]

type Props = {
  open: boolean
  onClose: () => void
  providerCode: string                     // vd 'proxyma.io'
  value: LocationTreeValue
  onSave: (next: LocationTreeValue) => void
}

const EMPTY_VALUE: LocationTreeValue = { countries: [], regions: {}, cities: {} }

// ============================ Colors (đồng bộ T1 Viewer) ============================
const C = {
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  bg: '#f8fafc',
  panel: '#ffffff',
  text: '#0f172a',
  textSub: '#64748b',
  textFaint: '#94a3b8',
  primary: '#6366f1',
  primarySoft: '#eef2ff',
  primaryLine: '#c7d2fe',
  success: '#10b981',
  successSoft: '#ecfdf5',
  selectedRow: '#eef2ff',
  selectedRowHover: '#e0e7ff',
  hover: '#f1f5f9'
}

// Hoist constant sx — không recreate mỗi render
const SX = {
  dialogTitle: { px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` },
  searchBar: { p: 1.25, borderBottom: `1px solid ${C.border}`, background: C.bg },
  zoneHeader: {
    px: 1.5, py: 1, fontSize: 11, fontWeight: 700, color: C.textSub,
    textTransform: 'uppercase', letterSpacing: 0.5,
    display: 'flex', alignItems: 'center', gap: 1,
    background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
    position: 'sticky' as const, top: 0, zIndex: 1
  },
  dialogActions: {
    px: 2, py: 1.5, borderTop: `1px solid ${C.border}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2
  },
  emptyState: { p: 4, textAlign: 'center' as const, color: C.textSub },
  rowBase: (depth: number, selected: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 1,
    py: '5px', pl: `${6 + depth * 24}px`, pr: 1,
    borderRadius: 1, cursor: 'pointer' as const,
    background: selected ? C.selectedRow : 'transparent',
    '&:hover': { background: selected ? C.selectedRowHover : C.hover }
  })
}

// ============================ Sub-components (memoized) ============================

/** Caret xoay khi expand. */
function Caret({ open, visible, small }: { open: boolean; visible: boolean; small?: boolean }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 16, height: 16, flexShrink: 0, color: C.textFaint,
      visibility: visible ? 'visible' : 'hidden',
      transform: open ? 'rotate(90deg)' : 'none',
      transition: 'transform 0.15s'
    }}>
      <ChevronRight size={small ? 13 : 15} />
    </Box>
  )
}

function Badge({ children, variant, compact }: {
  children: React.ReactNode
  variant?: 'primary' | 'success'
  compact?: boolean
}) {
  const colorMap = {
    primary: { bg: C.primarySoft, fg: C.primary },
    success: { bg: C.successSoft, fg: C.success }
  }
  const { bg, fg } = variant ? colorMap[variant] : { bg: C.bg, fg: C.textSub }

  return (
    <Box component='span' sx={{
      display: 'inline-flex', alignItems: 'center',
      px: compact ? '6px' : '8px', py: '1px',
      borderRadius: '99px', fontSize: 11, fontWeight: 500,
      background: bg, color: fg,
      border: variant ? 'none' : `1px solid ${C.border}`,
      lineHeight: 1.5, whiteSpace: 'nowrap'
    }}>
      {children}
    </Box>
  )
}

/**
 * Compact i18n TRIGGER button — chỉ render IconButton. KHÔNG có Popover riêng.
 * Popover là 1 instance singleton ở main component (xem `I18nEditorPopover`).
 *
 * Giảm 55 popover instances × (3 useState × MUI Modal/Paper overhead) → 1 popover toàn cục.
 * DOM ~10000 nodes → ~6000 sau refactor. Click response instant.
 */
const I18nTrigger = memo(function I18nTrigger({
  defaultLabel, hasCustom, customCount, small, onOpen
}: {
  defaultLabel: string
  hasCustom: boolean
  customCount: number
  small?: boolean
  onOpen: (anchor: HTMLElement, defaultLabel: string) => void
}) {
  // Chặn TOÀN BỘ mouse events bubble lên row parent (tránh tick/untick checkbox).
  const stopAll = useCallback((e: React.MouseEvent) => { e.stopPropagation() }, [])
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onOpen(e.currentTarget, defaultLabel)
  }, [defaultLabel, onOpen])

  const iconSize = small ? 11 : 12

  return (
    <Box
      component='span'
      onClick={stopAll} onMouseDown={stopAll} onMouseUp={stopAll}
      sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
    >
      <IconButton
        size='small' onClick={handleClick}
        title={hasCustom ? `Dịch custom (${customCount} ngôn ngữ)` : 'Đặt tên theo ngôn ngữ'}
        sx={{
          p: 0.25, color: hasCustom ? C.primary : C.textFaint,
          background: hasCustom ? C.primarySoft : 'transparent',
          '&:hover': { color: C.primary, background: C.primarySoft }
        }}
      >
        <Globe size={iconSize} />
      </IconButton>
    </Box>
  )
})

// Native styles (string CSS) cho CityRow — bỏ MUI Box/Checkbox overhead × 200+ rows.
// MUI Box/Checkbox/Typography mỗi instance compile emotion CSS class → 1 click re-render = 500-700ms.
// Native div + input + span → render <50ms cho cùng tree.
const CITY_ROW_STYLE_BASE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  paddingLeft: 54, paddingRight: 8, paddingTop: 3, paddingBottom: 3,
  cursor: 'pointer', borderRadius: 4
}
const CITY_ROW_STYLE_SELECTED: React.CSSProperties = { ...CITY_ROW_STYLE_BASE, background: C.selectedRow }
const CITY_BULLET_STYLE: React.CSSProperties = {
  width: 5, height: 5, borderRadius: '50%', background: C.primaryLine, flexShrink: 0
}
const CITY_LABEL_STYLE_SELECTED: React.CSSProperties = { flexGrow: 1, fontSize: 12.5, fontWeight: 500, color: C.text }
const CITY_LABEL_STYLE_UNSELECTED: React.CSSProperties = { flexGrow: 1, fontSize: 12.5, fontWeight: 400, color: C.textSub }

/** City row (level 2) — leaf, không expand. NATIVE elements để tránh MUI re-render overhead. */
const CityRow = memo(function CityRow({
  cityName, regionName, selected, onToggle, i18nValue, onOpenI18n
}: {
  cityName: string
  regionName: string
  selected: boolean
  onToggle: (regionName: string, name: string) => void
  i18nValue?: Record<string, string>
  onOpenI18n: (kind: 'country' | 'region' | 'city', key: string, anchor: HTMLElement, defaultLabel: string) => void
}) {
  const handleClick = useCallback(() => onToggle(regionName, cityName), [cityName, regionName, onToggle])
  const stopCb = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])
  const handleOpenI18n = useCallback((anchor: HTMLElement, label: string) =>
    onOpenI18n('city', `${regionName}:${cityName}`, anchor, label),
    [regionName, cityName, onOpenI18n]
  )

  const hasCustom = !!i18nValue && Object.values(i18nValue).some(v => v?.trim())
  const customCount = i18nValue ? Object.values(i18nValue).filter(v => v?.trim()).length : 0

  return (
    <div onClick={handleClick} style={selected ? CITY_ROW_STYLE_SELECTED : CITY_ROW_STYLE_BASE}>
      <input type='checkbox' checked={selected} onChange={handleClick} onClick={stopCb}
        style={{ margin: 0, cursor: 'pointer' }} />
      <div style={CITY_BULLET_STYLE} />
      <span style={selected ? CITY_LABEL_STYLE_SELECTED : CITY_LABEL_STYLE_UNSELECTED}>{cityName}</span>
      {selected && (
        <I18nTrigger
          small
          defaultLabel={cityName}
          hasCustom={hasCustom}
          customCount={customCount}
          onOpen={handleOpenI18n}
        />
      )}
    </div>
  )
})

/** Region row (level 1) — expand để load city. */
const RegionRow = memo(function RegionRow({
  countryCode, regionName, selected, expanded, cityList, citiesSelected, loadingCities,
  onToggleSelect, onToggleExpand, onToggleCity, onSelectAllCities, onRefreshCities,
  i18nValue, citiesI18n, onOpenI18n
}: {
  countryCode: string
  regionName: string
  selected: boolean
  expanded: boolean
  cityList: string[] | undefined
  citiesSelected: Set<string> | undefined
  loadingCities: boolean
  onToggleSelect: (cc: string, rn: string) => void
  onToggleExpand: (cc: string, rn: string) => void
  onToggleCity: (rn: string, name: string) => void
  onSelectAllCities: (rn: string, names: string[]) => void
  onRefreshCities: (cc: string, rn: string) => void
  i18nValue?: Record<string, string>
  citiesI18n: Record<string, Record<string, string>>
  onOpenI18n: (kind: 'country' | 'region' | 'city', key: string, anchor: HTMLElement, defaultLabel: string) => void
}) {
  const handleSelect = useCallback(() => onToggleSelect(countryCode, regionName), [countryCode, regionName, onToggleSelect])
  const handleExpand = useCallback(() => onToggleExpand(countryCode, regionName), [countryCode, regionName, onToggleExpand])
  const handleSelectAllCities = useCallback(() => onSelectAllCities(regionName, cityList || []), [regionName, cityList, onSelectAllCities])
  const handleRefreshCities = useCallback(() => onRefreshCities(countryCode, regionName), [countryCode, regionName, onRefreshCities])
  const handleOpenI18nRegion = useCallback((anchor: HTMLElement, label: string) =>
    onOpenI18n('region', `${countryCode}:${regionName}`, anchor, label),
    [countryCode, regionName, onOpenI18n]
  )
  const stopCb = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])

  const cityCount = citiesSelected?.size || 0
  const totalCities = cityList?.length || 0
  const allCitiesSelected = totalCities > 0 && cityCount === totalCities
  const hasI18nCustom = !!i18nValue && Object.values(i18nValue).some(v => v?.trim())
  const customCount = i18nValue ? Object.values(i18nValue).filter(v => v?.trim()).length : 0

  // Native styles thay MUI Box → save emotion CSS compile mỗi re-render
  const rowStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 8,
    paddingTop: 5, paddingBottom: 5, paddingLeft: 30, paddingRight: 8,
    borderRadius: 4, cursor: 'pointer',
    background: selected ? C.selectedRow : 'transparent'
  }

  return (
    <div>
      <div style={rowStyle}>
        <span onClick={handleExpand} style={{ display: 'inline-flex' }}>
          <Caret open={expanded} visible={true} small />
        </span>
        <input type='checkbox' checked={selected} onChange={handleSelect} onClick={stopCb}
          style={{ margin: 0, cursor: 'pointer' }} />
        <span onClick={handleSelect} style={{
          flexGrow: 1, fontSize: 13, fontWeight: selected ? 600 : 500, color: C.text
        }}>{regionName}</span>
        {selected && expanded && totalCities > 0 && (
          <label onClick={stopCb} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            cursor: 'pointer', userSelect: 'none', padding: '0 4px',
            fontSize: 11, fontWeight: 500, color: allCitiesSelected ? C.success : C.textSub
          }}>
            <input type='checkbox' checked={allCitiesSelected} onChange={handleSelectAllCities}
              style={{ margin: 0, cursor: 'pointer' }} />
            Tất cả city
          </label>
        )}
        {expanded && (
          <IconButton
            size='small' onClick={e => { e.stopPropagation(); handleRefreshCities() }}
            disabled={loadingCities}
            title='Tải lại cities từ NCC (bỏ qua cache)'
            sx={{
              p: 0.25, color: C.textFaint,
              '&:hover': { color: C.success, background: C.successSoft }
            }}
          >
            <Box sx={{
              display: 'inline-flex',
              animation: loadingCities ? 'spin 0.8s linear infinite' : 'none',
              '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } }
            }}>
              <RefreshCw size={11} />
            </Box>
          </IconButton>
        )}
        {selected && cityCount > 0 && <Badge variant='success' compact>{cityCount}C</Badge>}
        {selected && (
          <I18nTrigger
            small
            defaultLabel={regionName}
            hasCustom={hasI18nCustom}
            customCount={customCount}
            onOpen={handleOpenI18nRegion}
          />
        )}
      </div>

      {/* City children */}
      {expanded && (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 41, top: 0, bottom: 4, width: 1, background: C.border }} />
          {loadingCities ? (
            <div style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 12, color: C.textSub }}>
              <CircularProgress size={12} />
              <span style={{ marginLeft: 8 }}>Tải cities…</span>
            </div>
          ) : !cityList || cityList.length === 0 ? (
            <div style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 12, color: C.textSub }}>
              NCC không có city nào cho {regionName}
            </div>
          ) : (
            cityList.map(cityName => (
              <CityRow
                key={cityName}
                cityName={cityName}
                regionName={regionName}
                selected={citiesSelected?.has(cityName) ?? false}
                onToggle={onToggleCity}
                i18nValue={citiesI18n[`${regionName}:${cityName}`]}
                onOpenI18n={onOpenI18n}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
})

/** Country row (level 0) — top-level. Memo equality check ngầm shallow của props. */
const CountryRow = memo(function CountryRow({
  country, selected, expanded,
  regionList, selectedRegions, selectedCities, expandedRegions, citiesByRegion,
  loadingRegions, loadingCitiesSet,
  onToggleSelect, onToggleExpand,
  onToggleRegion, onToggleExpandRegion, onToggleCity,
  onSelectAllRegions, onSelectAllCities,
  onRefreshRegions, onRefreshCities,
  i18nValue, regionsI18n, citiesI18n, onOpenI18n
}: {
  country: Country
  selected: boolean
  expanded: boolean
  regionList: string[] | undefined
  selectedRegions: Set<string> | undefined
  selectedCities: Record<string, Set<string>> | undefined
  expandedRegions: Set<string>
  citiesByRegion: Record<string, string[]>
  loadingRegions: boolean
  loadingCitiesSet: Set<string>
  onToggleSelect: (code: string) => void
  onToggleExpand: (code: string) => void
  onToggleRegion: (cc: string, rn: string) => void
  onToggleExpandRegion: (cc: string, rn: string) => void
  onToggleCity: (rn: string, name: string) => void
  onSelectAllRegions: (cc: string, names: string[]) => void
  onSelectAllCities: (rn: string, names: string[]) => void
  onRefreshRegions: (cc: string) => void
  onRefreshCities: (cc: string, rn: string) => void
  i18nValue?: Record<string, string>
  regionsI18n: Record<string, Record<string, string>>
  citiesI18n: Record<string, Record<string, string>>
  onOpenI18n: (kind: 'country' | 'region' | 'city', key: string, anchor: HTMLElement, defaultLabel: string) => void
}) {
  const code = country.code.toLowerCase()
  const handleSelect = useCallback(() => onToggleSelect(code), [code, onToggleSelect])
  const handleExpand = useCallback(() => onToggleExpand(code), [code, onToggleExpand])
  const handleSelectAllRegions = useCallback(
    () => onSelectAllRegions(code, regionList || []),
    [code, regionList, onSelectAllRegions]
  )
  const handleRefreshRegions = useCallback(() => onRefreshRegions(code), [code, onRefreshRegions])

  const regCount = selectedRegions?.size || 0
  const cityCount = regionList?.reduce((s, rn) => s + (selectedCities?.[rn]?.size || 0), 0) || 0
  const totalRegions = regionList?.length || 0
  const allRegionsSelected = totalRegions > 0 && regCount === totalRegions

  const handleOpenI18nCountry = useCallback((anchor: HTMLElement, label: string) =>
    onOpenI18n('country', code, anchor, label),
    [code, onOpenI18n]
  )
  const stopCb = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])
  const hasI18nCustom = !!i18nValue && Object.values(i18nValue).some(v => v?.trim())
  const customI18nCount = i18nValue ? Object.values(i18nValue).filter(v => v?.trim()).length : 0

  // Native row style — tránh MUI Box emotion overhead.
  const countryRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    paddingTop: 5, paddingBottom: 5, paddingLeft: 6, paddingRight: 8,
    borderRadius: 4, cursor: 'pointer',
    background: selected ? C.selectedRow : 'transparent'
  }

  return (
    <div>
      <div style={countryRowStyle}>
        <span onClick={handleExpand} style={{ display: 'inline-flex' }}>
          <Caret open={expanded} visible={true} />
        </span>
        <input type='checkbox' checked={selected} onChange={handleSelect} onClick={stopCb}
          style={{ margin: 0, cursor: 'pointer' }} />
        <img
          src={`https://flagcdn.com/w40/${code}.png`} alt=''
          style={{ width: 22, height: 15, objectFit: 'cover', borderRadius: 2, boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }}
        />
        <span onClick={handleSelect} style={{
          flexGrow: 1, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ fontSize: 13.5, fontWeight: selected ? 600 : 500, color: C.text }}>{country.name}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: C.textSub }}>{country.code}</span>
        </span>
        {selected && expanded && totalRegions > 0 && (
          <label onClick={stopCb} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            cursor: 'pointer', userSelect: 'none', padding: '0 4px',
            fontSize: 11.5, fontWeight: 500, color: allRegionsSelected ? C.primary : C.textSub
          }}>
            <input type='checkbox' checked={allRegionsSelected} onChange={handleSelectAllRegions}
              style={{ margin: 0, cursor: 'pointer' }} />
            Tất cả region
          </label>
        )}
        {expanded && (
          // Icon ↻ refresh — chỉ reload regions của country này, KHÔNG refetch full tree
          <IconButton
            size='small' onClick={e => { e.stopPropagation(); handleRefreshRegions() }}
            disabled={loadingRegions}
            title='Tải lại regions từ NCC (bỏ qua cache)'
            sx={{
              p: 0.25, color: C.textFaint,
              '&:hover': { color: C.primary, background: C.primarySoft }
            }}
          >
            <Box sx={{
              display: 'inline-flex',
              animation: loadingRegions ? 'spin 0.8s linear infinite' : 'none',
              '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } }
            }}>
              <RefreshCw size={12} />
            </Box>
          </IconButton>
        )}
        {selected && (
          regCount > 0 || cityCount > 0 ? (
            <>
              <Badge variant='primary' compact>{regCount}R</Badge>
              {cityCount > 0 && <Badge variant='success' compact>{cityCount}C</Badge>}
            </>
          ) : (
            <Badge>tất cả region</Badge>
          )
        )}
        {selected && (
          <I18nTrigger
            defaultLabel={country.name}
            hasCustom={hasI18nCustom}
            customCount={customI18nCount}
            onOpen={handleOpenI18nCountry}
          />
        )}
      </div>

      {/* Region children */}
      {expanded && (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 17, top: 0, bottom: 6, width: 1, background: C.border }} />
          {loadingRegions ? (
            <div style={{ paddingLeft: 24, paddingTop: 8, paddingBottom: 8, fontSize: 12, color: C.textSub }}>
              <CircularProgress size={14} />
              <span style={{ marginLeft: 8 }}>Tải regions…</span>
            </div>
          ) : !regionList || regionList.length === 0 ? (
            <div style={{ paddingLeft: 24, paddingTop: 8, paddingBottom: 8, fontSize: 12, color: C.textSub }}>
              NCC không có region nào cho {country.name}
            </div>
          ) : (
            regionList.map(regionName => (
              <RegionRow
                key={regionName}
                countryCode={code}
                regionName={regionName}
                selected={selectedRegions?.has(regionName) ?? false}
                expanded={expandedRegions.has(regionName)}
                cityList={citiesByRegion[regionName]}
                citiesSelected={selectedCities?.[regionName]}
                loadingCities={loadingCitiesSet.has(regionName)}
                onToggleSelect={onToggleRegion}
                onToggleExpand={onToggleExpandRegion}
                onToggleCity={onToggleCity}
                onSelectAllCities={onSelectAllCities}
                onRefreshCities={onRefreshCities}
                i18nValue={regionsI18n[`${code}:${regionName}`]}
                citiesI18n={citiesI18n}
                onOpenI18n={onOpenI18n}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
})

// ============================ Main component ============================

export default function LocationTreePickerModal({ open, onClose, providerCode, value, onSave }: Props) {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()
  const slug = useMemo(() => providerCodeToSlug(providerCode), [providerCode])

  // Countries: Tanstack Query (cache 24h)
  const { data: countriesData, isFetching: loadingCountries } = useResidentialCountries(open ? providerCode : null)
  const allCountries: Country[] = countriesData ?? []

  // Regions/cities: local cache cho render; Tanstack cache là source of truth giữa sessions
  const [regionsByCountry, setRegionsByCountry] = useState<Record<string, string[]>>({})
  const [citiesByRegion, setCitiesByRegion] = useState<Record<string, string[]>>({})

  const [loadingRegions, setLoadingRegions] = useState<Set<string>>(new Set())
  const [loadingCities, setLoadingCities] = useState<Set<string>>(new Set())

  // Selection
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())
  const [selectedRegions, setSelectedRegions] = useState<Record<string, Set<string>>>({})
  const [selectedCities, setSelectedCities] = useState<Record<string, Set<string>>>({})

  // i18n overrides — admin nhập custom label cho country/region/city qua I18nButton.
  // Key country: lowercase code ('us'). Key region: country_code + ':' + region_name ('us:California').
  // Key city: region_name + ':' + city_name ('California:Los Angeles').
  const [i18nCountries, setI18nCountries] = useState<Record<string, Record<string, string>>>({})
  const [i18nRegions, setI18nRegions] = useState<Record<string, Record<string, string>>>({})
  const [i18nCities, setI18nCities] = useState<Record<string, Record<string, string>>>({})

  // Expand
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set())
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  const [search, setSearch] = useState('')

  // ─── Reset state khi mở modal + seed cache region/city từ value đã có ───
  useEffect(() => {
    if (!open) return

    const sc = new Set(value.countries.map(c => c.key))
    setSelectedCountries(sc)

    // Seed i18n từ value đã save (countries có thể có label_i18n)
    const i18nC: Record<string, Record<string, string>> = {}
    value.countries.forEach(c => { if (c.label_i18n && Object.keys(c.label_i18n).length > 0) i18nC[c.key] = c.label_i18n })
    setI18nCountries(i18nC)

    const sr: Record<string, Set<string>> = {}
    const reg: Record<string, string[]> = {}
    const i18nR: Record<string, Record<string, string>> = {}
    Object.entries(value.regions).forEach(([k, list]) => {
      sr[k] = new Set(list.map(o => o.key))
      const arr = list.map(o => o.key)
      reg[k] = arr
      list.forEach(o => {
        if (o.label_i18n && Object.keys(o.label_i18n).length > 0) i18nR[`${k}:${o.key}`] = o.label_i18n
      })
      if (slug && arr.length > 0) {
        queryClient.setQueryData(residentialAdminKeys.regions(slug, k), arr)
      }
    })
    setSelectedRegions(sr)
    setRegionsByCountry(prev => ({ ...reg, ...prev }))
    setI18nRegions(i18nR)

    const sci: Record<string, Set<string>> = {}
    const cit: Record<string, string[]> = {}
    const i18nCi: Record<string, Record<string, string>> = {}
    Object.entries(value.cities).forEach(([k, list]) => {
      sci[k] = new Set(list.map(o => o.key))
      cit[k] = list.map(o => o.key)
      list.forEach(o => {
        if (o.label_i18n && Object.keys(o.label_i18n).length > 0) i18nCi[`${k}:${o.key}`] = o.label_i18n
      })
    })
    setSelectedCities(sci)
    setCitiesByRegion(prev => ({ ...cit, ...prev }))
    setI18nCities(i18nCi)

    // Auto-expand country đã chọn để admin thấy ngay state hiện tại
    setExpandedCountries(new Set(value.countries.map(c => c.key)))
    setExpandedRegions(new Set(Object.keys(value.cities)))
    setSearch('')

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ─── Lazy fetch dùng Tanstack cache + localStorage persist ───
  //   Priority: localStorage (survive page reload) → Tanstack RAM cache → API fetch.
  //   Saved to localStorage after fetch — mở browser lần khác vẫn có data instant.
  const fetchRegions = useCallback(async (countryCode: string, forceRefresh = false) => {
    if (regionsByCountry[countryCode] && !forceRefresh) return
    if (!slug) return

    if (forceRefresh) {
      residentialAdminPersist.clearRegions(slug, countryCode)
      queryClient.removeQueries({ queryKey: residentialAdminKeys.regions(slug, countryCode) })
    } else {
      // Hydrate Tanstack cache từ localStorage → fetchQuery thấy ngay (skip network)
      const persisted = residentialAdminPersist.getRegions(slug, countryCode)
      if (persisted) {
        queryClient.setQueryData(residentialAdminKeys.regions(slug, countryCode), persisted)
      }
    }

    setLoadingRegions(prev => new Set(prev).add(countryCode))
    try {
      const data = await queryClient.fetchQuery<string[]>({
        queryKey: residentialAdminKeys.regions(slug, countryCode),
        queryFn: async () => {
          const res = await axiosAuth.get(`/admin/${slug}/regions`, {
            params: { country_code: countryCode.toUpperCase() }
          })
          const list = res?.data?.data ?? []
          residentialAdminPersist.setRegions(slug, countryCode, list)

          return list
        },
        staleTime: 60 * 60 * 1000
      })
      setRegionsByCountry(prev => ({ ...prev, [countryCode]: data }))
    } catch (e: any) {
      toast.error('Tải regions lỗi: ' + (e?.response?.data?.message || e.message))
    } finally {
      setLoadingRegions(prev => { const n = new Set(prev); n.delete(countryCode); return n })
    }
  }, [regionsByCountry, slug, queryClient, axiosAuth])

  const fetchCities = useCallback(async (countryCode: string, regionName: string, forceRefresh = false) => {
    if (citiesByRegion[regionName] && !forceRefresh) return
    if (!slug) return

    if (forceRefresh) {
      residentialAdminPersist.clearCities(slug, countryCode, regionName)
      queryClient.removeQueries({ queryKey: residentialAdminKeys.cities(slug, countryCode, regionName) })
    } else {
      const persisted = residentialAdminPersist.getCities(slug, countryCode, regionName)
      if (persisted) {
        queryClient.setQueryData(residentialAdminKeys.cities(slug, countryCode, regionName), persisted)
      }
    }

    setLoadingCities(prev => new Set(prev).add(regionName))
    try {
      const data = await queryClient.fetchQuery<string[]>({
        queryKey: residentialAdminKeys.cities(slug, countryCode, regionName),
        queryFn: async () => {
          const res = await axiosAuth.get(`/admin/${slug}/cities`, {
            params: { country_code: countryCode.toUpperCase(), region_name: regionName }
          })
          const list = res?.data?.data ?? []
          residentialAdminPersist.setCities(slug, countryCode, regionName, list)

          return list
        },
        staleTime: 60 * 60 * 1000
      })
      setCitiesByRegion(prev => ({ ...prev, [regionName]: data }))
    } catch (e: any) {
      toast.error('Tải cities lỗi: ' + (e?.response?.data?.message || e.message))
    } finally {
      setLoadingCities(prev => { const n = new Set(prev); n.delete(regionName); return n })
    }
  }, [citiesByRegion, slug, queryClient, axiosAuth])

  // Refresh per-key — click icon ↻ trên row country/region để pull lại từ NCC
  const refreshRegionsForCountry = useCallback((countryCode: string) => {
    setRegionsByCountry(prev => { const n = { ...prev }; delete n[countryCode]; return n })
    fetchRegions(countryCode, true)
  }, [fetchRegions])

  const refreshCitiesForRegion = useCallback((countryCode: string, regionName: string) => {
    setCitiesByRegion(prev => { const n = { ...prev }; delete n[regionName]; return n })
    fetchCities(countryCode, regionName, true)
  }, [fetchCities])

  // ─── i18n EDITOR: 1 popover singleton thay vì 55 instances ───
  // State: thông tin row đang edit. Popover render 1 lần duy nhất ở cuối Modal.
  const [i18nEditor, setI18nEditor] = useState<{
    anchorEl: HTMLElement
    kind: 'country' | 'region' | 'city'
    key: string
    defaultLabel: string
  } | null>(null)

  const openI18nEditor = useCallback((
    kind: 'country' | 'region' | 'city',
    key: string,
    anchor: HTMLElement,
    defaultLabel: string
  ) => {
    setI18nEditor({ anchorEl: anchor, kind, key, defaultLabel })
  }, [])

  const closeI18nEditor = useCallback(() => setI18nEditor(null), [])

  // Lookup current value cho editor based on kind+key
  const currentI18nValue: Record<string, string> | undefined = useMemo(() => {
    if (!i18nEditor) return undefined
    if (i18nEditor.kind === 'country') return i18nCountries[i18nEditor.key]
    if (i18nEditor.kind === 'region') return i18nRegions[i18nEditor.key]

    return i18nCities[i18nEditor.key]
  }, [i18nEditor, i18nCountries, i18nRegions, i18nCities])

  // Save từ editor → dispatch theo kind
  const saveI18n = useCallback((next: Record<string, string> | undefined) => {
    if (!i18nEditor) return
    const { kind, key } = i18nEditor
    const update = (prev: Record<string, Record<string, string>>) => {
      const n = { ...prev }
      if (next) n[key] = next; else delete n[key]

      return n
    }
    if (kind === 'country') setI18nCountries(update)
    else if (kind === 'region') setI18nRegions(update)
    else setI18nCities(update)
    closeI18nEditor()
  }, [i18nEditor, closeI18nEditor])

  // ─── Toggle handlers (useCallback để memo row không re-render) ───
  const toggleCountry = useCallback((code: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
        setSelectedRegions(p => { const c = { ...p }; delete c[code]; return c })
        setSelectedCities(p => {
          const c = { ...p }
          ;(regionsByCountry[code] || []).forEach(rn => delete c[rn])

          return c
        })
      } else {
        next.add(code)
      }

      return next
    })
  }, [regionsByCountry])

  const toggleExpandCountry = useCallback((code: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
        fetchRegions(code)
      }

      return next
    })
  }, [fetchRegions])

  const toggleRegion = useCallback((countryCode: string, regionName: string) => {
    setSelectedRegions(prev => {
      const next = { ...prev }
      const set = new Set(next[countryCode] || [])
      if (set.has(regionName)) {
        set.delete(regionName)
        setSelectedCities(p => { const c = { ...p }; delete c[regionName]; return c })
      } else {
        set.add(regionName)
      }
      next[countryCode] = set

      return next
    })
  }, [])

  const toggleExpandRegion = useCallback((countryCode: string, regionName: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      if (next.has(regionName)) {
        next.delete(regionName)
      } else {
        next.add(regionName)
        fetchCities(countryCode, regionName)
      }

      return next
    })
  }, [fetchCities])

  const toggleCity = useCallback((regionName: string, cityName: string) => {
    setSelectedCities(prev => {
      const next = { ...prev }
      const set = new Set(next[regionName] || [])
      if (set.has(cityName)) {
        set.delete(cityName)
      } else {
        set.add(cityName)
      }
      next[regionName] = set

      return next
    })
  }, [])

  // Bulk: chọn/bỏ tất cả region của 1 country
  const selectAllRegions = useCallback((countryCode: string, regionNames: string[]) => {
    setSelectedRegions(prev => {
      const next = { ...prev }
      const current = new Set(next[countryCode] || [])
      const allSelected = regionNames.length > 0 && regionNames.every(rn => current.has(rn))
      if (allSelected) {
        next[countryCode] = new Set()
        // cascade clear cities
        setSelectedCities(p => {
          const c = { ...p }
          regionNames.forEach(rn => delete c[rn])

          return c
        })
      } else {
        next[countryCode] = new Set(regionNames)
      }

      return next
    })
  }, [])

  // Bulk: chọn/bỏ tất cả city của 1 region
  const selectAllCities = useCallback((regionName: string, cityNames: string[]) => {
    setSelectedCities(prev => {
      const next = { ...prev }
      const current = new Set(next[regionName] || [])
      const allSelected = cityNames.length > 0 && cityNames.every(cn => current.has(cn))
      next[regionName] = allSelected ? new Set() : new Set(cityNames)

      return next
    })
  }, [])

  // ─── Refresh từ NCC: invalidate cache + reset local + refetch ───
  // Khi NCC thêm/đổi country/region/city, admin cần force pull lại data tươi.
  // Cache 24h/1h tốt cho UX nhưng cần nút này để override khi cần.
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (!slug || refreshing) return
    setRefreshing(true)
    try {
      // 1. Clear localStorage persist toàn bộ keys của slug này (countries + regions + cities)
      residentialAdminPersist.clearAll(slug)
      // 2. Invalidate Tanstack cache
      await queryClient.invalidateQueries({ queryKey: ['residential-admin', slug] })
      // 3. Reset local render cache + collapse all (tránh fetch storm các region/city đã expand)
      setRegionsByCountry({})
      setCitiesByRegion({})
      setExpandedCountries(new Set())
      setExpandedRegions(new Set())
      // useResidentialCountries tự refetch (invalidated + enabled=true) → save lại localStorage
    } catch (e: any) {
      toast.error('Làm mới lỗi: ' + (e?.message || 'unknown'))
    } finally {
      setRefreshing(false)
    }
  }, [slug, refreshing, queryClient])

  // ─── Filter + zone split ───
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return allCountries
    const q = search.toLowerCase()

    return allCountries.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [allCountries, search])

  const { selectedZone, otherZone } = useMemo(() => {
    const sel: Country[] = []
    const oth: Country[] = []
    filteredCountries.forEach(c => {
      if (selectedCountries.has(c.code.toLowerCase())) sel.push(c)
      else oth.push(c)
    })

    return { selectedZone: sel, otherZone: oth }
  }, [filteredCountries, selectedCountries])

  // Counter
  const countryCount = selectedCountries.size
  const regionCount = Object.values(selectedRegions).reduce((s, set) => s + set.size, 0)
  const cityCount = Object.values(selectedCities).reduce((s, set) => s + set.size, 0)

  const handleSave = () => {
    if (countryCount === 0) {
      toast.error('Phải chọn ít nhất 1 country')

      return
    }

    const countries: LeafOption[] = Array.from(selectedCountries).map(code => {
      const c = allCountries.find(x => x.code.toLowerCase() === code)
      const entry: LeafOption = { key: code, label: c?.name || code.toUpperCase(), flag: code }
      if (i18nCountries[code]) entry.label_i18n = i18nCountries[code]

      return entry
    })

    const regions: Record<string, LeafOption[]> = {}
    Object.entries(selectedRegions).forEach(([cc, set]) => {
      if (set.size === 0) return
      regions[cc] = Array.from(set).map(name => {
        const entry: LeafOption = { key: name, label: name }
        const i18n = i18nRegions[`${cc}:${name}`]
        if (i18n) entry.label_i18n = i18n

        return entry
      })
    })

    const cities: Record<string, LeafOption[]> = {}
    Object.entries(selectedCities).forEach(([rn, set]) => {
      if (set.size === 0) return
      cities[rn] = Array.from(set).map(name => {
        const entry: LeafOption = { key: name, label: name }
        const i18n = i18nCities[`${rn}:${name}`]
        if (i18n) entry.label_i18n = i18n

        return entry
      })
    })

    onSave({ countries, regions, cities })
    onClose()
  }

  // Helper render 1 country row (DRY giữa 2 zone)
  const renderCountry = (country: Country) => {
    const code = country.code.toLowerCase()

    return (
      <CountryRow
        key={code}
        country={country}
        selected={selectedCountries.has(code)}
        expanded={expandedCountries.has(code)}
        regionList={regionsByCountry[code]}
        selectedRegions={selectedRegions[code]}
        selectedCities={selectedCities}
        expandedRegions={expandedRegions}
        citiesByRegion={citiesByRegion}
        loadingRegions={loadingRegions.has(code)}
        loadingCitiesSet={loadingCities}
        onRefreshRegions={refreshRegionsForCountry}
        onRefreshCities={refreshCitiesForRegion}
        onToggleSelect={toggleCountry}
        onToggleExpand={toggleExpandCountry}
        onToggleRegion={toggleRegion}
        onToggleExpandRegion={toggleExpandRegion}
        onToggleCity={toggleCity}
        onSelectAllRegions={selectAllRegions}
        onSelectAllCities={selectAllCities}
        i18nValue={i18nCountries[code]}
        regionsI18n={i18nRegions}
        citiesI18n={i18nCities}
        onOpenI18n={openI18nEditor}
      />
    )
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md' PaperProps={{ sx: { borderRadius: 2 } }}>
      <Box sx={SX.dialogTitle}>
        <Box>
          <Typography fontWeight={700} fontSize={15}>🌍 Cấu hình vị trí</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            <Badge variant='primary' compact>{countryCount} country</Badge>
            {(regionCount > 0 || cityCount > 0) && (
              <Badge variant='success' compact>{regionCount}R · {cityCount}C</Badge>
            )}
          </Box>
        </Box>
        <Stack direction='row' spacing={0.5}>
          <IconButton
            size='small'
            onClick={handleRefresh}
            disabled={refreshing || !slug}
            title='Làm mới country / region / city từ NCC (bỏ qua cache)'
            sx={{
              color: C.textSub,
              '&:hover': { color: C.primary, background: C.primarySoft }
            }}
          >
            <Box sx={{
              display: 'inline-flex',
              transition: 'transform 0.6s',
              animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
              '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } }
            }}>
              <RefreshCw size={15} />
            </Box>
          </IconButton>
          <IconButton size='small' onClick={onClose}><X size={16} /></IconButton>
        </Stack>
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search */}
        <Box sx={SX.searchBar}>
          <TextField
            size='small' fullWidth value={search} onChange={e => setSearch(e.target.value)}
            placeholder='Tìm country theo tên / code...'
            InputProps={{ startAdornment: <InputAdornment position='start'><Search size={14} /></InputAdornment> }}
          />
        </Box>

        {/* Tree với 2 zone */}
        <Box sx={{ maxHeight: 520, overflow: 'auto' }}>
          {loadingCountries && allCountries.length === 0 ? (
            <Box sx={SX.emptyState}><CircularProgress size={28} /></Box>
          ) : filteredCountries.length === 0 ? (
            <Box sx={SX.emptyState}>Không có country nào khớp</Box>
          ) : (
            <>
              {/* Zone ĐÃ CHỌN */}
              {selectedZone.length > 0 && (
                <>
                  <Box sx={SX.zoneHeader}>
                    <Box component='span' sx={{ color: C.primary, fontSize: 12 }}>◆</Box>
                    Đã chọn ({selectedZone.length})
                  </Box>
                  <Box sx={{ p: 0.5 }}>{selectedZone.map(renderCountry)}</Box>
                </>
              )}

              {/* Zone COUNTRY KHÁC */}
              {otherZone.length > 0 && (
                <>
                  <Box sx={SX.zoneHeader}>
                    <Box component='span' sx={{ color: C.textFaint, fontSize: 12 }}>◇</Box>
                    Country khác ({otherZone.length}{search ? ` khớp` : ''})
                  </Box>
                  <Box sx={{ p: 0.5 }}>{otherZone.map(renderCountry)}</Box>
                </>
              )}
            </>
          )}
        </Box>
      </DialogContent>

      <Box sx={SX.dialogActions}>
        <Typography variant='caption' color='text.secondary' sx={{ fontSize: 11 }}>
          Tip: tick country để chọn cả NCC region/city; mở rộng để chọn riêng từng cấp.
        </Typography>
        <Stack direction='row' spacing={1}>
          <Button size='small' onClick={onClose}>Huỷ</Button>
          <Button
            variant='contained' size='small' onClick={handleSave} disabled={countryCount === 0}
            sx={{ background: C.primary, '&:hover': { background: '#4f46e5' } }}
          >
            💾 Lưu {countryCount}C · {regionCount}R · {cityCount}Ci
          </Button>
        </Stack>
      </Box>

      {/* I18n editor — 1 popover singleton cho mọi country/region/city. Khi đóng, state reset. */}
      <I18nEditorPopover
        editor={i18nEditor}
        currentValue={currentI18nValue}
        onClose={closeI18nEditor}
        onSave={saveI18n}
      />
    </Dialog>
  )
}

/**
 * Popover singleton — duy nhất 1 instance trong Modal, anchor động theo state.
 * Local edit state mode + edits, reset khi state.editor đổi key.
 */
function I18nEditorPopover({
  editor, currentValue, onClose, onSave
}: {
  editor: { anchorEl: HTMLElement; kind: string; key: string; defaultLabel: string } | null
  currentValue?: Record<string, string>
  onClose: () => void
  onSave: (next: Record<string, string> | undefined) => void
}) {
  const isCustomInitial = !!currentValue && Object.values(currentValue).some(v => v?.trim())
  const [mode, setMode] = useState<'auto' | 'custom'>(isCustomInitial ? 'custom' : 'auto')
  const [edits, setEdits] = useState<Record<string, string>>(currentValue || {})
  const editorKey = editor ? `${editor.kind}:${editor.key}` : ''

  // Reset khi editor đổi (mở row khác)
  useEffect(() => {
    if (!editor) return
    setMode(isCustomInitial ? 'custom' : 'auto')
    setEdits(currentValue || {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey])

  const handleSave = useCallback(() => {
    if (mode === 'auto') { onSave(undefined); return }
    const filtered: Record<string, string> = {}
    Object.entries(edits).forEach(([k, v]) => { if (typeof v === 'string' && v.trim()) filtered[k] = v.trim() })
    onSave(Object.keys(filtered).length > 0 ? filtered : undefined)
  }, [mode, edits, onSave])

  if (!editor) return null

  return (
    <Popover
      open={!!editor} anchorEl={editor.anchorEl} onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { width: 280, p: 1.5, borderRadius: 2 } } }}
    >
      <Typography fontSize={12} fontWeight={600} sx={{ mb: 1, color: C.text }}>
        Tên hiển thị cho "{editor.defaultLabel}"
      </Typography>
      <Stack spacing={0.5} sx={{ mb: 1.25 }}>
        <Box component='label' sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', fontSize: 12 }}>
          <input type='radio' checked={mode === 'auto'} onChange={() => setMode('auto')} style={{ margin: 0 }} />
          <span><strong>Giống nhau</strong> — dùng "{editor.defaultLabel}" cho mọi ngôn ngữ</span>
        </Box>
        <Box component='label' sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', fontSize: 12 }}>
          <input type='radio' checked={mode === 'custom'} onChange={() => setMode('custom')} style={{ margin: 0 }} />
          <span><strong>Custom</strong> — nhập riêng từng ngôn ngữ</span>
        </Box>
      </Stack>
      {mode === 'custom' && (
        <Stack spacing={0.75} sx={{ mb: 1.25 }}>
          {I18N_LOCALES.map(loc => (
            <Box key={loc.code} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ width: 48, fontSize: 11, color: C.textSub }}>{loc.flag} {loc.label}</Typography>
              <TextField
                size='small' fullWidth placeholder={editor.defaultLabel}
                value={edits[loc.code] || ''}
                onChange={e => setEdits(prev => ({ ...prev, [loc.code]: e.target.value }))}
                inputProps={{ style: { fontSize: 12, padding: '4px 8px' } }}
              />
            </Box>
          ))}
        </Stack>
      )}
      <Stack direction='row' spacing={1} justifyContent='flex-end'>
        <Button size='small' onClick={onClose} sx={{ fontSize: 11.5 }}>Huỷ</Button>
        <Button size='small' variant='contained' onClick={handleSave}
          sx={{ background: C.primary, fontSize: 11.5, '&:hover': { background: '#4f46e5' } }}>
          Lưu
        </Button>
      </Stack>
    </Popover>
  )
}

export { EMPTY_VALUE }
