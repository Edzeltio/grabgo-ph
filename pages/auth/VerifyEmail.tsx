import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MailCheck, Loader2, Truck, RefreshCw, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function VerifyEmailPage() {
  const [, navigate] = useLocation()
  const [resending, setResending] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('pending_verification_email') || ''
    setEmail(storedEmail)

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setVerified(true)
        sessionStorage.removeItem('pending_verification_email')
        toast.success("Email verified! Welcome to GarbGo PH.")
        setTimeout(() => {
          const role = session.user.user_metadata?.role
          if (role === 'collector') {
            navigate('/collector/jobs')
          } else {
            navigate('/customer/dashboard')
          }
        }, 1500)
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleResend = async () => {
    if (!email) {
      toast.error("No email found. Please sign up again.")
      navigate('/auth/signup')
      return
    }
    setResending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (error) throw error
      toast.success("Verification email resent!", {
        description: `Check your inbox at ${email}`,
      })
    } catch (error: any) {
      toast.error("Failed to resend", { description: error.message })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mb-4">
              {verified ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <MailCheck className="w-8 h-8 text-white" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {verified ? 'Email Verified!' : 'Check Your Email'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {verified ? (
              <div className="space-y-4">
                <p className="text-gray-600">You're all set! Redirecting you now...</p>
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    We sent a verification link to:
                  </p>
                  {email && (
                    <p className="font-semibold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl">
                      {email}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm">
                    Click the link in the email to verify your account. Check your spam folder if you don't see it.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full"
                  >
                    {resending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                      <><RefreshCw className="mr-2 h-4 w-4" /> Resend verification email</>
                    )}
                  </Button>

                  <button
                    onClick={() => navigate('/auth/login')}
                    className="text-sm text-gray-500 hover:text-emerald-600"
                  >
                    Already verified? Login here
                  </button>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 text-left text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-700">Why verify?</span>
                  </div>
                  <p className="text-gray-600">
                    Email verification keeps GarbGo PH safe for residents and collectors in Zamboanga City.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
