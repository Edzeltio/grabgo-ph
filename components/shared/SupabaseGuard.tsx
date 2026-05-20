import { isSupabaseConfigured } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck } from 'lucide-react'

export default function SupabaseGuard({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Setup Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                GarbGo PH needs your Supabase credentials to enable authentication and data features.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2">
                <p className="font-semibold text-gray-700">Add these secrets in the Replit Secrets tab:</p>
                <code className="block bg-white border rounded px-3 py-1 font-mono text-xs">VITE_SUPABASE_URL</code>
                <code className="block bg-white border rounded px-3 py-1 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>
                <p className="text-gray-500 text-xs mt-2">
                  Find these in your Supabase dashboard under{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    Project Settings → API
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
