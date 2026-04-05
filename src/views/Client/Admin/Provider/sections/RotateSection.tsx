import { memo } from 'react'
import { Controller, useFieldArray, useWatch } from 'react-hook-form'
import Grid2 from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import { Plus, Trash2 } from 'lucide-react'

import CustomTextField from '@core/components/mui/TextField'
import FieldHint from '../components/FieldHint'
import type { SectionProps } from '../ProviderFormTypes'

function RotateParamsTable({ control }: SectionProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'rotate.rotate_params' as any })

  return (
    <Box sx={{ border: '1px solid #c4b5fd', borderTop: '3px solid #8b5cf6', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ background: '#f5f3ff', borderBottom: '1px solid #c4b5fd', px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#8b5cf6' }}>
            Params lấy từ DB gửi kèm khi xoay
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
            Ngoài key proxy + token, cần gửi thêm data nào cho NCC? VD: IP whitelist, protocol, region...
          </Typography>
        </Box>
        <Button size='small' startIcon={<Plus size={14} />} onClick={() => append({ param: '', source: 'order_items', field: '', value: '', send_as: 'raw' })}>
          Thêm
        </Button>
      </Box>
      <Box sx={{ p: 2 }}>
        {fields.length === 0 && (
          <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
            Chưa có. Bấm "Thêm" nếu cần gửi thêm data từ đơn hàng khi xoay proxy.
          </Typography>
        )}
        {fields.map((f, i) => (
          <RotateParamRow key={f.id} index={i} control={control} onRemove={() => remove(i)} />
        ))}
      </Box>
    </Box>
  )
}

function RotateParamRow({ index, control, onRemove }: { index: number; control: any; onRemove: () => void }) {
  const source = useWatch({ control, name: `rotate.rotate_params.${index}.source` })

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
      <Controller name={`rotate.rotate_params.${index}.param` as any} control={control} render={({ field }) => (
        <CustomTextField {...field} size='small' placeholder='Param gửi NCC (VD: ip)' sx={{ flex: 1, minWidth: 120 }} />
      )} />
      <Controller name={`rotate.rotate_params.${index}.source` as any} control={control} render={({ field }) => (
        <CustomTextField {...field} size='small' select sx={{ minWidth: 140 }}>
          <MenuItem value='order_items'>Từ order_item</MenuItem>
          <MenuItem value='default'>Giá trị cố định</MenuItem>
        </CustomTextField>
      )} />
      {source === 'order_items' ? (
        <Controller name={`rotate.rotate_params.${index}.field` as any} control={control} render={({ field }) => (
          <CustomTextField {...field} size='small' placeholder='Field (VD: provider_key, ip_whitelist)' sx={{ flex: 1, minWidth: 150 }} />
        )} />
      ) : (
        <Controller name={`rotate.rotate_params.${index}.value` as any} control={control} render={({ field }) => (
          <CustomTextField {...field} size='small' placeholder='Giá trị cố định' sx={{ flex: 1, minWidth: 150 }} />
        )} />
      )}
      <Controller name={`rotate.rotate_params.${index}.send_as` as any} control={control} render={({ field }) => (
        <CustomTextField {...field} size='small' select value={field.value || 'raw'} sx={{ minWidth: 140 }}>
          <MenuItem value='raw'>Nguyên</MenuItem>
          <MenuItem value='join_comma'>Mảng → phẩy</MenuItem>
          <MenuItem value='join_newline'>Mảng → xuống dòng</MenuItem>
          <MenuItem value='first'>Lấy phần tử đầu</MenuItem>
        </CustomTextField>
      )} />
      <IconButton size='small' onClick={onRemove} color='error'><Trash2 size={14} /></IconButton>
    </Box>
  )
}

