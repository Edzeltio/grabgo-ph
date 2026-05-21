export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SERVICE_KEY || !SUPABASE_URL) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/waste_types?select=id,name,base_price_per_kg&order=name.asc`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const data = await r.json()
    return res.status(200).json(Array.isArray(data) ? data : [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
