'use client'

import { useState, useEffect, useMemo } from 'react'

import { useRouter, useParams } from 'next/navigation'

import Divider from '@mui/material/Divider'
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  FormControlLabel,
  Switch,
  Grid2,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress
} from '@mui/material'

import { toast } from 'react-toastify'

import { ArrowLeft, Plus, X } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

import CustomTextField from '@/@core/components/mui/TextField'
import { useProviders } from '@/hooks/apis/useProviders'
import { useServiceType, useUpdateServiceType, useServiceTypes } from '@/hooks/apis/useServiceType'
import MultiInputModal from '@/views/Client/Admin/ServiceType/MultiInputModal'
import PriceByDurationModal from '@/views/Client/Admin/ServiceType/PriceByDurationModal'

// Yup validation schema (same as CreateServicePage)
const schema = yup.object({
  name: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value))
    .required('Tên dịch vụ là bắt buộc')
    .min(1, 'Tên dịch vụ là bắt buộc'),
  api_partner: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value))
    .required('Api Partner là bắt buộc')
    .min(1, 'Api Partner là bắt buộc'),
  cost_price: yup
    .number()
    .nullable()
    .typeError('Giá nhập phải là số')
    .positive('Giá nhập phải lớn hơn 0'),
  code: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value)),
  status: yup.string().nullable().required('Trạng thái là bắt buộc'),
  provider_id: yup.string().nullable().required('Nhà cung cấp là bắt buộc'),
  type: yup.string().nullable().required('Loại dịch vụ là bắt buộc'),
  ip_version: yup.string().nullable().required('IP Version là bắt buộc'),
  protocols: yup
    .array()
    .nullable()
    .of(yup.string())
    .min(1, 'Vui lòng chọn ít nhất một giao thức')
    .required('Proxy type là bắt buộc')
    .default([]),
  body_api: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value))
    .required('Body Api là bắt buộc')
    .min(1, 'Body Api là bắt buộc')
    .test('is-valid-json', 'Body Api phải là JSON hợp lệ', function (value) {
      if (!value) return true

      try {
        JSON.parse(value)
        
return true
      } catch (error) {
        return false
      }
    }),
  proxy_type: yup.string().nullable().required('Proxy type là bắt buộc'),
  country: yup.string().nullable().required('Quốc gia là bắt buộc'),
  note: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value)),
  tag: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value))
})

interface EditServicePageProps {
  serviceId: string
}

