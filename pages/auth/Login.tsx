import { useState } from 'react'
import { useLocation } from 'wouter'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Truck } from 'lucide-react'
import { toast } from 'sonner'
import SupabaseGuard from '@/components/shared/SupabaseGuard'

function LoginForm() {
  const [loading, setLoading] = useState(false)
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
          toast.error("Email not verified", {
            description: "Please check your inbox and verify your email first.",
          })
          navigate('/auth/verify-email')
          return
        }
        throw error
      }

      if (!authData.user.email_confirmed_at) {
        sessionStorage.setItem('pending_verification_email', formData.email)
        toast.error("Email not verified", {
          description: "Please verify your email before logging in.",
        })
        navigate('/auth/verify-email')
        return
      }

      let role = authData.user.user_metadata?.role
      if (!role) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle()
        role = profile?.role
      }

      if (role === 'collector') {
        navigate('/collector/jobs')
      } else {
        navigate('/customer/dashboard')
      }
    } catch (error: any) {
      toast.error("Login failed", {
        description: error.message || "Invalid email or password",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome back to GarbGo PH</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
            <p className="text-center text-sm text-gray-600 mt-6">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/auth/signup')}
                className="text-emerald-600 hover:underline font-medium"
              >
                Sign up now
              </button>
            </p>
          </CardContent>
        </Card>
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
