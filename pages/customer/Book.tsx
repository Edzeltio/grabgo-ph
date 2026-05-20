import { useState, useEffect, lazy, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { MapPin, Upload, Camera, Loader2 } from 'lucide-react'
import { useLocation } from 'wouter'
import CustomerLayout from '@/components/shared/CustomerLayout'

const MapPicker = lazy(() => import('@/components/MapPicker'))

export default function BookPickupPage() {
  const [loading, setLoading] = useState(false)
  const [wasteTypes, setWasteTypes] = useState<any[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [, navigate] = useLocation()

  const [form, setForm] = useState({
    waste_type_id: '',
    address: '',
    lat: 6.9042,
    lng: 122.0760,
    estimated_weight_kg: 10,
    notes: '',
  })

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [photoPreviews])

  useEffect(() => {
    const fetchWasteTypes = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('waste_types').select('*')
        setWasteTypes(data || [])
      } catch (err) {
        console.error('Failed to fetch waste types:', err)
      }
    }
    fetchWasteTypes()
  }, [])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setPhotos(prev => [...prev, ...newFiles])

      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      setPhotoPreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removePhoto = (index: number) => {
    // Revoke URL when removing
    URL.revokeObjectURL(photoPreviews[index])

    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.waste_type_id) {
      toast.error("Please select a waste type")
      return
    }
    if (!form.address?.trim()) {
      toast.error("Please enter a pickup address")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Please log in again")
        return
      }

      const wasteTypeId = parseInt(form.waste_type_id)

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          waste_type_id: wasteTypeId,
          address: form.address.trim(),
          lat: form.lat,
          lng: form.lng,
          estimated_weight_kg: form.estimated_weight_kg,
          total_amount: form.estimated_weight_kg * 15,
          notes: form.notes?.trim() || null,
        })
        .select()
        .single()

      if (bookingError) {
        console.error("Booking Error:", bookingError)
        throw new Error(bookingError.message)
      }

      if (!booking) throw new Error("Failed to create booking")

      // Upload photos
      if (photos.length > 0) {
        for (const photo of photos) {
          try {
            const fileName = `${booking.id}/${Date.now()}-${photo.name.replace(/\s+/g, '-')}`

            const { error: uploadError } = await supabase.storage
              .from('booking-photos')
              .upload(fileName, photo, { upsert: false })

            if (uploadError) {
              console.warn("Photo upload failed:", uploadError)
              continue
            }

            const { data: urlData } = supabase.storage
              .from('booking-photos')
              .getPublicUrl(fileName)

            await supabase.from('booking_photos').insert({
              booking_id: booking.id,
              url: urlData.publicUrl,
              type: 'request'
            })
          } catch (photoError) {
            console.warn("Photo processing error:", photoError)
          }
        }
      }

      toast.success("Booking created successfully!", {
        description: "A collector will accept your request soon."
      })

      navigate('/customer/dashboard')

    } catch (error: any) {
      console.error("Submit Error:", error)
      toast.error("Failed to create booking", {
        description: error.message || "Please try again later"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Book Garbage Pickup</h1>
          <p className="text-emerald-600 text-lg">Zamboanga City • RA 9003 Compliant</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">New Pickup Request</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Waste Type */}
              <div>
                <Label className="text-base">Waste Type (RA 9003)</Label>
                <select
                  value={form.waste_type_id}
                  onChange={(e) => setForm({ ...form, waste_type_id: e.target.value })}
                  className="w-full mt-2 border rounded-xl px-4 py-3 text-base bg-white"
                >
                  <option value="">Select waste category</option>
                  {wasteTypes.map((type) => (
                    <option key={type.id} value={type.id.toString()}>
                      {type.name} — ₱{type.base_price_per_kg}/kg
                    </option>
                  ))}
                </select>
              </div>

              {/* Map Picker */}
              <div>
                <Label className="flex items-center gap-2 text-base mb-2">
                  <MapPin className="w-5 h-5" />
                  Pickup Location
                </Label>
                <Suspense fallback={
                  <div className="w-full h-[400px] bg-gray-100 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  </div>
                }>
                  <MapPicker
                    lat={form.lat}
                    lng={form.lng}
                    onLocationChange={(lat, lng) => setForm({ ...form, lat, lng })}
                  />
                </Suspense>
              </div>

              {/* Address */}
              <div>
                <Label className="text-base">Full Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House #, Street, Barangay, Zamboanga City"
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Weight & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base">Estimated Weight (kg)</Label>
                  <input
                    type="number"
                    value={form.estimated_weight_kg}
                    onChange={(e) => setForm({ ...form, estimated_weight_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-2 border rounded-xl px-4 py-3 text-lg"
                    min="1"
                    step="0.5"
                  />
                </div>
                <div>
                  <Label className="text-base">Additional Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any special instructions..."
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <Label className="flex items-center gap-2 text-base mb-3">
                  <Camera className="w-5 h-5" />
                  Upload Photos (recommended)
                </Label>
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex items-center justify-center gap-3 border-2 border-dashed border-gray-300 hover:border-emerald-300 rounded-2xl py-8 text-gray-500 hover:text-emerald-600 transition"
                >
                  <Upload className="w-6 h-6" />
                  <span className="font-medium">Click to upload photos</span>
                </label>

                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 mt-6">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt="preview"
                          className="rounded-xl object-cover aspect-square border w-full"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full text-lg py-7"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Request...
                  </>
                ) : (
                  "Submit Pickup Request"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  )
}