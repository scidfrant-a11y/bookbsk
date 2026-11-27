import type { Board } from '@/lib/bbApi';
import { WEEKDAYS } from '@/lib/bbApi';

export default function Rules({ board }: { board: Board | null }) {
  const s = board?.settings;
  const steps = [
    { icon: 'ri-door-open-line', title: '準時開放', desc: `${s ? WEEKDAYS[s.open_weekday] : '週一'} ${s?.open_time || '12:00'} 自動開放報名，先搶先贏。` },
    { icon: 'ri-edit-2-line', title: '填寫資料', desc: '留下姓名、手機與身分類別，送出後立即知道正取或候補順位。' },
    { icon: 'ri-list-check-2', title: '即時名單', desc: '送出後名單立即更新，隨時看得到自己的順位與候補狀態。' },
    { icon: 'ri-lock-2-line', title: '準時截止', desc: `${s ? WEEKDAYS[s.close_weekday] : '週三'} ${s?.close_time || '18:00'} 截止，名單確定後準備開打。` },
  ];
  const rules = [
    '每個手機號碼每週限報名一次，幫朋友報名請使用對方的號碼。',
    `正取名額 ${s?.capacity ?? 20} 人，額滿後${s?.waitlist_enabled ? `開放 ${s.waitlist_limit} 位候補` : '不開放候補'}。`,
    ...(s?.company_priority ? [`宜鼎員工優先 ${s.company_priority} 位，其餘（含超出名額的員工）依報名順序補位。`] : []),
    '有人取消時，候補第一位自動遞補為正取。',
    '臨時無法參加請盡早取消，把位置留給其他球友。',
    '名額可能依場地狀況調整，名單會即時重新排序。',
  ];

  return (
    <section id="rules" className="bg-background-100 py-14 md:py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <span className="text-xs font-label text-primary-600 tracking-widest">HOW IT WORKS</span>
        <h2 className="font-heading text-2xl md:text-4xl mt-2">報名流程與規則</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {steps.map((st, i) => (
            <div key={st.title} className="rounded-lg bg-background-50 border border-background-200 p-5">
              <div className="flex items-center justify-between">
                <span className="w-11 h-11 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-800"><i className={`${st.icon} text-xl`} /></span>
                <span className="font-heading text-3xl text-background-300">0{i + 1}</span>
              </div>
              <h3 className="font-heading text-lg mt-4">{st.title}</h3>
              <p className="text-sm text-foreground-600 mt-1 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 items-stretch">
          <div className="rounded-lg overflow-hidden h-64 lg:h-auto min-h-64">
            <img
              src="https://readdy.ai/api/search-image?query=Stylized%20warm%20toned%20illustration%20of%20friends%20playing%20pickup%20basketball%20on%20an%20indoor%20wooden%20court%2C%20soft%20amber%20and%20cream%20background%2C%20dynamic%20motion%2C%20minimal%20graphic%20editorial%20style%20with%20clean%20composition&width=1200&height=800&seq=bb-rules-01&orientation=landscape"
              alt="球友一起打籃球"
              title="籃球團 報名規則"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="rounded-lg bg-background-50 border border-background-200 p-6">
            <h3 className="font-heading text-lg mb-4">注意事項</h3>
            <ul className="space-y-3">
              {rules.map((r) => (
                <li key={r} className="flex gap-3 text-sm text-foreground-700">
                  <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-accent-500 text-foreground-950 mt-0.5"><i className="ri-check-line text-xs" /></span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}