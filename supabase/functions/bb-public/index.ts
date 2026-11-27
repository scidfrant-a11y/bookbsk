import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const TZ_OFFSET = 8 * 3600 * 1000;
const DAY = 86400000;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

const pad = (n: number) => String(n).padStart(2, '0');

function computeWindow(s: Record<string, any>) {
  const now = Date.now();
  const local = new Date(now + TZ_OFFSET);
  const iso = ((local.getUTCDay() + 6) % 7) + 1;
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - (iso - 1) * DAY;
  const md = new Date(mondayLocal);
  const weekKey = `${md.getUTCFullYear()}-${pad(md.getUTCMonth() + 1)}-${pad(md.getUTCDate())}`;
  const at = (wd: number, t: string) => {
    const [h, m] = String(t || '00:00').split(':').map((x) => Number(x) || 0);
    return mondayLocal + (wd - 1) * DAY + h * 3600000 + m * 60000 - TZ_OFFSET;
  };
  const openAt = at(s.open_weekday, s.open_time);
  const closeAt = at(s.close_weekday, s.close_time);
  const eventAt = at(s.event_weekday || 4, s.event_time || '19:30');
  const isPaused = String(s.paused_week || '') === weekKey;
  let state = 'closed';
  if (isPaused) state = 'paused';
  else if (s.status_override === 'open') state = 'open';
  else if (s.status_override === 'closed') state = 'closed';
  else if (now < openAt) state = 'upcoming';
  else if (now < closeAt) state = 'open';
  const nextOpenAt = now < openAt ? openAt : openAt + 7 * DAY;
  return { now, weekKey, openAt, closeAt, eventAt, nextOpenAt, state };
}

function maskPhone(p: string) {
  const digits = String(p || '').replace(/\D/g, '');
  if (digits.length < 7) return '***';
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

function normalizePhone(v: unknown) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('886')) d = `0${d.slice(3)}`;
  if (/^9\d{8}$/.test(d)) d = `0${d}`;
  return d;
}

const PHONE_RE = /^09\d{8}$/;

type RegRow = {
  id: string; name: string; phone: string; note?: string | null;
  created_at: string; cancel_token?: string; is_company?: boolean | null;
};

