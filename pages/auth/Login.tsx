import { useState } from 'react'
import { useLocation } from 'wouter'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Truck, Eye, EyeOff, Recycle, Shield, MapPin, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import SupabaseGuard from '@/components/shared/SupabaseGuard'

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [, navigate] = useLocation()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          sessionStorage.setItem('pending_verification_email', formData.email)
          toast.error('Email not verified', {
            description: 'Please check your inbox and verify your email first.',
          })
          navigate('/auth/verify-email')
          return
        }
        throw error
      }
      if (!authData.user.email_confirmed_at) {
        sessionStorage.setItem('pending_verification_email', formData.email)
        toast.error('Email not verified', {
          description: 'Please verify your email before logging in.',
        })
        navigate('/auth/verify-email')
        return
      }

      let role = authData.user.user_metadata?.role
      if (!role) {
        const res = await fetch('/api/me/profile', {
          headers: { Authorization: `Bearer ${authData.session!.access_token}` },
        })
        if (res.ok) {
          const p = await res.json()
          role = p?.role
        }
      }

      toast.success('Welcome back!')
      if (role === 'collector') {
        navigate('/collector/jobs')
      } else {
        navigate('/customer/dashboard')
      }
    } catch (error: any) {
      toast.error('Login failed', { description: error.message || 'Invalid email or password' })
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
            Garbage Pickup,<br />Made Simple
          </h2>
          <p className="text-emerald-100 text-lg mb-10">
            Fast, trackable, and eco-friendly waste collection for Zamboanga City residents.
          </p>
          <div className="space-y-4">
            {[
              { icon: Recycle, text: 'RA 9003 Compliant Waste Segregation' },
              { icon: Shield, text: 'Background-Checked Collectors' },
              { icon: MapPin, text: 'City-Wide Coverage' },
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
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>

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
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-500 mt-1">Sign in to your GarbGo PH account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
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

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    className="h-11 pr-11"
                    autoComplete="current-password"
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
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/auth/signup')}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                >
                  Create one free
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <SupabaseGuard>
      <LoginForm />
    </SupabaseGuard>
  )
}
