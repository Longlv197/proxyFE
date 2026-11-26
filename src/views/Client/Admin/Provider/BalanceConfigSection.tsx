'use client'

import { useEffect, useState } from 'react'
import type { MutableRefObject } from 'react'

import {
  Alert, Box, Button, Card, CardContent, CardHeader, Grid2 as Grid, MenuItem, Stack, TextField, Typography
} from '@mui/material'
import { Wallet } from 'lucide-react'

import { formatProviderBalance, useProviderBalance, useProviderBalances } from '@/hooks/apis/useProviders'

/**
 * Mục "Số dư NCC" (tab Cơ bản) → `api_config.balance`. BE: ProviderBalanceService + command
 * providers:sync-balance (15 phút/lần).
 *
 *   - api:    NCC có API số dư (url + token_api + đường đọc số).
 *   - scrape: NCC KHÔNG có API → đăng nhập web, giữ phiên, đọc HTML, regex ra số tiền.
 *
 * Mật khẩu: BE mã hoá khi lưu (enc:...). Ô để trống = giữ mật khẩu đã lưu, KHÔNG gửi lại bản mã hoá
 * vào ô nhập (admin nhìn thấy chuỗi enc: dài dễ tưởng là mật khẩu thật rồi sửa hỏng).
 * Lưu chung nút "Cập nhật" footer qua stateRef (giống tab Residential).
 */

type Mode = '' | 'api' | 'scrape'

export type BalanceBuildResult = { ok: true; config: Record<string, any> } | { ok: false; error: string }
export type BalanceBuildRef = { build: () => BalanceBuildResult }

type Props = {
  provider: any
  stateRef?: MutableRefObject<BalanceBuildRef | null>
}

type Form = {
  mode: Mode
  currency: string
  low_threshold: string

  // api
  url: string
  method: string
  auth_type: string
  auth_param: string
  value_path: string

  // scrape
  login_url: string
  user_field: string
  pass_field: string
  success_path: string
  success_value: string
  page_url: string
  regex: string
  logged_out_marker: string
  session_ttl: string
  username: string
  password: string // chỉ chứa mật khẩu MỚI admin gõ; trống = giữ cũ
}

const EMPTY: Form = {
  mode: '', currency: 'VND', low_threshold: '',
  url: '', method: 'GET', auth_type: 'header', auth_param: 'api-key', value_path: '',
  login_url: '', user_field: 'username', pass_field: 'password', success_path: '', success_value: '',
  page_url: '', regex: '', logged_out_marker: '', session_ttl: '60', username: '', password: ''
}

const PRESETS: Record<string, Partial<Form>> = {
  'proxy.vn (đăng nhập web)': {
    mode: 'scrape', currency: 'VND',
    login_url: 'https://proxy.vn/login.php', user_field: 'user', pass_field: 'pass',
    success_path: 'status', success_value: 'ok',
    page_url: 'https://proxy.vn/',
    regex: 'CHATBOX_CUSTOMER_BALANCE\\s*=\\s*"([\\d.,]+)',
    logged_out_marker: 'id="loginForm"', session_ttl: '60'
  },
  '2proxy.vn (API)': {
    mode: 'api', currency: 'VND',
    url: 'https://app.2proxy.vn/api/proxyv3.php?sukien=so_du', method: 'GET',
    auth_type: 'query', auth_param: 'key', value_path: 'so_du'
  },
  'Proxyma (API)': {
    mode: 'api', currency: 'USD',
    url: 'https://api.proxyma1.io/api/reseller/get/balance', method: 'GET',
    auth_type: 'header', auth_param: 'api-key', value_path: 'result.message'
  }
}

function fromConfig(b: any): Form {
  if (!b || typeof b !== 'object') return { ...EMPTY }
  const fields = b.login_fields && typeof b.login_fields === 'object' ? b.login_fields : {}
  const userField = Object.keys(fields).find(k => String(fields[k]).includes('{username}')) || 'username'
  const passField = Object.keys(fields).find(k => String(fields[k]).includes('{password}')) || 'password'

  return {
    ...EMPTY,
    mode: b.mode === 'api' || b.mode === 'scrape' ? b.mode : '',
    currency: b.currency || 'VND',
    low_threshold: b.low_threshold != null ? String(b.low_threshold) : '',
    url: b.url || '', method: b.method || 'GET', auth_type: b.auth_type || 'header',
    auth_param: b.auth_param || 'api-key', value_path: b.value_path || '',
    login_url: b.login_url || '', user_field: userField, pass_field: passField,
    success_path: b.login_success?.path || '', success_value: b.login_success?.value != null ? String(b.login_success.value) : '',
    page_url: b.page_url || '', regex: b.regex || '', logged_out_marker: b.logged_out_marker || '',
    session_ttl: b.session_ttl != null ? String(b.session_ttl) : '60',
    username: b.username || '', password: ''
  }
}

