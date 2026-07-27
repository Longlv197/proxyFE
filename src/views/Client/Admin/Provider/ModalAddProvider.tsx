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
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
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
  useProviders,
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
import DraftBanner from './components/DraftBanner'
import CopyFromProviderDialog from './components/CopyFromProviderDialog'
import { useProviderDraft } from './useProviderDraft'
import RotateSection from './sections/RotateSection'
import IpWhitelistSection from './sections/IpWhitelistSection'
import RenewSection from './sections/RenewSection'
import ContactInfoSection from './sections/ContactInfoSection'
import JsonPreviewPanel from './components/JsonPreviewPanel'
import ConfigToolPanel from './components/ConfigToolPanel'
import OverviewPanel from './components/OverviewPanel'
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

// Tab "Kiểm tra" và "Tổng quan" chỉ có ở edit mode (cần provider đã lưu để đối chiếu DB).
// Chỉ số của chúng nằm SAU BASE_TABS (7, 8) — KHÔNG chèn vào giữa vì mọi chỗ so `activeTab === N`
// đang dùng chỉ số cứng của BASE_TABS. Thứ tự HIỂN THỊ trên rail thì đặt riêng ở TAB_ORDER.
const CHECK_TAB = { label: 'Kiểm tra', icon: 'tabler-checklist' }
const CHECK_TAB_INDEX = BASE_TABS.length // = 7
const OVERVIEW_TAB = { label: 'Tổng quan', icon: 'tabler-layout-dashboard' }
const OVERVIEW_TAB_INDEX = BASE_TABS.length + 1 // = 8

// Nhớ lựa chọn hiện/ẩn cột JSON của admin (localStorage). Chưa chọn lần nào → theo bề ngang màn hình.
const JSON_PREF_KEY = 'provider_modal_json_visible'

// Công tắc "Hướng dẫn": ẩn/hiện các khối giảng giải dài (đánh dấu bằng class 'provider-guide').
// Mặc định ẨN — admin đã quen thì form ngắn đi gần nửa; ai cần đọc thì bật, hệ thống nhớ lựa chọn.
const GUIDE_PREF_KEY = 'provider_modal_guide_visible'
const HIDE_GUIDE_SX = { '& .provider-guide': { display: 'none' } }

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

// ─── Trạng thái từng tab ────────────────────────────
// 'off' = chưa bật · 'ok' = bật & đủ field tối thiểu · 'missing' = ĐANG BẬT nhưng THIẾU field bắt buộc.
// Trước đây chấm chỉ báo bật/tắt → NCC bật mua mà quên URL vẫn chấm xanh (nói dối).
type TabState = 'off' | 'ok' | 'missing'

const TAB_DOT: Record<TabState, string> = {
  off: 'action.disabled',
  ok: 'success.main',
  missing: 'warning.main'
}

const TAB_DOT_HINT: Record<TabState, string> = {
  off: 'Chưa bật',
  ok: 'Đã bật, đủ thông tin tối thiểu',
  missing: 'Đang bật nhưng THIẾU thông tin bắt buộc — vào tab này kiểm lại'
}

/** Có URL mua chưa? (URL chung, hoặc ít nhất 1 dòng URL theo thời hạn — kể cả format cũ duration_urls) */
const hasBuyUrl = (buy: any): boolean => {
  if (!buy) return false

  if (buy.use_url_by_duration) {
    const rows = [...(buy.duration_units || []), ...(buy.duration_urls || [])]

    return rows.some((r: any) => String(r?.url || '').trim() !== '')
  }

  return String(buy.url || '').trim() !== ''
}

/**
 * Tính trạng thái 7 tab từ giá trị form (tab Residential lấy từ config ĐÃ LƯU vì state của nó
 * nằm cục bộ trong section, không nằm trong react-hook-form).
 */
