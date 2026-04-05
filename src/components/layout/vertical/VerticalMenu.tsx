import { useState, useEffect, useMemo, useCallback } from 'react'

import { useParams, usePathname } from 'next/navigation'

import {
  ChartColumn,
  RotateCw,
  CircleSmall,
  House,
  ShoppingBag,
  History,
  ClipboardList,
  FileText,
  MessageCircleQuestionMark,
  Handshake,
  Link,
  Wallet,
  EthernetPort,
  Key,

  // Admin icons
  Users,
  BarChart3,
  Megaphone,
  Settings,
  LifeBuoy,
  Landmark,
  ShoppingCart,
  Activity
} from 'lucide-react'

// MUI Imports
import { useTheme } from '@mui/material/styles'
import PerfectScrollbar from 'react-perfect-scrollbar'

import { menuClasses } from '@menu/utils/menuClasses'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem, MenuSection, SubMenu } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

// App Imports
import { useRole } from '@/hooks/useRole'
import { useBranding } from '@/app/contexts/BrandingContext'
import BalanceCard from '@/app/[lang]/(private)/(client)/components/wallet/BalanceCard'
import { TransactionHistory } from '@/components/icons'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  dictionary?: any
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

// =================================================================
// Các hằng số và styles
// =================================================================
const colors = {
  textDefault: 'var(--mui-palette-text-primary, #2d3748)',
  textHover: 'var(--mui-palette-primary-main, #FC4336)',
  textMuted: '#a0aec0',
  bgHover: 'var(--mui-palette-action-hover, rgba(0,0,0,0.04))',
  iconHoverSpecial: 'var(--mui-palette-primary-main, #FC4336)',
  textActive: 'var(--primary-contrast, #ffffff)',
  bgActive: 'var(--primary-gradient)'
}

const fontSizes = {
  label: '14px',
  menuItem: '12px'
}

const activeMenuItemStyles = {
  ['.' + menuClasses.button]: {
    background: `${colors.bgActive} !important`,
    color: `${colors.textActive} !important`,
    borderRadius: '10px !important',
    overflow: 'hidden',

    [`&.${menuClasses.active}`]: {
      background: `${colors.bgActive} !important`,
      color: `${colors.textActive} !important`,
      borderRadius: '10px !important',
    },
    '&:hover': {
      background: `${colors.bgActive} !important`,
      opacity: 0.9,
      color: `${colors.textActive} !important`
    },

    // Ẩn ripple/shadow mặc định MUI
    '&::after, &::before': {
      display: 'none !important',
    },
    '& .MuiTouchRipple-root': {
      display: 'none',
    },
    boxShadow: 'none !important',
  },
  ['.' + menuClasses.icon]: {
    color: `${colors.textActive} !important`
  },

  [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active}`]: {
    background: `${colors.bgActive} !important`,
    color: `${colors.textActive} !important`,
    borderRadius: '10px !important',
  },
  [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active} .${menuClasses.icon}`]: {
    color: `${colors.textActive} !important`
  }
}

const baseButtonStyles = {
  ['.' + menuClasses.button]: {
    width: '100%',
    color: `${colors.textDefault} !important`,
    fontSize: fontSizes.label,
    '&:hover': {
      background: `${colors.bgHover} !important`,
      color: `${colors.textHover} !important`
    },

    [`&.${menuClasses.active}`]: {
      background: 'transparent !important',
      color: `${colors.textDefault} !important`,
      boxShadow: 'none !important'
    }
  },

  [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active}`]: {
    background: 'transparent !important',
    color: `${colors.textDefault} !important`,
    boxShadow: 'none !important'
  },
  [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active} .${menuClasses.icon}`]: {
    color: `${colors.textDefault} !important`
  }
}

