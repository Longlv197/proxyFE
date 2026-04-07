'use client'
import React, { useState } from 'react'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

import { toast } from 'react-toastify'
import { Loader } from 'lucide-react'

import { useTranslation } from 'react-i18next'

import axiosInstance from '@/libs/axios'
import { useModalContext } from '@/app/contexts/ModalContext'
import { useBranding } from '@/app/contexts/BrandingContext'
import TurnstileWidget from '@/components/TurnstileWidget'

interface ForgotForm {
  email: string
}

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const { openAuthModal } = useModalContext()
  const { t } = useTranslation()
  const { turnstile_enabled, turnstile_pages } = useBranding()
  const turnstileActive = turnstile_enabled === 'true' && (turnstile_pages || ['login', 'register']).includes('forgot_password')

  const forgotSchema = yup.object({
    email: yup.string().required(t('auth.validation.emailRequired')).email(t('auth.validation.emailInvalid'))
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ForgotForm>({ resolver: yupResolver(forgotSchema) })

  const onSubmit = async (data: ForgotForm) => {
    if (turnstileActive && !turnstileToken) {
      toast.error(t('auth.turnstileRequired') || 'Vui lòng xác minh bảo mật.')

      return
    }

    setIsLoading(true)

    try {
      const res = await axiosInstance.post('/forgot-password', {
        email: data.email,
        turnstile_token: turnstileToken || undefined
      })

      if (!res.data.success) throw new Error()
      toast.success(t('auth.forgotPasswordSuccess'))
      reset()
      setIsLoading(false)
      openAuthModal('login')
    } catch {
      toast.error(t('auth.forgotPasswordError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='login-form-group'>
        <label className={`login-form-label ${errors.email && 'text-red-500'}`}>{t('auth.email')}</label>
        <input
          type='text'
          className={`login-form-input ${errors.email && 'border-red-500'}`}
          placeholder={t('auth.placeholders.enterEmail')}
          {...register('email')}
        />
        {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>}
      </div>
      <TurnstileWidget page='forgot_password' onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
      <div className='mb-3'>
        {isLoading ? (
          <button type='button' disabled={isLoading} className='login-submit-btn'>
            <Loader className='rotate' /> {t('auth.buttons.loading')}
          </button>
        ) : (
          <button type='submit' className='login-submit-btn'>
            {t('auth.buttons.sendResetLink')}
          </button>
        )}
      </div>
    </form>
  )
}
