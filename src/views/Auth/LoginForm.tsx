'use client'

import React, { useState } from 'react'

import { useParams, usePathname, useRouter } from 'next/navigation'

import { signIn } from 'next-auth/react'

import { Eye, EyeOff, Loader } from 'lucide-react'

import { useForm } from 'react-hook-form'

import { yupResolver } from '@hookform/resolvers/yup'

import { toast } from 'react-toastify'

import * as yup from 'yup'

import { useTranslation } from 'react-i18next'

import { useModalContext } from '@/app/contexts/ModalContext'
import { useBranding } from '@/app/contexts/BrandingContext'
import TurnstileWidget from '@/components/TurnstileWidget'
import UnverifiedEmailModal from './UnverifiedEmailModal'

type LoginFormInputs = {
  email: string
  password: string
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showError, setError] = useState('')
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')

  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const { closeAuthModal, setAuthModalMode, referralCode } = useModalContext()
  const { turnstile_enabled } = useBranding()

  const { lang: locale } = params

  const { t } = useTranslation()

  const schema = yup.object({
    email: yup.string().email(t('auth.validation.emailInvalid')).required(t('auth.validation.emailRequired')),
    password: yup
      .string()
      .min(6, t('auth.validation.passwordMinLength'))
      .required(t('auth.validation.passwordRequired'))
  })

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormInputs>({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data: LoginFormInputs) => {
    if (turnstile_enabled === 'true' && !turnstileToken) {
      toast.error(t('auth.turnstileRequired') || 'Vui lòng xác minh bảo mật.')
      return
    }

    setLoading(true)

    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      turnstile_token: turnstileToken || undefined,
      redirect: false,
      callbackUrl: `/${locale}/home`,
      ref: referralCode ?? undefined
    })

    let errorObj

    if (res?.error) {
      try {
        errorObj = JSON.parse(res.error) // Laravel message + type
      } catch {
        errorObj = { message: res.error, type: 'unknown_error' }
      }

      setUnverified(errorObj.type)
      setLoading(false)

      if (errorObj.type === 'unverified') {
        setShowModal(true)
        setEmail(data.email)
      }

      if (errorObj.type === 'banned') {
        setError(errorObj.message || 'Tài khoản đã bị cấm.')

        return
      }

      toast.error(errorObj.message || t('auth.loginError'))
    } else if (res?.ok) {
      setLoading(false)
      toast.success(t('auth.loginSuccess'))
      closeAuthModal()

      // Chuyển hướng về overview và reload trang để cập nhật Redux store
      // Sử dụng window.location.href để force reload và sync session
      // router.replace(`/${locale}/home`)

      window.location.href = `/${locale}/home`
    } else {
      setLoading(false)
      toast.error(t('auth.loginError'))
    }
  }

  return (
    <>
      <form className='login-modal-form' onSubmit={handleSubmit(onSubmit)} autoComplete='on'>
        {/* Banned warning */}
        {showError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
            {showError}
          </div>
        )}
        {/* Email */}
        <div className='login-form-group'>
          <label className={`login-form-label ${errors.email && 'text-red-500'}`}>{t('auth.email')}</label>
          <input
            id='login-email'
            type='email'
            autoComplete='email'
            className={`login-form-input ${errors.email && 'border-red-500'}`}
            placeholder={t('auth.placeholders.enterEmail')}
            {...register('email')}
          />
          {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className='login-form-group'>
          <label className={`login-form-label ${errors.password && 'text-red-500'}`}>{t('auth.password')}</label>
          <div className='login-password-wrapper'>
            <input
              id='login-password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='current-password'
              className={`login-form-input ${errors.password && 'border-red-500'}`}
              placeholder={t('auth.placeholders.enterPassword')}
              {...register('password')}
            />
            <button type='button' className='login-password-toggle' onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} color='#999' /> : <Eye size={20} color='#999' />}
            </button>
          </div>
          {errors.password && <p className='text-red-500 text-sm mt-1'>{errors.password.message}</p>}
        </div>

        <div className='login-form-options'>
          <label className='login-checkbox-wrapper'>
            <input
              type='checkbox'
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className='login-checkbox-input'
            />
            <span className='login-checkbox-custom'></span>
            <span className='login-checkbox-label'>{t('auth.rememberMe')}</span>
          </label>
          <button type='button' className='login-forgot-link' onClick={() => setAuthModalMode('reset')}>
            {t('auth.buttons.forgotPassword')}
          </button>
        </div>

        <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />

        {loading ? (
          <button type='button' disabled={loading} className='login-submit-btn'>
            <Loader className='rotate' /> {t('auth.buttons.loading')}
          </button>
        ) : (
          <button type='submit' className='login-submit-btn'>
            {t('auth.buttons.login')}
          </button>
        )}
      </form>

      <UnverifiedEmailModal isOpen={showModal} onClose={() => setShowModal(false)} email={email} />
    </>
  )
}
