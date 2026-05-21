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

  if (!userJwt) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` },
    })
    if (!authRes.ok) return res.status(401).json({ error: 'Unauthorized' })
    const authUser = await authRes.json()

    const { waste_type_id, address, lat, lng, estimated_weight_kg, notes } = req.body || {}

    if (!waste_type_id || !address) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const wtRes = await fetch(
      `${SUPABASE_URL}/rest/v1/waste_types?id=eq.${waste_type_id}&select=base_price_per_kg&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const wtData = await wtRes.json()
    const pricePerKg = wtData?.[0]?.base_price_per_kg ?? 15
    const weight = parseFloat(estimated_weight_kg) || 0
    const totalAmount = weight * pricePerKg

    const h = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }

    const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        customer_id: authUser.id,
        waste_type_id: parseInt(waste_type_id),
        address: address.trim(),
        lat: lat ?? null,
        lng: lng ?? null,
        estimated_weight_kg: weight,
        total_amount: totalAmount,
        notes: notes?.trim() || null,
        status: 'pending',
      }),
    })

    const bookingData = await bookingRes.json()

    if (!bookingRes.ok) {
      const msg = Array.isArray(bookingData) ? bookingData[0]?.message : bookingData?.message
      return res.status(400).json({ error: msg || 'Failed to create booking' })
    }

    const booking = Array.isArray(bookingData) ? bookingData[0] : bookingData
    return res.status(200).json({ ok: true, booking })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
