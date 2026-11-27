import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { saveSettings, WEEKDAY_OPTIONS, currentWeekKey } from '@/lib/adminApi';
import type { AdminSettings } from '@/lib/adminApi';

interface Props { settings: AdminSettings; onSaved: (s: AdminSettings) => void }

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block min-w-0">
    <span className="text-sm text-foreground-800">{label}</span>
    {children}
    {hint && <span className="block text-xs text-foreground-500 mt-1">{hint}</span>}
  </label>
);

const inputCls = 'mt-1.5 w-full box-border px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400';

export default function SettingsPanel({ settings, onSaved }: Props) {
  const [form, setForm] = useState<AdminSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  const weekKey = currentWeekKey();
  const pausedThisWeek = (form.paused_week || '') === weekKey;

  useEffect(() => { setForm(settings); }, [settings]);

  const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const r = await saveSettings({ ...form, paused: pausedThisWeek });
      onSaved(r.settings);
      setMsg(r.cleared ? `設定已儲存，本週名單已清空（${r.cleared} 筆移到已取消，可手動恢復）` : '設定已儲存，前台會立即生效');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cap = Number(form.capacity) || 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-background-50 border border-background-200 p-5 md:p-6">
        <h3 className="font-heading text-lg flex items-center gap-2"><span className="w-8 h-8 flex items-center justify-center rounded-md bg-primary-500 text-background-50"><i className="ri-calendar-event-line" /></span>活動基本資訊</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Field label="活動名稱"><input className={inputCls} value={form.event_title} onChange={(e) => set('event_title', e.target.value)} /></Field>
          <Field label="地點"><input className={inputCls} value={form.event_location} onChange={(e) => set('event_location', e.target.value)} /></Field>
          <Field label="打球時間描述"><input className={inputCls} value={form.event_time_text} onChange={(e) => set('event_time_text', e.target.value)} /></Field>
        </div>
      </div>

      <div className="rounded-lg bg-background-50 border border-background-200 p-5 md:p-6">
        <h3 className="font-heading text-lg flex items-center gap-2"><span className="w-8 h-8 flex items-center justify-center rounded-md bg-accent-500 text-foreground-950"><i className="ri-timer-line" /></span>開放與截止時間</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Field label="開放日">
            <select className={inputCls} value={form.open_weekday} onChange={(e) => set('open_weekday', Number(e.target.value))}>
              {WEEKDAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="開放時間"><input type="time" className={inputCls} value={form.open_time} onChange={(e) => set('open_time', e.target.value)} /></Field>
          <Field label="截止日">
            <select className={inputCls} value={form.close_weekday} onChange={(e) => set('close_weekday', Number(e.target.value))}>
              {WEEKDAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="截止時間"><input type="time" className={inputCls} value={form.close_time} onChange={(e) => set('close_time', e.target.value)} /></Field>
        </div>
        <div className="mt-4">
          <span className="text-sm text-foreground-800">現在狀態</span>
          <div className="mt-1.5 inline-flex gap-1 p-1 rounded-full bg-background-100 border border-background-200">
            {([['auto', '依時間自動'], ['open', '強制開放'], ['closed', '強制關閉']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => set('status_override', k)} className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap cursor-pointer ${form.status_override === k ? 'bg-foreground-950 text-background-50' : 'text-foreground-600'}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-foreground-500 mt-2">臨時要加開或收單時，可切成強制開放或強制關閉。</p>
        </div>

        <div className="mt-5 rounded-md border border-background-200 bg-background-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-foreground-800 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-accent-100 text-accent-800"><i className="ri-pause-circle-line" /></span>
                本週暫停
              </div>
              <p className="text-xs text-foreground-500 mt-1 leading-relaxed">
                開啟後本週（{weekKey}）停止報名，前台報名區塊會顯示「本週暫停一次」，下週自動恢復正常。
              </p>
            </div>
            <button
              type="button"
              onClick={() => (pausedThisWeek ? set('paused_week', null) : setShowPauseConfirm(true))}
              className={`shrink-0 px-4 py-2 rounded-md text-sm whitespace-nowrap cursor-pointer ${pausedThisWeek ? 'bg-background-50 border border-background-300 text-foreground-700' : 'bg-primary-500 hover:bg-primary-600 text-background-50'}`}
            >
              {pausedThisWeek ? '取消暫停，恢復報名' : '暫停本週球局'}
            </button>
          </div>
          {pausedThisWeek && !showPauseConfirm && (
            <p className="text-xs text-primary-700 mt-2"><i className="ri-information-line mr-1" />目前狀態：本週已暫停，記得按下方「儲存設定」才會生效。</p>
          )}
          {showPauseConfirm && (
            <div className="mt-3 rounded-md bg-background-50 border border-accent-300 p-3">
              <p className="text-xs text-foreground-700 leading-relaxed">
                確定要暫停本週嗎？本週已報名的名單會全部清空（移到「已取消」，之後可在名單頁手動恢復），球友下週需要重新報名。
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" onClick={() => setShowPauseConfirm(false)} className="px-3 py-1.5 rounded-md border border-background-300 text-xs whitespace-nowrap cursor-pointer">再想想</button>
                <button
                  type="button"
                  onClick={() => { set('paused_week', weekKey); setShowPauseConfirm(false); }}
                  className="px-3 py-1.5 rounded-md bg-primary-500 hover:bg-primary-600 text-background-50 text-xs whitespace-nowrap cursor-pointer"
                >
                  確認暫停本週
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-background-50 border border-background-200 p-5 md:p-6">
        <h3 className="font-heading text-lg flex items-center gap-2"><span className="w-8 h-8 flex items-center justify-center rounded-md bg-secondary-500 text-background-50"><i className="ri-team-line" /></span>名額與候補規則</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Field label="正取人數上限" hint="調高或調低後，名單會依報名順序自動重新排序。">
            <div className="mt-1.5 flex items-center gap-2">
              <button type="button" aria-label="減少名額" onClick={() => set('capacity', Math.max(1, cap - 1))} className="w-10 h-10 flex items-center justify-center rounded-md border border-background-300 hover:bg-background-100 cursor-pointer"><i className="ri-subtract-line" /></button>
              <input type="number" min={1} max={200} className="w-full box-border px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-400" value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} />
              <button type="button" aria-label="增加名額" onClick={() => set('capacity', Math.min(200, cap + 1))} className="w-10 h-10 flex items-center justify-center rounded-md border border-background-300 hover:bg-background-100 cursor-pointer"><i className="ri-add-line" /></button>
            </div>
          </Field>
          <Field label="候補人數上限">
            <input type="number" min={0} max={200} className={inputCls} value={form.waitlist_limit} onChange={(e) => set('waitlist_limit', Number(e.target.value))} />
          </Field>
          <Field label="員工優先順位" hint="公司員工優先排前 N 位，其餘依報名順序補位；設 0 即取消員工優先。">
            <input type="number" min={0} max={200} className={inputCls} value={form.company_priority ?? 0} onChange={(e) => set('company_priority', Math.max(0, Number(e.target.value) || 0))} />
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          <button type="button" onClick={() => set('waitlist_enabled', !form.waitlist_enabled)} className="flex items-center gap-3 text-sm cursor-pointer">
            <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${form.waitlist_enabled ? 'bg-secondary-500' : 'bg-background-300'}`}>
              <span className={`block w-5 h-5 rounded-full bg-background-50 transition-transform ${form.waitlist_enabled ? 'translate-x-5' : ''}`} />
            </span>
            開放候補機制
          </button>
          <button type="button" onClick={() => set('auto_promote', !form.auto_promote)} className="flex items-center gap-3 text-sm cursor-pointer">
            <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${form.auto_promote ? 'bg-secondary-500' : 'bg-background-300'}`}>
              <span className={`block w-5 h-5 rounded-full bg-background-50 transition-transform ${form.auto_promote ? 'translate-x-5' : ''}`} />
            </span>
            有人取消時，候補自動遞補為正取
          </button>
        </div>
      </div>

      {msg && <div className="rounded-md bg-secondary-100 text-secondary-900 text-sm px-4 py-2.5"><i className="ri-checkbox-circle-line mr-1" />{msg}</div>}
      {error && <div className="rounded-md bg-primary-50 text-primary-800 text-sm px-4 py-2.5">{error}</div>}

      <div className="sticky bottom-0 bg-background-50/95 backdrop-blur border-t border-background-200 py-3 flex justify-end gap-2">
        <button type="button" onClick={() => setForm(settings)} className="px-5 py-2.5 rounded-md border border-background-300 text-sm whitespace-nowrap cursor-pointer">還原</button>
        <button type="button" onClick={submit} disabled={saving} className="px-6 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-background-50 text-sm whitespace-nowrap cursor-pointer">{saving ? '儲存中…' : '儲存設定'}</button>
      </div>
    </div>
  );
}