/** 公司員工優先佔用前 N 個順位，其餘（含超出名額的員工）依報名時間排序 */
function orderRows(rows: RegRow[], priority: number): RegRow[] {
  const quota = Math.max(0, Math.min(200, Number(priority) || 0));
  const byTime = [...rows].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const head = byTime.filter((r) => r.is_company === true).slice(0, quota);
  const headIds = new Set(head.map((r) => r.id));
  const tail = byTime.filter((r) => !headIds.has(r.id));
  return [...head, ...tail];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const action = String(body.action || 'status');

    const { data: s, error: se } = await admin.from('bb_settings').select('*').eq('id', 1).maybeSingle();
    if (se || !s) return json({ error: '無法讀取報名設定' }, 500);
    const win = computeWindow(s);

    const loadActive = async (weekKey: string) => {
      const { data, error } = await admin.from('bb_registrations')
        .select('id,name,phone,note,created_at,cancel_token,is_company')
        .eq('week_key', weekKey).eq('status', 'active')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    };

    if (action === 'status') {
      const ordered = orderRows(await loadActive(win.weekKey), s.company_priority);
      const list = ordered.map((r, i) => ({
        id: r.id,
        name: r.name,
        phone: maskPhone(r.phone),
        created_at: r.created_at,
        is_company: r.is_company === true,
        position: i + 1,
      }));
      const { count: cancelledCount } = await admin.from('bb_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('week_key', win.weekKey).eq('status', 'cancelled');
      return json({
        settings: {
          event_title: s.event_title, event_location: s.event_location, event_time_text: s.event_time_text,
          capacity: s.capacity, waitlist_enabled: s.waitlist_enabled, waitlist_limit: s.waitlist_limit,
          open_weekday: s.open_weekday, open_time: s.open_time, close_weekday: s.close_weekday, close_time: s.close_time,
          paused_week: s.paused_week || null,
          company_priority: s.company_priority ?? 0,
        },
        window: win,
        confirmed: list.slice(0, s.capacity),
        waitlist: list.slice(s.capacity),
        cancelledCount: cancelledCount || 0,
      });
    }

    if (action === 'register') {
      const name = String(body.name || '').trim().slice(0, 40);
      const phone = normalizePhone(body.phone);
      const note = String(body.note || '').trim().slice(0, 200);
      const isCompany = body.is_company === true || body.is_company === 'true';
      if (!name) return json({ error: '請填寫姓名' }, 400);
      if (!PHONE_RE.test(phone)) return json({ error: '手機號碼格式不正確，請輸入手機 09 開頭共 10 碼' }, 400);
      if (win.state !== 'open') {
        const closedMsg = win.state === 'upcoming'
          ? '報名尚未開放'
          : win.state === 'paused' ? '本週球局暫停一次，下週再報名' : '本週報名已截止';
        return json({ error: closedMsg }, 400);
      }
      const rows = await loadActive(win.weekKey);
      if (rows.some((r) => normalizePhone(r.phone) === phone)) return json({ error: '此手機號碼本週已報名過了' }, 400);
      const total = rows.length;
      if (total >= s.capacity) {
        if (!s.waitlist_enabled) return json({ error: '名額已滿，本週不開放候補' }, 400);
        if (total - s.capacity >= s.waitlist_limit) return json({ error: '名額與候補皆已額滿' }, 400);
      }
      const { data: ins, error: ie } = await admin.from('bb_registrations')
        .insert({ week_key: win.weekKey, name, phone, note: note || null, is_company: isCompany })
        .select('id,cancel_token,created_at').maybeSingle();
      if (ie || !ins) return json({ error: '報名失敗，請稍後再試' }, 500);

      const ordered = orderRows(await loadActive(win.weekKey), s.company_priority);
      const idx = ordered.findIndex((r) => r.id === ins.id) + 1;
      const rank = idx > 0 ? idx : ordered.length;
      const isConfirmed = rank <= s.capacity;

      return json({
        ok: true, id: ins.id, cancel_token: ins.cancel_token, name, phone, is_company: isCompany,
        status: isConfirmed ? 'confirmed' : 'waitlist',
        position: isConfirmed ? rank : rank - s.capacity,
      });
    }

    if (action === 'lookup' || action === 'cancel') {
      const token = String(body.token || '');
      if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: '取消連結無效' }, 400);
      const { data: reg } = await admin.from('bb_registrations')
        .select('id,week_key,name,phone,status,created_at').eq('cancel_token', token).maybeSingle();
      if (!reg) return json({ error: '找不到這筆報名' }, 404);
      if (action === 'lookup') {
        let position = 0;
        let regStatus = reg.status;
        if (reg.status === 'active') {
          const rows = orderRows(await loadActive(reg.week_key), s.company_priority);
          const idx = rows.findIndex((r) => r.id === reg.id) + 1;
          regStatus = idx <= s.capacity ? 'confirmed' : 'waitlist';
          position = idx <= s.capacity ? idx : idx - s.capacity;
        }
        return json({
          registration: { name: reg.name, phone: maskPhone(reg.phone), week_key: reg.week_key, status: regStatus, position, created_at: reg.created_at },
          isCurrentWeek: reg.week_key === win.weekKey,
          settings: { event_title: s.event_title, event_time_text: s.event_time_text, event_location: s.event_location },
        });
      }
      if (reg.status !== 'active') return json({ error: '這筆報名已經取消過了' }, 400);
      const { error: ue } = await admin.from('bb_registrations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', reg.id);
      if (ue) return json({ error: '取消失敗，請稍後再試' }, 500);

      let promoted: string | null = null;
      if (s.auto_promote) {
        const rows = orderRows(await loadActive(reg.week_key), s.company_priority);
        const candidate = rows.length >= s.capacity ? rows[s.capacity - 1] : null;
        if (candidate) {
          promoted = candidate.name;
        }
      }
      return json({ ok: true, promoted });
    }

    return json({ error: '未知的操作' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || '伺服器錯誤' }, 500);
  }
});
