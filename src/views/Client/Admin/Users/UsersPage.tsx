'use client'

import { useState, useCallback, useRef } from 'react'

import TableUsers from '@/views/Client/Admin/Users/TableUsers'
import ModalEditUser from '@/views/Client/Admin/Users/ModalEditUser'
import ModalBalanceAdjust from '@/views/Client/Admin/Users/ModalBalanceAdjust'
import ModalAffiliateAdjust from '@/views/Client/Admin/Users/ModalAffiliateAdjust'
import UserTransactionModal from '@/views/Client/Admin/Users/UserTransactionModal'
import ProviderPricingModal from '@/views/Client/Admin/Users/ProviderPricingModal'

export default function UsersPage() {
  const [modalState, setModalState] = useState<{
    type: 'edit' | 'balance' | 'affiliateBalance' | 'transaction' | 'providerPricing' | null
    user: any
  }>({ type: null, user: null })

  const handleEditUser = useCallback((user: any) => {
    setModalState({ type: 'edit', user })
  }, [])

  const handleAdjustBalance = useCallback((user: any) => {
    setModalState({ type: 'balance', user })
  }, [])

  const handleAdjustAffiliate = useCallback((user: any) => {
    setModalState({ type: 'affiliateBalance', user })
  }, [])

  const handleViewTransactions = useCallback((user: any) => {
    setModalState({ type: 'transaction', user })
  }, [])

  const handleProviderPricing = useCallback((user: any) => {
    setModalState({ type: 'providerPricing', user })
  }, [])

  const handleClose = useCallback(() => {
    setModalState({ type: null, user: null })
  }, [])

  return (
    <>
      <TableUsers
        onEditUser={handleEditUser}
        onAdjustBalance={handleAdjustBalance}
        onAdjustAffiliate={handleAdjustAffiliate}
        onViewTransactions={handleViewTransactions}
        onProviderPricing={handleProviderPricing}
      />
      {modalState.type === 'edit' && <ModalEditUser open onClose={handleClose} userData={modalState.user} />}
      {modalState.type === 'balance' && <ModalBalanceAdjust open onClose={handleClose} userData={modalState.user} />}
      {modalState.type === 'affiliateBalance' && <ModalAffiliateAdjust open onClose={handleClose} userData={modalState.user} />}
      {modalState.type === 'transaction' && <UserTransactionModal
        open
        onClose={handleClose}
        userId={modalState.user?.id}
        userName={`${modalState.user?.name || ''} (${modalState.user?.email || ''})`}
      />}
      {modalState.type === 'providerPricing' && <ProviderPricingModal
        open
        onClose={handleClose}
        userId={modalState.user?.id}
        userName={`${modalState.user?.name || ''} (${modalState.user?.email || ''})`}
      />}
    </>
  )
}
