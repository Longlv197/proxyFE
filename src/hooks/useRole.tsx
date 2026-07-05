'use client'

import { useMemo } from 'react'

import { useSession } from 'next-auth/react'
import { useSelector } from 'react-redux'

import type { RootState } from '@/store'

// Định nghĩa các role có thể có trong hệ thống
export type UserRole = 'admin' | 'user' | 'manager' | 'reseller'

// Định nghĩa các quyền
export type Permission =
  | 'admin.dashboard'
  | 'admin.users'
  | 'admin.provider'
  | 'admin.transactionHistory'
  | 'admin.depositHistory'
  | 'admin.serviceType'
  | 'admin.announcements'
  | 'admin.vouchers'
  | 'reseller.credentials'
  | 'user.proxy'
  | 'user.orders'
  | 'user.profile'

// Mapping role với các quyền
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'admin.dashboard',
    'admin.users',
    'admin.provider',
    'user.proxy',
    'user.orders',
    'user.profile',
    'admin.transactionHistory',
    'admin.depositHistory',
    'admin.serviceType',
    'admin.announcements',
    'admin.vouchers'
  ],
  reseller: [
    'reseller.credentials',
    'user.proxy',
    'user.orders',
    'user.profile'
  ],
  manager: [
    'user.proxy',
    'user.orders',
    'user.profile'
  ],
  user: ['user.proxy', 'user.orders', 'user.profile']
}

export function useRole() {
  const { data: session, status } = useSession()
  const reduxRole = useSelector((state: RootState) => state.user.role)

  // Ưu tiên Redux (cập nhật realtime từ /me mỗi 30s) > session (chỉ cập nhật khi login/refresh)
  const userRole = useMemo(() => {
    if (reduxRole) return reduxRole.toLowerCase() as UserRole
    if (!(session as any)?.role) return 'user' as UserRole

    return (session as any).role.toLowerCase() as UserRole
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxRole, (session as any)?.role])

  const isAdmin = useMemo(() => {
    return userRole === 'admin'
  }, [userRole])

  const isReseller = useMemo(() => {
    return userRole === 'reseller'
  }, [userRole])

  const isManager = useMemo(() => {
    return userRole === 'manager'
  }, [userRole])

  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      const userPermissions = ROLE_PERMISSIONS[userRole] || []

      return userPermissions.includes(permission)
    }
  }, [userRole])

  const hasAnyPermission = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      const userPermissions = ROLE_PERMISSIONS[userRole] || []

      return permissions.some(permission => userPermissions.includes(permission))
    }
  }, [userRole])

  const hasAllPermissions = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      const userPermissions = ROLE_PERMISSIONS[userRole] || []

      return permissions.every(permission => userPermissions.includes(permission))
    }
  }, [userRole])

  return {
    userRole,
    isAdmin,
    isReseller,
    isManager,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated'
  }
}

// Hook đơn giản hơn để kiểm tra role cụ thể
export function useIsAdmin() {
  const { isAdmin, isLoading } = useRole()

  return { isAdmin, isLoading }
}

export function useIsReseller() {
  const { isReseller, isLoading } = useRole()

  return { isReseller, isLoading }
}

export function useIsManager() {
  const { isManager, isLoading } = useRole()

  return { isManager, isLoading }
}

// Hook để kiểm tra quyền cụ thể
export function useHasPermission(permission: Permission) {
  const { hasPermission, isLoading } = useRole()

  return {
    hasPermission: hasPermission(permission),
    isLoading
  }
}
