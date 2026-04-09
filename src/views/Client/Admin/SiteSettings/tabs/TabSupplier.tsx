'use client'

import React from 'react'
import { TextField, Button } from '@mui/material'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'react-toastify'
import { sectionTitleSx, sectionDescSx } from './shared'

interface TabSupplierProps {
  supplier: { provider_api_url: string; provider_api_key: string }
  setSupplier: React.Dispatch<React.SetStateAction<{ provider_api_url: string; provider_api_key: string }>>
  updateSupplierMutation: any
  supplierData: any
  supplierTestResult: any
  setSupplierTestResult: (v: any) => void
  axiosAuth: any
}

export default function TabSupplier({
  supplier,
  setSupplier,
  updateSupplierMutation,
  supplierData,
  supplierTestResult,
  setSupplierTestResult,
  axiosAuth
}: TabSupplierProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h6 style={sectionTitleSx}>Kết nối nhà cung cấp (site mẹ)</h6>
        <p style={sectionDescSx}>
          Thay đổi API credentials kết nối đến site mẹ.{' '}
          {supplierData?.configured ? 'Đã cấu hình.' : 'Chưa cấu hình — vui lòng nhập thông tin bên dưới.'}
        </p>
      </div>
      <TextField
        size='small'
        label='Supplier API URL'
        value={supplier.provider_api_url}
        onChange={e => setSupplier(prev => ({ ...prev, provider_api_url: e.target.value }))}
        placeholder='https://app.mktproxy.com/api'
        fullWidth
      />
      <TextField
        size='small'
        label='API Key'
        value={supplier.provider_api_key}
        onChange={e => setSupplier(prev => ({ ...prev, provider_api_key: e.target.value }))}
        placeholder='mkt_xxxxx'
        fullWidth
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button
          size='small'
          variant='contained'
          onClick={() => {
            if (!supplier.provider_api_url || !supplier.provider_api_key) {
              toast.error('Vui lòng nhập đầy đủ URL và API Key')

              return
            }

            setSupplierTestResult(null)
            updateSupplierMutation.mutate(supplier, {
              onSuccess: (data: any) => {
                toast.success(data?.message || 'Cập nhật thành công')
                setSupplierTestResult(data?.test)
              },
              onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
              }
            })
          }}
          disabled={updateSupplierMutation.isPending}
          startIcon={
            updateSupplierMutation.isPending ? (
              <Loader2 size={14} className='animate-spin' />
            ) : (
              <Save size={14} />
            )
          }
          sx={{ textTransform: 'none', fontSize: '13px', color: '#fff' }}
        >
          {updateSupplierMutation.isPending ? 'Đang lưu...' : 'Lưu & Test kết nối'}
        </Button>
        {supplierTestResult && (
          <span
            style={{
              fontSize: '13px',
              color: supplierTestResult.connected ? '#059669' : '#dc2626',
              fontWeight: 500
            }}
          >
            {supplierTestResult.connected
              ? `Kết nối OK — Số dư: ${new Intl.NumberFormat('vi-VN').format(supplierTestResult.balance)}đ`
              : `Lỗi kết nối: ${supplierTestResult.error}`}
          </span>
        )}
      </div>
    </div>
  )
}
