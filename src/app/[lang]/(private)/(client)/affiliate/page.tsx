'use client'

import { MousePointer, DollarSign, BanknoteArrowDown, TrendingUp, Wallet } from 'lucide-react'

import AffiliatePage from '@/views/Client/Affiliate/AffiliatePage'
import BoxCustom from '@/components/UI/BoxCustom'
import WithdrawalTable from '@/views/Client/Affiliate/WithdrawalTable'
import { useAffiliate } from '@/hooks/apis/useAffiliate'

export default function Affiliate() {
  const { data: affiliateData, isLoading } = useAffiliate()

  return (
    <>
      <div className='grid grid-cols-1 lg:grid-cols-10 gap-6'>
        <div className='lg:col-span-7'>
          {/* Stats Overview */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8'>
            <BoxCustom>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Thu nhập tháng này</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {isLoading ? '...' : (new Intl.NumberFormat('vi-VN').format(affiliateData?.month ?? 0) + ' đ')}
                  </p>
                </div>
                <div className='w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'>
                  <DollarSign className='w-6 h-6 text-green-500' />
                </div>
              </div>
            </BoxCustom>

            <BoxCustom>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Thu nhập tổng</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {isLoading ? '...' : (new Intl.NumberFormat('vi-VN').format(affiliateData?.total ?? 0) + ' đ')}
                  </p>
                </div>
                <div className='w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center'>
                  <TrendingUp className='w-6 h-6 text-emerald-500' />
                </div>
              </div>
            </BoxCustom>

            <BoxCustom>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Số dư affiliate</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {isLoading ? '...' : (new Intl.NumberFormat('vi-VN').format(affiliateData?.affiliate_balance ?? 0) + ' đ')}
                  </p>
                  <p className='text-xs text-gray-400 mt-1'>Chưa hỗ trợ rút</p>
                </div>
                <div className='w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center'>
                  <Wallet className='w-6 h-6 text-teal-500' />
                </div>
              </div>
            </BoxCustom>

            <BoxCustom>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Hoa Hồng Giới Thiệu</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {isLoading ? '...' : `${affiliateData?.affiliate_percent ?? 0} %`}
                  </p>
                </div>
                <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center'>
                  <MousePointer className='w-6 h-6 text-blue-500' />
                </div>
              </div>
            </BoxCustom>
          </div>

          <AffiliatePage />
        </div>

        <div className='lg:col-span-3'>
          <BoxCustom>
            <h2 className='text-xl font-bold text-gray-900 mb-6 flex items-center'>
              <BanknoteArrowDown className='w-5 h-5 mr-2 text-orange-500' />
              Lịch sử rút tiền
            </h2>

            <WithdrawalTable />
          </BoxCustom>
        </div>
      </div>
    </>
  )
}
