import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, useLocation } from 'wouter'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, MapPin, Clock, CheckCircle, Loader2,
  Wifi, WifiOff, Truck, Package, Circle, AlertCircle
} from 'lucide-react'
import CustomerLayout from '@/components/shared/CustomerLayout'
import { toast } from 'sonner'

const BookingMap = lazy(() => import('@/components/BookingMap'))

const STEPS = [
  { key: 'pending',     label: 'Booking Placed',      icon: Package,      desc: 'Your pickup request is live and waiting for a collector.' },
  { key: 'accepted',    label: 'Collector Assigned',  icon: CheckCircle,  desc: 'A verified collector has accepted your request.' },
  { key: 'in_progress', label: 'On The Way',          icon: Truck,        desc: 'Your collector is heading to your location.' },
  { key: 'completed',   label: 'Pickup Complete',      icon: CheckCircle,  desc: 'Your garbage has been collected. Thank you!' },
]

const STEP_ORDER = ['pending', 'accepted', 'in_progress', 'completed']

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800 border border-yellow-200',
  accepted:    'bg-blue-100 text-blue-800 border border-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 border border-purple-200',
  completed:   'bg-green-100 text-green-800 border border-green-200',
  cancelled:   'bg-red-100 text-red-800 border border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  pending:     '⏳ Pending',
  accepted:    '✅ Collector Assigned',
  in_progress: '🚛 On The Way',
  completed:   '🎉 Completed',
  cancelled:   '❌ Cancelled',
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, waste_types(name, base_price_per_kg)')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Booking not found')
        navigate('/customer/dashboard')
        return
      }

      setBooking(data)
      setLoading(false)

      channel = supabase
        .channel(`booking-detail-${id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
          (payload) => {
            const updated = payload.new as any
            setBooking((prev: any) => ({ ...prev, ...updated }))
            setJustUpdated(true)
            setTimeout(() => setJustUpdated(false), 2500)

            const messages: Record<string, string> = {
              accepted:    'A collector has been assigned to your pickup!',
              in_progress: 'Your collector is on the way!',
              completed:   'Your garbage has been picked up. Thank you!',
              cancelled:   'Your booking was cancelled.',
            }
            const msg = messages[updated.status]
            if (msg) {
              if (updated.status === 'completed') toast.success(msg)
              else if (updated.status === 'cancelled') toast.error(msg)
              else toast.info(msg)
            }
          }
        )
        .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    }

    init()
    return () => { if (channel) channel.unsubscribe() }
  }, [id])

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </CustomerLayout>
    )
  }

  if (!booking) return null

  const isCancelled = booking.status === 'cancelled'
  const currentStepIndex = STEP_ORDER.indexOf(booking.status)

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/customer/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to My Bookings</span>
          </button>
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {connected ? <><Wifi className="w-3 h-3" /> Live</> : <><WifiOff className="w-3 h-3" /> Connecting...</>}
          </span>
        </div>

        {/* Status Card */}
        <Card className={`shadow-xl mb-6 transition-all duration-500 ${justUpdated ? 'ring-2 ring-emerald-400 shadow-emerald-200' : ''}`}>
          <CardContent className="py-7">
            <div className="flex items-start justify-between mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {booking.waste_types?.name || 'Waste Pickup'}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                {STATUS_LABELS[booking.status] || booking.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Booked {new Date(booking.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>

            {/* Progress Steps */}
            {!isCancelled ? (
              <div className="relative mt-2">
                {/* Connector line */}
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
                <div
                  className="absolute left-4 top-4 w-0.5 bg-emerald-500 transition-all duration-700"
                  style={{ height: `${Math.max(0, (currentStepIndex / (STEPS.length - 1)) * 100)}%` }}
                />

                <div className="space-y-6 relative">
                  {STEPS.map((step, index) => {
                    const done = index < currentStepIndex
                    const active = index === currentStepIndex
                    const upcoming = index > currentStepIndex
                    const Icon = step.icon

                    return (
                      <div key={step.key} className="flex items-start gap-4 pl-0">
                        {/* Node */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                          done    ? 'bg-emerald-500 text-white' :
                          active  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-100' :
                                    'bg-gray-100 text-gray-400'
                        }`}>
                          {done ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : active ? (
                            <Icon className={`w-4 h-4 ${active && booking.status !== 'completed' ? 'animate-pulse' : ''}`} />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`pt-0.5 transition-opacity duration-300 ${upcoming ? 'opacity-40' : ''}`}>
                          <p className={`font-semibold text-sm ${active ? 'text-emerald-700' : done ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {(done || active) && (
                            <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-medium">This booking was cancelled.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map (only for active bookings with coordinates) */}
        {['accepted', 'in_progress'].includes(booking.status) && booking.lat && booking.lng && (
          <Card className="shadow-md mb-6">
            <CardContent className="py-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" /> Pickup Location
              </h2>
              <Suspense fallback={
                <div className="h-48 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </div>
              }>
                <BookingMap lat={booking.lat} lng={booking.lng} address={booking.address} status={booking.status} />
              </Suspense>
            </CardContent>
          </Card>
        )}

        {/* Details Card */}
        <Card className="shadow-md mb-6">
          <CardContent className="py-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Booking Details</h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-0.5">Address</p>
                <p className="font-medium flex items-start gap-1.5 text-gray-800">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  {booking.address || 'Zamboanga City'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Estimated Weight</p>
                <p className="font-medium text-gray-800">{booking.estimated_weight_kg ?? '—'} kg</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Waste Type</p>
                <p className="font-medium text-gray-800">{booking.waste_types?.name || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Amount</p>
                <p className="font-semibold text-emerald-700 text-base">
                  {booking.total_amount != null ? `₱${booking.total_amount.toFixed(2)}` : '—'}
                </p>
              </div>
            </div>

            {booking.notes && (
              <div className="pt-2 border-t">
                <p className="text-gray-500 text-sm mb-0.5">Notes</p>
                <p className="text-sm text-gray-700 italic">"{booking.notes}"</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center pb-8">
          <Button variant="outline" onClick={() => navigate('/customer/book')}>
            + Book Another Pickup
          </Button>
        </div>
      </div>
    </CustomerLayout>
  )
}
