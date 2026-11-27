import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { lookup, cancelReg, removeMyReg, formatTaipei } from '@/lib/bbApi';
import type { LookupResult } from '@/lib/bbApi';

const statusMap = {
  confirmed: { label: '正取', cls: 'bg-secondary-100 text-secondary-900' },
  waitlist: { label: '候補', cls: 'bg-accent-100 text-accent-900' },
  cancelled: { label: '已取消', cls: 'bg-background-200 text-foreground-700' },
};

export default function CancelPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [data, setData] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);
  const [promoted, setPromoted] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await lookup(token));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const doCancel = async () => {
    setWorking(true);
    try {
      const r = await cancelReg(token);
      setPromoted(r.promoted || null);
      removeMyReg(token);
      setDone(true);
      setConfirming(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const reg = data?.registration;

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      <Navbar solid />
      <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
        <div className="max-w-xl mx-auto">
          <Link to="/" className="text-sm text-foreground-600 hover:text-primary-600 cursor-pointer"><i className="ri-arrow-left-line mr-1" />回報名首頁</Link>
          <h1 className="font-heading text-2xl md:text-4xl mt-4">我的報名狀態</h1>
          <div className="mt-6 rounded-lg bg-background-100 border border-background-200 p-6 md:p-8">
            {loading && !data ? (
              <p className="text-sm text-foreground-500 text-center py-8"><i className="ri-loader-4-line animate-spin mr-2" />載入中…</p>
            ) : error && !data ? (
              <div className="text-center py-6">
                <p className="text-sm text-primary-700">{error}</p>
                <button type="button" onClick={load} className="mt-4 px-5 py-2 rounded-md bg-primary-500 text-background-50 text-sm whitespace-nowrap cursor-pointer">重試</button>
              </div>
            ) : reg && data && (
              <>
                {done && (
                  <div className="mb-5 rounded-md bg-secondary-100 text-secondary-900 text-sm px-4 py-3">
                    <i className="ri-check-line mr-1" />已成功取消，名額已釋出給候補球友，謝謝你的通知！
                    {promoted && <span className="block mt-1 text-secondary-800">{promoted} 已遞補為正取。</span>}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-foreground-500">{data.settings.event_title}</div>
                    <div className="font-heading text-2xl mt-1">{reg.name}</div>
                    <div className="text-xs text-foreground-500 mt-1">{reg.phone}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${statusMap[reg.status].cls}`}>
                    {statusMap[reg.status].label}{reg.position ? ` 第 ${reg.position} 位` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-sm">
                  <div className="rounded-md bg-background-50 p-3"><div className="text-xs text-foreground-500">時間</div>{data.settings.event_time_text}</div>
                  <div className="rounded-md bg-background-50 p-3"><div className="text-xs text-foreground-500">地點</div>{data.settings.event_location}</div>
                  <div className="rounded-md bg-background-50 p-3"><div className="text-xs text-foreground-500">週次</div>{reg.week_key}</div>
                  <div className="rounded-md bg-background-50 p-3"><div className="text-xs text-foreground-500">報名時間</div>{formatTaipei(reg.created_at)}</div>
                </div>
                {error && <p className="mt-4 text-sm text-primary-700">{error}</p>}
                {reg.status !== 'cancelled' && (
                  confirming ? (
                    <div className="mt-6 rounded-md bg-primary-50 border border-primary-200 p-4">
                      <p className="text-sm text-primary-900">確定要取消這次報名嗎？取消後無法復原，需重新報名排隊。</p>
                      <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        <button type="button" disabled={working} onClick={doCancel} className="px-5 py-2 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-background-50 text-sm whitespace-nowrap cursor-pointer">
                          {working ? '處理中…' : '確定取消'}
                        </button>
                        <button type="button" onClick={() => setConfirming(false)} className="px-5 py-2 rounded-md border border-background-300 text-sm whitespace-nowrap cursor-pointer">我再想想</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirming(true)} className="mt-6 w-full py-3 rounded-md border border-primary-300 text-primary-700 hover:bg-primary-50 text-sm whitespace-nowrap cursor-pointer">
                      <i className="ri-close-circle-line mr-1" />臨時無法參加，取消報名
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}