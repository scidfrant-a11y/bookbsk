import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyRegs } from '@/lib/bbApi';
import type { MyReg } from '@/lib/bbApi';

export default function MyRegs({ refreshKey }: { refreshKey: number }) {
  const [list, setList] = useState<MyReg[]>([]);
  useEffect(() => { setList(getMyRegs()); }, [refreshKey]);

  return (
    <section id="my" className="bg-background-50 py-14 md:py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <span className="text-xs font-label text-secondary-600 tracking-widest">MY SIGN-UPS</span>
          <h2 className="font-heading text-2xl md:text-4xl mt-2">我的報名 / 取消</h2>
          <p className="text-sm text-foreground-600 mt-3 leading-relaxed">
            在這台裝置上的報名會顯示在這裡。換了裝置的話，請改用報名完成時取得的專屬取消連結。
          </p>
        </div>
        <div className="lg:col-span-2">
          {list.length === 0 ? (
            <div className="rounded-lg bg-background-100 border border-dashed border-background-300 p-8 text-center">
              <i className="ri-inbox-line text-3xl text-foreground-400" />
              <p className="text-sm text-foreground-600 mt-2">這台裝置上還沒有報名紀錄</p>
              <a href="#signup" className="inline-block mt-4 px-5 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-background-50 text-sm whitespace-nowrap cursor-pointer">前往報名</a>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((r) => (
                <li key={r.token} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-background-100 border border-background-200 p-4">
                  <span className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary-100 text-secondary-800"><i className="ri-user-3-line" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-foreground-500">週次 {r.week}</div>
                  </div>
                  <Link to={`/cancel?token=${r.token}`} className="px-4 py-2 rounded-md border border-background-300 hover:bg-background-200 text-sm whitespace-nowrap cursor-pointer text-center">
                    查看狀態 / 取消
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}