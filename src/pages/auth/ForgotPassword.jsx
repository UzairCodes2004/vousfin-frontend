import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft } from 'lucide-react'
import api from '@/services/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export default function ForgotPassword() {
  const [isSuccess, setIsSuccess] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/forgot-password', data)
      setIsSuccess(true)
      toast.success('Password reset email sent')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email')
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
          <Mail className="h-8 w-8 text-positive" />
        </div>
        <h2 className="mb-2 text-2xl font-black text-text-primary">Check your email</h2>
        <p className="mb-8 text-text-secondary">We've sent password reset instructions to your email address.</p>
        <Link to="/login">
          <Button variant="outline" fullWidth>Back to Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-cyan transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Reset Password</h1>
        <p className="mt-2 text-text-secondary">Enter your email and we'll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          icon={Mail}
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Send Reset Link
        </Button>
      </form>
    </div>
  )
}
