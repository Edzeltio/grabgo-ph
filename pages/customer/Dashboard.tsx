import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocation } from 'wouter'
import { MapPin, Clock, CheckCircle, Loader2, Plus, Wifi, WifiOff } from 'lucide-react'
import CustomerLayout from '@/components/shared/CustomerLayout'
import { toast } from 'sonner'

const BookingMap = lazy(() => import('@/components/BookingMap'))

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  accepted: 'bg-blue-100 text-blue-800 border border-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 border border-purple-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Pending',
  accepted: '✅ Collector Assigned',
  in_progress: '🚛 On The Way',
  completed: '🎉 Completed',
  cancelled: '❌ Cancelled',
}

const STATUS_MESSAGES: Record<string, string> = {
  accepted: 'A collector has accepted your pickup!',
  in_progress: 'Your collector is on the way!',
  completed: 'Your garbage has been picked up!',
  cancelled: 'Your booking was cancelled.',
}

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set())
  const [, navigate] = useLocation()
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      const { data } = await supabase
        .from('bookings')
        .select('*, waste_types(name)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      setBookings(data || [])
      setLoading(false)

      channel = supabase
        .channel(`customer-bookings-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `customer_id=eq.${user.id}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const { data: newBooking } = await supabase
                .from('bookings')
                .select('*, waste_types(name)')
                .eq('id', payload.new.id)
                .single()

              if (newBooking) {
                setBookings(prev => [newBooking, ...prev])
                flashUpdate(newBooking.id)
              }
            }

            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as any
              setBookings(prev =>
                prev.map(b =>
                  b.id === updated.id ? { ...b, ...updated } : b
                )
              )
              flashUpdate(updated.id)

              const msg = STATUS_MESSAGES[updated.status]
              if (msg) {
                if (updated.status === 'completed') {
                  toast.success(msg, { description: 'Thank you for using GarbGo PH!' })
                } else if (updated.status === 'cancelled') {
                  toast.error(msg)
                } else {
                  toast.info(msg, { description: 'Your booking status was updated.' })
                }
              }
            }

            if (payload.eventType === 'DELETE') {
              setBookings(prev => prev.filter(b => b.id !== payload.old.id))
            }
          }
        )
        .subscribe((status) => {
          setConnected(status === 'SUBSCRIBED')
        })
    }

    init()
    return () => {
      if (channel) channel.unsubscribe()
    }
  }, [])

  const flashUpdate = (id: string) => {
    setUpdatedIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setUpdatedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 2000)
  }

  return (
    <CustomerLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">My Bookings</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-emerald-600 text-lg">Track your pickup requests</p>
            {!loading && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {connected
                  ? <><Wifi className="w-3 h-3" /> Live</>
                  : <><WifiOff className="w-3 h-3" /> Connecting...</>}
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => navigate('/customer/book')} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          New Booking
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : bookings.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="py-20 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">No bookings yet</h3>
            <p className="text-gray-600 mb-6">Book your first pickup and help keep Zamboanga clean!</p>
            <Button onClick={() => navigate('/customer/book')} size="lg">
              Book a Pickup Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card
              key={booking.id}
              className={`shadow-md transition-all duration-500 ${
                updatedIds.has(booking.id)
                  ? 'shadow-emerald-200 shadow-lg ring-2 ring-emerald-400 scale-[1.01]'
                  : 'hover:shadow-lg'
              }`}
            >
              <CardContent className="py-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold">
                        {booking.waste_types?.name || 'Waste Pickup'}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[booking.status] || booking.status?.replace('_', ' ').toUpperCase()}
                      </span>
                      {updatedIds.has(booking.id) && (
                        <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse font-medium">
                          Updated!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        {booking.address || 'Zamboanga City'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                        {new Date(booking.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </div>
                    </div>

                    {booking.status === 'accepted' && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                        <span className="font-medium">A collector has been assigned — they'll be there soon!</span>
                      </div>
                    )}
                    {booking.status === 'in_progress' && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
                        <span className="animate-pulse font-medium">🚛 Your collector is on the way!</span>
                      </div>
                    )}
                    {['accepted', 'in_progress'].includes(booking.status) && booking.lat && booking.lng && (
                      <Suspense fallback={
                        <div className="mt-3 h-48 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                        </div>
                      }>
                        <BookingMap
                          lat={booking.lat}
                          lng={booking.lng}
                          address={booking.address}
                          status={booking.status}
                        />
                      </Suspense>
                    )}

                    {booking.total_amount && (
                      <p className="mt-3 font-semibold text-emerald-700">
                        ₱{booking.total_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CustomerLayout>
  )
}
