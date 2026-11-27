import { supabase } from '@/lib/supabase';

const TOKEN_KEY = 'bb_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function callAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('bb-admin', {
    body: { ...body, token: getToken() },
  });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = await ctx.json();
        if (parsed?.error) msg = parsed.error;
      }
    } catch {
      // ignore
    }
    throw new Error(msg || '連線失敗');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export interface AdminSettings {
  event_title: string;
  event_location: string;
  event_time_text: string;
  open_weekday: number;
  open_time: string;
  close_weekday: number;
  close_time: string;
  status_override: 'auto' | 'open' | 'closed';
  capacity: number;
  waitlist_enabled: boolean;
  waitlist_limit: number;
  auto_promote: boolean;
  company_priority: number;
  paused_week?: string | null;
}

export interface AdminRow {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  status: 'active' | 'cancelled';
  created_at: string;
  cancelled_at: string | null;
  is_company: boolean;
  position: number;
  bucket: 'confirmed' | 'waitlist' | 'cancelled';
}

export interface RosterResult {
  week: string;
  settings: AdminSettings;
  rows: AdminRow[];
}

export const loginStatus = () => callAdmin<{ initialized: boolean }>({ action: 'login-status' });
export const login = (password: string) => callAdmin<{ ok: boolean; token: string }>({ action: 'login', password });
export const setup = (password: string) => callAdmin<{ ok: boolean; token: string }>({ action: 'setup', password });
export const changePassword = (newPassword: string) => callAdmin<{ ok: boolean }>({ action: 'change-password', newPassword });
export const fetchRoster = (week: string) => callAdmin<RosterResult>({ action: 'roster', week });
export const saveSettings = (settings: Partial<AdminSettings> & { paused?: boolean }) => callAdmin<{ ok: boolean; settings: AdminSettings; cleared?: number }>({ action: 'save-settings', settings });
export const addEntry = (week: string, name: string, phone: string, note: string, isCompany = false) => callAdmin<{ ok: boolean }>({
  action: 'add-entry', week, name, phone, note, is_company: isCompany,
});
export const removeEntry = (week: string, id: string) => callAdmin<{ ok: boolean }>({ action: 'remove-entry', week, id });
export const setEntryCompany = (week: string, id: string, isCompany: boolean) => callAdmin<{ ok: boolean }>({
  action: 'set-company', week, id, is_company: isCompany,
});
export const restoreEntry = (week: string, id: string) => callAdmin<{ ok: boolean }>({ action: 'restore-entry', week, id });

export const currentWeekKey = () => {
  const t = new Date(Date.now() + 8 * 3600 * 1000);
  const iso = (t.getUTCDay() + 6) % 7;
  const monday = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - iso * 86400000;
  const d = new Date(monday);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: '週一' },
  { value: 2, label: '週二' },
  { value: 3, label: '週三' },
  { value: 4, label: '週四' },
  { value: 5, label: '週五' },
  { value: 6, label: '週六' },
  { value: 7, label: '週日' },
];