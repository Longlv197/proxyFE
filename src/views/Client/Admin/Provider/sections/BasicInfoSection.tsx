import { memo } from 'react'
import { Controller } from 'react-hook-form'
import Grid2 from '@mui/material/Grid2'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import FieldHint from '../components/FieldHint'
import type { SectionProps } from '../ProviderFormTypes'

function BasicInfoSection({ control, errors }: SectionProps & { errors: any }) {
  return (
    <>
      <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 1 }}>Thông tin cơ bản</Typography>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12 }}>
          <Controller
            name='title'
            control={control}
            rules={{ required: 'Bắt buộc' }}
            render={({ field }) => (
              <CustomTextField {...field} required fullWidth label='Tên nhà cung cấp' placeholder='VD: ProxyVN, HomeProxy...' error={!!errors.title} helperText={errors.title?.message} />
            )}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <Controller
            name='provider_code'
            control={control}
            rules={{ required: 'Bắt buộc' }}
            render={({ field }) => (
              <CustomTextField {...field} required fullWidth label={<>Provider Code <FieldHint text='Mã định danh duy nhất. VD: proxy.vn, homeproxy.vn' /></>} placeholder='proxy.vn' error={!!errors.provider_code} helperText={errors.provider_code?.message} />
            )}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <Controller
            name='token_api'
            control={control}
            rules={{ required: 'Bắt buộc' }}
            render={({ field }) => (
              <CustomTextField {...field} required fullWidth label={<>Token API <FieldHint text='API key/token xác thực với nhà cung cấp' /></>} placeholder='Token xác thực' error={!!errors.token_api} helperText={errors.token_api?.message} />
            )}
          />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <Controller name='status' control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth select label='Trạng thái'>
              <MenuItem value='active'>Active</MenuItem>
              <MenuItem value='inactive'>Inactive</MenuItem>
            </CustomTextField>
          )} />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <Controller name='order' control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth type='number' label='Thứ tự' placeholder='0' />
          )} />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <Controller name='rotation_interval' control={control} render={({ field }) => (
            <CustomTextField {...field} fullWidth type='number' label={<>Rotation Interval (giây) <FieldHint text='Thời gian chờ giữa 2 lần xoay. VD: 60 = 1 phút' /></>} placeholder='60' />
          )} />
        </Grid2>
      </Grid2>
    </>
  )
}

export default memo(BasicInfoSection)
