import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchRoster, addEntry, removeEntry, restoreEntry, setEntryCompany,
} from '@/lib/adminApi';
import type { AdminRow, RosterResult } from '@/lib/adminApi';

const bucketStyle = {
  confirmed: { label: '正取', cls: 'bg-secondary-100 text-secondary-900' },
  waitlist: { label: '候補', cls: 'bg-accent-100 text-accent-900' },
  cancelled: { label: '已取消', cls: 'bg-background-200 text-foreground-600' },
};

export default function RosterPanel({ onChanged }: { onChanged: () => void }) {
  const [params, setParams] = useSearchParams();
  const week = params.get('week') || '';
  const [data, setData] = useState<RosterResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', note: '', isCompany: false });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'waitlist' | 'cancelled'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchRoster(week);
      setData(r);
      if (!week) setParams({ week: r.week }, { replace: true });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [week, setParams]);

  useEffect(() => { load(); }, [load]);

  const shiftWeek = (days: number) => {
    const base = data?.week || week;
    if (!base) return;
    const d = new Date(`${base}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    setParams({ week: d.toISOString().slice(0, 10) });
  };

  const act = async (row: AdminRow) => {
    setBusyId(row.id);
    setMsg('');
    try {
      if (row.status === 'active') await removeEntry(data!.week, row.id);
      else await restoreEntry(data!.week, row.id);
      await load();
      onChanged();
      setMsg(row.status === 'active' ? `已取消 ${row.name} 的報名，候補名單已自動遞補` : `已恢復 ${row.name} 的報名`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId('');
    }
  };

  const toggleCompany = async (row: AdminRow) => {
    setBusyId(`c-${row.id}`);
    setMsg('');
    try {
      await setEntryCompany(data!.week, row.id, !row.is_company);
      await load();
      onChanged();
      setMsg(`已將 ${row.name} 的身份改為${row.is_company ? '一般球友' : '公司員工'}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId('');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setAdding(true);
    setMsg('');
    try {
      await addEntry(data.week, form.name, form.phone, form.note, form.isCompany);
      setForm({ name: '', phone: '', note: '', isCompany: false });
      await load();
      onChanged();
      setMsg('已手動加入一位球友');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['姓名', '身分', '手機', '備註', '狀態', '順位', '報名時間'],
      ...data.rows.map((r) => [r.name, r.is_company ? '公司員工' : '一般球友', r.phone || '', r.note || '', bucketStyle[r.bucket].label, String(r.position || ''), new Date(r.created_at).toLocaleString('zh-TW')]),
    ];
    const csv = `\uFEFF${rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `basketball-roster-${data.week}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = data ? data.rows.filter((r) => (filter === 'all' ? true : r.bucket === filter)) : [];
  const stats = data ? {
    confirmed: data.rows.filter((r) => r.bucket === 'confirmed').length,
    waitlist: data.rows.filter((r) => r.bucket === 'waitlist').length,
    cancelled: data.rows.filter((r) => r.bucket === 'cancelled').length,
    company: data.rows.filter((r) => r.status === 'active' && r.is_company).length,
  } : { confirmed: 0, waitlist: 0, cancelled: 0, company: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="上一週" onClick={() => shiftWeek(-7)} className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:bg-background-100 cursor-pointer"><i className="ri-arrow-left-s-line" /></button>
          <div className="px-3 py-2 rounded-md bg-background-50 border border-background-200 text-sm min-w-[140px] text-center">
            週次 {data?.week || week || '—'}
          </div>
          <button type="button" aria-label="下一週" onClick={() => shiftWeek(7)} className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:bg-background-100 cursor-pointer"><i className="ri-arrow-right-s-line" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className="px-4 py-2 rounded-md border border-background-300 hover:bg-background-100 text-sm whitespace-nowrap cursor-pointer"><i className="ri-refresh-line mr-1" />重新整理</button>
          <button type="button" onClick={exportCsv} className="px-4 py-2 rounded-md bg-secondary-500 hover:bg-secondary-600 text-background-50 text-sm whitespace-nowrap cursor-pointer"><i className="ri-download-2-line mr-1" />匯出 CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: '正取', value: `${stats.confirmed} / ${data?.settings.capacity ?? '-'}`, tone: 'bg-secondary-50 text-secondary-900 border-secondary-200' },
          { label: '候補', value: `${stats.waitlist} / ${data?.settings.waitlist_enabled ? data.settings.waitlist_limit : 0}`, tone: 'bg-accent-50 text-accent-900 border-accent-200' },
          { label: '已取消', value: String(stats.cancelled), tone: 'bg-background-50 text-foreground-800 border-background-200' },
          { label: '員工優先', value: `${stats.company} / ${data?.settings.company_priority ?? 0}`, tone: 'bg-background-50 text-foreground-800 border-background-200' },
          { label: '剩餘名額', value: String(Math.max(0, (data?.settings.capacity ?? 0) - stats.confirmed)), tone: 'bg-primary-50 text-primary-900 border-primary-200' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border p-4 ${c.tone}`}>
            <div className="text-xs opacity-80">{c.label}</div>
            <div className="font-heading text-2xl mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      {msg && <div className="rounded-md bg-secondary-100 text-secondary-900 text-sm px-4 py-2.5"><i className="ri-checkbox-circle-line mr-1" />{msg}</div>}
      {error && <div className="rounded-md bg-primary-50 text-primary-800 text-sm px-4 py-2.5">{error}</div>}

      <div className="rounded-lg bg-background-100 border border-background-200 p-4 md:p-5">
        <h3 className="font-heading text-base mb-3">手動加入球友</h3>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="姓名" className="min-w-0 px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" inputMode="numeric" placeholder="手機號碼（0912345678）" className="min-w-0 px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <select value={form.isCompany ? 'company' : 'guest'} onChange={(e) => setForm({ ...form, isCompany: e.target.value === 'company' })} className="min-w-0 px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer">
            <option value="guest">一般球友</option>
            <option value="company">公司員工</option>
          </select>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="備註（選填）" className="min-w-0 px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <button type="submit" disabled={adding} className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-background-50 text-sm whitespace-nowrap cursor-pointer">{adding ? '加入中…' : '加入名單'}</button>
        </form>
      </div>

      <div className="rounded-lg bg-background-50 border border-background-200 overflow-hidden">
        <div className="flex flex-wrap gap-1 p-2 border-b border-background-200">
          {([['all', '全部'], ['confirmed', '正取'], ['waitlist', '候補'], ['cancelled', '已取消']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap cursor-pointer ${filter === k ? 'bg-foreground-950 text-background-50' : 'text-foreground-600 hover:bg-background-100'}`}>
              {label}
            </button>
          ))}
        </div>
        {loading && !data ? (
          <div className="py-16 text-center text-sm text-foreground-500"><i className="ri-loader-4-line animate-spin mr-2" />載入名單…</div>
        ) : error && !data ? (
          <div className="py-10 text-center text-sm text-primary-700">{error}<button type="button" onClick={load} className="ml-2 underline cursor-pointer">重試</button></div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-sm text-foreground-500">這個週次還沒有報名資料</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-background-100 text-foreground-600 text-xs">
                <tr>
                  <th className="text-left font-normal px-4 py-3">順位</th>
                  <th className="text-left font-normal px-4 py-3">姓名</th>
                  <th className="text-left font-normal px-4 py-3">身分</th>
                  <th className="text-left font-normal px-4 py-3">手機</th>
                  <th className="text-left font-normal px-4 py-3">備註</th>
                  <th className="text-left font-normal px-4 py-3">狀態</th>
                  <th className="text-left font-normal px-4 py-3">報名時間</th>
                  <th className="text-right font-normal px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-200">
                {rows.map((r) => (
                  <tr key={r.id} className={r.status === 'cancelled' ? 'text-foreground-400' : ''}>
                    <td className="px-4 py-3 font-heading">{r.position || '—'}</td>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${r.is_company ? 'bg-secondary-100 text-secondary-900' : 'bg-background-100 text-foreground-600'}`}>
                        {r.is_company ? '公司員工' : '一般球友'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.phone || '—'}</td>
                    <td className="px-4 py-3 text-xs max-w-[180px] truncate">{r.note || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${bucketStyle[r.bucket].cls}`}>{bucketStyle[r.bucket].label}</span></td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button type="button" disabled={busyId === `c-${r.id}`} onClick={() => toggleCompany(r)} className="mr-1.5 px-2.5 py-1.5 rounded-md border border-background-300 text-foreground-600 hover:bg-background-100 text-xs whitespace-nowrap cursor-pointer">
                        {busyId === `c-${r.id}` ? '…' : r.is_company ? '改為一般' : '設為員工'}
                      </button>
                      <button type="button" disabled={busyId === r.id} onClick={() => act(r)} className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap cursor-pointer ${r.status === 'active' ? 'border border-primary-300 text-primary-700 hover:bg-primary-50' : 'border border-background-300 text-foreground-600 hover:bg-background-100'}`}>
                        {busyId === r.id ? '處理中…' : r.status === 'active' ? '取消報名' : '恢復'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}