'use client'

import { useEffect, useState, useRef } from 'react'

import { useForm, useWatch } from 'react-hook-form'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import Typography from '@mui/material/Typography'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Grid2 from '@mui/material/Grid2'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import useMediaQuery from '@mui/material/useMediaQuery'

import { toast } from 'react-toastify'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'

import DialogCloseButton from '@/components/modals/DialogCloseButton'

import {
  useCreateProvider,
  useUpdateProvider,
  useProviderStatistics,
  useProviderInvoiceSummary
} from '@/hooks/apis/useProviders'

import { useValidateConfig, useConfigCard, configLevel } from '@/hooks/apis/useConfigTools'

import type { FormValues, ModalAddProviderProps } from './ProviderFormTypes'
import { defaultValues } from './ProviderFormTypes'
import { parseApiConfig, buildApiConfig } from './ProviderFormSerializer'
import ResidentialProviderSection from './ResidentialProviderSection'
import type { ResidentialBuildRef } from './ResidentialProviderSection'

import BasicInfoSection from './sections/BasicInfoSection'
import BuyConfigSection from './sections/BuyConfigSection'
import RotateSection from './sections/RotateSection'
import IpWhitelistSection from './sections/IpWhitelistSection'
import RenewSection from './sections/RenewSection'
import ContactInfoSection from './sections/ContactInfoSection'
import JsonPreviewPanel from './components/JsonPreviewPanel'
import ConfigToolPanel from './components/ConfigToolPanel'
import ProviderInvoiceTab from './ProviderInvoiceTab'

// ─── Tab config ─────────────────────────────────────

const BASE_TABS = [
  { label: 'Cơ bản', icon: 'tabler-settings' },
  { label: 'Mua proxy', icon: 'tabler-shopping-cart' },
  { label: 'Xoay proxy', icon: 'tabler-refresh' },
  { label: 'IP Whitelist', icon: 'tabler-shield-check' },
  { label: 'Gia hạn', icon: 'tabler-clock' },
  { label: 'Residential', icon: 'tabler-world' },
  { label: 'Liên hệ', icon: 'tabler-address-book' }
]

// Tab "Kiểm tra" chỉ có ở edit mode (cần provider đã lưu để đối chiếu DB) → APPEND cuối,
// KHÔNG chèn giữa: mọi chỗ so `activeTab === N` + tabEnabled[] đang dùng chỉ số cứng của BASE_TABS.
const CHECK_TAB = { label: 'Kiểm tra', icon: 'tabler-checklist' }
const CHECK_TAB_INDEX = BASE_TABS.length // = 7

// Nhớ lựa chọn hiện/ẩn cột JSON của admin (localStorage). Chưa chọn lần nào → theo bề ngang màn hình.
const JSON_PREF_KEY = 'provider_modal_json_visible'

