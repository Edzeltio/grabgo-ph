import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Loader2, ShieldAlert, ArrowLeft } from 'lucide-react'
import { useLocation } from 'wouter'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [, navigate] = useLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) throw new Error('Access denied.')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Access denied.')
      }

      navigate('/admin/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Access denied.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Back button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center">
            <Lock className="w-7 h-7 text-gray-300" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-white text-xl font-semibold text-center mb-1">System Access</h1>
          <p className="text-gray-500 text-sm text-center mb-8">Restricted — authorised personnel only</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-gray-400 text-xs font-medium mb-1.5 block tracking-wide uppercase">
                Identifier
              </Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                autoComplete="off"
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-gray-500 focus:ring-0"
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs font-medium mb-1.5 block tracking-wide uppercase">
                Passphrase
              </Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-gray-500 focus:ring-0 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white border-0 mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying…</>
                : 'Authenticate'
              }
            </Button>
          </form>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-600 text-xs">
          <ShieldAlert className="w-3.5 h-3.5" />
          Unauthorised access attempts are logged.
        </div>
      </div>
    </div>
  )
}
