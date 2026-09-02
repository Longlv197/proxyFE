import { useProviderStatistics } from '@/hooks/apis/useProviders'
import { Box, Dialog, DialogContent, DialogTitle, Paper, Typography } from '@mui/material'
import {
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar
} from 'recharts'
import { format, parseISO } from 'date-fns'
import DialogCloseButton from '@/components/modals/DialogCloseButton'
import {
  formatPercent,
  profitColor,
  HINT_MARGIN,
  HINT_MARKUP,
  LABEL_MARGIN,
  LABEL_MARGIN_SHORT,
  LABEL_MARKUP,
  LABEL_MARKUP_SHORT
} from '@/utils/profitMetrics'

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
                {/* Summary */}
                {(() => {
                  const s = statsData?.summary || {}
                  const fmtM = (v: any) => `${Number(v || 0).toLocaleString('vi-VN')}đ`

                  return (
                    <Box sx={{ mb: 3 }}>
                      {/* Row 1: Tổng quan */}
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#94a3b8',
                          mb: 0.5,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}
                      >
                        Tổng quan
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                          gap: 1,
                          mb: 2
                        }}
                      >
                        {([
                          { label: 'Đơn mua', value: s.total_orders || 0, color: '#6366f1' },
                          { label: 'Gia hạn', value: s.renewal_orders || 0, color: '#8b5cf6' },
                          { label: 'Tỷ lệ OK', value: `${s.avg_success_rate || 0}%`, color: '#0ea5e9' },
                          { label: 'Proxy hoạt động', value: s.active_proxies || 0, color: '#6366f1' },
                          {
                            label: LABEL_MARKUP_SHORT,
                            value: formatPercent(s.markup_percent),
                            color: profitColor(s.markup_percent),
                            hint: HINT_MARKUP
                          },
                          {
                            label: LABEL_MARGIN_SHORT,
                            value: formatPercent(s.margin_percent),
                            color: profitColor(s.margin_percent),
                            hint: HINT_MARGIN
                          },
                          { label: 'Hoàn tiền', value: fmtM(s.total_refunds), color: '#ef4444' }
                        ] as { label: string; value: any; color: string; hint?: string }[]).map(c => (
                          <Box
                            key={c.label}
                            title={c.hint}
                            sx={{ p: 1, borderRadius: 1.5, border: '1px solid #e2e8f0', background: '#f8fafc' }}
                          >
                            <Typography sx={{ fontSize: 9, color: '#94a3b8' }}>{c.label}</Typography>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.value}</Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Row 2: Thực tế vs Dự kiến */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#166534', mb: 1 }}>
                            Thực tế (đã hoàn thành)
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                            <div>
                              <Typography sx={{ fontSize: 9, color: '#64748b' }}>Doanh thu</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                                {fmtM(s.actual_revenue)}
                              </Typography>
                            </div>
                            <div>
                              <Typography sx={{ fontSize: 9, color: '#64748b' }}>Chi phí</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                                {fmtM(s.actual_cost)}
                              </Typography>
                            </div>
                            <div>
                              <Typography sx={{ fontSize: 9, color: '#64748b' }}>Lợi nhuận</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
                                {fmtM(s.actual_profit)}
                              </Typography>
                            </div>
                          </Box>
                        </Box>
                        <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid #fde68a', background: '#fefce8' }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#854d0e', mb: 1 }}>
                            Dự kiến (đang sử dụng)
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                            <div>
                              <Typography sx={{ fontSize: 9, color: '#64748b' }}>Doanh thu</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                                {fmtM(s.expected_revenue)}
                              </Typography>
                            </div>
                            <div>
                              <Typography sx={{ fontSize: 9, color: '#64748b' }}>Chi phí</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                                {fmtM(s.expected_cost)}
                              </Typography>
                            </div>
                            <div>
                              <Typography sx={{ fontSize: 9, color: '#64748b' }}>Lợi nhuận</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
                                {fmtM(s.expected_profit)}
                              </Typography>
                            </div>
                          </Box>
                        </Box>
                      </Box>

                      {/* Row 3: Vốn NCC */}
                      <Box
                        sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1 }}
                      >
                        {[
                          { label: 'Tổng vốn đã nạp NCC', value: fmtM(s.total_invested), color: '#f97316' },
                          {
                            label: 'Số dư ước tính NCC',
                            value: fmtM(s.estimated_balance),
                            color: Number(s.estimated_balance) > 0 ? '#16a34a' : '#ef4444'
                          },
                          { label: 'DT gia hạn', value: fmtM(s.renewal_revenue), color: '#059669' }
                        ].map(c => (
                          <Box
                            key={c.label}
                            sx={{ p: 1, borderRadius: 1.5, border: '1px solid #e2e8f0', background: '#f8fafc' }}
                          >
                            <Typography sx={{ fontSize: 9, color: '#94a3b8' }}>{c.label}</Typography>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.value}</Typography>
                          </Box>
                        ))}
                      </Box>
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
                        {/* Chart 1: Doanh thu thực tế & Dự kiến */}
                        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: '#1e293b' }}>
                            Doanh thu thực tế & Dự kiến
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 1.5 }}>
                            So sánh doanh thu, chi phí, lợi nhuận giữa đơn hoàn thành và đơn đang sử dụng
                          </Typography>
                          <Box sx={{ width: '100%', height: 320 }}>
                            <ResponsiveContainer>
                              <BarChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray='3 3' opacity={0.4} />
                                <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                <YAxis
                                  style={axisSx}
                                  tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}tr` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                                />
                                <RechartsTooltip
                                  labelFormatter={fmtLabel}
                                  formatter={(value: any, name: string) => [
                                    `${Number(value || 0).toLocaleString('vi-VN')}đ`,
                                    name
                                  ]}
                                />
                                <Legend wrapperStyle={legendSx} />
                                <Bar name='Doanh thu (thực tế)' dataKey='actual_revenue' fill='#16a34a' radius={[4, 4, 0, 0]} />
                                <Bar name='Doanh thu (dự kiến)' dataKey='expected_revenue' fill='#f59e0b' radius={[4, 4, 0, 0]} />
                                <Bar name='Chi phí' dataKey='actual_cost' fill='#ef4444' radius={[4, 4, 0, 0]} />
                                <Bar name='Lợi nhuận' dataKey='actual_profit' fill='#2563eb' radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>

                        {/* Chart 2: Đơn hàng & Gia hạn & Proxy */}
                        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: '#1e293b' }}>
                            Đơn hàng & Gia hạn & Proxy
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 1.5 }}>
                            Số lượng đơn mua mới, gia hạn và proxy đang hoạt động theo ngày
                          </Typography>
                          <Box sx={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                              <BarChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray='3 3' opacity={0.4} />
                                <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                <YAxis style={axisSx} allowDecimals={false} />
                                <RechartsTooltip labelFormatter={fmtLabel} />
                                <Legend wrapperStyle={legendSx} />
                                <Bar name='Đơn mua' dataKey='total_orders' fill='#ff9800' radius={[4, 4, 0, 0]} />
                                <Bar name='Gia hạn' dataKey='renewal_orders' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
                                <Bar name='Proxy hoạt động' dataKey='active_proxies' fill='#6366f1' radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>

                        {/* Chart 3: Margin % + Tỷ lệ thành công */}
                        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: '#1e293b' }}>
                            Lợi nhuận & Tỷ lệ thành công
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 1.5 }}>
                            Lãi trên giá gốc, lãi trên tổng thu và tỷ lệ đơn thành công theo ngày
                          </Typography>
                          <Box sx={{ width: '100%', height: 280 }}>
                            <ResponsiveContainer>
                              <BarChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray='3 3' opacity={0.4} />
                                <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                {/*
                                  Khoá cứng [0, 100] sẽ cắt cột ở CẢ HAI đầu: NCC bán dưới vốn ra %
                                  âm, còn lãi trên giá gốc thì vượt 100% là chuyện bình thường
                                  (bán gấp đôi vốn = 100%). Giữ tối thiểu 0–100 cho tỷ lệ thành công.
                                */}
                                <YAxis
                                  unit='%'
                                  style={axisSx}
                                  domain={[
                                    (dataMin: number) => Math.min(0, Math.floor(dataMin)),
                                    (dataMax: number) => Math.max(100, Math.ceil(dataMax))
                                  ]}
                                />
                                <RechartsTooltip
                                  labelFormatter={fmtLabel}
                                  formatter={(value: any, name: string) => [formatPercent(value), name]}
                                />
                                <Legend wrapperStyle={legendSx} />
                                <Bar name={LABEL_MARKUP} dataKey='markup_percent' fill='#f59e0b' radius={[4, 4, 0, 0]} />
                                <Bar name={LABEL_MARGIN} dataKey='margin_percent' fill='#2563eb' radius={[4, 4, 0, 0]} />
                                <Bar name='Tỷ lệ thành công' dataKey='success_rate' fill='#16a34a' radius={[4, 4, 0, 0]} />
                              </BarChart>
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