// Nhãn field dài ("Tên param số lượng", "Trường kiểm tra"...) mặc định bị MUI cắt bằng dấu ba chấm
// → cho xuống dòng. Nhãn ở template này nằm TRÊN ô nhập (position relative) nên xuống dòng an toàn.
// ĐÃ THỬ căn đáy ô nhập cho thẳng hàng khi nhãn xuống 2 dòng → HỎNG các hàng có chữ chú thích
// dưới ô (ô có helper bị đẩy lên, lệch nhiều hơn). Chấp nhận nhãn 2 dòng làm ô hơi so le —
// vẫn hơn hẳn việc chữ bị cắt cụt bằng dấu ba chấm. Màn rộng / ẩn cột JSON thì nhãn vừa 1 dòng.
const LABEL_WRAP_SX = {
  '& .MuiInputLabel-root': { whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip' }
}

// Chiều cao CỐ ĐỊNH (không phải minHeight): đổi tab không làm modal cao thấp nhảy.
// Giữ overflow visible vì nút X được đẩy ra ngoài mép paper 9-10px.
const PAPER_SX = {
  overflow: 'visible',
  height: 'calc(100vh - 100px)',
  maxHeight: 'calc(100vh - 100px)'
}

// Chấm cảnh báo trên nhãn tab Kiểm tra — dùng token theme.
const LEVEL_DOT: Record<string, string> = {
  red: 'error.main',
  yellow: 'warning.main',
  green: 'success.main',
  none: 'action.disabled'
}

// ─── Component ──────────────────────────────────────

export default function ModalAddProvider({ open, onClose, type, providerData }: ModalAddProviderProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [renderedTabs, setRenderedTabs] = useState<Set<number>>(new Set([0]))

  const isEditMode = type === 'edit' && !!providerData?.id
  const TABS = isEditMode ? [...BASE_TABS, CHECK_TAB] : BASE_TABS

  // Kiểm cấu hình: fetch ngay khi mở modal để vẽ chấm cảnh báo trên nhãn tab (admin thấy NGAY,
  // không phải bấm vào tab mới biết). ConfigToolPanel dùng chung queryKey → KHÔNG tốn thêm request.
  // Cột JSON: màn rộng thì mặc định hiện, laptop hẹp thì mặc định thu về nút — nhưng admin đã tự
  // chọn hiện/ẩn thì tôn trọng lựa chọn đó ở mọi kích thước.
  const isWideScreen = useMediaQuery('(min-width:1600px)')
  const [showJson, setShowJson] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(JSON_PREF_KEY) : null

    setShowJson(saved === null ? isWideScreen : saved === '1')
  }, [isWideScreen])

  const toggleJson = () =>
    setShowJson(prev => {
      const next = !prev

      if (typeof window !== 'undefined') window.localStorage.setItem(JSON_PREF_KEY, next ? '1' : '0')

      return next
    })

  const queryClient = useQueryClient()
  const configCode = isEditMode ? providerData?.provider_code : undefined
  const { data: configValidate } = useValidateConfig(configCode)
  const { data: configCard } = useConfigCard(configCode)
  const checkLevel = configLevel(configValidate, configCard)

  const createMutation = useCreateProvider()
  const updateMutation = useUpdateProvider(providerData?.id)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({ defaultValues })

  // Status badges
  const buyRotatingEnabled = useWatch({ control, name: 'buy_rotating.enabled' })
  const buyStaticEnabled = useWatch({ control, name: 'buy_static.enabled' })
  const rotateEnabled = useWatch({ control, name: 'rotate.enabled' })
  const ipEnabled = useWatch({ control, name: 'ip_whitelist.enabled' })
  const renewEnabled = useWatch({ control, name: 'renew.enabled' })

  const tabEnabled = [
    true, // Cơ bản luôn active
    buyRotatingEnabled || buyStaticEnabled,
    rotateEnabled,
    ipEnabled,
    renewEnabled,
    providerData?.api_config?.kind === 'residential', // Residential dot xanh khi đã bật flag
    true // Liên hệ luôn cho phép
  ]

  // Tab Residential lưu state cục bộ (KHÔNG nằm trong react-hook-form) — section đẩy build()
  // qua ref để nút "Cập nhật" footer cũng lưu được tab này (tránh trap 2 nút lưu)
  const residentialRef = useRef<ResidentialBuildRef | null>(null)

  // JSON preview
  const [jsonPreview, setJsonPreview] = useState('// Chưa có cấu hình API')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    const subscription = watch(values => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const config = buildApiConfig(values as FormValues)
        setJsonPreview(config ? JSON.stringify(config, null, 2) : '// Chưa có cấu hình API')
      }, 500)
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [watch])

  // Load data on edit
  useEffect(() => {
    if (!open) return

    if (type === 'edit' && providerData) {
      const parsed = parseApiConfig(providerData.api_config)
      const values = {
        ...defaultValues,
        title: providerData.title || '',
        token_api: providerData.token_api || '',
        provider_code: providerData.provider_code || '',
        order: providerData.order || '',
        status: providerData.status || 'active',
        rotation_interval: providerData.rotation_interval || '',
        contact: {
          name: providerData.contact?.name || '',
          email: providerData.contact?.email || '',
          phone: providerData.contact?.phone || '',
          telegram: providerData.contact?.telegram || '',
          skype: providerData.contact?.skype || '',
          website: providerData.contact?.website || '',
          address: providerData.contact?.address || '',
          note: providerData.contact?.note || ''
        },
        ...parsed
      }

      reset(values)

      const config = buildApiConfig(values as FormValues)
      setJsonPreview(config ? JSON.stringify(config, null, 2) : '// Chưa có cấu hình API')
    } else {
      reset(defaultValues)
      setJsonPreview('// Chưa có cấu hình API')
    }

    setActiveTab(0)
    setRenderedTabs(new Set([0]))
  }, [open, type, providerData, reset])

  // Track rendered tabs (keep form fields mounted)
  const handleTabChange = (_: any, newValue: number) => {
    setActiveTab(newValue)
    setRenderedTabs(prev => new Set([...prev, newValue]))
  }

  // Nhảy tab từ trong nội dung (nút "Sửa ở tab ..." của panel Kiểm tra)
  const goToTab = (tab: number) => handleTabChange(null, tab)

  const onSubmit = (data: FormValues) => {
    // Validate: nếu use_url_by_duration=true thì phải có ít nhất 1 row có URL
    // Tránh bug ghi đè url_by_duration thành empty khi rows toàn trống
    const validateDurationUrls = (sectionKey: 'buy_rotating' | 'buy_static', label: string): boolean => {
      const section = (data as any)[sectionKey]

      if (!section?.enabled || !section?.use_url_by_duration) return true
      // Ưu tiên duration_units (mới), fallback duration_urls (legacy)
      const rows = (section.duration_units?.length ? section.duration_units : section.duration_urls) || []
      const validRows = rows.filter((r: any) => r.days && r.url)

      if (validRows.length === 0) {
        toast.error(`${label}: Đã chọn "URL theo thời hạn" nhưng chưa có URL/đơn vị nào. Vui lòng nhập hoặc chuyển sang "URL chung".`)
        return false
      }

      // Check duplicate days — JS object key sẽ ghi đè, mất URL
      const daysCount: Record<string, number> = {}

      validRows.forEach((r: any) => {
        const d = String(r.days).trim()

        daysCount[d] = (daysCount[d] || 0) + 1
      })
      const dupDays = Object.entries(daysCount).filter(([, c]) => c > 1).map(([d]) => d)

      if (dupDays.length > 0) {
        toast.error(`${label}: Trùng số ngày (${dupDays.join(', ')}). Mỗi giá trị ngày chỉ map được 1 URL.`)
        return false
      }

      return true
    }

    if (!validateDurationUrls('buy_rotating', 'Mua proxy xoay')) return
    if (!validateDurationUrls('buy_static', 'Mua proxy tĩnh')) return

    const apiConfig = buildApiConfig(data)

    const payload: any = {
      title: data.title,
      token_api: data.token_api,
      provider_code: data.provider_code,
      order: Number(data.order) || 0,
      status: data.status
    }

    if (data.rotation_interval) {
      payload.rotation_interval = Number(data.rotation_interval)
    }

    if (data.contact) {
      payload.contact = data.contact
    }

    if (apiConfig) {
      payload.api_config = apiConfig
    }

    // Merge cấu hình tab Residential (ref chỉ tồn tại khi tab đã mở — chưa mở thì BE giữ nguyên)
    if (residentialRef.current) {
      const r = residentialRef.current.build()

      if (!r.ok) {
        toast.error(`Tab Residential: ${r.error}`)
        setActiveTab(5)
        return
      }

      payload.api_config = { ...(payload.api_config || {}), ...r.config }
    }

    const mutation = type === 'create' ? createMutation : updateMutation

    mutation.mutate(payload, {
      onSuccess: () => {
        toast.info(type === 'create' ? 'Thêm nhà cung cấp thành công!' : 'Cập nhật thành công!')

        // Config vừa đổi → kết quả kiểm + thẻ tóm tắt cũ đã sai (cache 30s). Không xoá thì admin sửa lỗi
        // xong vào tab Kiểm tra vẫn thấy báo đỏ như cũ → tưởng sửa không ăn.
        if (configCode) {
          queryClient.invalidateQueries({ queryKey: ['configValidate', configCode] })
          queryClient.invalidateQueries({ queryKey: ['configCard', configCode] })
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
      }
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog
      onClose={onClose}
      open={open}
      closeAfterTransition={false}
      PaperProps={{ sx: PAPER_SX }}
      fullWidth
      maxWidth='xl'
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: 12 }}>
        <Typography variant='h5' component='span'>
          {type === 'create' ? 'Thêm mới nhà cung cấp' : 'Cập nhật nhà cung cấp'}
        </Typography>
        {activeTab <= 4 && (
          <Button
            type='button'
            size='small'
            variant='tonal'
            color='secondary'
            onClick={toggleJson}
            startIcon={<i className='tabler-code' style={{ fontSize: 16 }} />}
            sx={{ ml: 'auto', textTransform: 'none', flexShrink: 0 }}
          >
            {showJson ? 'Ẩn JSON' : 'Xem JSON'}
          </Button>
        )}
        <DialogCloseButton onClick={onClose} disableRipple>
          <i className='tabler-x' />
        </DialogCloseButton>
      </DialogTitle>

      {/* KHÔNG cho DialogContent tự cuộn ở md+ — trước đây nó dư ~46px nên LUÔN có thanh cuộn ngoài,
          cuộn trúng là rail tab + thanh Proxy xoay/tĩnh trôi mất. Giờ chỉ từng cột tự cuộn bên trong. */}
      <DialogContent sx={{ display: { md: 'flex' }, overflow: { xs: 'auto', md: 'hidden' }, minHeight: 0 }}>
        <Grid2 container spacing={0} sx={{ width: '100%', height: { md: '100%' }, minHeight: 0 }}>
          {/* ═══════ BÊN TRÁI: Vertical Tabs (đứng yên, không cuộn theo nội dung) ═══════ */}
          <Grid2 size={{ xs: 12, md: 'auto' }} sx={{ height: { md: '100%' }, overflowY: { md: 'auto' } }}>
            <Tabs
              orientation='vertical'
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                minWidth: 170,
                borderRight: '1px solid',
                borderColor: 'divider',
                mr: 2,
                '& .MuiTab-root': {
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  textTransform: 'none',
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 500,
                  px: 1.5,
                  justifyContent: 'flex-start'
                },
                '& .Mui-selected': {
                  fontWeight: 600
                }
              }}
            >
              {TABS.map((tab, i) => (
                <Tab
                  key={i}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <i className={tab.icon} style={{ fontSize: 16, opacity: 0.7 }} />
                      <span>{tab.label}</span>
                      {/* Tab Kiểm tra: chấm theo MỨC CẢNH BÁO (đỏ/vàng/xanh); tab khác: bật/tắt */}
                      {i > 0 &&
                        (i === CHECK_TAB_INDEX ? (
                          <Box
                            sx={{
                              ml: 'auto',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: LEVEL_DOT[checkLevel] || 'action.disabled',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              ml: 'auto',
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: tabEnabled[i] ? '#4caf50' : '#e0e0e0',
                              flexShrink: 0
                            }}
                          />
                        ))}
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Grid2>

          {/* ═══════ GIỮA: Tab Content ═══════ */}
          <Grid2
            size={{ xs: 12, md: 'grow' as any }}
            sx={{ height: { md: '100%' }, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <Box
              component='form'
              onSubmit={handleSubmit(onSubmit)}
              sx={{
                display: activeTab === CHECK_TAB_INDEX ? 'none' : 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0
              }}
            >
              {/* pb rộng để card cuối không bị cắt sát mép vùng cuộn */}
              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 2, pb: 4, ...LABEL_WRAP_SX }}>
                {/* Tab 0: Cơ bản */}
                <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
                  <BasicInfoSection control={control} errors={errors} />
                </Box>

                {/* Tab 1: Mua proxy */}
                {renderedTabs.has(1) && (
                  <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
                    <BuyConfigSection control={control} setValue={setValue} />
                  </Box>
                )}

                {/* Tab 2: Xoay proxy */}
                {renderedTabs.has(2) && (
                  <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
                    <RotateSection control={control} />
                  </Box>
                )}

                {/* Tab 3: IP Whitelist */}
                {renderedTabs.has(3) && (
                  <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
                    <IpWhitelistSection control={control} />
                  </Box>
                )}

                {/* Tab 4: Gia hạn */}
                {renderedTabs.has(4) && (
                  <Box sx={{ display: activeTab === 4 ? 'block' : 'none' }}>
                    <RenewSection control={control} />
                  </Box>
                )}

                {/* Tab 5: Residential */}
                {renderedTabs.has(5) && (
                  <Box sx={{ display: activeTab === 5 ? 'block' : 'none' }}>
                    <ResidentialProviderSection provider={providerData} stateRef={residentialRef} />
                  </Box>
                )}

                {/* Tab 6: Liên hệ */}
                {renderedTabs.has(6) && (
                  <Box sx={{ display: activeTab === 6 ? 'block' : 'none' }}>
                    <ContactInfoSection control={control} />
                  </Box>
                )}
              </Box>
            </Box>

            {/* Tab 7: Kiểm tra — NGOÀI <form> để nút Test / dropdown không submit nhầm form provider */}
            {isEditMode && renderedTabs.has(CHECK_TAB_INDEX) && (
              <Box
                sx={{
                  display: activeTab === CHECK_TAB_INDEX ? 'block' : 'none',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  pr: 2,
                  pb: 4
                }}
              >
                <ConfigToolPanel
                  code={providerData?.provider_code}
                  providerId={providerData?.id}
                  onGoToTab={goToTab}
                />
              </Box>
            )}
          </Grid2>

          {/* ═══════ BÊN PHẢI: JSON Preview — ẩn ở tab Residential/Liên hệ/Kiểm tra, và bật/tắt được ═══════ */}
          {activeTab <= 4 && showJson && (
            <Grid2 size={{ xs: 12, md: 4 }} sx={{ height: { md: '100%' }, minHeight: 0 }}>
              <JsonPreviewPanel jsonPreview={jsonPreview} />
            </Grid2>
          )}
        </Grid2>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant='tonal' color='secondary' disabled={isPending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit(onSubmit)} variant='contained' disabled={isPending} sx={{ color: '#fff' }}>
          {isPending ? 'Đang xử lý...' : type === 'create' ? 'Thêm mới' : 'Cập nhật'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
