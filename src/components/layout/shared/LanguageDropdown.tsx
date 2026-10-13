'use client'

// React Imports
import { useRef, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { usePathname, useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// MUI Imports
import IconButton from '@mui/material/IconButton'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import MenuItem from '@mui/material/MenuItem'
import ListSubheader from '@mui/material/ListSubheader'
import Divider from '@mui/material/Divider'

// Type Imports
import { Box } from '@mui/material'

import type { Locale } from '@/configs/configi18n'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import { useLanguageSync } from '@/hooks/useLanguageSync'
import { useBranding } from '@/app/contexts/BrandingContext'
import { DANH_SACH_TIEN_TE, useTienTe } from '@/app/contexts/TienTeContext'

// Flags
import flagEn from '@/../public/images/flags/united-states-of-america.png'
import flagCh from '@/../public/images/flags/china.png'
import flagVi from '@/../public/images/flags/vietnam.png'

type LanguageDataType = {
  langCode: Locale
  langName: string
  flag: any
}

const getLocalePath = (pathName: string, locale: string) => {
  if (!pathName) return '/'
  const segments = pathName.split('/')

  segments[1] = locale

  return segments.join('/')
}

const NHAN_MUC: Record<string, { ngonNgu: string; tienTe: string }> = {
  vi: { ngonNgu: 'Ngôn ngữ', tienTe: 'Tiền tệ' },
  en: { ngonNgu: 'Language', tienTe: 'Currency' },
  cn: { ngonNgu: '语言', tienTe: '货币' }
}

// Vars
const languageData: LanguageDataType[] = [
  {
    langCode: 'vi',
    langName: 'Tiếng Việt',
    flag: flagVi
  },
  {
    langCode: 'en',
    langName: 'English',
    flag: flagEn
  },
  {
    langCode: 'cn',
    langName: '中文',
    flag: flagCh
  }
]

const LanguageDropdown = () => {
  // States
  const [open, setOpen] = useState(false)

  // Refs
  const anchorRef = useRef<HTMLButtonElement>(null)

  // Hooks
  const pathName = usePathname()
  const { settings } = useSettings()
  const { lang } = useParams()
  
  // Sync i18n với URL language
  useLanguageSync()
  const { primaryHover } = useBranding()
  const { tienTe, coTheChon, datTienTe } = useTienTe()
  const nhan = NHAN_MUC[String(lang)] ?? NHAN_MUC.vi

  // Đổi ngôn ngữ giữ nguyên `?tab=...` (tab đang xem không bị mất).
  const query = useSearchParams()?.toString() ?? ''

  const handleClose = () => {
    setOpen(false)
  }

  const handleToggle = () => {
    setOpen(prevOpen => !prevOpen)
  }

  const currentLanguage = languageData.find(locale => locale.langCode === lang)

  return (
    <>
      <Box
        ref={anchorRef}
        onClick={handleToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          height: 32,
          borderRadius: '50px',
          border: `1.5px solid ${primaryHover}30`,
          padding: '4px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: `${primaryHover}70`,
            bgcolor: `${primaryHover}14`,
          }
        }}
      >
        {currentLanguage ? (
          <>
            <Image
              src={currentLanguage.flag}
              alt={currentLanguage.langName}
              width={18}
              height={18}
              className='rounded-full'
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase' }}>
              {currentLanguage.langCode}
              {coTheChon.length > 1 && ` · ${DANH_SACH_TIEN_TE.find(c => c.ma === tienTe)?.kyHieu ?? ''}`}
            </span>
          </>
        ) : (
          <i className='tabler-language' />
        )}
      </Box>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-start'
        anchorEl={anchorRef.current}
        className='min-is-[160px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{ transformOrigin: placement === 'bottom-start' ? 'left top' : 'right top' }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList onKeyDown={handleClose}>
                  <ListSubheader sx={{ lineHeight: '28px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {nhan.ngonNgu}
                  </ListSubheader>
                  {languageData.map(locale => (
                    <MenuItem
                      key={locale.langCode}
                      component={Link}
                      href={getLocalePath(pathName, locale.langCode) + (query ? `?${query}` : '')}
                      scroll={false}
                      onClick={handleClose}
                      selected={lang === locale.langCode}
                    >
                      <div>
                        <Image className='me-2' src={locale.flag} width={20} height={20} alt='Picture of the author' />
                        {locale.langName}
                      </div>
                    </MenuItem>
                  ))}

                  {/* Tiền tệ HIỂN THỊ — ví/tính tiền vẫn VNĐ (xem TienTeContext). Chỉ hiện loại admin đã đặt tỷ giá. */}
                  {coTheChon.length > 1 && <Divider sx={{ my: 0.5 }} />}
                  {coTheChon.length > 1 && (
                    <ListSubheader sx={{ lineHeight: '28px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      {nhan.tienTe}
                    </ListSubheader>
                  )}
                  {coTheChon.length > 1 &&
                    DANH_SACH_TIEN_TE.filter(c => coTheChon.includes(c.ma)).map(c => (
                      <MenuItem
                        key={c.ma}
                        selected={tienTe === c.ma}
                        onClick={() => {
                          datTienTe(c.ma)
                          handleClose()
                        }}
                      >
                        <Box component='span' sx={{ width: 20, me: 1, fontWeight: 700, textAlign: 'center' }}>
                          {c.kyHieu}
                        </Box>
                        {c.ma} · {c.ten}
                      </MenuItem>
                    ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default LanguageDropdown