const computeTabStatus = (v: any, providerData?: any): TabState[] => {
  const rot = v?.buy_rotating
  const sta = v?.buy_static
  const buyOn = !!rot?.enabled || !!sta?.enabled
  const buyMissing = (rot?.enabled && !hasBuyUrl(rot)) || (sta?.enabled && !hasBuyUrl(sta))

  const flag = (on: boolean, ok: boolean): TabState => (!on ? 'off' : ok ? 'ok' : 'missing')

  const cfg = providerData?.api_config || {}
  const eps = cfg.residential_endpoints || {}
  const residentialOn = cfg.kind === 'residential'

  return [
    'ok', // Cơ bản — không vẽ chấm
    flag(buyOn, !buyMissing),
    flag(!!v?.rotate?.enabled, String(v?.rotate?.url || '').trim() !== ''),
    flag(!!v?.ip_whitelist?.enabled, String(v?.ip_whitelist?.param || '').trim() !== ''),
    flag(!!v?.renew?.enabled, String(v?.renew?.url || '').trim() !== ''),
    flag(residentialOn, !!String(eps.balance || '').trim() && !!String(eps.tariffs || '').trim()),
    'ok' // Liên hệ — không có gì bắt buộc
  ]
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

  // Rail tab: edit mode thì "Tổng quan" đứng ĐẦU (màn đọc trước), "Kiểm tra" đứng CUỐI.
  // value = chỉ số logic (không đổi), thứ tự trong mảng = thứ tự hiển thị.
  const TABS: Array<{ label: string; icon: string; value: number }> = isEditMode
    ? [
        { ...OVERVIEW_TAB, value: OVERVIEW_TAB_INDEX },
        ...BASE_TABS.map((t, i) => ({ ...t, value: i })),
        { ...CHECK_TAB, value: CHECK_TAB_INDEX }
      ]
    : BASE_TABS.map((t, i) => ({ ...t, value: i }))

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

  // Công tắc hướng dẫn — mặc định ẩn, nhớ lựa chọn
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setShowGuide(window.localStorage.getItem(GUIDE_PREF_KEY) === '1')
  }, [])

  const toggleGuide = () =>
    setShowGuide(prev => {
      const next = !prev

      if (typeof window !== 'undefined') window.localStorage.setItem(GUIDE_PREF_KEY, next ? '1' : '0')

      return next
    })

  const queryClient = useQueryClient()
  const configCode = isEditMode ? providerData?.provider_code : undefined
  const { data: configValidate } = useValidateConfig(configCode)
  const { data: configCard, isLoading: configCardLoading } = useConfigCard(configCode)
  const checkLevel = configLevel(configValidate, configCard)

  const createMutation = useCreateProvider()
  const updateMutation = useUpdateProvider(providerData?.id)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState
  } = useForm<FormValues>({ defaultValues })

  // ⚠ formState của react-hook-form là Proxy: chỉ theo dõi field nào được ĐỌC LÚC RENDER.
  // Đọc isDirty ở đây (không phải trong callback) thì nó mới thực sự cập nhật —
  // đọc trong callback thì mãi là false và nháp không bao giờ được ghi.
  const { errors, isDirty } = formState

  // Nháp NCC đang sửa — chống mất công khi đóng máy giữa chừng. Lưu ở trình duyệt, KHÔNG lên server.
  const {
    draft,
    save: saveDraft,
    clear: clearDraft
  } = useProviderDraft({
    providerCode: type === 'edit' ? providerData?.provider_code : undefined,
    updatedAt: providerData?.updated_at
  })

  /** Đã xử lý dải nháp (khôi phục hoặc bỏ) → không hiện lại trong phiên mở này. */
  const [draftHandled, setDraftHandled] = useState(false)

  /** Đã chép cấu hình từ NCC nào — hiện nhắc để admin nhớ sửa lại cho đúng NCC mới. */
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)

  // Danh sách NCC để chép — chỉ nạp khi TẠO MỚI và admin đã mở hộp chọn (không tải thừa).
  const { data: allProviders } = useProviders()

  const copySourceProviders = (Array.isArray(allProviders) ? allProviders : []).filter(
    (p: any) => p?.api_config && (p.api_config.buy || p.api_config.buy_static || p.api_config.buy_rotating)
  )

  // Trạng thái chấm trên rail tab — tính lại trong cùng nhịp debounce với JSON preview
  // (không đăng ký thêm useWatch cho từng field → không re-render cả modal mỗi lần gõ phím).
  const [tabStatus, setTabStatus] = useState<TabState[]>(() => computeTabStatus(defaultValues))

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
        const config = buildApiConfig(values as FormValues, providerData?.api_config)
        setJsonPreview(config ? JSON.stringify(config, null, 2) : '// Chưa có cấu hình API')
        setTabStatus(computeTabStatus(values, providerData))

        // Ghi nháp cùng nhịp debounce sẵn có — không thêm vòng lặp/timer mới.
        // Chỉ ghi khi admin đã thực sự sửa gì đó (dirty), tránh đè nháp cũ bằng dữ liệu vừa nạp.
        if (isDirty) saveDraft(values)
      }, 500)
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [watch, providerData, isDirty, saveDraft])

  // Load data on edit
  useEffect(() => {
    if (!open) return

    // Modal KHÔNG unmount giữa 2 lần mở → timer debounce của provider TRƯỚC có thể còn treo và
    // bắn sau, ghi đè trạng thái tab bằng giá trị form cũ. Huỷ nó trước khi nạp provider mới.
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Cùng lý do: cờ "đã xử lý nháp" của NCC trước phải reset, không thì mở NCC sau
    // sẽ không thấy dải nháp của nó.
    setDraftHandled(false)
    setCopiedFrom(null)

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

      const config = buildApiConfig(values as FormValues, providerData?.api_config)
      setJsonPreview(config ? JSON.stringify(config, null, 2) : '// Chưa có cấu hình API')
      setTabStatus(computeTabStatus(values, providerData))
    } else {
      reset(defaultValues)
      setJsonPreview('// Chưa có cấu hình API')
      setTabStatus(computeTabStatus(defaultValues))
    }

    // Sửa NCC → mở thẳng màn "Tổng quan" (đọc trước rồi mới sửa). Thêm mới → vào tab Cơ bản.
    const firstTab = type === 'edit' && providerData?.id ? OVERVIEW_TAB_INDEX : 0

    setActiveTab(firstTab)
    setRenderedTabs(new Set([firstTab, 0]))
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

    const apiConfig = buildApiConfig(data, providerData?.api_config)

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

        // Lưu được rồi thì nháp vô nghĩa — giữ lại chỉ tổ lần sau mở ra hỏi khôi phục nhầm.
        clearDraft()

        // Config vừa đổi → kết quả kiểm + thẻ tóm tắt cũ đã sai (cache 30s). Không xoá thì admin sửa lỗi
        // xong vào tab Kiểm tra vẫn thấy báo đỏ như cũ → tưởng sửa không ăn.
        if (configCode) {
          queryClient.invalidateQueries({ queryKey: ['configValidate', configCode] })
          queryClient.invalidateQueries({ queryKey: ['configCard', configCode] })
          queryClient.invalidateQueries({ queryKey: ['configSteps', configCode] })
          queryClient.invalidateQueries({ queryKey: ['configExamples'] })
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
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Tooltip title='Hiện/ẩn các đoạn giải thích dài trong form'>
            <Button
              type='button'
              size='small'
              variant={showGuide ? 'contained' : 'tonal'}
              color='secondary'
              onClick={toggleGuide}
              startIcon={<i className='tabler-help-circle' style={{ fontSize: 16 }} />}
              sx={{ textTransform: 'none' }}
            >
              Hướng dẫn
            </Button>
          </Tooltip>
          {/* Chép cấu hình mua từ NCC có sẵn — chỉ khi TẠO MỚI (sửa NCC cũ mà chép là đè mất config đang chạy). */}
          {type === 'create' && (
            <Tooltip title='Điền sẵn phần Mua theo một NCC gần giống. Không chép khoá API.'>
              <Button
                type='button'
                size='small'
                variant='tonal'
                color='secondary'
                onClick={() => setCopyOpen(true)}
                startIcon={<i className='tabler-copy' style={{ fontSize: 16 }} />}
                sx={{ textTransform: 'none' }}
              >
                Chép từ NCC có sẵn
              </Button>
            </Tooltip>
          )}
          {activeTab <= 4 && (
            <Button
              type='button'
              size='small'
              variant='tonal'
              color='secondary'
              onClick={toggleJson}
              startIcon={<i className='tabler-code' style={{ fontSize: 16 }} />}
              sx={{ textTransform: 'none' }}
            >
              {showJson ? 'Ẩn JSON' : 'Xem JSON'}
            </Button>
          )}
        </Box>
        <DialogCloseButton onClick={onClose} disableRipple>
          <i className='tabler-x' />
        </DialogCloseButton>
      </DialogTitle>

      {/* KHÔNG cho DialogContent tự cuộn ở md+ — trước đây nó dư ~46px nên LUÔN có thanh cuộn ngoài,
          cuộn trúng là rail tab + thanh Proxy xoay/tĩnh trôi mất. Giờ chỉ từng cột tự cuộn bên trong. */}
      <DialogContent sx={{ display: { md: 'flex' }, overflow: { xs: 'auto', md: 'hidden' }, minHeight: 0 }}>
        <Grid2 container spacing={0} sx={{ width: '100%', height: { md: '100%' }, minHeight: 0 }}>
          {/* Dải nháp — KHÔNG tự khôi phục, admin bấm mới khôi phục (tự đè sẽ nuốt thay đổi người khác vừa lưu) */}
          {draft && !draftHandled && (
            <Grid2 size={{ xs: 12 }}>
              <DraftBanner
                draft={draft}
                onRestore={() => {
                  reset({ ...getValues(), ...draft.values }, { keepDirty: true })
                  setDraftHandled(true)
                }}
                onDiscard={() => {
                  clearDraft()
                  setDraftHandled(true)
                }}
              />
            </Grid2>
          )}

          {copiedFrom && (
            <Grid2 size={{ xs: 12 }}>
              <Alert severity='info' sx={{ mb: 2 }} onClose={() => setCopiedFrom(null)}>
                Đã chép cấu hình mua từ <b>{copiedFrom}</b> — sửa lại cho đúng NCC mới rồi mới bấm Lưu.
                Khoá API không được chép.
              </Alert>
            </Grid2>
          )}

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
              {TABS.map(tab => (
                <Tab
                  key={tab.value}
                  value={tab.value}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <i className={tab.icon} style={{ fontSize: 16, opacity: 0.7 }} />
                      <span>{tab.label}</span>
                      {/* Chấm trạng thái: tab Kiểm tra theo mức cảnh báo; tab cấu hình theo
                          chưa bật / đủ / ĐANG BẬT MÀ THIẾU field bắt buộc.
                          Tab "Tổng quan" và "Cơ bản" không có chấm. */}
                      {tab.value === CHECK_TAB_INDEX ? (
                        <Tooltip title='Kết quả kiểm cấu hình' placement='right'>
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
                        </Tooltip>
                      ) : tab.value > 0 && tab.value < BASE_TABS.length ? (
                        <Tooltip title={TAB_DOT_HINT[tabStatus[tab.value] || 'off']} placement='right'>
                          <Box
                            sx={{
                              ml: 'auto',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: TAB_DOT[tabStatus[tab.value] || 'off'],
                              flexShrink: 0
                            }}
                          />
                        </Tooltip>
                      ) : null}
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
                // Ẩn hẳn khung form ở các tab ngoài BASE_TABS (Kiểm tra / Tổng quan) — để display:'flex'
                // thì khung rỗng vẫn chiếm nửa chiều cao, đẩy nội dung 2 tab kia xuống dưới.
                display: activeTab < BASE_TABS.length ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0
              }}
            >
              {/* pb rộng để card cuối không bị cắt sát mép vùng cuộn */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  pr: 2,
                  pb: 4,
                  ...LABEL_WRAP_SX,
                  ...(showGuide ? {} : HIDE_GUIDE_SX)
                }}
              >
                {/* Tab 0: Cơ bản */}
                <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
                  <BasicInfoSection control={control} errors={errors} />
                </Box>

                {/* Tab 1: Mua proxy */}
                {renderedTabs.has(1) && (
                  <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
                    {/* providerConfig = bản ĐÃ LƯU, dùng để nhận kiểu mua (dấu hiệu stage1/stage2 nằm ở gốc
                        api_config, không nằm trong khối buy_*). Không phải giá trị form đang sửa. */}
                    <BuyConfigSection
                      control={control}
                      setValue={setValue}
                      providerConfig={providerData?.api_config}
                      providerCode={configCode}
                    />
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

            {/* Tab 8: Tổng quan — màn đọc trước, NGOÀI <form> */}
            {isEditMode && renderedTabs.has(OVERVIEW_TAB_INDEX) && (
              <Box
                sx={{
                  display: activeTab === OVERVIEW_TAB_INDEX ? 'block' : 'none',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  pr: 2,
                  pb: 4
                }}
              >
                <OverviewPanel
                  card={configCard}
                  cardLoading={configCardLoading}
                  validate={configValidate}
                  tabStatus={tabStatus}
                  // Residential lấy trạng thái từ config ĐÃ LƯU (state tab đó nằm cục bộ trong section,
                  // không ở react-hook-form) → nói rõ ra, tránh admin bật xong chưa lưu mà tưởng đã tính.
                  tabLabels={BASE_TABS.map((t, i) => (i === 5 ? `${t.label} (theo bản đã lưu)` : t.label))}
                  onGoToTab={goToTab}
                  onOpenCheck={() => goToTab(CHECK_TAB_INDEX)}
                />
              </Box>
            )}

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

      {/* Chép cấu hình mua từ NCC có sẵn — chỉ điền vào form, KHÔNG tự lưu, KHÔNG chép token */}
      <CopyFromProviderDialog
        open={copyOpen}
        providers={copySourceProviders}
        onClose={() => setCopyOpen(false)}
        onPick={(cfg, fromCode) => {
          Object.entries(cfg).forEach(([section, body]) => {
            if (body) setValue(section as any, parseApiConfig({ [section]: body })[section as never], { shouldDirty: true })
          })
          setCopiedFrom(fromCode)
        }}
      />
    </Dialog>
  )
}
