import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Search, ChevronDown, Loader2, MapPin } from 'lucide-react'
import AdminLayout from '@/components/shared/AdminLayout'

const STATUSES = ['pending', 'accepted', 'completed', 'cancelled']

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

interface Booking {
  id: string
  status: string
  total_amount: number | null
  estimated_weight_kg: number | null
  address: string | null
  notes: string | null
  created_at: string
  waste_types: { name: string } | null
  customer: { full_name: string | null } | null
  collector: { full_name: string | null } | null
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filtered, setFiltered] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bookings')
      const bkData = await res.json()
      const bkList = Array.isArray(bkData) ? bkData : []

      const ids = [...new Set([
        ...bkList.map((b: any) => b.customer_id),
        ...bkList.map((b: any) => b.collector_id),
      ].filter(Boolean))]

      let profileMap: Record<string, string> = {}
      if (ids.length > 0) {
        const pRes = await fetch(`/api/admin/profile-names?ids=${ids.join(',')}`)
        const profiles = await pRes.json()
        if (Array.isArray(profiles)) {
          profiles.forEach((p: any) => { profileMap[p.id] = p.full_name })
        }
      }

      const enriched = bkList.map((b: any) => ({
        ...b,
        customer:  { full_name: profileMap[b.customer_id]  || null },
        collector: { full_name: profileMap[b.collector_id] || null },
      }))
      setBookings(enriched)
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let list = bookings
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.address?.toLowerCase().includes(q) ||
        b.customer?.full_name?.toLowerCase().includes(q) ||
        b.waste_types?.name?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [bookings, search, statusFilter])

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Request failed')
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b))
    } catch (err: any) {
      toast.error('Update failed', { description: err.message })
    } finally {
      setUpdating(null)
    }
  }

  const statusCounts = ['all', ...STATUSES].reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === 'all' ? bookings.length : bookings.filter(b => b.status === s).length
    return acc
  }, {})

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500 text-sm mt-1">All pickup requests across the platform</p>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['all', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]} <span className="ml-1 opacity-70">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by customer, address, or waste type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No bookings found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(b => (
                <div key={b.id} className="border rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 flex-wrap"
                    onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                    <span className="font-medium text-gray-800 text-sm">
                      {b.customer?.full_name || 'Unknown customer'}
                    </span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-gray-600 text-sm">{b.waste_types?.name || '—'}</span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="flex items-center gap-1 text-gray-500 text-xs">
                      <MapPin className="w-3 h-3" />{b.address || 'No address'}
                    </span>
                    <span className="ml-auto font-semibold text-emerald-700 text-sm shrink-0">
                      ₱{(b.total_amount || 0).toFixed(2)}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded === b.id ? 'rotate-180' : ''}`} />
                  </div>

                  {expanded === b.id && (
                    <div className="border-t bg-gray-50 px-4 py-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Booking ID</p>
                          <p className="font-mono text-gray-700 text-xs truncate">{b.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Collector</p>
                          <p className="text-gray-700">{b.collector?.full_name || <span className="italic text-gray-400">Unassigned</span>}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Weight (est.)</p>
                          <p className="text-gray-700">{b.estimated_weight_kg ? `${b.estimated_weight_kg} kg` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Date</p>
                          <p className="text-gray-700">
                            {new Date(b.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        {b.notes && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-0.5">Notes</p>
                            <p className="text-gray-700">{b.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">Override status:</span>
                        {STATUSES.filter(s => s !== b.status).map(s => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            disabled={updating === b.id}
                            onClick={() => handleStatusChange(b.id, s)}
                            className="h-7 text-xs"
                          >
                            {updating === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : STATUS_LABELS[s]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