export default function BalanceConfigSection({ provider, stateRef }: Props) {
  const saved = provider?.api_config?.balance
  const [f, setF] = useState<Form>(() => fromConfig(saved))
  const hasSavedPassword = !!saved?.password

  useEffect(() => {
    setF(fromConfig(provider?.api_config?.balance))
  }, [provider?.id, provider?.api_config])

  const set = (k: keyof Form) => (e: any) => setF(prev => ({ ...prev, [k]: e.target.value }))

  const { data: balances } = useProviderBalances()
  const refresh = useProviderBalance()
  const code = provider?.provider_code
  const info = code ? balances?.[code] : undefined

  const build = (): BalanceBuildResult => {
    if (!f.mode) {
      // Tắt: có cấu hình cũ → gửi null để BE xoá; chưa từng có → không đụng
      return { ok: true, config: saved != null ? { balance: null } : {} }
    }

    const threshold = f.low_threshold.trim() === '' ? undefined : Number(f.low_threshold)

    if (threshold !== undefined && Number.isNaN(threshold)) return { ok: false, error: 'Ngưỡng cảnh báo phải là số' }

    const common = { mode: f.mode, currency: f.currency.trim().toUpperCase() || 'VND', low_threshold: threshold }

    if (f.mode === 'api') {
      if (!f.url.trim()) return { ok: false, error: 'Chưa nhập URL API số dư' }
      if (!f.value_path.trim()) return { ok: false, error: 'Chưa nhập đường đọc số dư (value_path)' }

      return {
        ok: true,
        config: {
          balance: {
            ...common, url: f.url.trim(), method: f.method, auth_type: f.auth_type,
            auth_param: f.auth_param.trim(), value_path: f.value_path.trim()
          }
        }
      }
    }

    for (const [k, label] of [
      ['login_url', 'URL đăng nhập'], ['page_url', 'URL trang có số dư'], ['regex', 'Regex số dư'],
      ['user_field', 'Tên ô tài khoản'], ['pass_field', 'Tên ô mật khẩu'], ['username', 'Tài khoản']
    ] as const) {
      if (!String(f[k]).trim()) return { ok: false, error: `Chưa nhập ${label}` }
    }

    if (!f.password && !hasSavedPassword) return { ok: false, error: 'Chưa nhập mật khẩu' }

    try {
      new RegExp(f.regex)
    } catch {
      return { ok: false, error: 'Regex không hợp lệ' }
    }

    return {
      ok: true,
      config: {
        balance: {
          ...common,
          login_url: f.login_url.trim(),
          login_fields: { [f.user_field.trim()]: '{username}', [f.pass_field.trim()]: '{password}' },
          login_success: f.success_path.trim() ? { path: f.success_path.trim(), value: f.success_value } : undefined,
          page_url: f.page_url.trim(),
          regex: f.regex,
          logged_out_marker: f.logged_out_marker || undefined,
          session_ttl: Number(f.session_ttl) || 60,
          username: f.username.trim(),

          // Trống → gửi lại bản đã lưu (enc:...) để BE giữ nguyên; có → mật khẩu mới, BE mã hoá
          password: f.password ? f.password : saved?.password
        }
      }
    }
  }

  useEffect(() => {
    if (stateRef) stateRef.current = { build }
  })
  useEffect(() => {
    return () => {
      if (stateRef) stateRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card variant='outlined' sx={{ mt: 3 }}>
      <CardHeader
        avatar={<Wallet size={18} />}
        title='Số dư NCC'
        subheader='Tự lấy 15 phút/lần, hiện ở cột "Số dư NCC" của bảng. Dưới ngưỡng → báo Telegram.'
        titleTypographyProps={{ fontSize: 15, fontWeight: 600 }}
      />
      <CardContent sx={{ pt: 0 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size='small' label='Cách lấy' value={f.mode} onChange={set('mode')}>
              <MenuItem value=''>Tắt</MenuItem>
              <MenuItem value='api'>API của NCC</MenuItem>
              <MenuItem value='scrape'>Đăng nhập web (NCC không có API)</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth size='small' label='Đơn vị tiền' value={f.currency} onChange={set('currency')}
              helperText='VND, USD...' disabled={!f.mode} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth size='small' label='Ngưỡng cảnh báo' value={f.low_threshold}
              onChange={set('low_threshold')} helperText='Bỏ trống = không cảnh báo' disabled={!f.mode} />
          </Grid>

          <Grid size={12}>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
              <Typography variant='caption' color='text.secondary'>Điền mẫu:</Typography>
              {Object.entries(PRESETS).map(([name, p]) => (
                <Button key={name} size='small' variant='outlined'
                  onClick={() => setF(prev => ({ ...prev, ...p }))}>
                  {name}
                </Button>
              ))}
            </Stack>
          </Grid>

          {f.mode === 'api' && (
            <>
              <Grid size={{ xs: 12, sm: 9 }}>
                <TextField fullWidth size='small' label='URL API số dư' value={f.url} onChange={set('url')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField select fullWidth size='small' label='Method' value={f.method} onChange={set('method')}>
                  <MenuItem value='GET'>GET</MenuItem>
                  <MenuItem value='POST'>POST</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select fullWidth size='small' label='Gửi token' value={f.auth_type} onChange={set('auth_type')}>
                  <MenuItem value='header'>Header</MenuItem>
                  <MenuItem value='bearer'>Bearer</MenuItem>
                  <MenuItem value='query'>Query param</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size='small' label='Tên header / param' value={f.auth_param}
                  onChange={set('auth_param')} disabled={f.auth_type === 'bearer'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size='small' label='Đường đọc số dư' value={f.value_path}
                  onChange={set('value_path')} helperText='VD result.message' />
              </Grid>
              <Grid size={12}>
                <Typography variant='caption' color='text.secondary'>Token lấy từ ô Token API ở trên.</Typography>
              </Grid>
            </>
          )}

          {f.mode === 'scrape' && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size='small' label='Tài khoản đăng nhập' value={f.username} onChange={set('username')}
                  autoComplete='off' />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size='small' type='password' label='Mật khẩu' value={f.password}
                  onChange={set('password')} autoComplete='new-password'
                  helperText={hasSavedPassword ? 'Đã lưu (mã hoá). Bỏ trống = giữ mật khẩu cũ' : 'Lưu dạng mã hoá'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size='small' label='URL đăng nhập (POST form)' value={f.login_url} onChange={set('login_url')} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth size='small' label='Tên ô tài khoản' value={f.user_field} onChange={set('user_field')} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth size='small' label='Tên ô mật khẩu' value={f.pass_field} onChange={set('pass_field')} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth size='small' label='Kiểm tra login: trường' value={f.success_path}
                  onChange={set('success_path')} helperText='JSON, VD status' />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth size='small' label='= giá trị' value={f.success_value}
                  onChange={set('success_value')} helperText='VD ok' />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size='small' label='URL trang có số dư' value={f.page_url} onChange={set('page_url')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 9 }}>
                <TextField fullWidth size='small' label='Regex số dư (nhóm 1 = số tiền)' value={f.regex}
                  onChange={set('regex')} InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth size='small' label='Giữ phiên (phút)' value={f.session_ttl} onChange={set('session_ttl')} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size='small' label='Dấu hiệu CHƯA đăng nhập' value={f.logged_out_marker}
                  onChange={set('logged_out_marker')}
                  helperText='Chuỗi chỉ có ở trang khi chưa đăng nhập (VD form đăng nhập) — tránh đọc nhầm số 0 của khách'
                  InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }} />
              </Grid>
            </>
          )}

          {f.mode && code && (
            <Grid size={12}>
              <Alert
                severity={info?.success === false ? 'warning' : 'info'}
                action={
                  <Button size='small' disabled={refresh.isPending} onClick={() => refresh.mutate(code)}>
                    {refresh.isPending ? 'Đang lấy...' : 'Lấy ngay'}
                  </Button>
                }
              >
                <Box component='span'>
                  {info
                    ? <>Số dư: <b>{formatProviderBalance(info.balance, info.currency)}</b>
                      {info.fetched_at ? ` · lúc ${info.fetched_at}` : ''}
                      {info.success === false ? ` · lỗi: ${info.message}` : ''}</>
                    : 'Chưa lấy lần nào.'}
                  {' '}(Đổi cấu hình thì bấm Cập nhật trước, rồi mới Lấy ngay.)
                </Box>
              </Alert>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  )
}