function RotateSection({ control }: SectionProps) {
  const enabled = useWatch({ control, name: 'rotate.enabled' })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Giải thích tổng quan */}
      <Box sx={{ p: 1.5, background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0e7490', mb: 0.5 }}>
          API Xoay proxy — lấy proxy mới (rotation)
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
          Khi khách bấm <strong>"Xoay IP"</strong> → hệ thống gọi API này → NCC trả proxy mới (ip:port:user:pass) → hệ thống cập nhật cho khách.
          <br />
          <strong>Chỉ dùng cho proxy xoay (rotating).</strong> Proxy tĩnh không cần section này.
        </Typography>
      </Box>

      <Controller
        name='rotate.enabled'
        control={control}
        render={({ field: { value, onChange, ...field } }) => (
          <CustomTextField
            {...field}
            value={value ? 'true' : 'false'}
            onChange={(e) => onChange(e.target.value === 'true')}
            fullWidth select label='Bật cấu hình xoay'
          >
            <MenuItem value='false'>Tắt</MenuItem>
            <MenuItem value='true'>Bật</MenuItem>
          </CustomTextField>
        )}
      />

      {enabled && (
        <>
          {/* Bước 1: Gọi API xoay */}
          <Box sx={{ border: '1px solid #67e8f9', borderTop: '3px solid #06b6d4', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ background: '#ecfeff', borderBottom: '1px solid #67e8f9', px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#06b6d4' }}>
                Cấu hình gọi API xoay
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
                Hệ thống BUILD URL từ config → gửi key proxy + token xác thực → NCC trả proxy mới.
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller name='rotate.method' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth select label='Method'>
                      <MenuItem value='GET'>GET</MenuItem>
                      <MenuItem value='POST'>POST</MenuItem>
                    </CustomTextField>
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 9 }}>
                  <Controller name='rotate.url' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='URL xoay proxy' placeholder='https://api.provider.com/get' helperText='URL NCC dùng để lấy proxy mới' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller name='rotate.auth_type' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth select label='Xác thực'>
                      <MenuItem value='none'>Không gửi token (chỉ gửi key proxy)</MenuItem>
                      <MenuItem value='query'>Token trong URL (?key=xxx)</MenuItem>
                      <MenuItem value='header'>Token trong header</MenuItem>
                      <MenuItem value='bearer'>Bearer token</MenuItem>
                    </CustomTextField>
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller name='rotate.auth_param' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Tên param token' placeholder='key' helperText='NCC gọi token là gì? VD: key, api_key' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller name='rotate.key_source' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth select label='Key proxy lấy từ đâu?'>
                      <MenuItem value='key'>key (hệ thống)</MenuItem>
                      <MenuItem value='provider_key'>provider_key (key NCC trả)</MenuItem>
                    </CustomTextField>
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Controller name='rotate.params_json' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Params cố định gửi kèm' placeholder='{"tinh": "hcm", "nhamang": "viettel"}' helperText='Bỏ trống nếu chỉ cần gửi key proxy + token' />
                  )} />
                </Grid2>
              </Grid2>
            </Box>
          </Box>

          {/* Bước 2: Đọc proxy mới từ response */}
          <Box sx={{ border: '1px solid #6ee7b7', borderTop: '3px solid #10b981', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ background: '#ecfdf5', borderBottom: '1px solid #6ee7b7', px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                Đọc proxy mới từ response NCC
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
                NCC trả JSON chứa proxy mới → hệ thống đọc field HTTP và SOCKS5 → cập nhật cho khách.
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 6, sm: 4 }}>
                  <Controller name='rotate.response_http' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Field chứa proxy HTTP' placeholder='http' helperText='VD: NCC trả {"http": "1.2.3.4:8080:user:pass"}' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 4 }}>
                  <Controller name='rotate.response_socks5' control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Field chứa proxy SOCKS5' placeholder='socks5' helperText='VD: NCC trả {"socks5": "1.2.3.4:1080:user:pass"}' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 4 }}>
                  <Controller name='rotate.double_ampersand' control={control} render={({ field: { value, onChange, ...field } }) => (
                    <CustomTextField
                      {...field}
                      value={value ? 'true' : 'false'}
                      onChange={(e) => onChange(e.target.value === 'true')}
                      fullWidth select
                      label='Dấu nối params'
                      helperText='Hầu hết NCC dùng &. Chỉ đổi nếu NCC dùng &&'
                    >
                      <MenuItem value='false'>Bình thường (&)</MenuItem>
                      <MenuItem value='true'>Double (&&)</MenuItem>
                    </CustomTextField>
                  )} />
                </Grid2>
              </Grid2>
            </Box>
          </Box>

          {/* Bước 3: Params lấy từ DB gửi kèm khi xoay */}
          <RotateParamsTable control={control} />

          {/* Minh hoạ flow */}
          <Box sx={{ p: 1.5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155', mb: 0.5 }}>
              Flow xoay proxy:
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#475569', fontFamily: 'monospace', lineHeight: 2 }}>
              Khách bấm "Xoay IP" → hệ thống gọi: <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>GET url?key=abc123&token=xxx</code>
              <br />
              → NCC trả: <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>{`{"http":"5.6.7.8:3128:u:p","socks5":"5.6.7.8:1080:u:p"}`}</code>
              <br />
              → Hệ thống cập nhật proxy mới → khách thấy IP mới ngay
            </Typography>
          </Box>
        </>
      )}
    </Box>
  )
}

export default memo(RotateSection)
