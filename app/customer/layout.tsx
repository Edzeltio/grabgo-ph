// app/(customer)/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Truck, MapPin, Plus, LogOut, User } from 'lucide-react'
import Link from 'next/link'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Customer Navbar */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-emerald-600" />
            <div>
              <h1 className="font-bold text-xl">GarbGo PH</h1>
              <p className="text-xs text-emerald-600">Zamboanga City</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/book" className="flex items-center gap-2 hover:text-emerald-600">
              <Plus className="w-5 h-5" />
              Book Pickup
            </Link>
            <Link href="/dashboard" className="hover:text-emerald-600">My Bookings</Link>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">{user?.user_metadata?.full_name || 'Resident'}</p>
                <p className="text-xs text-gray-500">Customer</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
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