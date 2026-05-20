import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, DollarSign, Truck, TrendingUp, Clock, TriangleAlert, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import AdminLayout from '@/components/shared/AdminLayout'

const RLS_SQL = `-- Safe to run multiple times in Supabase → SQL Editor

-- Admins can read all profiles
drop policy if exists "admin_read_profiles" on profiles;
create policy "admin_read_profiles" on profiles
  for select to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin' or id = auth.uid());

-- Admins can update any profile
drop policy if exists "admin_update_profiles" on profiles;
create policy "admin_update_profiles" on profiles
  for update to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Admins can delete any profile
drop policy if exists "admin_delete_profiles" on profiles;
create policy "admin_delete_profiles" on profiles
  for delete to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Admins can read all bookings
drop policy if exists "admin_read_bookings" on bookings;
create policy "admin_read_bookings" on bookings
  for select to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Admins can update any booking
drop policy if exists "admin_update_bookings" on bookings;
create policy "admin_update_bookings" on bookings
  for update to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Admins can manage waste types
drop policy if exists "admin_manage_waste_types" on waste_types;
create policy "admin_manage_waste_types" on waste_types
  for all to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin')
  with check ((select role from profiles where id = auth.uid()) = 'admin');`

function RlsSetupNotice() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(RLS_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-6 border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-100 transition-colors"
      >
        <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Supabase permissions setup required</p>
          <p className="text-xs text-amber-600 mt-0.5">Run these RLS policies so the admin panel can read and write all data</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-amber-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-amber-500 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-amber-200 px-4 pb-4">
          <p className="text-xs text-amber-700 mt-3 mb-2 font-medium">
            Open your Supabase dashboard → SQL Editor → New query → paste and run:
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed font-mono">
              {RLS_SQL}
            </pre>
            <button
              onClick={copy}
              className="absolute top-2 right-2 flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2.5 py-1.5 rounded-md transition-colors"
            >
              {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-2">After running, refresh this page — all admin features will work.</p>
        </div>
      )}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  accepted:  'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  accepted:  'Accepted',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalCollectors: 0,
    pendingBookings: 0,
    completedToday: 0,
  })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [
        { data: bookings },
        { data: profiles },
        { data: recent },
      ] = await Promise.all([
        supabase.from('bookings').select('status, total_amount, created_at'),
        supabase.from('profiles').select('role'),
        supabase
          .from('bookings')
          .select('id, status, total_amount, address, created_at, waste_types(name), profiles!bookings_customer_id_fkey(full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const bkList = bookings || []
      const profList = profiles || []

      setStats({
        totalBookings: bkList.length,
        totalRevenue: bkList.filter(b => b.status === 'completed').reduce((s, b) => s + (b.total_amount || 0), 0),
        totalCustomers: profList.filter(p => p.role === 'customer').length,
        totalCollectors: profList.filter(p => p.role === 'collector').length,
        pendingBookings: bkList.filter(b => b.status === 'pending').length,
        completedToday: bkList.filter(b => b.status === 'completed' && new Date(b.created_at) >= today).length,
      })
      setRecentBookings(recent || [])
      setLoading(false)
    }
    load()
  }, [])

  const KPI = [
    { label: 'Total Bookings',   value: stats.totalBookings,   icon: BookOpen,    color: 'bg-blue-50 text-blue-600'     },
    { label: 'Total Revenue',    value: `₱${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Customers',        value: stats.totalCustomers,  icon: Users,       color: 'bg-purple-50 text-purple-600' },
    { label: 'Collectors',       value: stats.totalCollectors, icon: Truck,       color: 'bg-orange-50 text-orange-600' },
    { label: 'Pending Pickups',  value: stats.pendingBookings, icon: Clock,       color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Completed Today',  value: stats.completedToday,  icon: TrendingUp,  color: 'bg-green-50 text-green-600'   },
  ]

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview for GarbGo PH — Zamboanga City</p>
      </div>

      <RlsSetupNotice />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {KPI.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Bookings */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentBookings.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4 font-medium">Customer</th>
                    <th className="text-left py-2 pr-4 font-medium">Waste Type</th>
                    <th className="text-left py-2 pr-4 font-medium">Address</th>
                    <th className="text-left py-2 pr-4 font-medium">Amount</th>
                    <th className="text-left py-2 pr-4 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-800">
                        {(b.profiles as any)?.full_name || 'Unknown'}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">
                        {(b.waste_types as any)?.name || '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 max-w-[180px] truncate">
                        {b.address || '—'}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold text-emerald-700">
                        ₱{(b.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[b.status] || b.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(b.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