export default function EditServicePage({ serviceId }: EditServicePageProps) {
  const router = useRouter()
  const params = useParams()
  const { lang: locale } = params

  // Fetch providers data
  const { data: providers = [], isLoading: loadingProviders } = useProviders()

  // React Hook Form
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm({
    resolver: async (data, context, options) => {
      try {
        const values = await schema.validate(data, { abortEarly: false })

        
return { values, errors: {} }
      } catch (err: any) {
        const formattedErrors = err.inner.reduce(
          (allErrors: any, currentError: any) => ({
            ...allErrors,
            [currentError.path]: {
              type: currentError.type ?? 'validation',
              message: currentError.message
            }
          }),
          {}
        )

        
return { values: {}, errors: formattedErrors }
      }
    },
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      api_partner: '',
      cost_price: undefined,
      code: '',
      status: 'active',
      provider_id: '',
      type: '0',
      ip_version: 'ipv4',
      protocols: [],
      body_api: '',
      proxy_type: '',
      country: '',
      note: '',
      tag: ''
    }
  })

  const watchProviderId = watch('provider_id')
  const watchType = watch('type')
  const selectedProvider = providers?.find((p: any) => String(p.id) === String(watchProviderId)) || null

  const [isMultiInputModalOpen, setIsMultiInputModalOpen] = useState(false)

  const [multiInputFields, setMultiInputFields] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ])

  const [dateMappingOptions, setDateMappingOptions] = useState<Array<{ key: string; label: string }>>([])

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)

  const [priceFields, setPriceFields] = useState<Array<{ key: string; value: string; cost?: string }>>([
    { key: '', value: '', cost: '' }
  ])

  const ITEM_HEIGHT = 48
  const ITEM_PADDING_TOP = 8

  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250
      }
    }
  }

  // Fetch service data
  const { data: serviceData, isLoading, isError, error } = useServiceType(serviceId)

  // Fetch tất cả service types để lấy danh sách protocols
  const { data: serviceTypes = [] } = useServiceTypes()

  // Lấy danh sách protocols từ tất cả service types và loại bỏ trùng lặp
  const protocols = useMemo(() => {
    const allProtocols = new Set<string>()

    serviceTypes.forEach((service: any) => {
      if (service.protocols && Array.isArray(service.protocols)) {
        service.protocols.forEach((protocol: string) => {
          allProtocols.add(protocol)
        })
      }
    })
    
return Array.from(allProtocols).map(protocol => ({
      value: protocol,
      label: protocol.toUpperCase()
    }))
  }, [serviceTypes])

  // Load data vào form khi fetch xong
  useEffect(() => {
    if (serviceData) {
      // Convert api_body từ object sang string JSON để hiển thị trong textarea
      let bodyApiString = ''

      if (serviceData.api_body) {
        try {
          bodyApiString =
            typeof serviceData.api_body === 'string'
              ? serviceData.api_body
              : JSON.stringify(serviceData.api_body, null, 2)
        } catch (error) {
          console.error('Error parsing api_body:', error)
          bodyApiString = ''
        }
      }

      // Load multi_inputs từ API
      if (serviceData.multi_inputs && Array.isArray(serviceData.multi_inputs)) {
        setMultiInputFields(serviceData.multi_inputs.length > 0 ? serviceData.multi_inputs : [{ key: '', value: '' }])
      }

      // Load price_by_duration từ API
      if (serviceData.price_by_duration && Array.isArray(serviceData.price_by_duration)) {
        setPriceFields(
          serviceData.price_by_duration.length > 0
            ? serviceData.price_by_duration.map((item: any) => ({
                key: item.key || '',
                value: item.value || '',
                cost: item.cost || ''
              }))
            : [{ key: '', value: '', cost: '' }]
        )
      }

      reset({
        name: serviceData.name || '',
        api_partner: serviceData.api_partner || '',
        cost_price: serviceData.cost_price || undefined,
        code: serviceData.code || '',
        status: serviceData.status || 'active',
        provider_id: serviceData.provider_id || '',
        type: serviceData.type || '0',
        ip_version: serviceData.ip_version || 'ipv4',
        protocols: serviceData.protocols || [],
        body_api: bodyApiString,
        proxy_type: serviceData.proxy_type || '',
        country: serviceData.country || '',
        note: serviceData.note || '',
        tag: serviceData.tag || ''
      })
    }
  }, [serviceData, reset])

  const updateMutation = useUpdateServiceType(serviceId)

  // Custom handlers cho mutation
  const handleUpdateSuccess = () => {
    toast.success('Cập nhật dịch vụ thành công!')
    router.push(`/${locale}/admin/service-type`)
  }

  const handleUpdateError = (error: any) => {
    toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
  }

  const onSubmit = (data: any) => {
    // Đảm bảo cost được gửi đi trong price_by_duration
    const formattedPriceFields = priceFields.map((field: any) => ({
      key: field.key,
      value: field.value,
      cost: field.cost || ''
    }))

    const submitData = {
      ...data,
      api_type: 'buy_api',
      multi_inputs: multiInputFields,
      price_by_duration: formattedPriceFields
    }

    console.log('Submit Data:', submitData)
    console.log('Price Fields with Cost:', formattedPriceFields)

    updateMutation.mutate(submitData, {
      onSuccess: handleUpdateSuccess,
      onError: handleUpdateError
    })
  }

  const onError = (errors: any) => {
    const errorMessages = Object.values(errors)
      .map((error: any) => error?.message)
      .filter(Boolean)

    if (errorMessages.length > 0) {
      toast.error(errorMessages[0] as string)
    }
  }

  // Multi Input Modal handlers
  const handleOpenMultiInputModal = () => {
    setIsMultiInputModalOpen(true)
  }

  const handleCloseMultiInputModal = () => {
    setIsMultiInputModalOpen(false)
  }

  const handleSaveMultiInputs = (fields: Array<{ key: string; value: string }>) => {
    console.log('Multi Input Fields:', fields)
    toast.success(`Đã lưu ${fields.length} trường thành công!`)
    handleCloseMultiInputModal()
  }

  // Price Modal handlers
  const handleOpenPriceModal = () => {
    setIsPriceModalOpen(true)
  }

  const handleClosePriceModal = () => {
    setIsPriceModalOpen(false)
  }

  const handleSavePrices = (fields: Array<{ key: string; value: string; cost?: string }>) => {
    setPriceFields(fields)
    console.log('Price Fields:', fields)
    toast.success('Đã lưu giá thành công!')
    handleClosePriceModal()
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card className='orders-content'>
        <CardContent>
          <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (isError) {
    return (
      <Card className='orders-content'>
        <CardContent>
          <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center' minHeight='400px' gap={2}>
            <Typography variant='h6' color='error'>
              Không thể tải dữ liệu dịch vụ
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải dữ liệu'}
            </Typography>
            <Button variant='contained' onClick={() => router.push(`/${locale}/admin/service-type`)}>
              Quay lại danh sách
            </Button>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='orders-content'>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <Box>
            <h2 className='text-xl font-semibold text-slate-900 mb-4'>Thông tin cơ bản</h2>
            <Grid2 container spacing={3} className='pb-6 border-b border-slate-200'>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  name='name'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      required
                      size='medium'
                      fullWidth
                      label='Tên dịch vụ'
                      placeholder='Nhập tên dịch vụ'
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  name='api_partner'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      size='medium'
                      required
                      {...field}
                      fullWidth
                      label='Api Partner'
                      placeholder='Placeholder'
                      error={!!errors.api_partner}
                      helperText={errors.api_partner?.message}
                    />
                  )}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  name='cost_price'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      value={field.value}
                      onChange={e => {
                        const value = e.target.value === '' ? null : Number(e.target.value)

                        field.onChange(value)
                      }}
                      size='medium'
                      fullWidth
                      type='number'
                      label='Giá nhập'
                      placeholder='Nhập giá nhập'
                      error={!!errors.cost_price}
                      helperText={errors.cost_price?.message}
                    />
                  )}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  name='code'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      size='medium'
                      fullWidth
                      label='Mã sản phẩm (Code)'
                      placeholder='Nhập code'
                      error={!!errors.code}
                      helperText={errors.code?.message || `ID: ${serviceId}`}
                    />
                  )}
                />
              </Grid2>
            </Grid2>
          </Box>

          <Box>
            <h2 className='text-xl font-semibold text-slate-900 mb-4 mt-4'>Cấu hình dịch vụ</h2>

            <Grid2 container spacing={5} className='pb-6 border-b border-slate-200'>
              <Grid2 size={{ xs: 12, sm: 4 }}>
                <Controller
                  name='type'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      size='medium'
                      fullWidth
                      select
                      id='select-type'
                      label='Type'
                      error={!!errors.type}
                      helperText={errors.type?.message}
                      slotProps={{
                        select: { displayEmpty: true },
                        htmlInput: { 'aria-label': 'Without label' }
                      }}
                    >
                      <MenuItem value='0'>STATIC</MenuItem>
                      <MenuItem value='1'>ROTATING</MenuItem>
                    </CustomTextField>
                  )}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, sm: 4 }}>
                <Controller
                  name='status'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      size='medium'
                      fullWidth
                      select
                      id='select-status'
                      label='Trạng thái'
                      error={!!errors.status}
                      helperText={errors.status?.message}
                      slotProps={{
                        select: { displayEmpty: true },
                        htmlInput: { 'aria-label': 'Without label' }
                      }}
                    >
                      <MenuItem value='active'>ACTIVE — Hiển thị & Bán</MenuItem>
                      <MenuItem value='maintenance'>MAINTENANCE — Hiển thị & Không bán</MenuItem>
                      <MenuItem value='slow'>SLOW — Hiển thị & Không bán</MenuItem>
                      <MenuItem value='hidden'>HIDDEN — Ẩn & Vẫn bán được</MenuItem>
                      <MenuItem value='inactive'>INACTIVE — Ẩn & Không bán</MenuItem>
                    </CustomTextField>
                  )}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, sm: 4 }}>
                <Controller
                  name='proxy_type'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      size='medium'
                      fullWidth
                      select
                      id='select-proxy_type'
                      label='Proxy Type'
                      value={field.value || ''}
                      error={!!errors.proxy_type}
                      helperText={errors.proxy_type?.message}
                      slotProps={{
                        select: { displayEmpty: true },
                        htmlInput: { 'aria-label': 'Without label' }
                      }}
                    >
                      <MenuItem value=''>
                        <em>Chọn proxy type</em>
                      </MenuItem>
                      <MenuItem value='residential'>Dân cư</MenuItem>
                      <MenuItem value='datacenter'>Datacenter</MenuItem>
                    </CustomTextField>
                  )}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, sm: 4 }}>
                <Controller
                  name='ip_version'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      size='medium'
                      fullWidth
                      select
                      id='select-ip-version'
                      label='Ip Version'
                      error={!!errors.ip_version}
                      helperText={errors.ip_version?.message}
                      slotProps={{
                        select: { displayEmpty: true },
                        htmlInput: { 'aria-label': 'Without label' }
                      }}
                    >
                      <MenuItem value='ipv4'>V4</MenuItem>
                      <MenuItem value='ipv6'>V6</MenuItem>
                    </CustomTextField>
                  )}
                />
              </Grid2>
            </Grid2>
          </Box>

          <Box>
            <h2 className='text-xl font-semibold text-slate-900 mb-4 mt-4'>Vị trí</h2>
            <Grid2 container spacing={5} className='pb-6 border-b border-slate-200'>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  name='provider_id'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      size='medium'
                      fullWidth
                      select
                      id='select-provider'
                      label='Nhà cung cấp'
                      disabled={loadingProviders}
                      error={!!errors.provider_id}
                      helperText={errors.provider_id?.message}
                      slotProps={{
                        select: { displayEmpty: true },
                        htmlInput: { 'aria-label': 'Without label' }
                      }}
                    >
                      <MenuItem value=''>
                        <em>{loadingProviders ? 'Đang tải...' : 'Chọn nhà cung cấp'}</em>
                      </MenuItem>
                      {providers?.filter((p: any) => p.status === 'active').map((provider: any) => (
                        <MenuItem key={provider.id} value={provider.id}>
                          <span style={{ color: '#94a3b8', fontSize: 12, marginRight: 6 }}>#{provider.id}</span>
                          {provider.title || provider.name}
                          {provider.provider_code && (
                            <span style={{ color: '#6366f1', fontSize: 11, marginLeft: 6, fontFamily: 'monospace' }}>
                              [{provider.provider_code}]
                            </span>
                          )}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  )}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  name='country'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      size='medium'
                      fullWidth
                      select
                      id='select-country'
                      label='Quốc gia'
                      value={field.value || ''}
                      error={!!errors.country}
                      helperText={errors.country?.message}
                      slotProps={{
                        select: { displayEmpty: true },
                        htmlInput: { 'aria-label': 'Without label' }
                      }}
                    >
                      <MenuItem value=''>
                        <em>Chọn quốc gia</em>
                      </MenuItem>
                      <MenuItem value='vi'>Việt Nam</MenuItem>
                    </CustomTextField>
                  )}
                />
              </Grid2>
            </Grid2>
          </Box>

          <Box>
            <h2 className='text-xl font-semibold text-slate-900 mb-4 mt-4'>Cấu hình body</h2>
            <Grid2 container spacing={5} className='pb-6 border-b border-slate-200'>
              <Grid2 size={{ xs: 12, sm: 12 }}>
                <Controller
                  name='body_api'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      rows={6}
                      fullWidth
                      multiline
                      label='Body Api'
                      id='textarea-outlined-static'
                      error={!!errors.body_api}
                      helperText={errors.body_api?.message}
                    />
                  )}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, sm: 12 }}>
                <div className='flex gap-2'>
                  <Button
                    onClick={handleOpenMultiInputModal}
                    className='text-white'
                    variant='contained'
                    color='secondary'
                    startIcon={<Plus size={16} />}
                  >
                    Thêm nhiều trường
                  </Button>

                  <Button
                    onClick={handleOpenPriceModal}
                    className='text-white'
                    variant='contained'
                    color='info'
                    startIcon={<Plus size={16} />}
                  >
                    Set giá theo thời gian
                  </Button>
                </div>
              </Grid2>
            </Grid2>
          </Box>

          <Box>
            <h2 className='text-xl font-semibold text-slate-900 mb-4 mt-4'>Tùy chọn</h2>
            <Grid2 container spacing={5} className='pb-6 border-b border-slate-200'>
              <Grid2 size={{ xs: 12, sm: 4 }}>
                <Controller
                  name='protocols'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      select
                      fullWidth
                      size='medium'
                      label='Giao thức'
                      value={field.value || []}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      error={!!errors.protocols}
                      helperText={errors.protocols?.message}
                      id='select-multiple-protocols'
                      slotProps={{
                        select: {
                          multiple: true,
                          MenuProps,
                          renderValue: selected => {
                            const values = selected as unknown as string[]

                            if (!values || values.length === 0) {
                              return <em>Chọn giao thức</em>
                            }

                            
return (
                              <div className='flex flex-wrap gap-1'>
                                {values.map(val => {
                                  const protocol = protocols.find(p => p.value === val)

                                  
return <Chip key={val} label={protocol?.label || val} size='small' />
                                })}
                              </div>
                            )
                          }
                        }
                      }}
                    >
                      {protocols.map(protocol => (
                        <MenuItem key={protocol.value} value={protocol.value}>
                          {protocol.label}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  )}
                />
              </Grid2>

              <FormControlLabel control={<Switch />} label='Hiện thị user/pass' />
            </Grid2>
          </Box>

          <Box>
            <h2 className='text-xl font-semibold text-slate-900 mb-4 mt-4'>Ghi chú & Tags</h2>
            <Grid2 container spacing={5} className='pb-6 border-b border-slate-200'>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  name='tag'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label='Tags'
                      placeholder='VD: nhanh, ổn định, hot (phân cách bằng dấu phẩy)'
                      id='input-tag'
                      error={!!errors.tag}
                      helperText={errors.tag?.message || 'Các tag hiển thị trên thẻ sản phẩm'}
                    />
                  )}
                />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}></Grid2>
              <Grid2 size={{ xs: 12, sm: 12 }}>
                <Controller
                  name='note'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      rows={3}
                      fullWidth
                      multiline
                      label='Mô tả sản phẩm'
                      placeholder='Nhập mô tả chi tiết sản phẩm (hiển thị trên thẻ sản phẩm)'
                      id='textarea-note'
                      error={!!errors.note}
                      helperText={errors.note?.message}
                      sx={{ '& .MuiInputBase-inputMultiline': { resize: 'vertical' } }}
                    />
                  )}
                />
              </Grid2>
            </Grid2>
          </Box>

          <Box className='mt-6 pb-6'>
            <Grid2 container spacing={3}>
              <Grid2 size={{ xs: 12 }}>
                <div className='flex gap-3 justify-end'>
                  <Button variant='outlined' onClick={() => router.push(`/${locale}/admin/service-type`)}>
                    Hủy
                  </Button>
                  <Button
                    variant='contained'
                    type='button'
                    className='text-white'
                    disabled={updateMutation.isPending}
                    startIcon={updateMutation.isPending ? <CircularProgress size={20} color='inherit' /> : null}
                    onClick={async () => {
                      await handleSubmit(onSubmit, onError)()
                    }}
                  >
                    {updateMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật dịch vụ'}
                  </Button>
                </div>
              </Grid2>
            </Grid2>
          </Box>
        </form>
      </CardContent>

      {/* Modal thêm nhiều input */}
      <MultiInputModal
        isOpen={isMultiInputModalOpen}
        onClose={handleCloseMultiInputModal}
        onSave={handleSaveMultiInputs}
        title='Thêm nhiều trường'
        keyLabel='Key'
        valueLabel='Value'
        fields={multiInputFields}
        setFields={setMultiInputFields}
      />

      {/* Modal set giá theo thời gian */}
      <PriceByDurationModal
        isOpen={isPriceModalOpen}
        onClose={handleClosePriceModal}
        onSave={handleSavePrices}
        fields={priceFields}
        setFields={setPriceFields}
        provider={selectedProvider}
        proxyType={watchType}
      />
    </Card>
  )
}
