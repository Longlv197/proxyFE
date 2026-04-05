'use client'

import { memo } from 'react'
import { Controller, useFieldArray, useWatch } from 'react-hook-form'

import Grid2 from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import { Plus, Trash2 } from 'lucide-react'

import CustomTextField from '@core/components/mui/TextField'
import FieldHint from '../components/FieldHint'
import type { SectionProps, FormValues, RenewParamConfig, DurationMapRow } from '../ProviderFormTypes'
import { ORDER_FIELDS, ITEM_FIELDS } from '../ProviderFormTypes'

// ─── Param Row ──────────────────────────────────────

/** Build dynamic item fields từ cấu hình tab Mua (response_mapping + proxy_fields) */
function useDynamicItemFields(control: SectionProps['control']) {
  const buyRotMapping: any[] = useWatch({ control, name: 'buy_rotating.response.response_mapping' }) || []
  const buyStatMapping: any[] = useWatch({ control, name: 'buy_static.response.response_mapping' }) || []
  const buyRotItemId = useWatch({ control, name: 'buy_rotating.response.item_id_field' })
  const buyStatItemId = useWatch({ control, name: 'buy_static.response.item_id_field' })

  const extra: { value: string; label: string }[] = []

  const seen = new Set(ITEM_FIELDS.map(f => f.value))

  const allMappings = [...buyRotMapping, ...buyStatMapping]

  allMappings.forEach((m: any) => {
    if (!m?.to || seen.has(m.to)) return

    const store = m.store || 'metadata'

    const fieldPath = store === 'root' ? m.to
      : store === 'proxy' ? `proxy.${m.to}`
      : store === 'metadata' ? `metadata.${m.to}`
      : `${store}.${m.to}`

    extra.push({ value: fieldPath, label: `${m.to} (${fieldPath}) — từ NCC: ${m.from}` })
    seen.add(m.to)
  })

  const itemId = buyRotItemId || buyStatItemId

  if (itemId && !seen.has('provider_item_id')) {
    extra.push({ value: 'provider_item_id', label: `ID item NCC (provider_item_id) — từ NCC: ${itemId}` })
  }

  return extra
}

