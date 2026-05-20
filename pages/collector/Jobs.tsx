import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Weight, Clock, Loader2, CheckCircle, Wifi, WifiOff, Truck } from 'lucide-react'
import { toast } from 'sonner'
import CollectorLayout from '@/components/shared/CollectorLayout'

const STATUS_COLORS: Record<string, string> = {
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
}

export default function CollectorJobsPage() {
  const [pendingJobs, setPendingJobs] = useState<any[]>([])
  const [myActiveJobs, setMyActiveJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [newJobIds, setNewJobIds] = useState<Set<string>>(new Set())
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      const [{ data: pending }, { data: active }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, waste_types(name, base_price_per_kg)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('bookings')
          .select('*, waste_types(name)')
          .eq('collector_id', user.id)
          .in('status', ['accepted', 'in_progress'])
          .order('created_at', { ascending: false }),
      ])

      setPendingJobs(pending || [])
      setMyActiveJobs(active || [])
      setLoading(false)

      channel = supabase
        .channel('collector-jobs-feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bookings' },
          async (payload) => {
            if (payload.new.status === 'pending') {
              const { data: newJob } = await supabase
                .from('bookings')
                .select('*, waste_types(name, base_price_per_kg)')
                .eq('id', payload.new.id)
                .single()

              if (newJob) {
                setPendingJobs(prev => [newJob, ...prev])
                flashNew(newJob.id)
                toast.info('New pickup request available!', {
                  description: `${newJob.waste_types?.name || 'Waste'} — ${newJob.address || 'Zamboanga City'}`,
                })
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings' },
          (payload) => {
            const updated = payload.new as any

            if (updated.status !== 'pending') {
              setPendingJobs(prev => prev.filter(j => j.id !== updated.id))
            }

            if (updated.collector_id === userIdRef.current) {
              if (updated.status === 'completed') {
                setMyActiveJobs(prev => prev.filter(j => j.id !== updated.id))
                toast.success('Job marked complete!')
              } else if (['accepted', 'in_progress'].includes(updated.status)) {
                setMyActiveJobs(prev =>
                  prev.map(j => j.id === updated.id ? { ...j, ...updated } : j)
                )
              }
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

  const flashNew = (id: string) => {
    setNewJobIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setNewJobIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 4000)
  }

  const handleAccept = async (jobId: string) => {
    setAccepting(jobId)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please log in again")

      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'accepted', collector_id: user.id })
        .eq('id', jobId)
        .eq('status', 'pending')
        .select('*, waste_types(name)')
        .single()

      if (error) throw error
      if (!data) throw new Error("Job not found or already taken")

      setPendingJobs(prev => prev.filter(j => j.id !== jobId))
      setMyActiveJobs(prev => [data, ...prev])

      toast.success("Job accepted!", { description: "Head to the pickup location." })
    } catch (error: any) {
      toast.error("Failed to accept job", { description: error.message || "Please try again" })
    } finally {
      setAccepting(null)
    }
  }

  const handleStatusUpdate = async (jobId: string, newStatus: 'in_progress' | 'completed') => {
    setUpdating(jobId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error

      if (newStatus === 'completed') {
        setMyActiveJobs(prev => prev.filter(j => j.id !== jobId))
        toast.success("Job completed! Great work 🎉")
      } else {
        setMyActiveJobs(prev =>
          prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j)
        )
        toast.info("Status updated to In Progress")
      }
    } catch (error: any) {
      toast.error("Failed to update status", { description: error.message })
    } finally {
      setUpdating(null)
    }
  }

  return (
    <CollectorLayout>
      {/* My Active Jobs */}
      {myActiveJobs.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">My Active Jobs</h2>
            <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
              {myActiveJobs.length}
            </span>
          </div>
          <div className="space-y-4">
            {myActiveJobs.map((job) => (
              <Card key={job.id} className="shadow-md border-l-4 border-l-blue-500">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{job.waste_types?.name || 'Waste Pickup'}</h3>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[job.status]}`}>
                          {job.status === 'in_progress' ? '🚛 In Progress' : '✅ Accepted'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-600" />{job.address || 'Zamboanga City'}</span>
                        <span className="font-semibold text-emerald-700">₱{(job.total_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {job.status === 'accepted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(job.id, 'in_progress')}
                          disabled={updating === job.id}
                          className="text-purple-700 border-purple-300 hover:bg-purple-50"
                        >
                          {updating === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Truck className="w-4 h-4 mr-1" />On My Way</>}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(job.id, 'completed')}
                        disabled={updating === job.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {updating === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" />Complete</>}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Jobs */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-gray-900">Available Jobs</h1>
            {!loading && pendingJobs.length > 0 && (
              <span className="bg-emerald-600 text-white text-sm px-3 py-1 rounded-full font-semibold">
                {pendingJobs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-emerald-600">Pickup requests near Zamboanga City</p>
            {!loading && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {connected ? <><Wifi className="w-3 h-3" /> Live</> : <><WifiOff className="w-3 h-3" /> Connecting...</>}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : pendingJobs.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="py-20 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">No pending jobs</h3>
            <p className="text-gray-600">This page updates live — new requests will appear here automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingJobs.map((job) => (
            <Card
              key={job.id}
              className={`shadow-md transition-all duration-500 ${
                newJobIds.has(job.id)
                  ? 'ring-2 ring-emerald-400 shadow-emerald-200 shadow-lg scale-[1.01]'
                  : 'hover:shadow-lg'
              }`}
            >
              <CardContent className="py-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold">
                        {job.waste_types?.name || 'Waste Pickup'}
                      </h3>
                      {newJobIds.has(job.id) && (
                        <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse font-medium">
                          New!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        {job.address || 'Zamboanga City'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Weight className="w-4 h-4 text-emerald-600" />
                        {job.estimated_weight_kg} kg estimated
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        {new Date(job.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </div>
                    </div>

                    {job.notes && (
                      <p className="text-sm text-gray-500 italic mb-4">"{job.notes}"</p>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-emerald-700">
                        ₱{(job.total_amount || 0).toFixed(2)}
                      </p>
                      <Button
                        onClick={() => handleAccept(job.id)}
                        disabled={accepting === job.id}
                        className="px-8"
                      >
                        {accepting === job.id ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Accepting...</>
                        ) : (
                          'Accept Job'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CollectorLayout>
  )
}
