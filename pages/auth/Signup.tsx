import { useState } from 'react'
import { useLocation } from 'wouter'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Truck, User } from 'lucide-react'
import { toast } from 'sonner'
import SupabaseGuard from '@/components/shared/SupabaseGuard'

function SignupForm() {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'customer' | 'collector'>('customer')
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [, navigate] = useLocation()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
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

      if (authError) {
        if (authError.message.includes('rate limit') || authError.message.includes('429')) {
          toast.error("Email rate limit reached", {
            description: "Please wait 1 hour before trying again.",
          })
        } else {
          toast.error("Signup failed", { description: authError.message })
        }
        return
      }

      sessionStorage.setItem('pending_verification_email', formData.email)
      toast.success("Account created!", {
        description: "Check your email to verify your account.",
      })
      navigate('/auth/verify-email')
    } catch (error: any) {
      toast.error("Signup failed", { description: error.message })
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
            <CardTitle className="text-2xl">Join GarbGo PH</CardTitle>
            <CardDescription>Start booking or earning with garbage pickup in Zamboanga</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <Label>I want to be a:</Label>
                <div className="flex gap-4 mt-3">
                  <label className={`flex items-center gap-2 border p-4 rounded-xl cursor-pointer flex-1 transition-colors ${role === 'customer' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-emerald-50'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={role === 'customer'}
                      onChange={() => setRole('customer')}
                      className="accent-emerald-600"
                    />
                    <User className="w-5 h-5" /> Customer
                  </label>
                  <label className={`flex items-center gap-2 border p-4 rounded-xl cursor-pointer flex-1 transition-colors ${role === 'collector' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-emerald-50'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="collector"
                      checked={role === 'collector'}
                      onChange={() => setRole('collector')}
                      className="accent-emerald-600"
                    />
                    <Truck className="w-5 h-5" /> Collector
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Juan Dela Cruz"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09123456789"
                    required
                    className="mt-1"
                  />
                </div>
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
                    placeholder="Create a strong password"
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create My Account
              </Button>
            </form>
            <p className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/auth/login')}
                className="text-emerald-600 hover:underline font-medium"
              >
                Login here
              </button>
            </p>
          </CardContent>
        </Card>
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
