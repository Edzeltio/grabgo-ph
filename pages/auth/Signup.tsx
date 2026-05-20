import { useState } from 'react'
import { useLocation } from 'wouter'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2, Truck, Eye, EyeOff, User, Recycle, Shield, MapPin,
  CheckCircle, Circle
} from 'lucide-react'
import { toast } from 'sonner'
import SupabaseGuard from '@/components/shared/SupabaseGuard'

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (pw.length >= 12) score++
  const map = [
    { label: '', color: 'bg-gray-200' },
    { label: 'Weak', color: 'bg-red-500' },
    { label: 'Fair', color: 'bg-orange-400' },
    { label: 'Good', color: 'bg-yellow-400' },
    { label: 'Strong', color: 'bg-emerald-500' },
    { label: 'Very strong', color: 'bg-emerald-600' },
  ]
  return { score, ...map[Math.min(score, 5)] }
}

function SignupForm() {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'customer' | 'collector'>('customer')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [, navigate] = useLocation()

  const strength = getPasswordStrength(formData.password)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password.length < 6) {
      toast.error('Password too short', { description: 'Must be at least 6 characters.' })
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            role,
          },
        },
      })
      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          toast.error('Email rate limit reached', {
            description: 'Please wait before trying again.',
          })
        } else {
          toast.error('Signup failed', { description: error.message })
        }
        return
      }
      sessionStorage.setItem('pending_verification_email', formData.email)
      toast.success('Account created!', { description: 'Check your email to verify your account.' })
      navigate('/auth/verify-email')
    } catch (error: any) {
      toast.error('Signup failed', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-emerald-600 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-xl leading-none">GarbGo PH</p>
            <p className="text-emerald-200 text-xs">Zamboanga City</p>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Join thousands<br />helping keep<br />Zamboanga clean
          </h2>
          <p className="text-emerald-100 text-lg mb-10">
            Whether you need pickups or want to earn by collecting — GarbGo PH has a role for you.
          </p>
          <div className="space-y-4">
            {[
              { icon: Recycle, text: 'Proper waste segregation per RA 9003' },
              { icon: Shield, text: 'Safe & verified platform' },
              { icon: MapPin, text: 'Zamboanga City, Philippines' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-emerald-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-emerald-300 text-sm">© 2026 GarbGo PH. Keeping Zamboanga clean.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-xl leading-none text-gray-900">GarbGo PH</p>
              <p className="text-emerald-600 text-xs">Zamboanga City</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="text-gray-500 mt-1">Join GarbGo PH for free today</p>
            </div>

            {/* Role selector */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">I want to join as a:</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'customer', label: 'Customer', sub: 'Book pickups', Icon: User },
                  { value: 'collector', label: 'Collector', sub: 'Earn by collecting', Icon: Truck },
                ] as const).map(({ value, label, sub, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      role === value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role === value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold text-sm ${role === value ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</p>
                      <p className="text-xs text-gray-500">{sub}</p>
                    </div>
                    <div className="mt-auto">
                      {role === value
                        ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                        : <Circle className="w-4 h-4 text-gray-300" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Juan Dela Cruz"
                    required
                    className="mt-1.5 h-11"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09123456789"
                    required
                    className="mt-1.5 h-11"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                    className="mt-1.5 h-11"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Create a strong password"
                    required
                    className="h-11 pr-11"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.score ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <p className="text-xs text-gray-500 mt-1">{strength.label} password</p>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold mt-2"
                disabled={loading}
              >
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>
                  : `Create ${role === 'collector' ? 'Collector' : 'Customer'} Account`}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/auth/login')}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <SupabaseGuard>
      <SignupForm />
    </SupabaseGuard>
  )
}
