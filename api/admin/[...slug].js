export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SERVICE_KEY || !SUPABASE_URL) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const h = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  const sb = (path) => `${SUPABASE_URL}/rest/v1/${path}`

  const slug = req.query.slug || []
  const parts = Array.isArray(slug) ? slug : [slug]
  const method = req.method || 'GET'
  const body = req.body || {}

  try {
    let data

    // GET /api/admin/stats
    if (parts[0] === 'stats' && method === 'GET') {
      const [bkRes, profRes, recentRes] = await Promise.all([
        fetch(sb('bookings?select=status,total_amount,created_at'), { headers: h }),
        fetch(sb('profiles?select=role'), { headers: h }),
        fetch(sb('bookings?select=id,status,total_amount,address,created_at,waste_types(name),profiles!bookings_customer_id_fkey(full_name)&order=created_at.desc&limit=10'), { headers: h }),
      ])
      data = {
        bookings: await bkRes.json(),
        profiles: await profRes.json(),
        recent: await recentRes.json(),
      }
    }

    // GET /api/admin/users
    else if (parts[0] === 'users' && !parts[1] && method === 'GET') {
      const r = await fetch(sb('profiles?select=id,full_name,phone,address,role&order=full_name.asc'), { headers: h })
      data = await r.json()
    }

    // POST /api/admin/users
    else if (parts[0] === 'users' && !parts[1] && method === 'POST') {
      const { email, password, full_name, phone, role } = body
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name, role } }),
      })
      const user = await authRes.json()
      if (authRes.ok && user.id) {
        await fetch(sb('profiles'), {
          method: 'POST',
          headers: { ...h, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({ id: user.id, full_name: full_name || null, phone: phone || null, role }),
        })
      }
      return res.status(authRes.ok ? 200 : 400).json({ ok: authRes.ok, user })
    }

    // PATCH /api/admin/users/:id
    else if (parts[0] === 'users' && parts[1] && method === 'PATCH') {
      const r = await fetch(sb(`profiles?id=eq.${parts[1]}`), {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify(body),
      })
      data = await r.json()
    }

    // DELETE /api/admin/users/:id
    else if (parts[0] === 'users' && parts[1] && method === 'DELETE') {
      const r = await fetch(sb(`profiles?id=eq.${parts[1]}`), { method: 'DELETE', headers: h })
      data = { success: r.ok }
    }

    // GET /api/admin/bookings
    else if (parts[0] === 'bookings' && !parts[1] && method === 'GET') {
      const r = await fetch(
        sb('bookings?select=id,status,total_amount,estimated_weight_kg,address,notes,created_at,customer_id,collector_id,waste_types(name)&order=created_at.desc'),
        { headers: h }
      )
      data = await r.json()
    }

    // PATCH /api/admin/bookings/:id
    else if (parts[0] === 'bookings' && parts[1] && method === 'PATCH') {
      const r = await fetch(sb(`bookings?id=eq.${parts[1]}`), {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify(body),
      })
      data = await r.json()
    }

    // GET /api/admin/profile-names?ids=id1,id2,...
    else if (parts[0] === 'profile-names' && method === 'GET') {
      const ids = req.query.ids || ''
      if (ids) {
        const r = await fetch(sb(`profiles?select=id,full_name&id=in.(${ids})`), { headers: h })
        data = await r.json()
      } else {
        data = []
      }
    }

    // GET /api/admin/waste-types
    else if (parts[0] === 'waste-types' && !parts[1] && method === 'GET') {
      const r = await fetch(sb('waste_types?select=id,name,base_price_per_kg&order=name.asc'), { headers: h })
      data = await r.json()
    }

    // POST /api/admin/waste-types
    else if (parts[0] === 'waste-types' && !parts[1] && method === 'POST') {
      const r = await fetch(sb('waste_types'), {
        method: 'POST',
        headers: h,
        body: JSON.stringify(body),
      })
      data = await r.json()
    }

    // PATCH /api/admin/waste-types/:id
    else if (parts[0] === 'waste-types' && parts[1] && method === 'PATCH') {
      const r = await fetch(sb(`waste_types?id=eq.${parts[1]}`), {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify(body),
      })
      data = await r.json()
    }

    // DELETE /api/admin/waste-types/:id
    else if (parts[0] === 'waste-types' && parts[1] && method === 'DELETE') {
      const r = await fetch(sb(`waste_types?id=eq.${parts[1]}`), { method: 'DELETE', headers: h })
      data = { success: r.ok }
    }

    else {
      return res.status(404).json({ error: 'Not found' })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
