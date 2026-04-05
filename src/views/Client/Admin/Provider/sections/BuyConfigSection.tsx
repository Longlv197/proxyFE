'use client'

import { useState } from 'react'
import { Controller, useFieldArray, useWatch } from 'react-hook-form'
import Grid2 from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

import CustomTextField from '@core/components/mui/TextField'
import FieldHint from '../components/FieldHint'
import PipelineStepCard from '../components/PipelineStepCard'
import ResponseMappingTable from '../components/ResponseMappingTable'
import SavePreviewBox from '../components/SavePreviewBox'
import ResponseDryRun from '../components/ResponseDryRun'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import type { BuySectionProps, ParamsMappingEntry } from '../ProviderFormTypes'
import { STANDARD_VARIABLES, VARIABLE_FORMAT_OPTIONS, defaultParamsMappingEntry } from '../ProviderFormTypes'

// ─── Duration URL Table (dynamic rows) ──────────────
function DurationUrlTable({ prefix, control }: { prefix: string; control: any }) {
  const { fields, append, remove } = useFieldArray({ control, name: `${prefix}.duration_urls` })

  // Nếu chưa có dòng nào → thêm 3 mặc định (1/7/30)
  if (fields.length === 0) {
    setTimeout(() => {
      append([
        { days: '1', url: '' },
        { days: '7', url: '' },
        { days: '30', url: '' }
      ])
    }, 0)

    return null
  }

  return (
    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', px: 1.5, py: 0.75, borderBottom: '1px solid #e2e8f0' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>URL theo thời hạn</Typography>
        <Button size='small' startIcon={<Plus size={13} />} onClick={() => append({ days: '', url: '' })}>Thêm</Button>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr 36px', gap: 1, px: 1.5, py: 0.5, fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f1f5f9' }}>
        <span>Số ngày</span><span>URL</span><span></span>
      </Box>
      {fields.map((field, index) => (
        <Box key={field.id} sx={{ display: 'grid', gridTemplateColumns: '100px 1fr 36px', gap: 1, alignItems: 'center', px: 1.5, py: 0.5, borderBottom: '1px solid #f1f5f9' }}>
          <Controller name={`${prefix}.duration_urls.${index}.days`} control={control} render={({ field: f }) => (
            <CustomTextField {...f} size='small' type='number' placeholder='VD: 7' sx={{ '& input': { fontSize: 13 } }} />
          )} />
          <Controller name={`${prefix}.duration_urls.${index}.url`} control={control} render={({ field: f }) => (
            <CustomTextField {...f} size='small' placeholder='https://api.provider.com/buy-weekly' sx={{ '& input': { fontSize: 12 } }} />
          )} />
          {fields.length > 1 ? (
            <IconButton size='small' color='error' onClick={() => remove(index)} sx={{ p: '2px' }}>
              <Trash2 size={14} />
            </IconButton>
          ) : <span />}
        </Box>
      ))}
    </Box>
  )
}

// ─── Pipeline Step 1: API Call ──────────────────────

