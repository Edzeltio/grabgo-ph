import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
import type { IncomingMessage, ServerResponse } from "http";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise(resolve => {
    let data = '';
    req.on('data', (chunk: any) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}

function profileApiPlugin() {
  return {
    name: 'profile-api',
    configureServer(server: any) {
      server.middlewares.use('/api/profile', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const method = req.method || 'GET';

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
        if (method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
        if (!SERVICE_KEY || !SUPABASE_URL) { res.statusCode = 500; res.end(JSON.stringify({ error: 'Server configuration error' })); return; }

        try {
          const authHeader = (req.headers as any)['authorization'] || '';
          const userJwt = authHeader.replace('Bearer ', '');

          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` },
          });
          if (!authRes.ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authUser = await authRes.json();

          const body = await readBody(req);
          const { full_name, phone, address, role, vehicle_type, vehicle_plate, service_area } = body;

          const h: Record<string, string> = {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          };

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
          });

          if (!profileRes.ok) {
            const err = await profileRes.json().catch(() => ({}));
            res.statusCode = 400;
            res.end(JSON.stringify({ error: (err as any).message || 'Profile save failed' }));
            return;
          }

          const metaUpdate: Record<string, any> = {};
          if (vehicle_type !== undefined) metaUpdate.vehicle_type = vehicle_type;
          if (vehicle_plate !== undefined) metaUpdate.vehicle_plate = (vehicle_plate || '').toUpperCase();
          if (service_area !== undefined) metaUpdate.service_area = service_area;

          if (Object.keys(metaUpdate).length > 0) {
            await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
              method: 'PUT',
              headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_metadata: { ...authUser.user_metadata, ...metaUpdate } }),
            });
          }

          res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

function bookingsApiPlugin() {
  return {
    name: 'bookings-api',
    configureServer(server: any) {
      server.middlewares.use('/api/bookings', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!SERVICE_KEY || !SUPABASE_URL) { next(); return; }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const method = req.method || 'GET';
        if (method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
        if (method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }

        try {
          const authHeader = (req.headers as any)['authorization'] || '';
          const userJwt = authHeader.replace('Bearer ', '');
          if (!userJwt) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }

          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` },
          });
          if (!authRes.ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authUser = await authRes.json();

          const body = await readBody(req);
          const { waste_type_id, address, lat, lng, estimated_weight_kg, notes } = body;

          if (!waste_type_id || !address) {
            res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing required fields' })); return;
          }

          const h: Record<string, string> = {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          };

          const wtRes = await fetch(`${SUPABASE_URL}/rest/v1/waste_types?id=eq.${waste_type_id}&select=base_price_per_kg&limit=1`, { headers: h });
          const wtData = await wtRes.json();
          const pricePerKg = wtData?.[0]?.base_price_per_kg ?? 15;
          const weight = parseFloat(estimated_weight_kg) || 0;
          const totalAmount = weight * pricePerKg;

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
          });

          const bookingData = await bookingRes.json();
          if (!bookingRes.ok) {
            const msg = Array.isArray(bookingData) ? bookingData[0]?.message : bookingData?.message;
            res.statusCode = 400; res.end(JSON.stringify({ error: msg || 'Failed to create booking' })); return;
          }

          const booking = Array.isArray(bookingData) ? bookingData[0] : bookingData;
          res.end(JSON.stringify({ ok: true, booking }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

function wasteTypesApiPlugin() {
  return {
    name: 'waste-types-api',
    configureServer(server: any) {
      server.middlewares.use('/api/waste-types', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!SERVICE_KEY || !SUPABASE_URL) { next(); return; }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if ((req.method || 'GET') === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
        if ((req.method || 'GET') !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }

        try {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/waste_types?select=id,name,base_price_per_kg&order=name.asc`, {
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
          });
          const data = await r.json();
          res.end(JSON.stringify(Array.isArray(data) ? data : []));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

function adminApiPlugin() {
  return {
    name: 'admin-api',
    configureServer(server: any) {
      server.middlewares.use('/api/admin', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!SERVICE_KEY || !SUPABASE_URL) { next(); return; }

        const urlStr = req.url || '/';
        const [pathname, search] = urlStr.split('?');
        const params = new URLSearchParams(search || '');
        const method = req.method || 'GET';
        const parts = pathname.split('/').filter(Boolean);

        const h: Record<string, string> = {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        };
        const sb = (path: string) => `${SUPABASE_URL}/rest/v1/${path}`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
          let data: any;

          // GET /api/admin/stats
          if (parts[0] === 'stats' && method === 'GET') {
            const [bkRes, profRes, recentRes] = await Promise.all([
              fetch(sb('bookings?select=status,total_amount,created_at'), { headers: h }),
              fetch(sb('profiles?select=role'), { headers: h }),
              fetch(sb('bookings?select=id,status,total_amount,address,created_at,waste_types(name),profiles!bookings_customer_id_fkey(full_name)&order=created_at.desc&limit=10'), { headers: h }),
            ]);
            data = { bookings: await bkRes.json(), profiles: await profRes.json(), recent: await recentRes.json() };
          }

          // GET /api/admin/users
          else if (parts[0] === 'users' && !parts[1] && method === 'GET') {
            const r = await fetch(sb('profiles?select=id,full_name,phone,address,role&order=full_name.asc'), { headers: h });
            data = await r.json();
          }

          // POST /api/admin/users (create user + profile)
          else if (parts[0] === 'users' && !parts[1] && method === 'POST') {
            const { email, password, full_name, phone, role } = await readBody(req);
            const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
              method: 'POST', headers: h,
              body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name, role } }),
            });
            const user = await authRes.json();
            if (authRes.ok && user.id) {
              await fetch(sb('profiles'), {
                method: 'POST',
                headers: { ...h, Prefer: 'resolution=merge-duplicates' },
                body: JSON.stringify({ id: user.id, full_name: full_name || null, phone: phone || null, role }),
              });
            }
            res.statusCode = authRes.ok ? 200 : 400;
            data = { ok: authRes.ok, user };
          }

          // PATCH /api/admin/users/:id
          else if (parts[0] === 'users' && parts[1] && method === 'PATCH') {
            const body = await readBody(req);
            const r = await fetch(sb(`profiles?id=eq.${parts[1]}`), { method: 'PATCH', headers: h, body: JSON.stringify(body) });
            data = await r.json();
          }

          // DELETE /api/admin/users/:id
          else if (parts[0] === 'users' && parts[1] && method === 'DELETE') {
            const r = await fetch(sb(`profiles?id=eq.${parts[1]}`), { method: 'DELETE', headers: h });
            data = { success: r.ok };
          }

          // GET /api/admin/bookings
          else if (parts[0] === 'bookings' && !parts[1] && method === 'GET') {
            const r = await fetch(sb('bookings?select=id,status,total_amount,estimated_weight_kg,address,notes,created_at,customer_id,collector_id,waste_types(name)&order=created_at.desc'), { headers: h });
            data = await r.json();
          }

          // GET /api/admin/profile-names?ids=id1,id2,...
          else if (parts[0] === 'profile-names' && method === 'GET') {
            const ids = params.get('ids') || '';
            if (ids) {
              const r = await fetch(sb(`profiles?select=id,full_name&id=in.(${ids})`), { headers: h });
              data = await r.json();
            } else { data = []; }
          }

          // PATCH /api/admin/bookings/:id
          else if (parts[0] === 'bookings' && parts[1] && method === 'PATCH') {
            const body = await readBody(req);
            const r = await fetch(sb(`bookings?id=eq.${parts[1]}`), { method: 'PATCH', headers: h, body: JSON.stringify(body) });
            data = await r.json();
          }

          // GET /api/admin/waste-types
          else if (parts[0] === 'waste-types' && !parts[1] && method === 'GET') {
            const r = await fetch(sb('waste_types?select=id,name,base_price_per_kg&order=name.asc'), { headers: h });
            data = await r.json();
          }

          // POST /api/admin/waste-types
          else if (parts[0] === 'waste-types' && !parts[1] && method === 'POST') {
            const body = await readBody(req);
            const r = await fetch(sb('waste_types'), { method: 'POST', headers: h, body: JSON.stringify(body) });
            data = await r.json();
          }

          // PATCH /api/admin/waste-types/:id
          else if (parts[0] === 'waste-types' && parts[1] && method === 'PATCH') {
            const body = await readBody(req);
            const r = await fetch(sb(`waste_types?id=eq.${parts[1]}`), { method: 'PATCH', headers: h, body: JSON.stringify(body) });
            data = await r.json();
          }

          // DELETE /api/admin/waste-types/:id
          else if (parts[0] === 'waste-types' && parts[1] && method === 'DELETE') {
            const r = await fetch(sb(`waste_types?id=eq.${parts[1]}`), { method: 'DELETE', headers: h });
            data = { success: r.ok };
          }

          else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

function meBookingsApiPlugin() {
  return {
    name: 'me-bookings-api',
    configureServer(server: any) {
      server.middlewares.use('/api/me/bookings', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!SERVICE_KEY || !SUPABASE_URL) { next(); return; }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if ((req.method || 'GET') === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
        if ((req.method || 'GET') !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
        try {
          const authHeader = (req.headers as any)['authorization'] || '';
          const userJwt = authHeader.replace('Bearer ', '');
          if (!userJwt) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` } });
          if (!authRes.ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authUser = await authRes.json();
          const h: Record<string, string> = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
          const urlStr = req.url || '/';
          const params = new URLSearchParams(urlStr.includes('?') ? urlStr.split('?')[1] : '');
          const id = params.get('id');
          if (id) {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}&customer_id=eq.${authUser.id}&select=*,waste_types(name,base_price_per_kg)&limit=1`, { headers: h });
            const data = await r.json();
            const booking = Array.isArray(data) ? data[0] : null;
            res.statusCode = booking ? 200 : 404;
            res.end(JSON.stringify(booking || { error: 'Not found' }));
          } else {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${authUser.id}&select=*,waste_types(name)&order=created_at.desc`, { headers: h });
            const data = await r.json();
            res.end(JSON.stringify(Array.isArray(data) ? data : []));
          }
        } catch (err: any) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); }
      });
    },
  };
}

