import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2, User, Phone, Mail, MapPin, Save,
  Truck, Eye, EyeOff, KeyRound, BadgeCheck
} from 'lucide-react'
import { toast } from 'sonner'
import CollectorLayout from '@/components/shared/CollectorLayout'

function AvatarCircle({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
  return (
    <div className="w-20 h-20 rounded-full bg-emerald-600 text-white font-bold text-2xl flex items-center justify-center shrink-0">
      {initials || <User className="w-8 h-8" />}
    </div>
  )
}

const VEHICLE_TYPES = [
  'Motorcycle w/ Sidecar',
  'Tricycle',
  'Small Truck',
  'Pickup Truck',
  'Cargo Van',
  'Other',
]

export default function CollectorProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ completed: 0, total: 0 })

  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    address: '',
    vehicle_type: '',
    vehicle_plate: '',
    service_area: '',
  })

  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const [{ data: p }, { data: jobs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('bookings').select('status').eq('collector_id', user.id),
      ])

      setProfile({
        full_name: p?.full_name || user.user_metadata?.full_name || '',
        phone: p?.phone || user.user_metadata?.phone || '',
        address: p?.address || '',
        vehicle_type: p?.vehicle_type || '',
        vehicle_plate: p?.vehicle_plate || '',
        service_area: p?.service_area || '',
      })

      const jobList = jobs || []
      setStats({
        completed: jobList.filter((j) => j.status === 'completed').length,
        total: jobList.length,
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
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          address: profile.address.trim(),
          vehicle_type: profile.vehicle_type,
          vehicle_plate: profile.vehicle_plate.trim().toUpperCase(),
          service_area: profile.service_area.trim(),
          role: 'collector',
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      await supabase.auth.updateUser({
        data: { full_name: profile.full_name.trim() },
      })

      toast.success('Profile saved!', { description: 'Your collector profile has been updated.' })
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
      <CollectorLayout>
        <div className="flex justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </CollectorLayout>
    )
  }

  return (
    <CollectorLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your collector account and vehicle details</p>
        </div>

        {/* Avatar + stats summary */}
        <Card className="shadow-md mb-6">
          <CardContent className="py-6">
            <div className="flex items-center gap-5">
              <AvatarCircle name={profile.full_name || 'C'} />
              <div className="flex-1">
                <p className="text-xl font-bold text-gray-900">{profile.full_name || 'Your Name'}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Collector Account
                </span>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
                <p className="text-xs text-gray-500 mt-0.5">Jobs Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
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
                    <Phone className="w-4 h-4 text-gray-400" /> Phone
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
                  <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Mail className="w-4 h-4 text-gray-400" /> Email
                  </Label>
                  <Input value={user?.email || ''} disabled className="h-11 bg-gray-50 text-gray-500" />
                </div>
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

              {/* Vehicle details */}
              <div className="pt-2 border-t">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4 text-emerald-600" /> Vehicle Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vehicle_type" className="text-sm font-medium text-gray-700 mb-1.5 block">Vehicle Type</Label>
                    <select
                      id="vehicle_type"
                      value={profile.vehicle_type}
                      onChange={(e) => setProfile({ ...profile, vehicle_type: e.target.value })}
                      className="w-full border rounded-lg px-3 h-11 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">Select type...</option>
                      {VEHICLE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="vehicle_plate" className="text-sm font-medium text-gray-700 mb-1.5 block">Plate Number</Label>
                    <Input
                      id="vehicle_plate"
                      value={profile.vehicle_plate}
                      onChange={(e) => setProfile({ ...profile, vehicle_plate: e.target.value })}
                      placeholder="ABC 1234"
                      className="h-11 uppercase"
                      maxLength={10}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="service_area" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" /> Service Area / Barangays
                    </Label>
                    <Input
                      id="service_area"
                      value={profile.service_area}
                      onChange={(e) => setProfile({ ...profile, service_area: e.target.value })}
                      placeholder="e.g. Sta. Catalina, Canelar, Lanzones..."
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 gap-2 font-semibold" disabled={saving}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4" />Save Profile</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password change */}
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
    </CollectorLayout>
  )
}