function StepApiCall({ prefix, control }: BuySectionProps) {
  const useUrlByDuration = useWatch({ control, name: `${prefix}.use_url_by_duration` })
  const durationParam = useWatch({ control, name: `${prefix}.duration_param` })

  return (
    <PipelineStepCard
      step={1}
      title='Gọi API nhà cung cấp'
      description='Khi khách mua proxy → hệ thống tự BUILD request HTTP từ config bên dưới → gửi đến NCC → nhận response JSON. Config sai URL/auth → request thất bại, đơn bị treo.'
    >
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <Controller name={`${prefix}.method`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth select label='Method'>
              <MenuItem value='GET'>GET</MenuItem>
              <MenuItem value='POST'>POST</MenuItem>
            </CustomTextField>
          )} />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <Controller name={`${prefix}.auth_type`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth select label={<>Xác thực <FieldHint text='query: token qua URL (?key=xxx). header: qua HTTP header. bearer: Authorization: Bearer xxx' /></>}>
              <MenuItem value='query'>Query param</MenuItem>
              <MenuItem value='header'>Header</MenuItem>
              <MenuItem value='bearer'>Bearer token</MenuItem>
            </CustomTextField>
          )} />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <Controller name={`${prefix}.auth_param`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth label={<>Tên param auth <FieldHint text='VD: key, x-api-key, token' /></>} placeholder='key' />
          )} />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <Controller name={`${prefix}.quantity_param`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth label={<>Tên param số lượng <FieldHint text='VD: soluong, quantity, amount' /></>} placeholder='soluong' />
          )} />
        </Grid2>

        {/* URL */}
        <Grid2 size={{ xs: 12 }}>
          <Controller
            name={`${prefix}.use_url_by_duration`}
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <CustomTextField {...field} value={value ? 'duration' : 'single'} onChange={(e) => onChange(e.target.value === 'duration')} fullWidth select
                label={<>Kiểu URL <FieldHint text='URL đơn: 1 URL cho mọi thời hạn. URL riêng: mỗi thời hạn gọi URL khác nhau.' /></>}
              >
                <MenuItem value='single'>1 URL dùng chung</MenuItem>
                <MenuItem value='duration'>URL riêng theo thời hạn</MenuItem>
              </CustomTextField>
            )}
          />
        </Grid2>
        {!useUrlByDuration ? (
          <Grid2 size={{ xs: 12 }}>
            <Controller name={`${prefix}.url`} control={control} render={({ field }) => (
              <CustomTextField {...field} fullWidth label='URL' placeholder='https://api.provider.com/buy' />
            )} />
          </Grid2>
        ) : (
          <Grid2 size={{ xs: 12 }}>
            <DurationUrlTable prefix={prefix} control={control} />
          </Grid2>
        )}

        {/* Duration param + mapping */}
        <Grid2 size={{ xs: 12, sm: durationParam ? 6 : 12 }}>
          <Controller name={`${prefix}.duration_param`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth label={<>Tên param thời hạn <FieldHint text='Param gửi số ngày mua cho provider. VD: thoigian, days, period. Bỏ trống nếu không cần (VD: đã nằm trong URL).' /></>} placeholder='Bỏ trống nếu không cần' />
          )} />
        </Grid2>
        {durationParam && (
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <Box sx={{ p: 1.5, background: '#f1f5f9', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
              <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block', lineHeight: 1.4 }}>
                Khi user mua 1/7/30 ngày, hệ thống gửi giá trị nào cho provider?
                <br />
                <span style={{ color: '#94a3b8' }}>Bỏ trống = gửi nguyên số ngày. Điền nếu provider dùng giá trị khác (VD: daily, weekly, monthly)</span>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                {[{ label: '1 ngày', name: `${prefix}.duration_map_1` as const, ph: '1' },
                  { label: '7 ngày', name: `${prefix}.duration_map_7` as const, ph: '7' },
                  { label: '30 ngày', name: `${prefix}.duration_map_30` as const, ph: '30' }].map(d => (
                  <Box key={d.name} sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant='caption' sx={{ fontWeight: 600, color: '#475569', mb: 0.5, display: 'block' }}>{d.label}</Typography>
                    <Controller name={d.name as any} control={control} render={({ field }) => (
                      <CustomTextField {...field} fullWidth placeholder={d.ph} size='small' sx={{ '& input': { textAlign: 'center' } }} />
                    )} />
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid2>
        )}

        {/* Params mặc định */}
        <Grid2 size={{ xs: 12 }}>
          <Controller name={`${prefix}.params_json`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth label={<>Params cố định (JSON) <FieldHint text='Các param luôn gửi kèm. VD: {"loaiproxy":"static","quocgia":"us"}. Bỏ trống nếu không có.' /></>} placeholder='{"key1":"value1"}' />
          )} />
        </Grid2>

        {/* Double ampersand */}
        <Grid2 size={{ xs: 12 }}>
          <Controller name={`${prefix}.double_ampersand`} control={control} render={({ field: { value, onChange, ...field } }) => (
            <CustomTextField {...field} value={value ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')} fullWidth select size='small'
              label={<>Dấu nối params <FieldHint text='Mặc định dùng & nối params (?a=1&b=2). Một số API hiếm dùng && thay vì &.' /></>}
            >
              <MenuItem value='false'>Bình thường (&)</MenuItem>
              <MenuItem value='true'>Double (&&)</MenuItem>
            </CustomTextField>
          )} />
        </Grid2>
      </Grid2>
    </PipelineStepCard>
  )
}

// ─── Pipeline Step 2: Success Check ─────────────────

function StepSuccessCheck({ prefix, control }: BuySectionProps) {
  const responseMode = useWatch({ control, name: `${prefix}.response_mode` })
  const responseType = useWatch({ control, name: `${prefix}.response.type` })

  return (
    <PipelineStepCard
      step={2}
      title='Kiểm tra kết quả — thành công hay lỗi?'
      description='Sau khi nhận response từ NCC → hệ thống ĐỌC trường kiểm tra (VD: "statusCode") → SO SÁNH với giá trị OK (VD: 200). Khớp → đơn thành công, chuyển sang bước 3. Không khớp → đơn lỗi, hoàn tiền. Sai config → hệ thống không phân biệt được, đơn bị treo mãi.'
    >
      <Grid2 container spacing={2}>
        {/* Giải thích 2 dạng response */}
        <Grid2 size={{ xs: 12 }}>
          <Box sx={{ p: 1.5, background: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            Sau khi gọi API mua, nhà cung cấp sẽ <strong>trả về kết quả</strong>. Có 2 dạng:
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1, mb: 0.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#334155', mb: 0.5 }}>Dạng 1: 1 kết quả duy nhất</Typography>
                <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 10, borderRadius: 6, margin: 0, fontSize: 11, overflowX: 'auto', lineHeight: 1.5 }}>{responseMode === 'deferred'
? `{
  "success": true,       ← Check: "success" = true
  "data": {
    "id": 12345          ← Mã đơn: "data.id"
  }
}`
: `{
  "success": true,       ← Check: "success" = true
  "data": {
    "proxies": [         ← Proxy: "data.proxies"
      {"ip":"1.2.3.4", ...}
    ]
  }
}`}</pre>
              </Box>
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#334155', mb: 0.5 }}>Dạng 2: Nhiều kết quả liên tiếp</Typography>
                <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 10, borderRadius: 6, margin: 0, fontSize: 11, overflowX: 'auto', lineHeight: 1.5 }}>{`{                        ← Proxy 1
  "status": 100,
  "ip": "27.73.88.211",
  "port": 35270, ...
},
{                        ← Kết quả cuối
  "status": 200,         ← Check: "status" = 200
  "comen": "Success"
}`}</pre>
              </Box>
            </Box>
            Chọn dạng phù hợp rồi cấu hình bên dưới.
          </Box>
        </Grid2>

        <Grid2 size={{ xs: 12, sm: 4 }}>
          <Controller name={`${prefix}.response_mode`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth select label='Nhà cung cấp trả về gì?'>
              <MenuItem value='immediate'>Trả proxy ngay</MenuItem>
              <MenuItem value='deferred'>Chỉ trả mã đơn, lấy proxy sau</MenuItem>
            </CustomTextField>
          )} />
        </Grid2>

        <Grid2 size={{ xs: 12, sm: 4 }}>
          <Controller name={`${prefix}.response.type`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth select
              label='Dạng kết quả trả về'
              helperText='Gọi thử API đối tác, xem kết quả rồi chọn dạng phù hợp'
            >
              <MenuItem value='object'>Dạng 1 — Một object {'{ }'} duy nhất</MenuItem>
              <MenuItem value='array_last_status'>Dạng 2 — Mảng [ ], phần tử cuối là trạng thái</MenuItem>
              <MenuItem value='array_each_status'>Dạng 3 — Mảng [ ], mỗi phần tử là 1 proxy có trạng thái riêng</MenuItem>
            </CustomTextField>
          )} />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 2 }}>
          <Controller name={`${prefix}.response.success_field`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth
              label={<>Trường kiểm tra <FieldHint text='Khi mua xong, hệ thống đọc trường này để biết thành công hay thất bại.\n\nVD: NCC trả {"success": true} → điền "success"\nVD: NCC trả {"statusCode": 200} → điền "statusCode"\n\nSai → hệ thống không phân biệt được lỗi, đơn hàng bị treo.' /></>}
              placeholder='statusCode'
              helperText='Sai → đơn hàng bị treo'
            />
          )} />
        </Grid2>
        <Grid2 size={{ xs: 3, sm: 1.5 }}>
          <Controller name={`${prefix}.response.success_value`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth
              label={<>Giá trị OK <FieldHint text='Giá trị của trường kiểm tra khi thành công.\n\nVD: NCC trả {"success": true} → điền true\nVD: NCC trả {"statusCode": 200} → điền 200' /></>}
              placeholder='200'
            />
          )} />
        </Grid2>
        {responseType === 'array_last_status' && (
          <Grid2 size={{ xs: 3, sm: 2 }}>
            <Controller name={`${prefix}.response.success_check`} control={control} render={({ field }) => (
              <CustomTextField {...field} fullWidth select
                label={<>Check ở object <FieldHint text='Mảng có nhiều object — chọn object nào để kiểm tra thành công.\n\nVD: [{proxy}, {status:200}] → chọn "Cuối"\nVD: [{status:100}, {proxy}] → chọn "Đầu"' /></>}
              >
                <MenuItem value='last'>Cuối cùng</MenuItem>
                <MenuItem value='first'>Đầu tiên</MenuItem>
              </CustomTextField>
            )} />
          </Grid2>
        )}
      </Grid2>
    </PipelineStepCard>
  )
}

