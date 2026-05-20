export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SERVICE_KEY || !SUPABASE_URL) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const authHeader = req.headers['authorization'] || ''
  const userJwt = authHeader.replace('Bearer ', '')

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` },
  })
  if (!authRes.ok) return res.status(401).json({ error: 'Unauthorized' })
  const authUser = await authRes.json()

  const body = req.body || {}
  const { full_name, phone, address, role, vehicle_type, vehicle_plate, service_area } = body

  const h = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  }

  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      id: authUser.id,
      full_name: (full_name || '').trim() || null,
      phone: (phone || '').trim() || null,
      address: (address || '').trim() || null,
      role: role || authUser.user_metadata?.role || 'customer',
    }),
  })

  if (!profileRes.ok) {
    const err = await profileRes.json().catch(() => ({}))
    return res.status(400).json({ error: err.message || 'Profile save failed' })
  }

  const metaUpdate = {}
  if (vehicle_type !== undefined) metaUpdate.vehicle_type = vehicle_type
  if (vehicle_plate !== undefined) metaUpdate.vehicle_plate = (vehicle_plate || '').toUpperCase()
  if (service_area !== undefined) metaUpdate.service_area = service_area

  if (Object.keys(metaUpdate).length > 0) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
      method: 'PUT',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_metadata: { ...authUser.user_metadata, ...metaUpdate } }),
    })
  }

  return res.status(200).json({ ok: true })
}
