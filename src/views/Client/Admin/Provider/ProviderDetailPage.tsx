'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { Tabs, Tab, Box, Typography, Button, Paper, Grid, Card, CardContent, Divider } from '@mui/material'
import { ArrowLeft, TrendingUp, CheckCircle, XCircle, CreditCard } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'

import { useProviders, useProviderStatistics, useProviderInvoices, useProviderInvoiceSummary } from '@/hooks/apis/useProviders'
import ProviderInvoiceTab from './ProviderInvoiceTab'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  }
}

export default function ProviderDetailPage() {
  const [tabValue, setTabValue] = useState(0)
  const router = useRouter()
  const params = useParams()
  const { id } = params
  const { lang: locale } = params

  const { data: dataProviders = [], isLoading } = useProviders()
  const provider = Array.isArray(dataProviders) ? dataProviders.find((p: any) => p.id === Number(id)) : null

  // Fetch API related to details
  const { data: statsData, isLoading: isLoadingStats } = useProviderStatistics(id as string)
  const { data: invoiceSumData } = useProviderInvoiceSummary(id as string)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleBack = () => {
    router.push(`/${locale}/admin/providers`)
  }

  if (isLoading || !provider) {
    return (
      <div className='flex justify-center items-center h-64'>
        <Typography>Loading provider data...</Typography>
      </div>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button onClick={handleBack} startIcon={<ArrowLeft size={16} />} sx={{ mr: 2 }}>
          Quay lại
        </Button>
        <Typography variant='h4' component='h1'>
          Chi tiết Provider: {provider?.title || provider?.provider_code}
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label='provider tabs'>
            <Tab label='Thống Kê (Statistics)' {...a11yProps(0)} />
            <Tab label='Hoá Đơn (Invoices)' {...a11yProps(1)} />
            <Tab label='Thông Tin Liên Hệ' {...a11yProps(2)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {isLoadingStats ? (
            <Typography>Đang tải dữ liệu thống kê...</Typography>
          ) : (
            <>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card>
                  <CardContent>
                    <Typography color='textSecondary' gutterBottom>
                      Tổng Giao Dịch
                    </Typography>
                    <Typography variant='h5'>{statsData?.summary?.total_orders || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card>
                  <CardContent>
                    <Typography color='textSecondary' gutterBottom>
                      Tổng Doanh Thu
                    </Typography>
                    <Typography variant='h5' color='success.main'>
                      {Number(statsData?.summary?.total_revenue || 0).toLocaleString('vi-VN')} đ
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card>
                  <CardContent>
                    <Typography color='textSecondary' gutterBottom>
                      Chi phí (Invoices)
                    </Typography>
                    <Typography variant='h5' color='warning.main'>
                      {Number(invoiceSumData?.total_amount || 0).toLocaleString('vi-VN')} đ
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card>
                  <CardContent>
                    <Typography color='textSecondary' gutterBottom>
                      Tỷ Lệ Thành Công
                    </Typography>
                    <Typography variant='h5' color='primary.main'>
                      {statsData?.summary?.avg_success_rate || 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card>
                  <CardContent>
                    <Typography color='textSecondary' gutterBottom>
                      Refunds
                    </Typography>
                    <Typography variant='h5' color='error.main'>
                      {Number(statsData?.summary?.total_refunds || 0).toLocaleString('vi-VN')} đ
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Bảng liệt kê trend hoặc list stat row có thể bổ sung tại đây (sử dụng Material UI Table) */}

            </Grid>

            {statsData?.trend && statsData.trend.length > 0 && (
              <Box mt={5}>
                <Typography variant="h6" gutterBottom>
                  Biểu Đồ Xu Hướng 30 Ngày Tới (Trend)
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} lg={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Doanh Thu & Chi Phí
                      </Typography>
                      <Box sx={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                          <BarChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(val) => format(parseISO(val), 'dd/MM')} 
                              style={{ fontSize: '12px' }} 
                            />
                            <YAxis style={{ fontSize: '12px' }} />
                            <RechartsTooltip 
                              labelFormatter={(lbl) => format(parseISO(lbl as string), 'dd/MM/yyyy')}
                              formatter={(value: any) => [`${Number(value || 0).toLocaleString('vi-VN')} đ`, '']}
                            />
                            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                            <Bar name="Doanh Thu" dataKey="total_revenue" fill="#4caf50" radius={[4, 4, 0, 0]} />
                            <Bar name="Chi Phí Khai Thác" dataKey="total_cost" fill="#f44336" radius={[4, 4, 0, 0]} />
                            <Bar name="Lợi Nhuận" dataKey="total_profit" fill="#2196f3" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Khối Lượng Giao Dịch
                      </Typography>
                      <Box sx={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                          <LineChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(val) => format(parseISO(val), 'dd/MM')} 
                              style={{ fontSize: '12px' }} 
                            />
                            <YAxis style={{ fontSize: '12px' }} />
                            <RechartsTooltip 
                              labelFormatter={(lbl) => format(parseISO(lbl as string), 'dd/MM/yyyy')}
                            />
                            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                            <Line 
                              name="Tổng Giao Dịch" 
                              type="monotone" 
                              dataKey="total_orders" 
                              stroke="#ff9800" 
                              strokeWidth={3} 
                              dot={{ r: 4 }} 
                              activeDot={{ r: 6 }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
           <ProviderInvoiceTab providerId={id as string} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
           {/* Section Contact Info */}
            <Typography variant='h6' sx={{ mb: 2 }}>
              Thông tin liên hệ
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Tên (Name):</Typography>
                <Typography>{provider?.contact?.name || 'Chưa cập nhật'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Email:</Typography>
                <Typography>{provider?.contact?.email || 'Chưa cập nhật'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Số điện thoại (Phone):</Typography>
                <Typography>{provider?.contact?.phone || 'Chưa cập nhật'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Telegram:</Typography>
                <Typography>{provider?.contact?.telegram || 'Chưa cập nhật'}</Typography>
              </Grid>
            </Grid>
        </TabPanel>
      </Paper>
    </Box>
  )
}
