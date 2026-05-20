import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Search, Edit2, Trash2, X, Save, UserPlus, Loader2 } from 'lucide-react'
import AdminLayout from '@/components/shared/AdminLayout'

const ROLES = ['customer', 'collector', 'admin']

const ROLE_COLORS: Record<string, string> = {
  customer:  'bg-blue-100 text-blue-700',
  collector: 'bg-orange-100 text-orange-700',
  admin:     'bg-purple-100 text-purple-700',
}

interface UserProfile {
  id: string
  full_name: string | null
  phone: string | null
  address: string | null
  role: string | null
  email?: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filtered, setFiltered] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, address, role')
      .order('full_name', { ascending: true })

    if (error) { toast.error('Failed to load users'); setLoading(false); return }
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let list = users
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.address?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [users, search, roleFilter])

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editing.full_name?.trim() || null,
          phone:     editing.phone?.trim() || null,
          address:   editing.address?.trim() || null,
          role:      editing.role,
        })
        .eq('id', editing.id)
      if (error) throw error
      toast.success('User updated')
      setEditing(null)
      load()
    } catch (err: any) {
      toast.error('Save failed', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string | null) => {
    if (!confirm(`Delete user "${name || 'this user'}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      toast.success('User removed')
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message })
    } finally {
      setDeleting(null)
    }
  }

  const roleCounts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length
    return acc
  }, {})

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">View, edit, and remove platform users</p>
        </div>
      </div>

      {/* Role filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[['all', 'All', users.length], ...ROLES.map(r => [r, r.charAt(0).toUpperCase() + r.slice(1), roleCounts[r] ?? 0])].map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setRoleFilter(val as string)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              roleFilter === val
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {label} <span className="ml-1 opacity-70">{count}</span>
          </button>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, or address…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4 font-medium">Name</th>
                    <th className="text-left py-2 pr-4 font-medium">Phone</th>
                    <th className="text-left py-2 pr-4 font-medium">Address</th>
                    <th className="text-left py-2 pr-4 font-medium">Role</th>
                    <th className="text-left py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-800">{u.full_name || <span className="text-gray-400 italic">No name</span>}</td>
                      <td className="py-3 pr-4 text-gray-600">{u.phone || '—'}</td>
                      <td className="py-3 pr-4 text-gray-600 max-w-[200px] truncate">{u.address || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[u.role || ''] || 'bg-gray-100 text-gray-600'}`}>
                          {u.role || 'unset'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing({ ...u })} className="h-7 px-2">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(u.id, u.full_name)}
                            disabled={deleting === u.id}
                            className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {deleting === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Edit User</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</Label>
                <Input
                  value={editing.full_name || ''}
                  onChange={e => setEditing({ ...editing, full_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Phone</Label>
                <Input
                  value={editing.phone || ''}
                  onChange={e => setEditing({ ...editing, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Address</Label>
                <Input
                  value={editing.address || ''}
                  onChange={e => setEditing({ ...editing, address: e.target.value })}
                  placeholder="Address"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Role</Label>
                <select
                  value={editing.role || ''}
                  onChange={e => setEditing({ ...editing, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
