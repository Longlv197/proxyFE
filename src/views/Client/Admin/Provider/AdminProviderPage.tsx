'use client'

import { useState, useEffect } from 'react'

import { useRouter, useParams } from 'next/navigation'

import { useBranding } from '@/app/contexts/BrandingContext'
import ModalAddProvider from '@/views/Client/Admin/Provider/ModalAddProvider'
import TableProvider from '@/views/Client/Admin/Provider/TableProvider'
import ModalStatistic from './ModalStatistic'
import ModalInvoice from './ModalInvoice'

export default function AdminProviderPage() {
  const { isChild, isLoading } = useBranding()
  const router = useRouter()
  const { lang: locale } = useParams()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'create' | 'edit'>('create')
  const [providerData, setProviderData] = useState<any>(null)
  const [openStatistic, setOpenStatistic] = useState(false)
  const [openInvoice, setOpenInvoice] = useState(false)

  // Site con không có quyền truy cập nhà cung cấp — chờ data load xong mới check
  useEffect(() => {
    if (!isLoading && isChild) {
      router.replace(`/${locale}/home`)
    }
  }, [isChild, isLoading, router, locale])

  const handleOpenModal = (modalType: 'create' | 'edit', data?: any) => {
    setType(modalType)
    setProviderData(data || null)
    setOpen(true)
  }

  const handleCloseModal = () => {
    setOpen(false)
    setProviderData(null)
  }

  const handleOpenStatistic = (provider: any) => {
    setProviderData(provider)
    setOpenStatistic(true)
  }

  const handleCloseStatistic = () => {
    setOpenStatistic(false)
  }

  const handleOpenInvoice = (provider: any) => {
    setProviderData(provider)
    setOpenInvoice(true)
  }

  const handleCloseInvoice = () => {
    setOpenInvoice(false)
  }

  if (isLoading || isChild) return null

  return (
    <>
      <TableProvider
        onOpenModal={handleOpenModal}
        onOpenStatistic={handleOpenStatistic}
        onOpenInvoice={handleOpenInvoice}
      />
      <ModalAddProvider open={open} onClose={handleCloseModal} type={type} providerData={providerData} />
      <ModalStatistic open={openStatistic} onClose={handleCloseStatistic} providerId={providerData?.id} />
      <ModalInvoice open={openInvoice} onClose={handleCloseInvoice} providerId={providerData?.id} />
    </>
  )
}
