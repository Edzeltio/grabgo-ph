// app/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Truck, User } from 'lucide-react'
import { toast } from 'sonner'   // ← Correct import

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'customer' | 'collector'>('customer')
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
  })

  const router = useRouter()
  const supabase = createClient()

const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name,
          phone: formData.phone,
        },
      }
    })

    if (authError) {
      if (authError.message.includes('rate limit') || authError.message.includes('429')) {
        toast.error("Email rate limit reached", {
          description: "Please wait 1 hour before trying again, or disable email confirmation in Supabase dashboard for development.",
        })
      } else {
        toast.error("Signup failed", {
          description: authError.message,
        })
      }
      throw authError
    }

    // Profile will be created by the trigger we set earlier (if you used it)

    toast.success("Account created successfully!", {
      description: "You can now login. (Email confirmation may be disabled during development)",
    })

    router.push('/auth/login')
  } catch (error: any) {
    // error already handled above
  } finally {
    setLoading(false)
  }
}

  return (
    <Card className="shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mb-4">
          <Truck className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl">Join GarbGo PH</CardTitle>
        <CardDescription>Start booking or earning with garbage pickup in Davao</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <Label>I want to be a:</Label>
            <RadioGroup 
              value={role} 
              onValueChange={(v) => setRole(v as 'customer' | 'collector')} 
              className="flex gap-4 mt-3"
            >
              <div className="flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:bg-emerald-50 flex-1">
                <RadioGroupItem value="customer" id="customer" />
                <Label htmlFor="customer" className="cursor-pointer flex items-center gap-2 font-medium">
                  <User className="w-5 h-5" /> Customer
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:bg-emerald-50 flex-1">
                <RadioGroupItem value="collector" id="collector" />
                <Label htmlFor="collector" className="cursor-pointer flex items-center gap-2 font-medium">
                  <Truck className="w-5 h-5" /> Collector
                </Label>
              </div>
            </RadioGroup>
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
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number (09xxxxxxxxx)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="09123456789"
                required
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
            onClick={() => router.push('/auth/login')} 
            className="text-emerald-600 hover:underline font-medium"
          >
            Login here
          </button>
        </p>
      </CardContent>
    </Card>
  )
}