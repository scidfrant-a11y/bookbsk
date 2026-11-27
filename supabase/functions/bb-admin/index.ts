import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const TZ_OFFSET = 8 * 3600 * 1000;
const DAY = 86400000;
const TOKEN_MAX_AGE = 1000 * 3600 * 24 * 30;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

const enc = new TextEncoder();
const pad = (n: number) => String(n).padStart(2, '0');
const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

async function sha256(text: string) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}
async function hmac(text: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
const hashPassword = (pw: string) => sha256(`bb-admin::${pw}`);
const makeToken = async (secret: string, ts = Date.now()) => `${ts}.${await hmac(`admin|${ts}`, secret)}`;

async function verifyToken(token: string, secret: string) {
  if (!token || !token.includes('.')) return false;
  const [tsRaw, sig] = token.split('.');
  const ts = Number(tsRaw);
  if (!ts || Date.now() - ts > TOKEN_MAX_AGE) return false;
  return sig === (await hmac(`admin|${ts}`, secret));
}

function computeWeek(now: number) {
  const local = new Date(now + TZ_OFFSET);
  const iso = ((local.getUTCDay() + 6) % 7) + 1;
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - (iso - 1) * DAY;
}
const weekKeyOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PHONE_RE = /^09\d{8}$/;
type RegRow = {
  id: string; name: string; phone: string; created_at: string; is_company?: boolean | null;
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
const normalizePhone = (v: unknown) => {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('886')) d = `0${d.slice(3)}`;
  if (/^9\d{8}$/.test(d)) d = `0${d}`;
  return d;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const action = String(body.action || '');

    const { data: adm } = await admin.from('bb_admin').select('*').eq('id', 1).maybeSingle();

    if (action === 'login-status') {
      return json({ initialized: !!adm });
    }
    if (action === 'setup') {
      if (adm) return json({ error: '管理員帳號已設定過' }, 400);
      const pw = String(body.password || '');
      if (pw.length < 6) return json({ error: '密碼至少 6 碼' }, 400);
      const secret = crypto.randomUUID() + crypto.randomUUID();
      const { error } = await admin.from('bb_admin').insert({ id: 1, password_hash: await hashPassword(pw), token_secret: secret });
      if (error) return json({ error: '設定失敗，請重新整理再試' }, 500);
      return json({ ok: true, token: await makeToken(secret) });
    }
    if (action === 'login') {
      if (!adm) return json({ error: '尚未設定管理密碼' }, 400);
      const pw = String(body.password || '');
      if ((await hashPassword(pw)) !== adm.password_hash) return json({ error: '密碼不正確' }, 401);
      return json({ ok: true, token: await makeToken(adm.token_secret) });
    }
    if (!adm) return json({ error: '尚未設定管理員帳號' }, 401);
    if (!(await verifyToken(String(body.token || ''), adm.token_secret))) {
      return json({ error: '登入已過期，請重新登入' }, 401);
    }

    const { data: s } = await admin.from('bb_settings').select('*').eq('id', 1).maybeSingle();
    if (!s) return json({ error: '找不到設定' }, 500);

    if (action === 'change-password') {
      const pw = String(body.newPassword || '');
      if (pw.length < 6) return json({ error: '新密碼至少 6 碼' }, 400);
      const { error } = await admin.from('bb_admin').update({ password_hash: await hashPassword(pw) }).eq('id', 1);
      if (error) return json({ error: '更新失敗' }, 500);
      return json({ ok: true });
    }

    if (action === 'save-settings') {
      const p = body.settings || {};
      const num = (v: unknown, min: number, max: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
      };
      const capacity = num(p.capacity, 1, 200);
      const waitlistLimit = num(p.waitlist_limit, 0, 200);
      const openWeekday = num(p.open_weekday, 1, 7);
      const closeWeekday = num(p.close_weekday, 1, 7);
      const companyPriority = p.company_priority === undefined || p.company_priority === null
        ? (s.company_priority ?? 12)
        : num(p.company_priority, 0, 200);
      if (capacity === null || waitlistLimit === null || openWeekday === null
        || closeWeekday === null || companyPriority === null) {
        return json({ error: '數值格式不正確' }, 400);
      }
      if (!TIME_RE.test(String(p.open_time)) || !TIME_RE.test(String(p.close_time))) {
        return json({ error: '時間格式需為 HH:MM' }, 400);
      }
      if (p.status_override && !['auto', 'open', 'closed'].includes(String(p.status_override))) {
        return json({ error: '開放狀態不正確' }, 400);
      }
      const currentWeek = weekKeyOf(computeWeek(Date.now()));
      const pausedNow = !!p.paused;
      const patch = {
        event_title: String(p.event_title || '').trim().slice(0, 60) || s.event_title,
        event_location: String(p.event_location || '').trim().slice(0, 80),
        event_time_text: String(p.event_time_text || '').trim().slice(0, 60),
        open_weekday: openWeekday, open_time: String(p.open_time),
        close_weekday: closeWeekday, close_time: String(p.close_time),
        status_override: String(p.status_override || 'auto'),
        capacity, waitlist_enabled: !!p.waitlist_enabled, waitlist_limit: waitlistLimit,
        auto_promote: !!p.auto_promote,
        company_priority: companyPriority,
        paused_week: pausedNow ? currentWeek : null,
        updated_at: new Date().toISOString(),
      };
      const { data: updated, error } = await admin.from('bb_settings').update(patch).eq('id', 1).select('*').maybeSingle();
      if (error) return json({ error: '儲存失敗' }, 500);

      let cleared = 0;
      if (pausedNow && String(s.paused_week || '') !== currentWeek) {
        const { data: clearedRows } = await admin.from('bb_registrations')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('week_key', currentWeek).eq('status', 'active')
          .select('id');
        cleared = (clearedRows || []).length;
      }

      return json({ ok: true, settings: updated, cleared });
    }

    const week = String(body.week || weekKeyOf(computeWeek(Date.now())));

    if (action === 'roster') {
      const { data, error } = await admin.from('bb_registrations')
        .select('id,name,phone,note,status,created_at,cancelled_at,is_company')
        .eq('week_key', week).order('created_at', { ascending: true });
      if (error) return json({ error: '讀取名單失敗' }, 500);
      const active = orderRows((data || []).filter((r) => r.status === 'active'), s.company_priority ?? 0);
      return json({
        week,
        settings: s,
        rows: (data || []).map((r) => {
          const idx = active.findIndex((a) => a.id === r.id);
          return {
            ...r,
            is_company: r.is_company === true,
            position: idx >= 0 ? idx + 1 : 0,
            bucket: r.status === 'cancelled' ? 'cancelled' : idx + 1 <= s.capacity ? 'confirmed' : 'waitlist',
          };
        }),
      });
    }

    if (action === 'add-entry') {
      const name = String(body.name || '').trim().slice(0, 40);
      const phone = normalizePhone(body.phone);
      const note = String(body.note || '').trim().slice(0, 200);
      const isCompany = body.is_company === true || body.is_company === 'true';
      if (!name) return json({ error: '請填寫姓名' }, 400);
      if (!PHONE_RE.test(phone)) return json({ error: '手機號碼格式不正確，請輸入 09 開頭共 10 碼' }, 400);
      const { data: dup } = await admin.from('bb_registrations')
        .select('id').eq('week_key', week).eq('phone', phone).eq('status', 'active').maybeSingle();
      if (dup) return json({ error: '此手機號碼本週已在名單中' }, 400);
      const { error } = await admin.from('bb_registrations').insert({ week_key: week, name, phone, note: note || null, is_company: isCompany });
      if (error) return json({ error: '新增失敗' }, 500);
      return json({ ok: true });
    }

    if (action === 'set-company') {
      const id = String(body.id || '');
      if (!id) return json({ error: '缺少名單編號' }, 400);
      const isCompany = body.is_company === true || body.is_company === 'true';
      const { error } = await admin.from('bb_registrations')
        .update({ is_company: isCompany }).eq('id', id).eq('week_key', week);
      if (error) return json({ error: '更新失敗' }, 500);
      return json({ ok: true });
    }

    if (action === 'remove-entry' || action === 'restore-entry') {
      const id = String(body.id || '');
      if (!id) return json({ error: '缺少名單編號' }, 400);
      const patch = action === 'remove-entry'
        ? { status: 'cancelled', cancelled_at: new Date().toISOString() }
        : { status: 'active', cancelled_at: null };
      const { error } = await admin.from('bb_registrations').update(patch).eq('id', id).eq('week_key', week);
      if (error) return json({ error: '更新失敗' }, 500);
      return json({ ok: true });
    }

    return json({ error: '未知的操作' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || '伺服器錯誤' }, 500);
  }
});
