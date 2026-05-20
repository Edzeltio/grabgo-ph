import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, X, Save, Loader2, Tag, PhilippinePeso } from 'lucide-react'
import AdminLayout from '@/components/shared/AdminLayout'

interface WasteType {
  id: string
  name: string
  base_price_per_kg: number
}

const EMPTY: Omit<WasteType, 'id'> = { name: '', base_price_per_kg: 0 }

export default function AdminPricing() {
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{ id?: string; name: string; base_price_per_kg: number | string }>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('waste_types')
      .select('id, name, base_price_per_kg')
      .order('name')
    if (error) { toast.error('Failed to load waste types'); setLoading(false); return }
    setWasteTypes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm(EMPTY)
    setShowForm(true)
  }

  const openEdit = (wt: WasteType) => {
    setForm({ id: wt.id, name: wt.name, base_price_per_kg: wt.base_price_per_kg })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Waste type name is required'); return }
    const price = parseFloat(String(form.base_price_per_kg))
    if (isNaN(price) || price < 0) { toast.error('Enter a valid price'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      if (form.id) {
        const { data: updated, error } = await supabase
          .from('waste_types')
          .update({ name: form.name.trim(), base_price_per_kg: price })
          .eq('id', form.id)
          .select()
        if (error) throw error
        if (!updated || updated.length === 0) throw new Error('Permission denied — see Supabase setup notice on the dashboard.')
        toast.success('Waste type updated')
      } else {
        const { error } = await supabase
          .from('waste_types')
          .insert({ name: form.name.trim(), base_price_per_kg: price })
        if (error) throw error
        toast.success('Waste type added')
      }
      setShowForm(false)
      load()
    } catch (err: any) {
      toast.error('Save failed', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Existing bookings referencing this type may be affected.`)) return
    setDeleting(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('waste_types').delete().eq('id', id)
      if (error) throw error
      toast.success('Waste type deleted')
      setWasteTypes(prev => prev.filter(w => w.id !== id))
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing & Waste Types</h1>
          <p className="text-gray-500 text-sm mt-1">Manage waste categories and their base price per kilogram</p>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Add Waste Type
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6 text-sm text-emerald-800 flex items-start gap-2">
        <PhilippinePeso className="w-4 h-4 mt-0.5 shrink-0" />
        <p>The <strong>base price per kg</strong> is used to calculate the total booking cost based on the customer's estimated weight.</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : wasteTypes.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="text-center py-16 text-gray-500">
            <Tag className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No waste types yet</p>
            <p className="text-sm mt-1">Click "Add Waste Type" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wasteTypes.map(wt => (
            <Card key={wt.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <Tag className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{wt.name}</h3>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-gray-400 mb-0.5">Base Price</p>
                  <p className="text-2xl font-bold text-emerald-700">₱{wt.base_price_per_kg.toFixed(2)}<span className="text-sm font-normal text-gray-400"> / kg</span></p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(wt)} className="flex-1 h-8">
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(wt.id, wt.name)}
                    disabled={deleting === wt.id}
                    className="flex-1 h-8 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {deleting === wt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{form.id ? 'Edit Waste Type' : 'Add Waste Type'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Waste Type Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Biodegradable, Recyclable, Hazardous"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Base Price per kg (₱)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₱</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.base_price_per_kg}
                    onChange={e => setForm({ ...form, base_price_per_kg: e.target.value })}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {form.id ? 'Save Changes' : 'Add Waste Type'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
