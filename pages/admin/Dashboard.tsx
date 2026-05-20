import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, DollarSign, Truck, TrendingUp, Clock } from 'lucide-react'
import AdminLayout from '@/components/shared/AdminLayout'

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
