'use client'

import { useState, useMemo } from 'react'

import { useRouter, useParams } from 'next/navigation'

import { Box, Typography, Paper, Button } from '@mui/material'
import { ArrowLeft, TrendingUp, DollarSign, Users, Activity, Wallet, AlertTriangle, Calendar } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import AppReactDatepicker from '@/components/AppReactDatepicker'
import { useProviderDashboard } from '@/hooks/apis/useProviders'
import DatePicker from 'react-datepicker'

const fmtM = (v: any) => `${Number(v || 0).toLocaleString('vi-VN')}đ`

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4', '#e91e63', '#8bc34a']

export default function ProviderReportPage() {
  const router = useRouter()
  const { lang: locale } = useParams()
  const [days, setDays] = useState(30)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  const applyCustomRange = (start: Date | null, end: Date | null) => {
    if (start && end) {
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end date
      setDays(diffDays)
    }
  }

  const dateFrom = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().slice(0, 10)
  }, [days])

  const { data, isLoading } = useProviderDashboard(dateFrom)
  const overview = data?.overview || {}
  const providers = data?.providers || []

  return (
    <div className='table-container'>
      <div className='orders-content'>
        {/* Header */}
        <div
          className='table-toolbar'
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div className='header-left'>
            <Button
              size='small'
              startIcon={<ArrowLeft size={14} />}
              onClick={() => router.push(`/${locale}/admin/providers`)}
              sx={{ mr: 1, textTransform: 'none', fontSize: 12 }}
            >
              Quay lại
            </Button>
            <div className='page-icon'>
              <TrendingUp size={17} />
            </div>
            <div>
              <h5 className='mb-0 font-semibold'>Báo cáo nhà cung cấp</h5>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 30, 90].map(d => (
              <Button
                key={d}
                size='small'
                variant={days === d ? 'contained' : 'outlined'}
                onClick={() => setDays(d)}
                sx={{ textTransform: 'none', fontSize: 11, minWidth: 50, color: days === d ? '#fff' : undefined }}
              >
                {d} ngày
              </Button>
            ))}
          </div>

          <div className='flex items-center gap-2 ml-auto'>
            <Calendar size={16} className='text-gray-400' />
            <AppReactDatepicker
              selected={startDate}
              onChange={(date: Date | null) => {
                setStartDate(date)
                applyCustomRange(date, endDate)
              }}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              dateFormat='dd/MM/yyyy'
              placeholderText='Từ ngày'
              className='w-28 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0B6FFF]'
              maxDate={new Date()}
            />
            <span className='text-gray-400'>—</span>
            <AppReactDatepicker
              selected={endDate}
              onChange={(date: Date | null) => {
                setEndDate(date)
                applyCustomRange(startDate, date)
              }}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              dateFormat='dd/MM/yyyy'
              placeholderText='Đến ngày'
              className='w-28 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0B6FFF]'
              maxDate={new Date()}
            />
          </div>
        </div>

        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</Box>
        ) : (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Overview cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5 }}>
              {[
                {
                  icon: <Users size={14} />,
                  label: 'Nhà cung cấp',
                  value: overview.total_providers || 0,
                  color: '#6366f1'
                },
                {
                  icon: <Activity size={14} />,
                  label: 'Tổng đơn hàng',
                  value: overview.total_orders || 0,
                  color: '#8b5cf6'
                },
                {
                  icon: <DollarSign size={14} />,
                  label: 'Doanh thu',
                  value: fmtM(overview.total_revenue),
                  color: '#16a34a'
                },
                {
                  icon: <DollarSign size={14} />,
                  label: 'Chi phí',
                  value: fmtM(overview.total_cost),
                  color: '#f59e0b'
                },
                {
                  icon: <TrendingUp size={14} />,
                  label: 'Lợi nhuận',
                  value: fmtM(overview.total_profit),
                  color: '#2563eb'
                },
                {
                  icon: <TrendingUp size={14} />,
                  label: 'Margin',
                  value: `${overview.margin_percent || 0}%`,
                  color: Number(overview.margin_percent) > 20 ? '#16a34a' : '#f59e0b'
                },
                {
                  icon: <Wallet size={14} />,
                  label: 'Vốn đã nạp NCC',
                  value: fmtM(overview.total_invested),
                  color: '#f97316'
                },
                {
                  icon: <Wallet size={14} />,
                  label: 'Số dư NCC',
                  value: fmtM(overview.estimated_balance),
                  color: Number(overview.estimated_balance) > 0 ? '#16a34a' : '#ef4444'
                },
                {
                  icon: <AlertTriangle size={14} />,
                  label: 'Hoàn tiền',
                  value: fmtM(overview.total_refunds),
                  color: '#ef4444'
                },
                {
                  icon: <Activity size={14} />,
                  label: 'Tỷ lệ OK',
                  value: `${overview.avg_success_rate || 0}%`,
                  color: '#0ea5e9'
                }
              ].map(c => (
                <Paper key={c.label} variant='outlined' sx={{ p: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <span style={{ color: c.color }}>{c.icon}</span>
                    <Typography sx={{ fontSize: 9, color: '#94a3b8' }}>{c.label}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: c.color }}>{c.value}</Typography>
                </Paper>
              ))}
            </Box>

            {/* Chart: Doanh thu theo NCC */}
            {providers.length > 0 && (
              <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: '#475569' }}>
                  So sánh doanh thu & lợi nhuận theo NCC
                </Typography>
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={providers} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray='3 3' opacity={0.5} />
                      <XAxis dataKey='title' style={{ fontSize: '10px' }} angle={-20} textAnchor='end' height={60} />
                      <YAxis style={{ fontSize: '10px' }} />
                      <RechartsTooltip
                        formatter={(value: any, name: string) => [
                          `${Number(value || 0).toLocaleString('vi-VN')}đ`,
                          name
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                      <Bar name='Doanh thu' dataKey='total_revenue' fill='#4caf50' radius={[4, 4, 0, 0]} />
                      <Bar name='Chi phí' dataKey='total_cost' fill='#f44336' radius={[4, 4, 0, 0]} />
                      <Bar name='Lợi nhuận' dataKey='total_profit' fill='#2196f3' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            )}

            {/* Chart: Pie tỷ lệ doanh thu */}
            {providers.length > 1 && (
              <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: '#475569' }}>
                  Tỷ lệ doanh thu theo NCC
                </Typography>
                <Box sx={{ width: '100%', height: 280, display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={providers.filter((p: any) => p.total_revenue > 0)}
                        dataKey='total_revenue'
                        nameKey='title'
                        cx='50%'
                        cy='50%'
                        outerRadius={100}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        style={{ fontSize: '10px' }}
                      >
                        {providers.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => [`${Number(value || 0).toLocaleString('vi-VN')}đ`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            )}

            {/* Bảng chi tiết từng NCC */}
            <Paper variant='outlined' sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  p: '12px 16px',
                  color: '#475569',
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                Chi tiết từng nhà cung cấp
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['NCC', 'Đơn hàng', 'Doanh thu', 'Chi phí', 'Lợi nhuận', 'Margin', 'Tỷ lệ OK', 'Hoàn tiền'].map(
                        h => (
                          <th
                            key={h}
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#64748b',
                              borderBottom: '1px solid #e2e8f0'
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p: any, i: number) => {
                      const margin = p.total_revenue > 0 ? ((p.total_profit / p.total_revenue) * 100).toFixed(1) : '0'

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                            <div>{p.title}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                              {p.provider_code}
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{p.total_orders}</td>
                          <td
                            style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#16a34a', fontWeight: 600 }}
                          >
                            {fmtM(p.total_revenue)}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#dc2626' }}>
                            {fmtM(p.total_cost)}
                          </td>
                          <td
                            style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}
                          >
                            {fmtM(p.total_profit)}
                          </td>
                          <td
                            style={{
                              padding: '8px 12px',
                              fontWeight: 600,
                              color: Number(margin) > 20 ? '#16a34a' : '#f59e0b'
                            }}
                          >
                            {margin}%
                          </td>
                          <td style={{ padding: '8px 12px', color: '#0ea5e9' }}>{p.avg_success_rate}%</td>
                          <td style={{ padding: '8px 12px', color: '#ef4444', fontFamily: 'monospace' }}>
                            {fmtM(p.total_refunds)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Paper>
          </Box>
        )}
      </div>
    </div>
  )
}