// ─── Pipeline Step 3: Proxy Extract ─────────────────

function StepProxyExtract({ prefix, control }: BuySectionProps) {
  const responseMode = useWatch({ control, name: `${prefix}.response_mode` })
  const responseType = useWatch({ control, name: `${prefix}.response.type` })
  const proxyFormat = useWatch({ control, name: `${prefix}.response.proxy_format` })
  const fetchProxyFormat = useWatch({ control, name: `${prefix}.fetch_proxies.proxy_format` })
  const fetchResponseType = useWatch({ control, name: `${prefix}.fetch_proxies.response_type` })
  const fetchPaginationEnabled = useWatch({ control, name: `${prefix}.fetch_proxies.pagination_enabled` })

  return (
    <PipelineStepCard
      step={3}
      title='Trích xuất proxy từ response'
      description={responseMode === 'deferred'
        ? 'NCC chỉ trả mã đơn lúc mua (deferred). Hệ thống GHI MÃ ĐƠN → tự gọi API lấy proxy sau (poll mỗi phút) → khi có proxy → LƯU VÀO OrderItem.proxy hoặc OrderItem.provider_key.'
        : 'Khi đơn OK → hệ thống TÌM mảng proxy trong response (VD: data.proxies) → ĐỌC từng proxy theo format (key xoay / chuỗi ip:port / fields riêng) → LƯU VÀO OrderItem.proxy (hoặc provider_key nếu dạng key). Sai đường dẫn → hệ thống không tìm được proxy, đơn thất bại.'}
    >
      <Grid2 container spacing={2}>
        {/* IMMEDIATE MODE */}
        {responseMode !== 'deferred' && (
          <>
            {responseType === 'object' && (
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller name={`${prefix}.response.proxies_path`} control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='Vị trí danh sách proxy' helperText='Lấy tên trường từ kết quả API, xem ví dụ ở trên' placeholder='data.proxies' />
                )} />
              </Grid2>
            )}
            <Grid2 size={{ xs: 12, sm: responseType === 'object' ? 6 : 4 }}>
              <Controller name={`${prefix}.response.proxy_format`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth select label={<>Nhà cung cấp trả proxy dạng gì? <FieldHint text='Mỗi proxy trong kết quả trả về có dạng gì? Chọn đúng để hệ thống đọc được.' /></>}>
                  <MenuItem value='key'>1 trường chứa key (VD: keyxoay)</MenuItem>
                  <MenuItem value='string'>1 chuỗi ip:port:user:pass</MenuItem>
                  <MenuItem value='fields'>Nhiều trường riêng (ip, port, user, pass)</MenuItem>
                </CustomTextField>
              )} />
            </Grid2>

            <Grid2 size={{ xs: 12 }}>
              <Typography sx={{ fontSize: 11, color: '#64748b', mt: -0.5, mb: 0.5 }}>
                Nhập tên trường mà <strong>nhà cung cấp trả về</strong> trong kết quả API. Hệ thống sẽ đọc giá trị từ trường đó và lưu vào hệ thống.
              </Typography>
            </Grid2>

            {proxyFormat === 'key' && (
              <>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name={`${prefix}.response.proxy_key_field`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Trường chứa key proxy' placeholder='proxy' helperText='→ Hệ thống lưu vào: provider_key' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name={`${prefix}.response.item_id_field`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Trường ID proxy' placeholder='idproxy' helperText='Bỏ trống nếu không có' />
                  )} />
                </Grid2>
              </>
            )}
            {proxyFormat === 'string' && (
              <>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name={`${prefix}.response.proxy_key_field`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Trường chứa chuỗi proxy' placeholder='proxy' helperText='→ Hệ thống tách thành ip:port:user:pass' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name={`${prefix}.response.item_id_field`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label={<>Trường ID proxy <FieldHint text='Bỏ trống nếu không có' /></>} placeholder='idproxy' helperText='→ provider_item_id' />
                  )} />
                </Grid2>
              </>
            )}
            {proxyFormat === 'fields' && (
              <>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.response.proxy_fields_ip`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='Trường IP' placeholder='ip' helperText='→ proxy.ip' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.response.proxy_fields_port`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='Trường Port' placeholder='port' helperText='→ proxy.port' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.response.proxy_fields_user`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='Trường User' placeholder='username' helperText='→ proxy.user' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.response.proxy_fields_pass`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='Trường Pass' placeholder='password' helperText='→ proxy.pass' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.response.proxy_fields_type`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='Trường giao thức' placeholder='type' helperText='→ proxy.protocol' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.response.item_id_field`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label={<>Trường ID proxy <FieldHint text='Mã proxy phía nhà cung cấp. Dùng để gia hạn/xoay IP. Bỏ trống nếu không có.' /></>} placeholder='idproxy' helperText='→ provider_item_id' />)} /></Grid2>
              </>
            )}
          </>
        )}

        {/* DEFERRED MODE */}
        {responseMode === 'deferred' && (
          <>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <Controller name={`${prefix}.response.proxies_path`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth label='Vị trí mã đơn hàng' helperText='Lấy tên trường từ kết quả API, xem ví dụ ở trên' placeholder='data.id' />
              )} />
            </Grid2>

            {/* Fetch Proxies config */}
            <Grid2 size={{ xs: 12 }}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant='body2' fontWeight={600} sx={{ mb: 1, mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                API lấy proxy (poll tự động) <FieldHint text='Sau khi có mã đơn, hệ thống gọi API này mỗi phút để lấy proxy' />
              </Typography>
            </Grid2>

            {/* Hướng dẫn đọc response */}
            <Grid2 size={{ xs: 12 }}>
              <Box sx={{ p: 1.5, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 1.5, fontSize: 12 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e', mb: 1 }}>
                  Hướng dẫn: Tìm đường dẫn đến danh sách proxy trong response
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: '#334155', lineHeight: 1.8 }}>
                  NCC trả <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>{`{"data": {"proxies": [...]}}`}</code> → điền: <strong style={{ color: '#16a34a' }}>data.proxies</strong>
                  <br />
                  NCC trả <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>{`{"result": [...]}`}</code> → điền: <strong style={{ color: '#16a34a' }}>result</strong>
                </Typography>
              </Box>
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 5 }}>
              <Controller name={`${prefix}.fetch_proxies.url`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth label='URL lấy proxy'
                  helperText='Có thể dùng {order_id} trong URL hoặc dùng field "Tên param mã đơn" bên dưới'
                  placeholder='https://api.provider.com/api/proxy.php' />
              )} />
            </Grid2>
            <Grid2 size={{ xs: 6, sm: 2 }}>
              <Controller name={`${prefix}.fetch_proxies.order_code_param`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth label='Tên param mã đơn'
                  helperText='Tự gắn mã đơn NCC vào param này'
                  placeholder='ma_don_hang' />
              )} />
            </Grid2>
            <Grid2 size={{ xs: 6, sm: 2.5 }}>
              <Controller name={`${prefix}.fetch_proxies.method`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth select label='Method'>
                  <MenuItem value='GET'>GET</MenuItem>
                  <MenuItem value='POST'>POST</MenuItem>
                </CustomTextField>
              )} />
            </Grid2>
            <Grid2 size={{ xs: 6, sm: 2.5 }}>
              <Controller name={`${prefix}.fetch_proxies.auth_type`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth select label='Xác thực'>
                  <MenuItem value='inherit'>Giống API mua</MenuItem>
                  <MenuItem value='query'>Query param</MenuItem>
                  <MenuItem value='header'>Header</MenuItem>
                  <MenuItem value='bearer'>Bearer token</MenuItem>
                </CustomTextField>
              )} />
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 3 }}>
              <Controller name={`${prefix}.fetch_proxies.response_type`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth select label='Dạng kết quả'>
                  <MenuItem value='object'>Object — proxy nằm trong 1 field</MenuItem>
                  <MenuItem value='array_last_status'>Mảng — phần tử cuối là trạng thái</MenuItem>
                  <MenuItem value='array_each_status'>Mảng — mỗi phần tử là 1 proxy</MenuItem>
                </CustomTextField>
              )} />
            </Grid2>
            <Grid2 size={{ xs: 6, sm: 2 }}>
              <Controller name={`${prefix}.fetch_proxies.success_field`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth label='Field kiểm tra' helperText='Bỏ trống nếu không cần' placeholder='maloi' />
              )} />
            </Grid2>
            <Grid2 size={{ xs: 6, sm: 1.5 }}>
              <Controller name={`${prefix}.fetch_proxies.success_value`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth label='Giá trị OK' placeholder='0' />
              )} />
            </Grid2>
            {(!fetchResponseType || fetchResponseType === 'object') && (
              <Grid2 size={{ xs: 12, sm: 3 }}>
                <Controller name={`${prefix}.fetch_proxies.proxies_path`} control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='Vị trí danh sách proxy' helperText='VD: data.proxies, result' placeholder='data.proxies' />
                )} />
              </Grid2>
            )}
            <Grid2 size={{ xs: 12, sm: 3 }}>
              <Controller name={`${prefix}.fetch_proxies.proxy_format`} control={control} render={({ field }) => (
                <CustomTextField {...field} fullWidth select label='Format proxy'>
                  <MenuItem value='key'>1 field key</MenuItem>
                  <MenuItem value='string'>Chuỗi ip:port:user:pass</MenuItem>
                  <MenuItem value='fields'>Nhiều field riêng</MenuItem>
                </CustomTextField>
              )} />
            </Grid2>

            {fetchProxyFormat === 'fields' && (
              <>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.fetch_proxies.proxy_fields_ip`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='IP' placeholder='ip' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.fetch_proxies.proxy_fields_port`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='Port' placeholder='port' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.fetch_proxies.proxy_fields_user`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='User' placeholder='user' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.fetch_proxies.proxy_fields_pass`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='Pass' placeholder='pass' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.fetch_proxies.proxy_fields_type`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='Type' placeholder='type' />)} /></Grid2>
                <Grid2 size={{ xs: 4, sm: 2 }}><Controller name={`${prefix}.fetch_proxies.item_id_field`} control={control} render={({ field }) => (<CustomTextField {...field} fullWidth label='ID' placeholder='id' />)} /></Grid2>
              </>
            )}
            {(fetchProxyFormat === 'key' || fetchProxyFormat === 'string') && (
              <>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller name={`${prefix}.fetch_proxies.proxy_key_field`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label={fetchProxyFormat === 'key' ? 'Tên field key' : 'Tên field chuỗi proxy'} placeholder={fetchProxyFormat === 'key' ? 'proxy' : 'proxy'} />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 2 }}>
                  <Controller name={`${prefix}.fetch_proxies.item_id_field`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='ID proxy' placeholder='idproxy' helperText='Bỏ trống nếu không có' />
                  )} />
                </Grid2>
              </>
            )}

            {/* Pagination */}
            <Grid2 size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid2>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <Controller name={`${prefix}.fetch_proxies.pagination_enabled`} control={control} render={({ field: { value, onChange, ...field } }) => (
                <CustomTextField {...field} value={value ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')} fullWidth select
                  label={<>Phân trang <FieldHint text='Bật nếu API trả proxy phân trang (nhiều page). Hệ thống sẽ tự gom hết.' /></>}
                >
                  <MenuItem value='false'>Không</MenuItem>
                  <MenuItem value='true'>Có phân trang</MenuItem>
                </CustomTextField>
              )} />
            </Grid2>
            {fetchPaginationEnabled && (
              <>
                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller name={`${prefix}.fetch_proxies.page_param`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Param page' placeholder='page' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller name={`${prefix}.fetch_proxies.per_page_param`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Param per_page' placeholder='per_page' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller name={`${prefix}.fetch_proxies.per_page`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Số/trang' placeholder='50' type='number' />
                  )} />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller name={`${prefix}.fetch_proxies.last_page_path`} control={control} render={({ field }) => (
                    <CustomTextField {...field} fullWidth label={<>Path last page <FieldHint text='VD: data.last_page, meta.last_page' /></>} placeholder='data.last_page' />
                  )} />
                </Grid2>
              </>
            )}
          </>
        )}
      </Grid2>
    </PipelineStepCard>
  )
}

// ─── Pipeline Step 4: Data Storage ──────────────────

function StepDataStorage({ prefix, control }: BuySectionProps) {
  return (
    <PipelineStepCard
      step={4}
      title='Ánh xạ dữ liệu — lưu thêm field từ NCC'
      description='Ngoài proxy (bước 3), NCC có thể trả thêm dữ liệu (ISP, region, loại proxy...). Bảng dưới cấu hình: ĐỌC field nào từ response NCC → ĐẶT TÊN gì trong hệ thống → LƯU VÀO ĐÂU.'
    >
      {/* Giải thích data flow */}
      <Box sx={{ mb: 2, p: 1.5, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e', mb: 1 }}>
          Dữ liệu được lưu ở đâu?
        </Typography>
        <Box sx={{ fontSize: 11.5, color: '#334155', lineHeight: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ background: '#3b82f6', color: '#fff', px: 0.75, py: 0.15, borderRadius: 0.5, fontSize: 10, fontWeight: 600 }}>proxy</Box>
            <span>→ Lưu trong <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>OrderItem.proxy</code> — hiện cho khách hàng (ip, port, user, pass...)</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ background: '#8b5cf6', color: '#fff', px: 0.75, py: 0.15, borderRadius: 0.5, fontSize: 10, fontWeight: 600 }}>metadata</Box>
            <span>→ Lưu trong <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>OrderItem.metadata</code> — chỉ admin thấy (ISP, region, ghi chú NCC...)</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ background: '#10b981', color: '#fff', px: 0.75, py: 0.15, borderRadius: 0.5, fontSize: 10, fontWeight: 600 }}>root</Box>
            <span>→ Lưu trực tiếp trên <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>OrderItem</code> (flat) — dùng cho hệ thống, truy vấn nhanh</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ background: '#f59e0b', color: '#fff', px: 0.75, py: 0.15, borderRadius: 0.5, fontSize: 10, fontWeight: 600 }}>custom</Box>
            <span>→ Lưu trong object tên tự đặt (VD: <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>OrderItem.extra_info</code>)</span>
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography sx={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          <strong>Hệ thống tự ghi nguồn gốc:</strong> Khi lưu, hệ thống tự snapshot <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>_field_origins</code> — ghi lại field nào lấy từ đâu của NCC. Admin xem chi tiết trong trang đơn hàng → mở proxy → cột "Field đối tác".
          <br />
          <strong>Site con:</strong> Dữ liệu metadata + custom fields tự động chuyển sang site con qua <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>_data_field</code> (field trung gian). Site con không cần cấu hình lại.
        </Typography>
      </Box>
      <ResponseMappingTable prefix={prefix} control={control} />
      <SavePreviewBox prefix={prefix} control={control} />
    </PipelineStepCard>
  )
}

// ─── Pipeline Step 5: Error Handling ────────────────

function StepErrorHandling({ prefix, control }: BuySectionProps) {
  const { fields: errorCodeFields, append: appendErrorCode, remove: removeErrorCode } = useFieldArray({
    control,
    name: `${prefix}.response.error_codes` as any,
  })
  const { fields: httpErrorFields, append: appendHttpError, remove: removeHttpError } = useFieldArray({
    control,
    name: `${prefix}.response.http_errors` as any,
  })

  return (
    <PipelineStepCard
      step={5}
      title='Xử lý lỗi — thông báo rõ ràng thay vì lỗi chung'
      description='Khi NCC trả lỗi → hệ thống ĐỌC mã lỗi từ response → TÌM trong bảng lỗi bên dưới → HIỆN thông báo tiếng Việt cho admin. Không config → admin chỉ thấy "Lỗi không xác định". Trường lý do lỗi = field chứa message lỗi gốc của NCC (VD: "message", "error.msg").'
    >
      <Grid2 container spacing={2}>
        {/* Error message field */}
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <Controller name={`${prefix}.response.error_message_field`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth
              label={<>Trường lý do lỗi <FieldHint text='Khi đối tác trả lỗi, hệ thống đọc trường này để lấy lý do hiển thị cho admin.\n\nVD: NCC trả {"statusCode":101, "message":"Hết hàng"}\n→ điền "message"' /></>}
              placeholder='message'
              helperText='Bỏ trống → admin không thấy lý do lỗi'
            />
          )} />
        </Grid2>

        {/* Fallback message */}
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <Controller name={`${prefix}.response.fallback_message`} control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth
              label={<>Thông báo mặc định khi lỗi <FieldHint text='Hiển thị khi có lỗi nhưng không khớp mã lỗi nào ở trên' /></>}
              placeholder='Lỗi không xác định từ nhà cung cấp'
            />
          )} />
        </Grid2>

        {/* Error codes */}
        <Grid2 size={{ xs: 12 }}>
          <Box sx={{ p: 1.5, background: '#fef2f2', borderRadius: 1.5, border: '1px solid #fecaca' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='caption' sx={{ fontWeight: 600, color: '#991b1b' }}>
                Mã lỗi cụ thể <FieldHint text='Khi nhà cung cấp trả mã lỗi, hệ thống sẽ hiện thông báo tương ứng thay vì lỗi chung chung.' />
              </Typography>
              <Button size='small' startIcon={<Plus size={14} />}
                onClick={() => appendErrorCode({ field: '', value: '', match: 'exact' as const, message: '' })}
                sx={{ fontSize: 11, textTransform: 'none' }}>
                Thêm mã lỗi
              </Button>
            </Box>
            {errorCodeFields.map((item, idx) => (
              <Box key={item.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <Controller name={`${prefix}.response.error_codes.${idx}.field`} control={control} render={({ field }) => (
                  <CustomTextField {...field} placeholder='statusCode' size='small' sx={{ flex: 1.2 }} label={idx === 0 ? 'Field' : undefined} />
                )} />
                <Controller name={`${prefix}.response.error_codes.${idx}.match`} control={control} render={({ field }) => (
                  <CustomTextField {...field} select size='small' sx={{ flex: 1 }} label={idx === 0 ? 'So sánh' : undefined}>
                    <MenuItem value='exact'>bằng (===)</MenuItem>
                    <MenuItem value='contains'>chứa</MenuItem>
                  </CustomTextField>
                )} />
                <Controller name={`${prefix}.response.error_codes.${idx}.value`} control={control} render={({ field }) => (
                  <CustomTextField {...field} placeholder='101' size='small' sx={{ flex: 1 }} label={idx === 0 ? 'Giá trị' : undefined} />
                )} />
                <Controller name={`${prefix}.response.error_codes.${idx}.message`} control={control} render={({ field }) => (
                  <CustomTextField {...field} placeholder='Hết proxy trong kho' size='small' sx={{ flex: 2 }} label={idx === 0 ? 'Thông báo hiển thị' : undefined} />
                )} />
                <IconButton size='small' onClick={() => removeErrorCode(idx)} sx={{ color: '#dc2626', mt: idx === 0 ? 2.5 : 0 }}>
                  <Trash2 size={14} />
                </IconButton>
              </Box>
            ))}
            {errorCodeFields.length === 0 && (
              <Typography variant='caption' sx={{ color: '#a8a29e', fontStyle: 'italic' }}>
                Chưa có mã lỗi nào. Bấm "Thêm mã lỗi" để cấu hình.
              </Typography>
            )}
          </Box>
        </Grid2>

        {/* HTTP errors */}
        <Grid2 size={{ xs: 12 }}>
          <Box sx={{ p: 1.5, background: '#fefce8', borderRadius: 1.5, border: '1px solid #fde68a' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='caption' sx={{ fontWeight: 600, color: '#854d0e' }}>
                Lỗi HTTP (server/mạng) <FieldHint text='Khi nhà cung cấp trả lỗi HTTP (500, 524...) thay vì JSON bình thường.' />
              </Typography>
              <Button size='small' startIcon={<Plus size={14} />}
                onClick={() => appendHttpError({ status: '', message: '' })}
                sx={{ fontSize: 11, textTransform: 'none' }}>
                Thêm mã HTTP
              </Button>
            </Box>
            {httpErrorFields.map((item, idx) => (
              <Box key={item.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <Controller name={`${prefix}.response.http_errors.${idx}.status`} control={control} render={({ field }) => (
                  <CustomTextField {...field} placeholder='524 hoặc 5xx' size='small' sx={{ flex: 1 }} label={idx === 0 ? 'Mã HTTP' : undefined}
                    helperText={idx === 0 ? 'VD: 524, 429, 5xx, 4xx' : undefined}
                  />
                )} />
                <Controller name={`${prefix}.response.http_errors.${idx}.message`} control={control} render={({ field }) => (
                  <CustomTextField {...field} placeholder='Server nhà cung cấp đang lỗi' size='small' sx={{ flex: 3 }} label={idx === 0 ? 'Thông báo hiển thị' : undefined} />
                )} />
                <IconButton size='small' onClick={() => removeHttpError(idx)} sx={{ color: '#dc2626', mt: idx === 0 ? 2.5 : 0 }}>
                  <Trash2 size={14} />
                </IconButton>
              </Box>
            ))}
            {httpErrorFields.length === 0 && (
              <Typography variant='caption' sx={{ color: '#a8a29e', fontStyle: 'italic' }}>
                Không bắt buộc. Hệ thống sẽ tự trích nội dung từ HTML nếu chưa cấu hình.
              </Typography>
            )}
          </Box>
        </Grid2>
      </Grid2>
    </PipelineStepCard>
  )
}

// ─── Pipeline Step 6: Params Mapping ──────────────────

function StepParamsMapping({ prefix, control }: BuySectionProps) {
  const enabled = useWatch({ control, name: `${prefix}.params_mapping_enabled` })
  const { fields, append, remove } = useFieldArray({ control, name: `${prefix}.params_mapping` })
  const mappingValues = useWatch({ control, name: `${prefix}.params_mapping` }) as ParamsMappingEntry[] | undefined

  const usedVars = (mappingValues || []).map(m => m.variable).filter(Boolean)

  const replacedLabels: Record<string, string> = {
    protocol: 'Protocol Override', quantity: 'Quantity Param', duration: 'Duration Param',
    username: 'User Override', password: 'User Override', ip_whitelist: 'IP Whitelist', auth_token: 'Auth Query',
  }
  const replacedConfigs = [...new Set(usedVars.map(v => replacedLabels[v]).filter(Boolean))]

  return (
    <PipelineStepCard
      step={6}
      title='Params Mapping — biến chuẩn hệ thống (chỉ dùng khi MUA HÀNG)'
      description='Dùng khi gọi API MUA proxy — dịch biến hệ thống (quantity, duration...) sang tên param NCC yêu cầu. Không ảnh hưởng xoay, gia hạn, lấy proxy.'
    >
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12 }}>
          <Controller name={`${prefix}.params_mapping_enabled`} control={control} render={({ field: { value, onChange, ...field } }) => (
            <CustomTextField {...field} value={value ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')} fullWidth select
              label='Bật params mapping'
            >
              <MenuItem value='false'>Tắt — dùng config cũ</MenuItem>
              <MenuItem value='true'>Bật — cấu hình biến chuẩn</MenuItem>
            </CustomTextField>
          )} />
        </Grid2>

        {enabled && (
          <>
            {replacedConfigs.length > 0 && (
              <Grid2 size={{ xs: 12 }}>
                <Alert severity='info' sx={{ fontSize: 12, py: 0.5 }}>
                  Thay thế config cũ: {replacedConfigs.map(c => (
                    <Chip key={c} label={c} size='small' variant='outlined' sx={{ fontSize: 11, ml: 0.5 }} />
                  ))}
                </Alert>
              </Grid2>
            )}

            {/* Mapping entries — mỗi entry là 1 flow card */}
            {fields.map((field, index) => {
              const currentVar = mappingValues?.[index]?.variable
              const varDef = STANDARD_VARIABLES.find(v => v.value === currentVar)

              return (
                <Grid2 size={{ xs: 12 }} key={field.id}>
                  <MappingCard prefix={prefix} control={control} index={index} currentVar={currentVar} varDef={varDef} usedVars={usedVars} onRemove={() => remove(index)} />
                </Grid2>
              )
            })}

            <Grid2 size={{ xs: 12 }}>
              <Button size='small' startIcon={<Plus size={14} />}
                onClick={() => append({ ...defaultParamsMappingEntry })}
                disabled={usedVars.length >= STANDARD_VARIABLES.length}
                sx={{ textTransform: 'none', fontSize: 12 }}
              >
                Thêm biến
              </Button>
            </Grid2>
          </>
        )}
      </Grid2>
    </PipelineStepCard>
  )
}

/** Flow card — hiển thị: Khách chọn X ──→ Gửi NCC param Y = giá trị Z */
function MappingCard({ prefix, control, index, currentVar, varDef, usedVars, onRemove }: BuySectionProps & {
  index: number; currentVar?: string; varDef?: (typeof STANDARD_VARIABLES)[0]; usedVars: string[]; onRemove: () => void
}) {
  const { fields: vmFields, append: vmAppend, remove: vmRemove } = useFieldArray({ control, name: `${prefix}.params_mapping.${index}.value_map` })
  const paramValue = useWatch({ control, name: `${prefix}.params_mapping.${index}.param` })
  const vmValues = useWatch({ control, name: `${prefix}.params_mapping.${index}.value_map` }) as { from: string; to: string }[] | undefined

  // Ví dụ kết quả thực tế
  const exampleResult = (() => {
    if (!varDef || !paramValue) return null
    const exVal = varDef.example?.split(', ')[0] || ''
    const mapped = (vmValues || []).find(vm => vm.from && vm.from.toLowerCase() === exVal.toLowerCase())
    const finalVal = mapped?.to || exVal
    return `${paramValue}=${finalVal}`
  })()

  return (
    <Box sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Dòng 1: Khách chọn/nhập → Gửi NCC param */}
      <Box sx={{ px: 2, py: 1.5, background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Variable dropdown */}
          <Box sx={{ flex: 1 }}>
            <Controller name={`${prefix}.params_mapping.${index}.variable`} control={control} render={({ field: f }) => (
              <CustomTextField {...f} fullWidth select size='small'
                label={varDef ? `${varDef.source}` : 'Chọn biến'}
                slotProps={{ select: { renderValue: (val: unknown) => {
                  const sv = STANDARD_VARIABLES.find(s => s.value === val)
                  return sv ? `${sv.value} — ${sv.label}` : 'Chọn biến...'
                }}}}
              >
                {STANDARD_VARIABLES.map(sv => (
                  <MenuItem key={sv.value} value={sv.value} disabled={usedVars.includes(sv.value) && sv.value !== currentVar}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontWeight: 600, minWidth: 75 }}>{sv.value}</code>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 13 }}>{sv.label}</Typography>
                        <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>{sv.source} — VD: {sv.example}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </CustomTextField>
            )} />
          </Box>

          <Typography sx={{ fontSize: 20, color: '#6366f1', fontWeight: 700 }}>→</Typography>

          {/* Param NCC */}
          <Box sx={{ flex: 1 }}>
            <Controller name={`${prefix}.params_mapping.${index}.param`} control={control} render={({ field: f }) => (
              <CustomTextField {...f} fullWidth size='small' label='Gửi NCC bằng param' placeholder='VD: soluong, type, ngay' />
            )} />
          </Box>

          <IconButton size='small' onClick={onRemove} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
            <Trash2 size={16} />
          </IconButton>
        </Box>

        {/* Ví dụ kết quả */}
        {exampleResult && (
          <Typography sx={{ fontSize: 11, color: '#6366f1', mt: 0.75, pl: 0.5 }}>
            VD: Khách chọn <strong>{varDef?.example?.split(', ')[0]}</strong> → gửi NCC <code style={{ background: '#eef2ff', padding: '1px 4px', borderRadius: 3 }}>{exampleResult}</code>
          </Typography>
        )}
      </Box>

      {/* Dòng 2: Tuỳ chọn — mặc định + format + chuyển giá trị */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
          <Controller name={`${prefix}.params_mapping.${index}.default_value`} control={control} render={({ field: f }) => (
            <CustomTextField {...f} size='small' label='Nếu khách không nhập, gửi giá trị' placeholder='Bỏ trống = không gửi param này' sx={{ flex: 1 }} />
          )} />
          {varDef?.hasFormat && (
            <Controller name={`${prefix}.params_mapping.${index}.format`} control={control} render={({ field: f }) => (
              <CustomTextField {...f} select size='small' label='Gửi nhiều giá trị kiểu' sx={{ minWidth: 220 }}>
                {VARIABLE_FORMAT_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </CustomTextField>
            )} />
          )}
        </Box>

        {/* Chuyển giá trị */}
        <Typography variant='caption' sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
          Chuyển giá trị trước khi gửi NCC
          <Typography component='span' variant='caption' sx={{ color: '#94a3b8', fontWeight: 400, ml: 0.5 }}>
            — bỏ trống = gửi nguyên
          </Typography>
        </Typography>

        {vmFields.map((f, vmIdx) => (
          <Box key={f.id} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
            <Typography variant='caption' sx={{ color: '#94a3b8', minWidth: 65, fontSize: 11 }}>Khách chọn</Typography>
            <Controller name={`${prefix}.params_mapping.${index}.value_map.${vmIdx}.from`} control={control} render={({ field }) => (
              <CustomTextField {...field} size='small' placeholder={varDef?.example?.split(', ')[0] || 'VD: http'} sx={{ flex: 1 }} />
            )} />
            <Typography sx={{ color: '#6366f1', fontWeight: 600 }}>→</Typography>
            <Typography variant='caption' sx={{ color: '#94a3b8', minWidth: 55, fontSize: 11 }}>gửi NCC</Typography>
            <Controller name={`${prefix}.params_mapping.${index}.value_map.${vmIdx}.to`} control={control} render={({ field }) => (
              <CustomTextField {...field} size='small' placeholder='VD: 1' sx={{ flex: 1 }} />
            )} />
            <IconButton size='small' onClick={() => vmRemove(vmIdx)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
              <Trash2 size={14} />
            </IconButton>
          </Box>
        ))}
        <Button size='small' onClick={() => vmAppend({ from: '', to: '' })} sx={{ textTransform: 'none', fontSize: 11, color: '#6366f1' }}>
          + Thêm chuyển giá trị
        </Button>
      </Box>
    </Box>
  )
}

// ─── Advanced Options (collapsible) ─────────────────

function StepAdvancedOptions({ prefix, control }: BuySectionProps) {
  const userOverrideEnabled = useWatch({ control, name: `${prefix}.user_override_enabled` })
  const protocolOverrideEnabled = useWatch({ control, name: `${prefix}.protocol_override_enabled` })

  return (
    <Accordion sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ChevronDown size={16} />}>
        <Typography variant='body2' fontWeight={600} sx={{ color: '#64748b' }}>Tuỳ chọn nâng cao</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid2 container spacing={2}>
          {/* User override */}
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Controller name={`${prefix}.user_override_enabled`} control={control} render={({ field: { value, onChange, ...field } }) => (
              <CustomTextField {...field} value={value ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')} fullWidth select
                label={<>User tự chọn User:Pass <FieldHint text='Bật nếu provider cho phép user tự đặt tài khoản proxy' /></>}
              >
                <MenuItem value='false'>Không</MenuItem>
                <MenuItem value='true'>Có</MenuItem>
              </CustomTextField>
            )} />
          </Grid2>
          {userOverrideEnabled && (
            <>
              <Grid2 size={{ xs: 6, sm: 4 }}>
                <Controller name={`${prefix}.user_override_user_param`} control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='Param username' placeholder='user' />
                )} />
              </Grid2>
              <Grid2 size={{ xs: 6, sm: 4 }}>
                <Controller name={`${prefix}.user_override_pass_param`} control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='Param password' placeholder='password' />
                )} />
              </Grid2>
            </>
          )}

          {/* Protocol override */}
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Controller name={`${prefix}.protocol_override_enabled`} control={control} render={({ field: { value, onChange, ...field } }) => (
              <CustomTextField {...field} value={value ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')} fullWidth select
                label={<>Giao thức (HTTP/SOCKS5) <FieldHint text='Khi khách chọn HTTP hoặc SOCKS5, hệ thống sẽ gửi giá trị tương ứng cho NCC.' /></>}
              >
                <MenuItem value='false'>Không gửi</MenuItem>
                <MenuItem value='true'>Gửi theo lựa chọn khách</MenuItem>
              </CustomTextField>
            )} />
          </Grid2>
          {protocolOverrideEnabled && (
            <>
              <Grid2 size={{ xs: 4, sm: 2.67 }}>
                <Controller name={`${prefix}.protocol_override_param`} control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='Tên biến' placeholder='type' />
                )} />
              </Grid2>
              <Grid2 size={{ xs: 4, sm: 2.67 }}>
                <Controller name={`${prefix}.protocol_override_http`} control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='Khi chọn HTTP' placeholder='HTTP' />
                )} />
              </Grid2>
              <Grid2 size={{ xs: 4, sm: 2.67 }}>
                <Controller name={`${prefix}.protocol_override_socks5`} control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='Khi chọn SOCKS5' placeholder='SOCKS5' />
                )} />
              </Grid2>
            </>
          )}
        </Grid2>
      </AccordionDetails>
    </Accordion>
  )
}

// ─── Main Buy Config Section ────────────────────────

export default function BuyConfigSection({ control, setValue }: { control: BuySectionProps['control']; setValue?: any }) {
  const [activeType, setActiveType] = useState<'rotating' | 'static'>('rotating')

  const rotatingEnabled = useWatch({ control, name: 'buy_rotating.enabled' })
  const staticEnabled = useWatch({ control, name: 'buy_static.enabled' })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Toggle Rotating / Static */}
      <Box sx={{ display: 'flex', gap: 0.5, background: '#f1f5f9', borderRadius: 1.5, p: 0.5 }}>
        {[
          { key: 'rotating' as const, label: 'Proxy xoay', enabled: rotatingEnabled },
          { key: 'static' as const, label: 'Proxy tĩnh', enabled: staticEnabled },
        ].map(t => (
          <Button
            key={t.key}
            size='small'
            variant={activeType === t.key ? 'contained' : 'text'}
            onClick={() => setActiveType(t.key)}
            sx={{
              flex: 1,
              textTransform: 'none',
              fontSize: 13,
              fontWeight: activeType === t.key ? 600 : 400,
              color: activeType === t.key ? '#fff' : '#64748b',
              boxShadow: activeType === t.key ? 1 : 0,
            }}
          >
            {t.label}
            {t.enabled && (
              <Box component='span' sx={{
                ml: 0.75, width: 6, height: 6, borderRadius: '50%',
                background: activeType === t.key ? '#a5d6a7' : '#4caf50',
                display: 'inline-block',
              }} />
            )}
          </Button>
        ))}
      </Box>

      {/* Render cả 2 tab, ẩn tab không active — giữ form fields mounted */}
      {(['rotating', 'static'] as const).map(type => {
        const prefix = type === 'rotating' ? 'buy_rotating' : 'buy_static' as const
        const enabled = type === 'rotating' ? rotatingEnabled : staticEnabled

        return (
          <Box key={type} sx={{ display: activeType === type ? 'block' : 'none' }}>
            {/* Enable/Disable */}
            <Controller
              name={`${prefix}.enabled`}
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <CustomTextField
                  {...field}
                  value={value ? 'true' : 'false'}
                  onChange={(e) => onChange(e.target.value === 'true')}
                  fullWidth select label={`Bật cấu hình mua ${type === 'rotating' ? 'proxy xoay' : 'proxy tĩnh'}`}
                >
                  <MenuItem value='false'>Tắt</MenuItem>
                  <MenuItem value='true'>Bật</MenuItem>
                </CustomTextField>
              )}
            />

            {/* Pipeline Steps */}
            {enabled && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <StepApiCall prefix={prefix} control={control} />
                <StepSuccessCheck prefix={prefix} control={control} />
                <StepProxyExtract prefix={prefix} control={control} />
                <StepDataStorage prefix={prefix} control={control} />
                <StepErrorHandling prefix={prefix} control={control} />
                <StepParamsMapping prefix={prefix} control={control} />
                <StepAdvancedOptions prefix={prefix} control={control} />
                <ResponseDryRun prefix={prefix} control={control} setValue={setValue} />
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
