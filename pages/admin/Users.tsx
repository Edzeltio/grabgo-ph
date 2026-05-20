import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Search, Edit2, Trash2, X, Save, UserPlus, Loader2, ChevronDown } from 'lucide-react'
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
}

function RoleBadge({ user, onChanged }: { user: UserProfile; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const changeRole = async (newRole: string) => {
    if (newRole === user.role) { setOpen(false); return }
    setSaving(true)
    setOpen(false)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error('Request failed')
      toast.success(`Role changed to ${newRole}`)
      onChanged()
    } catch (err: any) {
      toast.error('Failed to change role', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
          ROLE_COLORS[user.role || ''] || 'bg-gray-100 text-gray-600'
        }`}
      >
        {saving
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <>{user.role || 'unset'} <ChevronDown className="w-2.5 h-2.5" /></>
        }
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[110px] py-1 overflow-hidden">
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => changeRole(r)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                r === user.role ? 'font-semibold' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                r === 'admin' ? 'bg-purple-500' : r === 'collector' ? 'bg-orange-500' : 'bg-blue-500'
              }`} />
              {r.charAt(0).toUpperCase() + r.slice(1)}
              {r === user.role && <span className="ml-auto text-gray-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', phone: '', role: 'customer' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
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
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editing.full_name?.trim() || null,
          phone:     editing.phone?.trim() || null,
          address:   editing.address?.trim() || null,
          role:      editing.role,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
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
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Request failed')
      toast.success('User removed')
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message })
    } finally {
      setDeleting(null)
    }
  }

  const handleCreate = async () => {
    if (!newUser.email.trim() || !newUser.password.trim()) {
      toast.error('Email and password are required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      const result = await res.json()
      if (!result.ok) throw new Error(result.user?.msg || result.user?.message || 'Failed to create user')
      toast.success('User created', { description: `${newUser.email} added as ${newUser.role}.` })
      setShowCreate(false)
      setNewUser({ full_name: '', email: '', password: '', phone: '', role: 'customer' })
      load()
    } catch (err: any) {
      toast.error('Create failed', { description: err.message })
    } finally {
      setCreating(false)
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
          <p className="text-gray-500 text-sm mt-1">View, edit roles, and manage platform users</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <UserPlus className="w-4 h-4" /> Create User
        </Button>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, or address…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
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
                        <RoleBadge user={u} onChanged={load} />
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
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</Label>
                <Input value={editing.full_name || ''} onChange={e => setEditing({ ...editing, full_name: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Phone</Label>
                <Input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Address</Label>
                <Input value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} placeholder="Address" />
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

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Create User</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</Label>
                <Input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Password <span className="text-red-500">*</span></Label>
                <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min 6 characters" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Phone</Label>
                <Input value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Role</Label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleCreate} disabled={creating} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Create User
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
