import { supabase } from '@/lib/supabase';

export type WindowState = 'open' | 'upcoming' | 'closed' | 'paused';

export interface BoardSettings {
  event_title: string;
  event_location: string;
  event_time_text: string;
  capacity: number;
  waitlist_enabled: boolean;
  waitlist_limit: number;
  open_weekday: number;
  open_time: string;
  close_weekday: number;
  close_time: string;
  paused_week?: string | null;
  company_priority: number;
}

export interface BoardWindow {
  now: number;
  weekKey: string;
  openAt: number;
  closeAt: number;
  nextOpenAt: number;
  state: WindowState;
}

export interface Entry {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  is_company: boolean;
  position: number;
}

export interface Board {
  settings: BoardSettings;
  window: BoardWindow;
  confirmed: Entry[];
  waitlist: Entry[];
  cancelledCount: number;
}

export interface RegisterResult {
  ok: boolean;
  id: string;
  cancel_token: string;
  name: string;
  phone: string;
  status: 'confirmed' | 'waitlist';
  is_company?: boolean;
  position: number;
}

export interface CancelResult {
  ok: boolean;
  promoted?: string | null;
}

export interface LookupResult {
  registration: {
    name: string;
    phone: string;
    week_key: string;
    status: 'confirmed' | 'waitlist' | 'cancelled';
    position: number;
    created_at: string;
  };
  isCurrentWeek: boolean;
  settings: { event_title: string; event_time_text: string; event_location: string };
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('bb-public', { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = await ctx.json();
        if (parsed?.error) msg = parsed.error;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(msg || '連線失敗');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const fetchBoard = () => call<Board>({ action: 'status' });

export const register = (name: string, phone: string, note: string, isCompany: boolean) => call<RegisterResult>({
  action: 'register', name, phone, note, is_company: isCompany,
});
export const lookup = (token: string) => call<LookupResult>({ action: 'lookup', token });
export const cancelReg = (token: string) => call<CancelResult>({ action: 'cancel', token });

export const WEEKDAYS = ['', '週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export const formatTaipei = (ms: number | string) => new Date(ms).toLocaleString('zh-TW', {
  timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

const STORE_KEY = 'bb_my_regs';
export interface MyReg { token: string; name: string; week: string }

export const getMyRegs = (): MyReg[] => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') as MyReg[];
  } catch {
    return [];
  }
};
export const saveMyReg = (r: MyReg) => {
  const list = getMyRegs().filter((x) => x.token !== r.token);
  list.unshift(r);
  localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 10)));
};
export const removeMyReg = (token: string) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(getMyRegs().filter((x) => x.token !== token)));
};