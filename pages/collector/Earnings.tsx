import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Clock, Loader2, TrendingUp, DollarSign, Package } from 'lucide-react'
import CollectorLayout from '@/components/shared/CollectorLayout'

export default function CollectorEarningsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('bookings')
          .select('*, waste_types(name)')
          .eq('collector_id', user.id)
          .in('status', ['accepted', 'in_progress', 'completed'])
          .order('created_at', { ascending: false })

        setJobs(data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchEarnings()
  }, [])

  const totalEarnings = jobs
    .filter(j => j.status === 'completed')
    .reduce((sum, j) => sum + (j.total_amount || 0), 0)

  const pendingEarnings = jobs
    .filter(j => j.status !== 'completed')
    .reduce((sum, j) => sum + (j.total_amount || 0), 0)

  return (
    <CollectorLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">My Earnings</h1>
        <p className="text-emerald-600 text-lg">Track your income from completed pickups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-md bg-emerald-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Earned</p>
                <p className="text-3xl font-bold mt-1">₱{totalEarnings.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">₱{pendingEarnings.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Jobs</p>
                <p className="text-3xl font-bold mt-1">{jobs.length}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="py-20 text-center">
            <p className="text-gray-600 text-lg">No completed jobs yet. Accept jobs to start earning!</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Job History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between py-4 border-b last:border-0">
                  <div>
                    <p className="font-semibold">{job.waste_types?.name || 'Waste Pickup'}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.address || 'Zamboanga City'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(job.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700">₱{(job.total_amount || 0).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      job.status === 'completed' ? 'bg-green-100 text-green-700' :
                      job.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </CollectorLayout>
  )
}
