export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

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

    const h = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }

    if (req.method === 'GET') {
      const [pendingRes, activeRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/bookings?status=eq.pending&select=*,waste_types(name,base_price_per_kg)&order=created_at.desc`, { headers: h }),
        fetch(`${SUPABASE_URL}/rest/v1/bookings?collector_id=eq.${authUser.id}&status=eq.accepted&select=*,waste_types(name)&order=created_at.desc`, { headers: h }),
      ])
      return res.status(200).json({
        pending: await pendingRes.json(),
        active: await activeRes.json(),
      })
    }

    if (req.method === 'PATCH') {
      const { jobId, action } = req.body || {}
      if (!jobId || !action) return res.status(400).json({ error: 'Missing jobId or action' })

      if (action === 'accept') {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${jobId}&status=eq.pending`,
          { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'accepted', collector_id: authUser.id }) }
        )
        const data = await r.json()
        if (!r.ok) return res.status(400).json({ error: 'Failed to accept job' })
        const job = Array.isArray(data) ? data[0] : data
        if (!job) return res.status(409).json({ error: 'Job not found or already taken' })

        const wtRes = await fetch(`${SUPABASE_URL}/rest/v1/waste_types?id=eq.${job.waste_type_id}&select=name&limit=1`, { headers: h })
        const wtData = await wtRes.json()
        job.waste_types = wtData?.[0] || null

        return res.status(200).json({ ok: true, job })
      }

      if (action === 'complete') {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${jobId}&collector_id=eq.${authUser.id}`,
          { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'completed' }) }
        )
        if (!r.ok) return res.status(400).json({ error: 'Failed to complete job' })
        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ error: 'Unknown action' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