function meProfileApiPlugin() {
  return {
    name: 'me-profile-api',
    configureServer(server: any) {
      server.middlewares.use('/api/me/profile', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!SERVICE_KEY || !SUPABASE_URL) { next(); return; }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if ((req.method || 'GET') === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
        if ((req.method || 'GET') !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
        try {
          const authHeader = (req.headers as any)['authorization'] || '';
          const userJwt = authHeader.replace('Bearer ', '');
          if (!userJwt) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` } });
          if (!authRes.ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authUser = await authRes.json();
          const h: Record<string, string> = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
          const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authUser.id}&select=full_name,phone,address,role&limit=1`, { headers: h });
          const rows = await r.json();
          const profile = Array.isArray(rows) ? rows[0] : null;
          res.end(JSON.stringify({
            full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
            phone: profile?.phone || authUser.user_metadata?.phone || '',
            address: profile?.address || '',
            role: profile?.role || authUser.user_metadata?.role || 'customer',
          }));
        } catch (err: any) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); }
      });
    },
  };
}

function collectorJobsApiPlugin() {
  return {
    name: 'collector-jobs-api',
    configureServer(server: any) {
      server.middlewares.use('/api/collector/jobs', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!SERVICE_KEY || !SUPABASE_URL) { next(); return; }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        const method = req.method || 'GET';
        if (method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
        if (method !== 'GET' && method !== 'PATCH') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
        try {
          const authHeader = (req.headers as any)['authorization'] || '';
          const userJwt = authHeader.replace('Bearer ', '');
          if (!userJwt) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` } });
          if (!authRes.ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authUser = await authRes.json();
          const h: Record<string, string> = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
          if (method === 'GET') {
            const [pRes, aRes] = await Promise.all([
              fetch(`${SUPABASE_URL}/rest/v1/bookings?status=eq.pending&select=*,waste_types(name,base_price_per_kg)&order=created_at.desc`, { headers: h }),
              fetch(`${SUPABASE_URL}/rest/v1/bookings?collector_id=eq.${authUser.id}&status=eq.accepted&select=*,waste_types(name)&order=created_at.desc`, { headers: h }),
            ]);
            res.end(JSON.stringify({ pending: await pRes.json(), active: await aRes.json() }));
          } else {
            const body = await readBody(req);
            const { jobId, action } = body || {};
            if (!jobId || !action) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing jobId or action' })); return; }
            if (action === 'accept') {
              const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${jobId}&status=eq.pending`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'accepted', collector_id: authUser.id }) });
              const data = await r.json();
              if (!r.ok) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Failed to accept job' })); return; }
              const job = Array.isArray(data) ? data[0] : data;
              if (!job) { res.statusCode = 409; res.end(JSON.stringify({ error: 'Job not found or already taken' })); return; }
              if (job.waste_type_id) {
                const wtRes = await fetch(`${SUPABASE_URL}/rest/v1/waste_types?id=eq.${job.waste_type_id}&select=name&limit=1`, { headers: h });
                const wtData = await wtRes.json();
                job.waste_types = wtData?.[0] || null;
              }
              res.end(JSON.stringify({ ok: true, job }));
            } else if (action === 'complete') {
              const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${jobId}&collector_id=eq.${authUser.id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'completed' }) });
              if (!r.ok) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Failed to complete job' })); return; }
              res.end(JSON.stringify({ ok: true }));
            } else {
              res.statusCode = 400; res.end(JSON.stringify({ error: 'Unknown action' }));
            }
          }
        } catch (err: any) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); }
      });
    },
  };
}

