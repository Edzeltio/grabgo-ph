// app/(customer)/book/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { MapPin, Upload, Camera } from 'lucide-react'
import Image from 'next/image'

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

export default function BookPickupPage() {
  const [loading, setLoading] = useState(false)
  const [wasteTypes, setWasteTypes] = useState<any[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const [form, setForm] = useState({
    waste_type_id: '',           // keep as string (from Select)
    address: '',
    lat: 6.9042,
    lng: 122.0760,
    estimated_weight_kg: 10,
    notes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    const fetchWasteTypes = async () => {
      const { data } = await supabase.from('waste_types').select('*')
      setWasteTypes(data || [])
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
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.waste_type_id) {
      toast.error("Please select a waste type")
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please log in again")

      // Parse only when inserting
      const wasteTypeId = parseInt(form.waste_type_id)

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          waste_type_id: wasteTypeId,                    // now safely number
          address: form.address || 'Zamboanga City',
          lat: form.lat,
          lng: form.lng,
          estimated_weight_kg: form.estimated_weight_kg,
          total_amount: form.estimated_weight_kg * 15,
          notes: form.notes,
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // Upload photos
      for (const photo of photos) {
        const fileName = `${booking.id}/${Date.now()}-${photo.name}`
        const { error: uploadError } = await supabase.storage
          .from('booking-photos')
          .upload(fileName, photo, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('booking-photos')
            .getPublicUrl(fileName)

          await supabase.from('booking_photos').insert({
            booking_id: booking.id,
            url: urlData.publicUrl,
            type: 'request'
          })
        }
      }

      toast.success("Booking created successfully!", {
        description: "A collector will accept your request soon."
      })

      window.location.href = '/dashboard'
    } catch (error: any) {
      toast.error("Failed to create booking", {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
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
              <Select 
                onValueChange={(value) => setForm({ ...form, waste_type_id: value })}
                value={form.waste_type_id}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select waste category" />
                </SelectTrigger>
                <SelectContent>
                  {wasteTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name} — ₱{type.base_price_per_kg}/kg
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Map */}
            <div>
              <Label className="flex items-center gap-2 text-base mb-2">
                <MapPin className="w-5 h-5" />
                Pickup Location
              </Label>
              <MapPicker
                lat={form.lat}
                lng={form.lng}
                onLocationChange={(lat, lng) => setForm({ ...form, lat, lng })}
              />
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

            {/* Weight + Notes */}
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
                      <Image
                        src={preview}
                        alt="preview"
                        width={200}
                        height={200}
                        className="rounded-xl object-cover aspect-square border"
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

            <Button type="submit" size="lg" className="w-full text-lg py-7" disabled={loading}>
              {loading ? "Creating Request..." : "Submit Pickup Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}