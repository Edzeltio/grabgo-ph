import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useLocation } from 'wouter'
import { Truck, Briefcase, DollarSign, LogOut } from 'lucide-react'
import SupabaseGuard from './SupabaseGuard'

function CollectorNav({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [, navigate] = useLocation()

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/auth/login')
        return
      }
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-emerald-600" />
            <div>
              <h1 className="font-bold text-xl">GarbGo PH</h1>
              <p className="text-xs text-emerald-600">Collector Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <button onClick={() => navigate('/collector/jobs')} className="flex items-center gap-2 hover:text-emerald-600">
              <Briefcase className="w-5 h-5" />
              Available Jobs
            </button>
            <button onClick={() => navigate('/collector/earnings')} className="flex items-center gap-2 hover:text-emerald-600">
              <DollarSign className="w-5 h-5" />
              Earnings
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">{user?.user_metadata?.full_name || 'Collector'}</p>
                <p className="text-xs text-gray-500">Collector</p>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}

export default function CollectorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseGuard>
      <CollectorNav>{children}</CollectorNav>
    </SupabaseGuard>
  )
}