// =================================================================
// Bắt đầu Component
// =================================================================
const VerticalMenu = ({ scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const pathname = usePathname()
  const params = useParams()
  const { lang: locale } = params
  const { isAdmin, isLoading: isAdminLoading, hasPermission } = useRole()
  const { isChild, menu_labels } = useBranding()
  const ml = (menu_labels || {}) as Record<string, string>

  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    setIsInitialLoad(false)
  }, [])

  const activePath = pathname

  // Vars
  const { isBreakpointReached, transitionDuration, isCollapsed, isHovered } = verticalNavOptions
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar
  const isWalletVisible = !isCollapsed || (isHovered ?? false)
  const collapsedNotHovered = isCollapsed && !isHovered

  // Dynamic styles — react to collapsed state
  const baseMenuItemStyles = useMemo(() => ({
    ...baseButtonStyles,
    ['.' + menuClasses.button]: {
      ...baseButtonStyles['.' + menuClasses.button],
      ...(collapsedNotHovered && {
        justifyContent: 'center',
        paddingInline: '0 !important'
      })
    },
    ['.' + menuClasses.label]: {
      marginTop: '2px',
      ...(collapsedNotHovered && {
        opacity: 0,
        width: 0,
        overflow: 'hidden'
      })
    }
  }), [collapsedNotHovered])

  const mergedActiveStyles = useMemo(() => ({
    ...baseMenuItemStyles,
    ...(collapsedNotHovered
      ? {
          ['.' + menuClasses.button]: {
            ...baseMenuItemStyles['.' + menuClasses.button],
            [`&.${menuClasses.active}`]: {
              background: 'transparent !important',
              color: `${colors.iconHoverSpecial} !important`,
              boxShadow: 'none !important'
            }
          },
          [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active}`]: {
            background: 'transparent !important',
            color: `${colors.iconHoverSpecial} !important`
          },
          [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active} .${menuClasses.icon}`]: {
            color: `${colors.iconHoverSpecial} !important`
          }
        }
      : activeMenuItemStyles)
  }), [baseMenuItemStyles, collapsedNotHovered])

  const menuSectionHeaderStyles = useMemo(() => ({
    fontSize: fontSizes.label,
    fontWeight: 600,
    color: colors.textMuted,
    padding: '0',
    marginBottom: collapsedNotHovered ? '0' : '1rem',
    ...(collapsedNotHovered && {
      [`& .${menuClasses.menuSectionContent}`]: {
        paddingBlock: '4px !important',
        marginBlockStart: '4px',
        '&:before': {
          content: 'none'
        }
      }
    })
  }), [collapsedNotHovered])

  // Memoize theme styles — avoids recalculation when unrelated state changes
  const themeMenuItemStyles = useMemo(() => menuItemStyles(verticalNavOptions, theme), [verticalNavOptions, theme])
  const themeMenuSectionStyles = useMemo(() => menuSectionStyles(verticalNavOptions, theme), [verticalNavOptions, theme])

  const getMenuItemStyles = useCallback((path: string) => {
    const fullPath = `/${locale}/${path}`

    return activePath === fullPath ? mergedActiveStyles : baseMenuItemStyles
  }, [locale, activePath, mergedActiveStyles, baseMenuItemStyles])

  // Helper: tạo props cho MenuItem — dùng href native, Next.js tự handle navigation
  const nav = useCallback((path: string) => ({
    rootStyles: getMenuItemStyles(path),
  }), [getMenuItemStyles])

  return (
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Wallet Section */}
      <BalanceCard isInitialLoad={isInitialLoad} isWalletVisible={isWalletVisible} />

      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 23 }}
        menuItemStyles={themeMenuItemStyles}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <CircleSmall size={10} /> }}
        menuSectionStyles={themeMenuSectionStyles}
      >
        <MenuSection label={ml.home || 'Trang chủ'} rootStyles={menuSectionHeaderStyles}>
          <MenuItem
            icon={<House size={20} strokeWidth={1.5} />}
            {...nav('home')}
            href={`/${locale}/home`}
          >
            Home
          </MenuItem>
        </MenuSection>

        <MenuSection label={ml.products || 'Sản phẩm'} rootStyles={menuSectionHeaderStyles}>
          <MenuItem
            icon={<EthernetPort size={20} strokeWidth={1.5} />}
            {...nav('proxy-tinh')}
            href={`/${locale}/proxy-tinh`}
          >
            Proxy Tĩnh
          </MenuItem>

          <MenuItem
            icon={<RotateCw size={20} strokeWidth={1.5} />}
            {...nav('proxy-xoay')}
            href={`/${locale}/proxy-xoay`}
          >
            Proxy Xoay
          </MenuItem>

          <MenuItem
            icon={<ShoppingBag size={20} strokeWidth={1.5} />}
            {...nav('check-proxy')}
            href={`/${locale}/check-proxy`}
          >
            Check Proxy
          </MenuItem>
        </MenuSection>

        <MenuSection label='Đơn hàng' rootStyles={menuSectionHeaderStyles}>
          <MenuItem
            icon={<ClipboardList size={20} strokeWidth={1.5} />}
            {...nav('history-order')}
            href={`/${locale}/history-order`}
          >
            Đơn hàng của tôi
          </MenuItem>
          <MenuItem
            icon={<Key size={20} strokeWidth={1.5} />}
            {...nav('order-items')}
            href={`/${locale}/order-items`}
          >
            Danh sách proxy
          </MenuItem>
        </MenuSection>

        <MenuSection label={ml.finance || 'Tài chính'} rootStyles={menuSectionHeaderStyles}>
          <MenuItem
            icon={<Wallet size={20} strokeWidth={1.5} />}
            {...nav('recharge')}
            href={`/${locale}/recharge`}
          >
            Nạp tiền
          </MenuItem>

          <MenuItem
            icon={<FileText size={20} strokeWidth={1.5} />}
            {...nav('transaction-history')}
            href={`/${locale}/transaction-history`}
          >
            Lịch sử giao dịch
          </MenuItem>
        </MenuSection>

        <MenuSection label={ml.earn || 'Kiếm tiền'} rootStyles={menuSectionHeaderStyles}>
          <MenuItem
            icon={<Link size={20} strokeWidth={1.5} />}
            {...nav('affiliate')}
            href={`/${locale}/affiliate`}
          >
            Tiếp thị liên kết
          </MenuItem>

          <MenuItem
            icon={<Handshake size={20} strokeWidth={1.5} />}
            {...nav('partner')}
            href={`/${locale}/partner`}
          >
            Đối tác
          </MenuItem>
        </MenuSection>

        <MenuSection label={ml.support || 'Hỗ trợ'} rootStyles={menuSectionHeaderStyles}>
          <MenuItem
            icon={<FileText size={20} strokeWidth={1.5} />}
            rootStyles={getMenuItemStyles('docs-api')}
            href={`/${locale}/docs-api`}
          >
            API Docs
          </MenuItem>
          <MenuItem
            icon={<LifeBuoy size={20} strokeWidth={1.5} />}
            {...nav('support-tickets')}
            href={`/${locale}/support-tickets`}
          >
            Ticket Hỗ trợ
          </MenuItem>
          <MenuItem
            icon={<MessageCircleQuestionMark size={20} strokeWidth={1.5} />}
            {...nav('contact')}
            href={`/${locale}/contact`}
          >
            Liên hệ
          </MenuItem>
        </MenuSection>

        {/* Admin Menu Section */}
        {!isAdminLoading && isAdmin && (
          <MenuSection label={ml.admin || 'Quản trị'} rootStyles={menuSectionHeaderStyles}>
            {/* Tổng quan */}
            {hasPermission('admin.dashboard') && (
              <MenuItem
                icon={<BarChart3 size={20} strokeWidth={1.5} />}
                {...nav('admin/dashboard')}
                href={`/${locale}/admin/dashboard`}
              >
                Dashboard
              </MenuItem>
            )}

            {/* Sản phẩm & Đơn hàng */}
            {hasPermission('admin.serviceType') && (
              <MenuItem
                icon={<ShoppingBag size={20} strokeWidth={1.5} />}
                {...nav('admin/service-type')}
                href={`/${locale}/admin/service-type`}
              >
                Quản lý sản phẩm
              </MenuItem>
            )}
            {hasPermission('admin.provider') && !isChild && (
              <MenuItem
                icon={<Handshake size={20} strokeWidth={1.5} />}
                {...nav('admin/providers')}
                href={`/${locale}/admin/providers`}
              >
                Nhà cung cấp
              </MenuItem>
            )}
            {hasPermission('admin.provider') && (
              <MenuItem
                icon={<Handshake size={20} strokeWidth={1.5} />}
                {...nav('admin/partners')}
                href={`/${locale}/admin/partners`}
              >
                Đối tác
              </MenuItem>
            )}
            {hasPermission('admin.provider') && !isChild && (
              <MenuItem
                icon={<Users size={20} strokeWidth={1.5} />}
                {...nav('admin/resellers')}
                href={`/${locale}/admin/resellers`}
              >
                Quản lý Reseller
              </MenuItem>
            )}
            {hasPermission('admin.transactionHistory') && (
              <MenuItem
                icon={<ShoppingCart size={20} strokeWidth={1.5} />}
                {...nav('admin/orders')}
                href={`/${locale}/admin/orders`}
              >
                Quản lý đơn hàng
              </MenuItem>
            )}
            {hasPermission('admin.transactionHistory') && (
              <MenuItem
                icon={<Key size={20} strokeWidth={1.5} />}
                {...nav('admin/order-items')}
                href={`/${locale}/admin/order-items`}
              >
                Proxy Keys
              </MenuItem>
            )}

            {hasPermission('admin.transactionHistory') && !isChild && (
              <MenuItem
                icon={<Activity size={20} strokeWidth={1.5} />}
                {...nav('admin/queue-monitor')}
                href={`/${locale}/admin/queue-monitor`}
              >
                Queue Monitor
              </MenuItem>
            )}

            {/* Tài chính */}
            {hasPermission('admin.transactionHistory') && (
              <MenuItem
                icon={<TransactionHistory />}
                {...nav('admin/transaction-history')}
                href={`/${locale}/admin/transaction-history`}
              >
                Lịch sử giao dịch
              </MenuItem>
            )}
            {hasPermission('admin.depositHistory') && (
              <MenuItem
                icon={<Landmark size={20} strokeWidth={1.5} />}
                {...nav('admin/transaction-bank')}
                href={`/${locale}/admin/transaction-bank`}
              >
                Quản lý nạp tiền
              </MenuItem>
            )}

            {/* Người dùng & Hỗ trợ */}
            {hasPermission('admin.users') && (
              <MenuItem
                icon={<Users size={20} strokeWidth={1.5} />}
                {...nav('admin/users')}
                href={`/${locale}/admin/users`}
              >
                Người dùng
              </MenuItem>
            )}
            {hasPermission('admin.transactionHistory') && (
              <MenuItem
                icon={<LifeBuoy size={20} strokeWidth={1.5} />}
                {...nav('admin/support-tickets')}
                href={`/${locale}/admin/support-tickets`}
              >
                Tickets hỗ trợ
              </MenuItem>
            )}

            {/* Cài đặt */}
            {hasPermission('admin.announcements') && (
              <MenuItem
                icon={<Megaphone size={20} strokeWidth={1.5} />}
                {...nav('admin/announcements')}
                href={`/${locale}/admin/announcements`}
              >
                Thông báo
              </MenuItem>
            )}
            {hasPermission('admin.announcements') && (
              <MenuItem
                icon={<Settings size={20} strokeWidth={1.5} />}
                {...nav('admin/site-settings')}
                href={`/${locale}/admin/site-settings`}
              >
                Cài đặt chung
              </MenuItem>
            )}
            {hasPermission('admin.announcements') && (
              <MenuItem
                icon={<History size={20} strokeWidth={1.5} />}
                {...nav('admin/config-versions')}
                href={`/${locale}/admin/config-versions`}
              >
                Lịch sử cấu hình
              </MenuItem>
            )}
          </MenuSection>
        )}
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