function RenewParamRow({
  index, control, onRemove
}: {
  index: number
  control: SectionProps['control']
  onRemove: () => void
}) {
  const source = useWatch({ control, name: `renew.renew_params.${index}.source` as any })
  const rawInputType = useWatch({ control, name: `renew.renew_params.${index}.input_type` as any })
  const inputType = rawInputType || 'string'
  const fieldValue = useWatch({ control, name: `renew.renew_params.${index}.field` as any })
  const dynamicFields = useDynamicItemFields(control)
  const fieldOptions = source === 'orders' ? ORDER_FIELDS : [...ITEM_FIELDS, ...dynamicFields]

  return (
    <Box sx={{ mb: 1.5, p: 1.5, background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
        <IconButton size='small' onClick={onRemove} color='error'><Trash2 size={14} /></IconButton>
      </Box>

      <Grid2 container spacing={1.5}>
        {/* Param name */}
        <Grid2 size={{ xs: 12, sm: 3 }}>
          <Controller name={`renew.renew_params.${index}.param` as any} control={control} render={({ field }) => (
            <CustomTextField {...field} size='small' fullWidth label='Param gửi đi' placeholder='VD: idproxy, ngay' helperText='Tên biến khi call API NCC' />
          )} />
        </Grid2>

        {/* Source */}
        <Grid2 size={{ xs: 12, sm: 3 }}>
          <Controller name={`renew.renew_params.${index}.source` as any} control={control} render={({ field }) => (
            <CustomTextField {...field} size='small' select fullWidth label='Nguồn giá trị'>
              <MenuItem value='order_items'>order_items (chi tiết đơn)</MenuItem>
              <MenuItem value='orders'>orders (đơn hàng)</MenuItem>
              <MenuItem value='user_input'>User nhập</MenuItem>
              <MenuItem value='default'>Mặc định (cố định)</MenuItem>
            </CustomTextField>
          )} />
        </Grid2>

        {/* Source = orders | order_items → chọn field */}
        {(source === 'orders' || source === 'order_items') && (
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <Controller name={`renew.renew_params.${index}.field` as any} control={control} render={({ field }) => (
              <CustomTextField {...field} size='small' select fullWidth label={`Field trong ${source}`} helperText='Hỗ trợ dot notation: proxy.ip, metadata.xxx'>
                {fieldOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label} ({o.value})</MenuItem>)}
                <MenuItem value='__custom'>Tự nhập field...</MenuItem>
              </CustomTextField>
            )} />
            {fieldValue === '__custom' && (
              <Controller name={`renew.renew_params.${index}.field` as any} control={control} render={({ field }) => (
                <CustomTextField {...field} size='small' fullWidth placeholder='proxy.protocol' sx={{ mt: 1 }} />
              )} />
            )}
          </Grid2>
        )}

        {/* Source = default → nhập giá trị cố định */}
        {source === 'default' && (
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <Controller name={`renew.renew_params.${index}.value` as any} control={control} render={({ field }) => (
              <CustomTextField {...field} size='small' fullWidth label='Giá trị cố định' placeholder='VD: 4Gvinaphone' helperText='Luôn gửi giá trị này mỗi lần gia hạn' />
            )} />
          </Grid2>
        )}

        {/* Source = user_input → cấu hình input */}
        {source === 'user_input' && (
          <>
            <Grid2 size={{ xs: 12, sm: 3 }}>
              <Controller name={`renew.renew_params.${index}.input_label` as any} control={control} render={({ field }) => (
                <CustomTextField {...field} size='small' fullWidth label='Label hiện user' placeholder='VD: Số ngày gia hạn' />
              )} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 3 }}>
              <Controller name={`renew.renew_params.${index}.input_type` as any} control={control} render={({ field }) => (
                <CustomTextField {...field} value={field.value || 'string'} size='small' select fullWidth label='Loại input'>
                  <MenuItem value='number'>Số (number)</MenuItem>
                  <MenuItem value='string'>Chữ (text)</MenuItem>
                  <MenuItem value='select'>Chọn từ danh sách</MenuItem>
                </CustomTextField>
              )} />
            </Grid2>

            {/* number → min/max */}
            {inputType === 'number' && (
              <>
                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller name={`renew.renew_params.${index}.min` as any} control={control} render={({ field }) => (
                    <CustomTextField {...field} size='small' fullWidth type='number' label='Min' placeholder='1' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller name={`renew.renew_params.${index}.max` as any} control={control} render={({ field }) => (
                    <CustomTextField {...field} size='small' fullWidth type='number' label='Max' placeholder='365' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12 }}>
                  <Controller name={`renew.renew_params.${index}.is_duration` as any} control={control} render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox {...field} checked={!!field.value} size='small' />}
                      label={<Typography variant='body2' sx={{ fontSize: 12 }}>Đây là param số ngày gia hạn (dùng cho quy đổi bên dưới)</Typography>}
                    />
                  )} />
                </Grid2>
              </>
            )}

            {/* select → danh sách options */}
            {inputType === 'select' && (
              <SelectOptionsEditor index={index} control={control} />
            )}
          </>
        )}
      </Grid2>
    </Box>
  )
}

// ─── Select Options Editor ──────────────────────────

