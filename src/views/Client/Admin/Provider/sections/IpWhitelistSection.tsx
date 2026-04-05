import { memo } from 'react'
import { Controller, useWatch } from 'react-hook-form'
import Grid2 from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'
import FieldHint from '../components/FieldHint'
import type { SectionProps } from '../ProviderFormTypes'

function IpWhitelistSection({ control }: SectionProps) {
  const enabled = useWatch({ control, name: 'ip_whitelist.enabled' })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Giải thích tổng quan */}
      <Box sx={{ p: 1.5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#15803d', mb: 0.5 }}>
          IP Whitelist — giới hạn IP được dùng proxy
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
          Một số NCC yêu cầu khai báo IP máy khách trước khi dùng proxy. Bật section này nếu NCC hỗ trợ.
          <br />
          Hệ thống sẽ <strong>tự gửi IP của khách</strong> cho NCC khi mua hoặc khi xoay (tuỳ chọn).
        </Typography>
      </Box>

      <Controller
        name='ip_whitelist.enabled'
        control={control}
        render={({ field: { value, onChange, ...field } }) => (
          <CustomTextField
            {...field}
            value={value ? 'true' : 'false'}
            onChange={(e) => onChange(e.target.value === 'true')}
            fullWidth select label='NCC hỗ trợ IP Whitelist?'
          >
            <MenuItem value='false'>Không — bỏ qua</MenuItem>
            <MenuItem value='true'>Có — cấu hình bên dưới</MenuItem>
          </CustomTextField>
        )}
      />

      {enabled && (
        <Box sx={{ border: '1px solid #bbf7d0', borderTop: '3px solid #16a34a', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', px: 2, py: 1.25 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
              Cấu hình gửi IP cho NCC
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
              Hệ thống lấy IP từ danh sách IP whitelist khách đã nhập → gửi cho NCC qua param bên dưới.
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller name='ip_whitelist.mode' control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth select label='Gửi IP cho NCC khi nào?'>
                    <MenuItem value='on_buy'>Khi mua — gửi 1 lần lúc tạo đơn</MenuItem>
                    <MenuItem value='on_rotate'>Mỗi lần xoay — gửi kèm request xoay</MenuItem>
                  </CustomTextField>
                )} />
              </Grid2>
              <Grid2 size={{ xs: 6, sm: 3 }}>
                <Controller name='ip_whitelist.max_ips' control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth type='number' label='Tối đa bao nhiêu IP?' placeholder='1' helperText='NCC cho phép khai báo bao nhiêu IP' />
                )} />
              </Grid2>
              <Grid2 size={{ xs: 6, sm: 3 }}>
                <Controller name='ip_whitelist.param' control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='NCC gọi param IP là gì?' placeholder='ip' helperText='VD: ip, allowed_ips, whitelist' />
                )} />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller name='ip_whitelist.param_format' control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth select label='Format gửi IP'>
                    <MenuItem value='single'>Đơn — ip=1.2.3.4 (chỉ 1 IP)</MenuItem>
                    <MenuItem value='comma'>Nối bằng dấu phẩy — ip=1.2.3.4,5.6.7.8</MenuItem>
                    <MenuItem value='array'>Mảng — ip[]=1.2.3.4&ip[]=5.6.7.8</MenuItem>
                  </CustomTextField>
                )} />
              </Grid2>
            </Grid2>

            {/* Minh hoạ */}
            <Box sx={{ mt: 2, p: 1.5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155', mb: 0.5 }}>
                Ví dụ request gửi NCC:
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#475569', fontFamily: 'monospace', lineHeight: 2 }}>
                Khách nhập IP: <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>103.1.2.3</code>
                <br />
                → Hệ thống gửi kèm: <code style={{ background: '#dcfce7', padding: '1px 4px', borderRadius: 3 }}>...&ip=103.1.2.3</code>
                <br />
                → NCC whitelist IP đó → proxy chỉ dùng được từ IP này
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default memo(IpWhitelistSection)
