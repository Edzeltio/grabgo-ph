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

export default defineConfig({
  plugins: [react(), tailwindcss(), adminApiPlugin()],
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
