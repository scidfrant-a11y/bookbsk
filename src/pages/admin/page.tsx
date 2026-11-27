import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoginGate from './components/LoginGate';
import RosterPanel from './components/RosterPanel';
import SettingsPanel from './components/SettingsPanel';
import AccountPanel from './components/AccountPanel';
import {
  loginStatus, fetchRoster, getToken, clearToken, WEEKDAY_OPTIONS,
} from '@/lib/adminApi';
import type { AdminSettings } from '@/lib/adminApi';

type Tab = 'roster' | 'settings' | 'account';
const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'roster', label: '名單管理', icon: 'ri-list-check-2' },
  { key: 'settings', label: '報名設定', icon: 'ri-settings-3-line' },
  { key: 'account', label: '帳號', icon: 'ri-shield-user-line' },
];

export default function AdminPage() {
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>('roster');
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [stat, setStat] = useState({ confirmed: 0, waitlist: 0, cancelled: 0, capacity: 0 });
  const [loadError, setLoadError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const r = await loginStatus();
      setInitialized(r.initialized);
    } catch {
      setInitialized(true);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const r = await fetchRoster('');
      setSettings(r.settings);
      setStat({
        confirmed: r.rows.filter((x) => x.bucket === 'confirmed').length,
        waitlist: r.rows.filter((x) => x.bucket === 'waitlist').length,
        cancelled: r.rows.filter((x) => x.bucket === 'cancelled').length,
        capacity: r.settings.capacity,
      });
      setAuthed(true);
      setLoadError('');
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('登入')) {
        setTokenMissing();
      } else {
        setLoadError(msg);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTokenMissing = () => {
    clearToken();
    setAuthed(false);
  };

  useEffect(() => {
    (async () => {
      await checkStatus();
      if (getToken()) await loadData();
    })();
  }, [checkStatus, loadData]);

  const onLogin = async () => {
    await loadData();
    setAuthed(true);
  };

  const logout = () => {
    clearToken();
    setAuthed(false);
    setSettings(null);
  };

  if (initialized === null) {
    return <div className="min-h-screen bg-background-100 flex items-center justify-center text-sm text-foreground-500"><i className="ri-loader-4-line animate-spin mr-2" />載入中…</div>;
  }

  if (!authed) {
    return <LoginGate initialized={initialized} onSuccess={onLogin} onRefresh={checkStatus} />;
  }

  const openDays = settings ? WEEKDAY_OPTIONS.find((w) => w.value === settings.open_weekday)?.label : '';
  const closeDays = settings ? WEEKDAY_OPTIONS.find((w) => w.value === settings.close_weekday)?.label : '';

  return (
    <div className="min-h-screen bg-background-100 flex flex-col">
      <header className="bg-background-50 border-b border-background-200 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="切換選單" onClick={() => setMenuOpen((v) => !v)} className="lg:hidden w-9 h-9 flex items-center justify-center cursor-pointer"><i className={`text-xl ${menuOpen ? 'ri-close-line' : 'ri-menu-line'}`} /></button>
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-500 text-background-50"><i className="ri-basketball-line" /></span>
              <span className="font-heading text-lg">HOOPS 管理後台</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:block text-sm text-foreground-600 hover:text-primary-600 whitespace-nowrap cursor-pointer"><i className="ri-external-link-line mr-1" />查看前台</Link>
            <button type="button" onClick={logout} className="px-3 py-1.5 rounded-md border border-background-300 text-sm whitespace-nowrap cursor-pointer hover:bg-background-100">登出</button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className={`${menuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-56 shrink-0 bg-background-50 border-r border-background-200 p-3`}>
          <nav className="flex flex-col gap-1">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => { setTab(t.key); setMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm whitespace-nowrap cursor-pointer text-left ${tab === t.key ? 'bg-primary-500 text-background-50' : 'text-foreground-700 hover:bg-background-100'}`}>
                <span className={`w-6 h-6 flex items-center justify-center ${tab === t.key ? 'text-background-50' : 'text-foreground-500'}`}><i className={t.icon} /></span>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 rounded-md bg-background-100 p-3 text-xs text-foreground-600 leading-relaxed">
            <div className="font-medium text-foreground-800 mb-1">目前時程</div>
            開放：{openDays} {settings?.open_time}<br />
            截止：{closeDays} {settings?.close_time}<br />
            正取上限：{settings?.capacity} 人
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 md:p-8">
          <div className="max-w-5xl">
            <div className="mb-6">
              <h1 className="font-heading text-2xl md:text-3xl">{tabs.find((t) => t.key === tab)?.label}</h1>
              <p className="text-sm text-foreground-600 mt-1">
                {tab === 'roster' && '即時查看正取、候補與取消名單，可手動增減與匯出。'}
                {tab === 'settings' && '調整開放與截止時間、名額上限與候補規則，儲存後前台立即生效。'}
                {tab === 'account' && '管理後台登入密碼與登出。'}
              </p>
            </div>

            {tab !== 'roster' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: '正取', value: `${stat.confirmed}/${stat.capacity}` },
                  { label: '候補', value: String(stat.waitlist) },
                  { label: '已取消', value: String(stat.cancelled) },
                  { label: '剩餘名額', value: String(Math.max(0, stat.capacity - stat.confirmed)) },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg bg-background-50 border border-background-200 p-3">
                    <div className="text-xs text-foreground-500">{c.label}</div>
                    <div className="font-heading text-xl mt-0.5">{c.value}</div>
                  </div>
                ))}
              </div>
            )}

            {loadError && (
              <div className="mb-4 rounded-md bg-primary-50 text-primary-800 text-sm px-4 py-2.5">
                {loadError}
                <button type="button" onClick={loadData} className="ml-2 underline cursor-pointer">重試</button>
              </div>
            )}

            {tab === 'roster' && <RosterPanel onChanged={loadData} />}
            {tab === 'settings' && settings && <SettingsPanel settings={settings} onSaved={setSettings} />}
            {tab === 'account' && <AccountPanel onLogout={logout} />}
            {tab !== 'roster' && !settings && (
              <div className="rounded-lg bg-background-50 border border-background-200 p-10 text-center text-sm text-foreground-500">
                <i className="ri-loader-4-line animate-spin mr-2" />設定載入中，請稍候…
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}