import { useProviderStatistics } from '@/hooks/apis/useProviders'
import { Box, Dialog, DialogContent, DialogTitle, Paper, Typography } from '@mui/material'
import { LineChart } from 'lucide-react'
import {
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  Line
} from 'recharts'
import { format, parseISO } from 'date-fns'
import DialogCloseButton from '@/components/modals/DialogCloseButton'

interface ModalStatisticProps {
  onClose: () => void
  open: boolean
  providerId: string
}
export default function ModalStatistic({ onClose, open, providerId }: ModalStatisticProps) {
  const { data: statsData, isLoading: isLoadingStats } = useProviderStatistics(providerId)
  return (
    <div>
      <Dialog
        onClose={onClose}
        open={open}
        closeAfterTransition={false}
        PaperProps={{ sx: { overflow: 'visible', minHeight: 'calc(100vh - 100px)' } }}
        fullWidth
        maxWidth='xl'
      >
        <DialogTitle>
          <Typography variant='h5' component='span'>
            Thống kê nhà cung cấp
          </Typography>
          <DialogCloseButton onClick={onClose} disableRipple>
            <i className='tabler-x' />
          </DialogCloseButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ p: 1 }}>
            {isLoadingStats ? (
              <Typography sx={{ color: '#64748b', fontSize: 13, p: 3, textAlign: 'center' }}>
                Đang tải thống kê...
              </Typography>
            ) : (
              <>
                {/* Summary cards */}
                {(() => {
                  const s = statsData?.summary || {}
                  const fmtM = (v: any) => `${Number(v || 0).toLocaleString('vi-VN')}đ`
                  const cards = [
                    { label: 'Tổng đơn mua', value: s.total_orders || 0, color: '#6366f1' },
                    { label: 'Gia hạn', value: s.renewal_orders || 0, color: '#8b5cf6' },
                    { label: 'Doanh thu (mua)', value: fmtM(s.total_revenue), color: '#16a34a' },
                    { label: 'Doanh thu (gia hạn)', value: fmtM(s.renewal_revenue), color: '#059669' },
                    { label: 'Chi phí NCC', value: fmtM(s.total_cost), color: '#f59e0b' },
                    { label: 'Lợi nhuận', value: fmtM(s.combined_profit || s.total_profit), color: '#2563eb' },
                    {
                      label: 'Margin',
                      value: `${s.margin_percent || 0}%`,
                      color: Number(s.margin_percent) > 20 ? '#16a34a' : '#f59e0b'
                    },
                    { label: 'Tỷ lệ OK', value: `${s.avg_success_rate || 0}%`, color: '#0ea5e9' },
                    { label: 'Proxy đang dùng', value: s.active_proxies || 0, color: '#6366f1' },
                    { label: 'Hoàn tiền', value: fmtM(s.total_refunds), color: '#ef4444' }
                  ]

                  return (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: 1.5,
                        mb: 3
                      }}
                    >
                      {cards.map(card => (
                        <Box
                          key={card.label}
                          sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', background: '#f8fafc' }}
                        >
                          <Typography sx={{ fontSize: 10, color: '#94a3b8', mb: 0.5 }}>{card.label}</Typography>
                          <Typography sx={{ fontSize: 15, fontWeight: 700, color: card.color }}>
                            {card.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )
                })()}

                {/* Charts */}
                {statsData?.trend &&
                  statsData.trend.length > 0 &&
                  (() => {
                    const fmtX = (val: string) => {
                      try {
                        return format(parseISO(val), 'dd/MM')
                      } catch {
                        return val
                      }
                    }
                    const fmtLabel = (lbl: any) => {
                      try {
                        return format(parseISO(lbl as string), 'dd/MM/yyyy')
                      } catch {
                        return String(lbl)
                      }
                    }
                    const axisSx = { fontSize: '10px' }
                    const legendSx = { fontSize: '10px', paddingTop: '6px' }

                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Chart 1: Doanh thu & Chi phí */}
                        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: '#475569' }}>
                            Doanh thu & Chi phí
                          </Typography>
                          <Box sx={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                              <BarChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray='3 3' opacity={0.5} />
                                <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                <YAxis style={axisSx} />
                                <RechartsTooltip
                                  labelFormatter={fmtLabel}
                                  formatter={(value: any, name: string) => [
                                    `${Number(value || 0).toLocaleString('vi-VN')}đ`,
                                    name
                                  ]}
                                />
                                <Legend wrapperStyle={legendSx} />
                                <Bar
                                  name='Doanh thu mua'
                                  dataKey='total_revenue'
                                  fill='#4caf50'
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                  name='Doanh thu gia hạn'
                                  dataKey='renewal_revenue'
                                  fill='#059669'
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar name='Chi phí' dataKey='total_cost' fill='#f44336' radius={[4, 4, 0, 0]} />
                                <Bar name='Lợi nhuận' dataKey='total_profit' fill='#2196f3' radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>

                        {/* Chart 2: Đơn hàng & Gia hạn & Proxy */}
                        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: '#475569' }}>
                            Đơn hàng & Gia hạn & Proxy
                          </Typography>
                          <Box sx={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                              <LineChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray='3 3' opacity={0.5} />
                                <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                <YAxis style={axisSx} />
                                <RechartsTooltip labelFormatter={fmtLabel} />
                                <Legend wrapperStyle={legendSx} />
                                <Line
                                  name='Đơn mua'
                                  type='monotone'
                                  dataKey='total_orders'
                                  stroke='#ff9800'
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                                <Line
                                  name='Gia hạn'
                                  type='monotone'
                                  dataKey='renewal_orders'
                                  stroke='#8b5cf6'
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                                <Line
                                  name='Proxy hoạt động'
                                  type='monotone'
                                  dataKey='active_proxies'
                                  stroke='#6366f1'
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>

                        {/* Chart 3: Margin % + Tỷ lệ thành công */}
                        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: '#475569' }}>
                            Biên lợi nhuận & Tỷ lệ thành công
                          </Typography>
                          <Box sx={{ width: '100%', height: 280 }}>
                            <ResponsiveContainer>
                              <LineChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray='3 3' opacity={0.5} />
                                <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                <YAxis unit='%' style={axisSx} />
                                <RechartsTooltip
                                  labelFormatter={fmtLabel}
                                  formatter={(value: any, name: string) => [`${value}%`, name]}
                                />
                                <Legend wrapperStyle={legendSx} />
                                <Line
                                  name='Margin'
                                  type='monotone'
                                  dataKey='margin_percent'
                                  stroke='#2563eb'
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                                <Line
                                  name='Tỷ lệ thành công'
                                  type='monotone'
                                  dataKey='success_rate'
                                  stroke='#16a34a'
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>
                      </Box>
                    )
                  })()}
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  )
}
