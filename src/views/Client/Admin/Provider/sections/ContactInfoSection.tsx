'use client'

import React from 'react'
import { Controller } from 'react-hook-form'
import Grid2 from '@mui/material/Grid2'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { SectionProps } from '../ProviderFormTypes'

export default function ContactInfoSection({ control }: SectionProps) {
  return (
    <div>
      <Typography variant='h6' sx={{ mb: 2 }}>
        Thông tin liên hệ
      </Typography>

      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Controller
            control={control}
            name='contact.name'
            render={({ field }) => (
              <TextField {...field} fullWidth label='Họ tên / Người đại diện' size='small' variant='outlined' />
            )}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Controller
            control={control}
            name='contact.email'
            render={({ field }) => (
              <TextField {...field} fullWidth label='Email hỗ trợ' size='small' variant='outlined' />
            )}
          />
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
          <Controller
            control={control}
            name='contact.phone'
            render={({ field }) => (
              <TextField {...field} fullWidth label='Số điện thoại' size='small' variant='outlined' />
            )}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Controller
            control={control}
            name='contact.telegram'
            render={({ field }) => (
              <TextField {...field} fullWidth label='Telegram' size='small' variant='outlined' />
            )}
          />
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
          <Controller
            control={control}
            name='contact.website'
            render={({ field }) => (
              <TextField {...field} fullWidth label='Website chính thức' size='small' variant='outlined' />
            )}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Controller
            control={control}
            name='contact.skype'
            render={({ field }) => (
              <TextField {...field} fullWidth label='Skype (Nếu có)' size='small' variant='outlined' />
            )}
          />
        </Grid2>

        <Grid2 size={{ xs: 12 }}>
          <Controller
            control={control}
            name='contact.address'
            render={({ field }) => (
              <TextField {...field} fullWidth label='Địa chỉ văn phòng' size='small' variant='outlined' />
            )}
          />
        </Grid2>

        <Grid2 size={{ xs: 12 }}>
          <Controller
            control={control}
            name='contact.note'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Ghi chú thêm (Hợp đồng, ngày ký...)'
                size='small'
                variant='outlined'
                multiline
                rows={3}
              />
            )}
          />
        </Grid2>
      </Grid2>
    </div>
  )
}
