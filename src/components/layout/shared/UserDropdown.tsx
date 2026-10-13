'use client'

// React Imports
import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { useRouter, useParams } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

import { signOut, useSession } from 'next-auth/react'

import { ChevronDown, User, LogOut, Wallet, Settings, CreditCard } from 'lucide-react'

import { useDispatch, useSelector } from 'react-redux'

import { useSettings } from '@core/hooks/useSettings'
import { clearUser } from '@/store/userSlice'
import type { RootState } from '@/store'

import { useBranding } from '@/app/contexts/BrandingContext'
import { useTienTe } from '@/app/contexts/TienTeContext'

import ConfirmDialog from '@components/confirm-modal/ConfirmDialog'

import UserProfileModal from '@/components/modals/UserProfileModal'

const UserDropdown = () => {
  const [open, setOpen] = useState(false)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const anchorRef = useRef<HTMLDivElement>(null)

  const session = useSession()
  const params = useParams()
  const lang = params.lang || 'vi'

  const router = useRouter()
  const dispatch = useDispatch()

  const { settings } = useSettings()
  const { primaryHover } = useBranding()

  const user = session?.data?.user as any
  const userName = user?.name || 'User'
  const userEmail = user?.email || ''
  const userAvatar = user?.avatar || ''
  const userRole = user?.role

  // Balance lấy từ Redux — cùng nguồn với sidebar BalanceCard (đồng bộ)
  const { sodu } = useSelector((state: RootState) => state.user)
  const userBalance = sodu
  const { hien } = useTienTe()

  const handleDropdownOpen = () => {
    setOpen(prev => !prev)
  }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(url)
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  const handleNavigate = (path: string) => {
    router.push(`/${lang}/${path}`)
    setOpen(false)
  }

  const handleConfirmLogout = async () => {
    setOpenConfirm(false)

    try {
      dispatch(clearUser())

      await signOut({
        redirect: false,
        callbackUrl: `/${lang}/proxy-tinh`
      })

      window.location.href = `/${lang}/proxy-tinh`
    } catch (error) {
      dispatch(clearUser())
      window.location.href = `/${lang}/proxy-tinh`
    }
  }

  // Lấy chữ cái đầu cho avatar fallback
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      {/* ═══ Trigger ═══ */}
      <Box
        ref={anchorRef}
        onClick={handleDropdownOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: '5px', lg: '8px' },
          cursor: 'pointer',
          padding: { xs: '2px 8px 2px 2px', lg: '4px 10px 4px 4px' },
          height: { xs: 32, lg: 'auto' },
          borderRadius: '50px',
          bgcolor: open ? `${primaryHover}18` : `${primaryHover}08`,
          border: '1.5px solid',
          borderColor: open ? primaryHover : `${primaryHover}25`,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: `${primaryHover}70`,
            bgcolor: `${primaryHover}14`,
          },
        }}
      >
        {/* Avatar */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Avatar
            alt={userName}
            src={userAvatar}
            sx={{
              width: { xs: 24, lg: 34 },
              height: { xs: 24, lg: 34 },
              fontSize: { xs: '0.6rem', lg: '0.85rem' },
              fontWeight: 700,
              bgcolor: primaryHover,
              color: '#fff',
            }}
          >
            {initials}
          </Avatar>
          <Box
            sx={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: { xs: 7, lg: 9 },
              height: { xs: 7, lg: 9 },
              bgcolor: '#22c55e',
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: 'background.paper',
            }}
          />
        </Box>

        {/* Mobile: tên ngắn */}
        <Typography sx={{ display: { xs: 'block', lg: 'none' }, fontSize: '0.7rem', fontWeight: 600, color: 'text.primary', maxWidth: 55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
          {userName.split(' ').pop()}
        </Typography>

        {/* Tên + số dư */}
        <Box sx={{ display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', minWidth: 0, maxWidth: 130 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              lineHeight: 1.3,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userName}
          </Typography>
          {userBalance !== undefined && (
            <Typography sx={{ fontSize: '0.7rem', lineHeight: 1.2, fontWeight: 700, color: primaryHover }}>
              {hien(userBalance)}
            </Typography>
          )}
        </Box>

        {/* Chevron chỉ desktop */}
        <Box sx={{ display: { xs: 'none', lg: 'flex' }, flexShrink: 0 }}>
          <ChevronDown
            size={15}
            style={{
              color: primaryHover,
              transition: 'transform 0.25s ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: 0.7,
            }}
          />
        </Box>
      </Box>

      {/* ═══ Dropdown ═══ */}
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='!mbs-2 z-[1]'
        sx={{ width: 280 }}
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}
          >
            <Paper
              className={settings.skin === 'bordered' ? 'border shadow-none' : ''}
              sx={{
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList sx={{ py: 0 }}>
                  {/* Header — user info */}
                  <Box
                    sx={{
                      px: 2.5,
                      pt: 2.5,
                      pb: 2,
                      background: `linear-gradient(135deg, ${primaryHover}08 0%, ${primaryHover}04 100%)`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar
                          alt={userName}
                          src={userAvatar}
                          sx={{
                            width: 44,
                            height: 44,
                            fontSize: '1rem',
                            fontWeight: 700,
                            bgcolor: primaryHover,
                            color: '#fff',
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 12,
                            height: 12,
                            bgcolor: '#22c55e',
                            borderRadius: '50%',
                            border: '2.5px solid',
                            borderColor: 'background.paper',
                          }}
                        />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', lineHeight: 1.3 }}>
                          {userName}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {userEmail}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Số dư card */}
                  {userBalance !== undefined && (
                    <Box sx={{ px: 1.5, pt: 1 }}>
                      <Box
                        onClick={() => handleNavigate('recharge')}
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderRadius: '12px',
                          background: `linear-gradient(135deg, ${primaryHover} 0%, ${primaryHover}CC 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            opacity: 0.9,
                            transform: 'translateY(-1px)',
                            boxShadow: `0 4px 12px ${primaryHover}40`,
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Wallet size={16} color='#fff' />
                          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                            Số dư
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                          {hien(userBalance)}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Menu items */}
                  <Box sx={{ px: 1, py: 1 }}>
                    <MenuItem
                      sx={{
                        borderRadius: '10px',
                        gap: 1.5,
                        py: 1,
                        px: 1.5,
                        '&:hover': {
                          bgcolor: `${primaryHover}0A`,
                        },
                      }}
                      onClick={() => handleNavigate('profile')}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          bgcolor: `${primaryHover}12`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <User size={16} style={{ color: primaryHover }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'text.primary' }}>
                          Tài khoản
                        </Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>
                          Thông tin cá nhân
                        </Typography>
                      </Box>
                    </MenuItem>

                    <MenuItem
                      sx={{
                        borderRadius: '10px',
                        gap: 1.5,
                        py: 1,
                        px: 1.5,
                        '&:hover': {
                          bgcolor: `${primaryHover}0A`,
                        },
                      }}
                      onClick={() => handleNavigate('recharge')}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          bgcolor: '#f0fdf4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CreditCard size={16} style={{ color: '#16a34a' }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'text.primary' }}>
                          Nạp tiền
                        </Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>
                          Nạp số dư tài khoản
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Box>

                  {/* Logout */}
                  <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                      <Button
                        fullWidth
                        size='small'
                        startIcon={<LogOut size={15} />}
                        onClick={() => setOpenConfirm(true)}
                        sx={{
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontWeight: 500,
                          color: 'text.secondary',
                          justifyContent: 'flex-start',
                          px: 1.5,
                          '&:hover': {
                            bgcolor: '#fef2f2',
                            color: '#dc2626',
                          },
                        }}
                      >
                        Đăng xuất
                      </Button>
                    </Box>
                  </Box>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleConfirmLogout}
        title='Xác nhận đăng xuất'
        confirmText='Đăng xuất'
        cancelText='Hủy bỏ'
      >
        Bạn có chắc chắn muốn kết thúc phiên làm việc và đăng xuất khỏi tài khoản này không?
      </ConfirmDialog>

      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  )
}

export default UserDropdown
