// app/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Truck, Clock, MapPin, Shield, Recycle, Users } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-2xl text-gray-900">GarbGo PH</h1>
              <p className="text-xs text-emerald-600 -mt-1">Zamboanga City</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Recycle className="w-4 h-4" />
            RA 9003 Compliant • Proper Segregation
          </div>

          <h1 className="text-6xl font-bold text-gray-900 leading-tight mb-6">
            Garbage Pickup,<br />
            <span className="text-emerald-600">Made Simple</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Book a reliable collector to pick up your segregated garbage in Zamboanga City. 
            Fast, trackable, and eco-friendly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 rounded-2xl"
              onClick={() => router.push('/auth/signup')}
            >
              Book a Pickup Now
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-7 rounded-2xl"
              onClick={() => router.push('/auth/signup')}
            >
              Join as Collector
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" /> Under 2 hours
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Verified Collectors
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Zamboanga City Wide
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose GarbGo?</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              We make waste management easy, responsible, and rewarding for Zamboanga
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Easy Booking</h3>
                <p className="text-gray-600">
                  Take a photo, select waste type, pin your location — done in under 60 seconds.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Verified Collectors</h3>
                <p className="text-gray-600">
                  All collectors are background-checked and trained on proper waste handling.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Recycle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Eco-Friendly</h3>
                <p className="text-gray-600">
                  We strictly follow waste segregation rules (RA 9003). 
                  Help keep Zamboanga City clean!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Book", desc: "Choose waste type, upload photo & location" },
              { step: "2", title: "Match", desc: "Nearby collector accepts your request" },
              { step: "3", title: "Pickup", desc: "Collector arrives and picks up your garbage" },
              { step: "4", title: "Done", desc: "Rate & pay securely via GCash or Maya" }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6">
                  {item.step}
                </div>
                <h4 className="font-semibold text-xl mb-2">{item.title}</h4>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to keep Zamboanga clean?
          </h2>
          <p className="text-emerald-100 text-xl mb-10">
            Join thousands of residents who are making waste management easier and greener in Zamboanga City.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-12 py-7 rounded-2xl bg-white text-emerald-700 hover:bg-gray-100"
              onClick={() => router.push('/auth/signup')}
            >
              Book My First Pickup
            </Button>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-12 py-7 rounded-2xl bg-white text-emerald-700 hover:bg-gray-100"
              onClick={() => router.push('/auth/signup')}
            >
              Become a Collector
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div className="text-white font-semibold text-2xl">GarbGo PH</div>
            </div>
            
            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-white">About</a>
              <a href="#" className="hover:text-white">For Collectors</a>
              <a href="#" className="hover:text-white">Contact</a>
              <a href="#" className="hover:text-white">Terms</a>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm">
            © 2026 GarbGo PH. Made for a cleaner Zamboanga City.
          </div>
        </div>
      </footer>
    </div>
  )
}