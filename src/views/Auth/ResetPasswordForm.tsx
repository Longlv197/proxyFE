'use client'
import React, { useState } from 'react'

import { useRouter } from 'next/navigation'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Eye, EyeOff, Loader } from 'lucide-react'

import { toast } from 'react-toastify'

import { useTranslation } from 'react-i18next'

import { useModalContext } from '@/app/contexts/ModalContext'
import { useBranding } from '@/app/contexts/BrandingContext'
import axiosInstance from '@/libs/axios'
import TurnstileWidget from '@/components/TurnstileWidget'

interface ResetForm {
  newPassword: string
  confirmPassword: string
}

export default function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const { t } = useTranslation()
  const { turnstile_enabled, turnstile_pages } = useBranding()
  const turnstileActive = turnstile_enabled === 'true' && (turnstile_pages || ['login', 'register']).includes('reset_password')

  const { resetToken, resetEmail, closeAuthModal, openAuthModal } = useModalContext()
  const router = useRouter()

  const resetSchema = yup.object({
    newPassword: yup.string().required(t('auth.validation.passwordRequired')).min(8, 'Ít nhất 8 ký tự'),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('newPassword')], 'Mật khẩu xác nhận không khớp')
      .required('Vui lòng xác nhận mật khẩu')
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<ResetForm>({ resolver: yupResolver(resetSchema) })

  const onSubmit = async (data: ResetForm) => {
    if (turnstileActive && !turnstileToken) {
      toast.error(t('auth.turnstileRequired') || 'Vui lòng xác minh bảo mật.')

      return
    }

    setIsLoading(true)

    const res = await axiosInstance.post('/reset-password', {
      email: resetEmail,
      token: resetToken,
      password: data.newPassword,
      password_confirmation: data.confirmPassword,
      turnstile_token: turnstileToken || undefined
    })

    if (!res.data.success) throw new Error()

    reset()

    toast.success('Đổi mật khẩu thành công!')

    setIsLoading(false)
    
    // Đóng modal reset password
    closeAuthModal()
    
    // Redirect về trang empty và reload
    router.push('/')
    window.location.reload()
  }
    
   

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* New password */}
      <div className='login-form-group'>
        <label className={`login-form-label ${errors.newPassword && 'text-red-500'}`}>Mật khẩu mới</label>
        <div className='login-password-wrapper'>
          <input
            type={showPassword ? 'text' : 'password'}
            className={`login-form-input ${errors.newPassword && 'border-red-500'}`}
            {...register('newPassword')}
          />
          <button type='button' onClick={() => setShowPassword(!showPassword)} className='login-password-toggle'>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.newPassword && <p className='text-red-500 text-sm'>{errors.newPassword.message}</p>}
      </div>

      {/* Confirm password */}
      <div className='login-form-group'>
        <label className={`login-form-label ${errors.confirmPassword && 'text-red-500'}`}>Xác nhận mật khẩu</label>
        <div className='login-password-wrapper'>
          <input
            type={showConfirm ? 'text' : 'password'}
            className={`login-form-input ${errors.confirmPassword && 'border-red-500'}`}
            {...register('confirmPassword')}
          />
          <button type='button' onClick={() => setShowConfirm(!showConfirm)} className='login-password-toggle'>
            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.confirmPassword && <p className='text-red-500 text-sm'>{errors.confirmPassword.message}</p>}
      </div>

      <TurnstileWidget page='reset_password' onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
      <div className='mb-3'>
        {isLoading ? (
          <button type='button' disabled={isLoading} className='login-submit-btn'>
            <Loader className='rotate' /> Loading...
          </button>
        ) : (
          <button type='submit' className='login-submit-btn'>
            Cập nhật mật khẩu
          </button>
        )}
      </div>
    </form>
  )
}