function SelectOptionsEditor({ index, control }: { index: number; control: SectionProps['control'] }) {
  return (
    <Grid2 size={{ xs: 12 }}>
      <Box sx={{ p: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 1, mt: 0.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569', mb: 0.5 }}>Danh sách giá trị</Typography>

        <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
          {'Cấu hình options trong JSON preview bên phải (options: [{value, label}])'}
        </Typography>
      </Box>
    </Grid2>
  )
}

// ─── Duration Map ───────────────────────────────────

function DurationMapSection({ control }: SectionProps) {
  const override = useWatch({ control, name: 'renew.duration_map_override' })
  const { fields, append, remove } = useFieldArray({ control, name: 'renew.duration_map_rows' as any })

  // Đọc duration_map từ tab Mua (buy_rotating hoặc buy_static)
  const buyRotDurationMap1 = useWatch({ control, name: 'buy_rotating.duration_map_1' })
  const buyRotDurationMap7 = useWatch({ control, name: 'buy_rotating.duration_map_7' })
  const buyRotDurationMap30 = useWatch({ control, name: 'buy_rotating.duration_map_30' })
  const buyStatDurationMap1 = useWatch({ control, name: 'buy_static.duration_map_1' })
  const buyStatDurationMap7 = useWatch({ control, name: 'buy_static.duration_map_7' })
  const buyStatDurationMap30 = useWatch({ control, name: 'buy_static.duration_map_30' })

  const buyMapEntries: { days: string; value: string }[] = []

  const addEntry = (days: string, val: string) => { if (val) buyMapEntries.push({ days, value: val }) }

  addEntry('1', buyRotDurationMap1 || buyStatDurationMap1)
  addEntry('7', buyRotDurationMap7 || buyStatDurationMap7)
  addEntry('30', buyRotDurationMap30 || buyStatDurationMap30)

  const hasBuyMap = buyMapEntries.length > 0

  return (
    <Box sx={{ mt: 1, p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5, background: '#fafbfc' }}>
      <Typography variant='body2' fontWeight={600} sx={{ mb: 0.5 }}>
        Quy đổi số ngày
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: '#64748b', mb: 1 }}>
        Nếu NCC không nhận số thuần (7, 30) mà nhận tên (weekly, monthly) → cấu hình bảng quy đổi.
      </Typography>

      {/* Preview cấu hình từ tab Mua */}
      {hasBuyMap && (
        <Box sx={{ mb: 1.5, p: 1, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 1 }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#0c4a6e', mb: 0.5 }}>
            Cấu hình từ tab Mua (đang dùng chung):
          </Typography>
          <Box sx={{ fontSize: 12, fontFamily: 'monospace', color: '#334155' }}>
            {buyMapEntries.map(e => (
              <div key={e.days}>{e.days} ngày → <strong>{e.value}</strong></div>
            ))}
          </Box>
        </Box>
      )}
      {!hasBuyMap && (
        <Box sx={{ mb: 1, p: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
          <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>
            Tab Mua chưa có cấu hình quy đổi → gửi nguyên số ngày.
          </Typography>
        </Box>
      )}

      <Controller name='renew.duration_map_override' control={control} render={({ field }) => (
        <FormControlLabel
          control={<Checkbox {...field} checked={!!field.value} size='small' />}
          label={<Typography variant='body2' sx={{ fontSize: 12 }}>Cấu hình riêng cho gia hạn (bỏ tick = dùng chung từ tab Mua)</Typography>}
        />
      )} />

      {override && (
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant='caption' color='text.secondary'>Quy đổi riêng: số ngày → giá trị gửi NCC</Typography>
            <Button size='small' startIcon={<Plus size={14} />} onClick={() => append({ days: '', send_value: '' })}>
              Thêm
            </Button>
          </Box>
          {fields.map((f, i) => (
            <Box key={f.id} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
              <Controller name={`renew.duration_map_rows.${i}.days` as any} control={control} render={({ field }) => (
                <CustomTextField {...field} size='small' placeholder='Số ngày (VD: 7)' sx={{ width: 120 }} />
              )} />
              <Typography variant='body2' color='text.secondary'>→</Typography>
              <Controller name={`renew.duration_map_rows.${i}.send_value` as any} control={control} render={({ field }) => (
                <CustomTextField {...field} size='small' placeholder='Gửi NCC (VD: weekly)' sx={{ flex: 1 }} />
              )} />
              <IconButton size='small' onClick={() => remove(i)} color='error'><Trash2 size={14} /></IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

// ─── Main Section ───────────────────────────────────

function RenewSection({ control }: SectionProps) {
  const enabled = useWatch({ control, name: 'renew.enabled' })
  const mode = useWatch({ control, name: 'renew.mode' })
  const renewAuthType = useWatch({ control, name: 'renew.auth_type' })
  const renewParams: RenewParamConfig[] = useWatch({ control, name: 'renew.renew_params' }) || []
  const { fields, append, remove } = useFieldArray({ control, name: 'renew.renew_params' as any })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Giải thích tổng quan */}
      <Box sx={{ p: 1.5, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400e', mb: 0.5 }}>
          Gia hạn — kéo dài thời hạn sử dụng
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
          Khi khách gia hạn → hệ thống gọi API NCC kèm các params đã cấu hình → NCC gia hạn → cập nhật ngày hết hạn mới.
        </Typography>
      </Box>

      <Controller
        name='renew.enabled'
        control={control}
        render={({ field: { value, onChange, ...field } }) => (
          <CustomTextField
            {...field}
            value={value ? 'true' : 'false'}
            onChange={(e) => onChange(e.target.value === 'true')}
            fullWidth select label='NCC hỗ trợ gia hạn?'
          >
            <MenuItem value='false'>Không — bỏ qua</MenuItem>
            <MenuItem value='true'>Có — cấu hình bên dưới</MenuItem>
          </CustomTextField>
        )}
      />

      {enabled && (
        <>
          {/* ═══ Nhóm 1: Gọi API gia hạn ═══ */}
          <Box sx={{ border: '1px solid #fcd34d', borderTop: '3px solid #f59e0b', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>
                Gọi API gia hạn
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
                Hệ thống BUILD request từ URL + params → gửi NCC. Biến trong URL (như {'{provider_order_code}'}) tự thay bằng giá trị thật.
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name='renew.mode' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth select label='Cách gia hạn' helperText='1 lệnh: gửi 1 request cho cả đơn. Riêng: loop từng item gửi riêng.'>
                      <MenuItem value='by_order'>1 lệnh cho cả đơn</MenuItem>
                      <MenuItem value='by_item'>Gọi riêng từng item</MenuItem>
                    </CustomTextField>
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name='renew.method' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth select label='Method'>
                      <MenuItem value='GET'>GET</MenuItem>
                      <MenuItem value='POST'>POST</MenuItem>
                    </CustomTextField>
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name='renew.auth_type' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth select label='Xác thực NCC'>
                      <MenuItem value='inherit'>Giống lúc mua (dùng cùng token)</MenuItem>
                      <MenuItem value='query'>Key trong URL (?key=xxx)</MenuItem>
                      <MenuItem value='header'>Key trong header</MenuItem>
                      <MenuItem value='bearer'>Bearer token</MenuItem>
                    </CustomTextField>
                  )} />
                </Grid2>

                {renewAuthType && renewAuthType !== 'inherit' && renewAuthType !== 'bearer' && (
                  <Grid2 size={{ xs: 12, sm: 4 }}>
                    <Controller name='renew.auth_param' control={control} render={({ field }) => (
                      <CustomTextField {...field} fullWidth label='Tên param token' placeholder={renewAuthType === 'header' ? 'apikey' : 'key'} />
                    )} />
                  </Grid2>
                )}

                <Grid2 size={{ xs: 12 }}>
                  <Controller name='renew.url' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth
                      label='URL gia hạn'
                      placeholder='https://api.ncc.com/renew/{provider_order_code}'
                      helperText={
                        field.value?.includes('{')
                          ? '↳ Preview: ' + field.value
                              .replace(/\{provider_order_code\}/g, 'TXN-12345')
                              .replace(/\{provider_item_id\}/g, 'PROXY-001')
                              .replace(/\{duration\}/g, '30')
                          : 'Dùng {provider_order_code}, {provider_item_id}, {duration} — tự thay bằng giá trị thật'
                      }
                    />
                  )} />
                </Grid2>

                {mode === 'by_item' && (
                  <Grid2 size={{ xs: 6, sm: 4 }}>
                    <Controller name='renew.batch_delay_ms' control={control} render={({ field }) => (
                      <CustomTextField {...field} fullWidth type='number' label='Nghỉ giữa mỗi item (ms)' placeholder='0' helperText='Nếu NCC giới hạn tốc độ gọi. 0 = không nghỉ' />
                    )} />
                  </Grid2>
                )}
              </Grid2>
            </Box>
          </Box>

          {/* ═══ Nhóm 2: Params gửi kèm — 1 bảng thống nhất ═══ */}
          <Box sx={{ border: '1px solid #c4b5fd', borderTop: '3px solid #8b5cf6', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ background: '#f5f3ff', borderBottom: '1px solid #c4b5fd', px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>
                Params gửi NCC khi gia hạn
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
                Mỗi dòng = 1 param. Chọn nguồn giá trị → hệ thống tự đọc từ DB hoặc lấy từ user → gán vào param → gửi NCC.
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              {/* Ví dụ minh hoạ */}
              <Box sx={{ mb: 2, p: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#7c3aed', mb: 0.5 }}>Ví dụ:</Typography>
                <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8' }}>
                      <td style={{ padding: '3px 6px' }}>Param</td>
                      <td style={{ padding: '3px 6px' }}>Nguồn</td>
                      <td style={{ padding: '3px 6px' }}>Request thực tế</td>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: 'monospace', color: '#334155' }}>
                    <tr><td style={{ padding: '3px 6px' }}>idproxy</td><td style={{ padding: '3px 6px', color: '#3b82f6' }}>order_items → provider_item_id</td><td style={{ padding: '3px 6px' }}>idproxy=566171</td></tr>
                    <tr style={{ background: '#fafbfc' }}><td style={{ padding: '3px 6px' }}>ngay</td><td style={{ padding: '3px 6px', color: '#8b5cf6' }}>User nhập (number)</td><td style={{ padding: '3px 6px' }}>ngay=30</td></tr>
                    <tr><td style={{ padding: '3px 6px' }}>loaiproxy</td><td style={{ padding: '3px 6px', color: '#16a34a' }}>Mặc định: 4Gvinaphone</td><td style={{ padding: '3px 6px' }}>loaiproxy=4Gvinaphone</td></tr>
                    <tr style={{ background: '#fafbfc' }}><td style={{ padding: '3px 6px' }}>country</td><td style={{ padding: '3px 6px', color: '#3b82f6' }}>orders → country</td><td style={{ padding: '3px 6px' }}>country=VN</td></tr>
                  </tbody>
                </table>
              </Box>

              {/* Param rows */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' fontWeight={600}>Danh sách params</Typography>
                <Button size='small' startIcon={<Plus size={14} />}
                  onClick={() => append({ param: '', source: 'default', value: '' } as any)}>
                  Thêm
                </Button>
              </Box>

              {fields.length === 0 && (
                <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                  Chưa có param nào. Bấm &ldquo;Thêm&rdquo; để cấu hình.
                </Typography>
              )}

              {fields.map((f, i) => (
                <RenewParamRow key={f.id} index={i} control={control} onRemove={() => remove(i)} />
              ))}

              {/* Duration Map */}
              <DurationMapSection control={control} />
            </Box>
          </Box>

          {/* ═══ Nhóm 3: Kiểm tra kết quả ═══ */}
          <Box sx={{ border: '1px solid #6ee7b7', borderTop: '3px solid #10b981', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ background: '#ecfdf5', borderBottom: '1px solid #6ee7b7', px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>
                Kiểm tra kết quả gia hạn
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
                Sau khi gọi API → hệ thống đọc response NCC để biết OK hay lỗi → cập nhật ngày hết hạn mới.
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller name='renew.success_field' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Field báo thành công' placeholder='status' helperText='VD: NCC trả {"status":"success"}' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller name='renew.success_value' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Giá trị = thành công' placeholder='success' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Controller name='renew.new_expiry_field' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Field ngày hết hạn mới' placeholder='data.expired_at' helperText='Bỏ trống = hệ thống tự tính: hạn cũ + số ngày gia hạn' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name='renew.response_mode' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth select label='NCC xác nhận thế nào?'>
                      <MenuItem value='immediate'>Trả kết quả ngay trong response</MenuItem>
                      <MenuItem value='deferred'>Cần gọi lại API khác để kiểm tra</MenuItem>
                    </CustomTextField>
                  )} />
                </Grid2>
              </Grid2>
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}

export default memo(RenewSection)