function collectorEarningsApiPlugin() {
  return {
    name: 'collector-earnings-api',
    configureServer(server: any) {
      server.middlewares.use('/api/collector/earnings', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!SERVICE_KEY || !SUPABASE_URL) { next(); return; }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if ((req.method || 'GET') === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
        if ((req.method || 'GET') !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
        try {
          const authHeader = (req.headers as any)['authorization'] || '';
          const userJwt = authHeader.replace('Bearer ', '');
          if (!userJwt) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userJwt}` } });
          if (!authRes.ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
          const authUser = await authRes.json();
          const h: Record<string, string> = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
          const [jobsRes, allRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/bookings?collector_id=eq.${authUser.id}&status=in.(accepted,completed)&select=*,waste_types(name)&order=created_at.desc`, { headers: h }),
            fetch(`${SUPABASE_URL}/rest/v1/bookings?collector_id=eq.${authUser.id}&select=status`, { headers: h }),
          ]);
          const jobs = await jobsRes.json();
          const allJobs = await allRes.json();
          res.end(JSON.stringify({
            jobs: Array.isArray(jobs) ? jobs : [],
            stats: {
              completed: Array.isArray(allJobs) ? allJobs.filter((j: any) => j.status === 'completed').length : 0,
              total: Array.isArray(allJobs) ? allJobs.length : 0,
            },
          }));
        } catch (err: any) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(), tailwindcss(),
    meBookingsApiPlugin(), meProfileApiPlugin(),
    collectorJobsApiPlugin(), collectorEarningsApiPlugin(),
    profileApiPlugin(), bookingsApiPlugin(), wasteTypesApiPlugin(), adminApiPlugin(),
  ],
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
});
