import type { Board, Entry } from '@/lib/bbApi';
import { formatTaipei } from '@/lib/bbApi';

interface Props { board: Board | null; loading: boolean; error: string; onRetry: () => void }

function List({ items, tone, empty }: { items: Entry[]; tone: 'primary' | 'accent'; empty: string }) {
  if (!items.length) return <p className="text-sm text-foreground-500 py-10 text-center">{empty}</p>;
  return (
    <ul className="divide-y divide-background-200">
      {items.map((e, i) => (
        <li key={e.id} className="flex items-center gap-3 py-3">
          <span className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-xs font-heading ${tone === 'primary' ? 'bg-primary-100 text-primary-800' : 'bg-accent-100 text-accent-900'}`}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium truncate">{e.name}</span>
              {e.is_company && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-900 text-[10px] whitespace-nowrap">員工</span>
              )}
            </div>
            <div className="text-xs text-foreground-500 truncate">{e.phone}</div>
          </div>
          <span className="text-xs text-foreground-400 whitespace-nowrap hidden sm:block">{formatTaipei(e.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Roster({ board, loading, error, onRetry }: Props) {
  return (
    <section id="roster" className="bg-background-50 py-14 md:py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-label text-secondary-600 tracking-widest">LIVE ROSTER</span>
            <h2 className="font-heading text-2xl md:text-4xl mt-2">即時報名名單</h2>
            <p className="text-sm text-foreground-600 mt-2">
              名單每 10 秒自動更新；{board && board.settings.company_priority > 0 ? `宜鼎員工優先排前 ${board.settings.company_priority} 位，其餘依報名順序。` : ''}有人取消時，候補會依序自動遞補為正取。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-100 text-secondary-900 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 anim-pulse-dot" />即時同步
            </span>
            {board && <span className="px-3 py-1.5 rounded-full bg-background-100 text-foreground-700 whitespace-nowrap">週次：{board.window.weekKey}</span>}
            {board && <span className="px-3 py-1.5 rounded-full bg-background-100 text-foreground-700 whitespace-nowrap">已取消 {board.cancelledCount} 人</span>}
          </div>
        </div>

        {error && !board ? (
          <div className="rounded-lg bg-primary-50 border border-primary-200 p-8 text-center">
            <p className="text-sm text-primary-800">名單載入失敗：{error}</p>
            <button type="button" onClick={onRetry} className="mt-4 px-5 py-2 rounded-md bg-primary-500 text-background-50 text-sm whitespace-nowrap cursor-pointer">重新載入</button>
          </div>
        ) : loading && !board ? (
          <div className="py-16 text-center text-sm text-foreground-500"><i className="ri-loader-4-line animate-spin mr-2" />名單載入中…</div>
        ) : board && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg bg-background-100 border border-background-200 p-5 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-lg flex items-center gap-2">
                  <span className="w-8 h-8 flex items-center justify-center rounded-md bg-primary-500 text-background-50"><i className="ri-team-line" /></span>
                  正取名單
                </h3>
                <span className="text-sm text-foreground-600">{board.confirmed.length} / {board.settings.capacity}</span>
              </div>
              <List items={board.confirmed} tone="primary" empty="還沒有人報名，搶頭香吧！" />
            </div>
            <div className="rounded-lg bg-background-100 border border-background-200 p-5 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-lg flex items-center gap-2">
                  <span className="w-8 h-8 flex items-center justify-center rounded-md bg-accent-500 text-foreground-950"><i className="ri-time-line" /></span>
                  候補名單
                </h3>
                <span className="text-sm text-foreground-600">{board.waitlist.length} / {board.settings.waitlist_enabled ? board.settings.waitlist_limit : 0}</span>
              </div>
              <List items={board.waitlist} tone="accent" empty={board.settings.waitlist_enabled ? '目前沒有候補' : '本週不開放候補'} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}