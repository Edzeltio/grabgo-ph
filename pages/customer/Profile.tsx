import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2, User, Phone, Mail, MapPin, Save,
  ShieldCheck, Eye, EyeOff, KeyRound
} from 'lucide-react'
import { toast } from 'sonner'
import CustomerLayout from '@/components/shared/CustomerLayout'

function AvatarCircle({ name, size = 'lg' }: { name: string; size?: 'lg' | 'sm' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
  const sz = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-base'
  return (
    <div className={`${sz} rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0`}>
      {initials || <User className="w-8 h-8" />}
    </div>
  )
}

export default function CustomerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)

  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    address: '',
  })

  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setSession(session)
      setUser(session.user)

      const res = await fetch('/api/me/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const p = await res.json()

      setProfile({
        full_name: p?.full_name || '',
        phone: p?.phone || '',
        address: p?.address || '',
      })
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.full_name.trim()) {
      toast.error('Full name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          role: 'customer',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Profile saved!', { description: 'Your changes have been updated.' })
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword.length < 6) {
      toast.error('Password too short', { description: 'Must be at least 6 characters.' })
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChangingPw(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword })
      if (error) throw error
      toast.success('Password updated!')
      setPwForm({ newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error('Failed to update password', { description: err.message })
    } finally {
      setChangingPw(false)
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account details and preferences</p>
        </div>

        <Card className="shadow-md mb-6">
          <CardContent className="py-6">
            <div className="flex items-center gap-5">
              <AvatarCircle name={profile.full_name || 'U'} />
              <div>
                <p className="text-xl font-bold text-gray-900">{profile.full_name || 'Your Name'}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Customer Account
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <Label htmlFor="full_name" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <User className="w-4 h-4 text-gray-400" /> Full Name
                </Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Juan Dela Cruz"
                  required
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-4 h-4 text-gray-400" /> Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="09123456789"
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="address" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" /> Home Address
                </Label>
                <Textarea
                  id="address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="House #, Street, Barangay, Zamboanga City"
                  rows={2}
                />
              </div>

              <div>
                <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Mail className="w-4 h-4 text-gray-400" /> Email Address
                </Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="h-11 bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
              </div>

              <Button type="submit" className="w-full h-11 gap-2 font-semibold" disabled={saving}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4" />Save Profile</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-md mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-gray-500" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="new-pw" className="text-sm font-medium text-gray-700 mb-1.5 block">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-pw"
                    type={showNewPw ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-pw" className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm New Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  placeholder="Repeat your new password"
                  className="h-11"
                />
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                variant="outline"
                className="w-full h-11 gap-2 font-semibold"
                disabled={changingPw || !pwForm.newPassword}
              >
                {changingPw
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</>
                  : <><KeyRound className="w-4 h-4" />Update Password</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  )
}
