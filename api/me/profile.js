export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SERVICE_KEY || !SUPABASE_URL) return res.status(500).json({ error: 'Server configuration error' })

  const authHeader = req.headers['authorization'] || ''
  const userJwt = authHeader.replace('Bearer ', '')
  if (!userJwt) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` },
    })
    if (!authRes.ok) return res.status(401).json({ error: 'Unauthorized' })
    const authUser = await authRes.json()

    const h = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${authUser.id}&select=full_name,phone,address,role&limit=1`,
      { headers: h }
    )
    const rows = await r.json()
    const profile = Array.isArray(rows) ? rows[0] : null

    return res.status(200).json({
      full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
      phone: profile?.phone || authUser.user_metadata?.phone || '',
      address: profile?.address || '',
      role: profile?.role || authUser.user_metadata?.role || 'customer',
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
