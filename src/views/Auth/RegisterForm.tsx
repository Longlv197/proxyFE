'use client'

import React, { useState } from 'react'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

import { useMutation } from '@tanstack/react-query'

import { Eye, EyeOff } from 'lucide-react'

import { toast } from 'react-toastify'

import { useTranslation } from 'react-i18next'

import axiosInstance from '@/libs/axios'
import { useModalContext } from '@/app/contexts/ModalContext'
import { useBranding } from '@/app/contexts/BrandingContext'
import TurnstileWidget from '@/components/TurnstileWidget'

type RegisterFormInputs = {
  name: string
  email: string
  password: string
  password_confirmation: string
  ref?: string | null
}

const registerUser = async (data: RegisterFormInputs) => {
  const response = await axiosInstance.post('/register', data)

  return response.data
}

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setPasswordConfirmation] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')

  const { closeAuthModal, setAuthModalMode, referralCode } = useModalContext()
  const { turnstile_enabled, turnstile_pages } = useBranding()
  const turnstileActiveForRegister = turnstile_enabled === 'true' && (turnstile_pages || ['login', 'register']).includes('register')
  const { t } = useTranslation()

  const schema = yup
    .object({
      name: yup.string().required(t('auth.validation.nameRequired')),
      email: yup.string().email(t('auth.validation.emailInvalid')).required(t('auth.validation.emailRequired')),
      password: yup
        .string()
        .min(6, t('auth.validation.passwordMinLength'))
        .required(t('auth.validation.passwordRequired')),
      password_confirmation: yup
        .string()
        .oneOf([yup.ref('password')], t('auth.validation.passwordsNotMatch'))
        .required(t('auth.validation.confirmPasswordRequired'))
    })
    .required()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors }
  } = useForm<RegisterFormInputs>({
    resolver: yupResolver(schema)
  })

  const { mutate, isPending } = useMutation({
    mutationFn: registerUser,
    onSuccess: data => {
      toast.success(data.message)
      reset()
      setAuthModalMode('login')
    },
    onError: (error: any) => {
      console.error('Lỗi đăng ký:', error)

      // Kiểm tra nếu có lỗi validation từ server
      if (error?.response?.data?.errors) {
        const serverErrors = error.response.data.errors

        // Set lỗi cho từng field
        Object.keys(serverErrors).forEach(field => {
          if (field in errors || ['name', 'email', 'password', 'password_confirmation'].includes(field)) {
            setError(field as keyof RegisterFormInputs, {
              type: 'server',
              message: serverErrors[field][0] // Lấy lỗi đầu tiên
            })
          }
        })

        // Hiển thị toast với lỗi chung (nếu có)
        const firstError = Object.values(serverErrors)[0]

        if (Array.isArray(firstError) && firstError[0]) {
          toast.error(firstError[0])
        }
      } else if (error?.response?.data?.message) {
        // Hiển thị message lỗi từ server
        toast.error(error.response.data.message)
      } else {
        // Lỗi chung
        toast.error(t('auth.registerError'))
      }
    }
  })

  const onSubmit = (data: RegisterFormInputs) => {
    if (turnstileActiveForRegister && !turnstileToken) {
      toast.error(t('auth.turnstileRequired') || 'Vui lòng xác minh bảo mật.')
      return
    }

    const payload: any = { ...data, ref: referralCode ?? undefined }
    if (turnstileToken) payload.turnstile_token = turnstileToken

    mutate(payload)
  }

  return (
    <form className='login-modal-form' onSubmit={handleSubmit(onSubmit)} autoComplete='on'>
      {/* Email */}
      <div className='login-form-group'>
        <label className={`login-form-label ${errors.email && 'text-red-500'}`}>{t('auth.email')}</label>
        <input
          id='register-email'
          type='email'
          autoComplete='email'
          className={`login-form-input ${errors.email && 'border-red-500'}`}
          placeholder={t('auth.placeholders.enterEmail')}
          {...register('email')}
        />
        {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>}
      </div>

      {/* Username */}
      <div className='login-form-group'>
        <label className={`login-form-label ${errors.name && 'text-red-500'}`}>{t('auth.username')}</label>
        <input
          type='text'
          className={`login-form-input ${errors.name && 'border-red-500'}`}
          placeholder={t('auth.placeholders.enterName')}
          {...register('name')}
        />
        {errors.name && <p className='text-red-500 text-sm mt-1'>{errors.name.message}</p>}
      </div>

      {/* Password */}
      <div className='login-form-group'>
        <label className={`login-form-label ${errors.password && 'text-red-500'}`}>{t('auth.password')}</label>
        <div className='login-password-wrapper'>
          <input
            id='register-password'
            type={showPassword ? 'text' : 'password'}
            autoComplete='new-password'
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

      {/* password_confirmation */}
      <div className='login-form-group'>
        <label className={`login-form-label ${errors.password_confirmation && 'text-red-500'}`}>
          {t('auth.confirmPassword')}
        </label>
        <div className='login-password-wrapper'>
          <input
            type={showPasswordConfirmation ? 'text' : 'password'}
            autoComplete='new-password'
            className={`login-form-input ${errors.password_confirmation && 'border-red-500'}`}
            placeholder={t('auth.placeholders.confirmPassword') || t('auth.placeholders.enterPassword')}
            {...register('password_confirmation')}
          />
          <button
            type='button'
            className='login-password-toggle'
            onClick={() => setPasswordConfirmation(!showPasswordConfirmation)}
          >
            {showPasswordConfirmation ? <EyeOff size={20} color='#999' /> : <Eye size={20} color='#999' />}
          </button>
        </div>
        {errors.password_confirmation && (
          <p className='text-red-500 text-sm mt-1'>{errors.password_confirmation.message}</p>
        )}
      </div>

      <TurnstileWidget page='register' onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />

      <button type='submit' className='login-submit-btn' disabled={isPending}>
        {isPending ? t('auth.buttons.loading') : t('auth.register')}
      </button>
    </form>
  )
}
