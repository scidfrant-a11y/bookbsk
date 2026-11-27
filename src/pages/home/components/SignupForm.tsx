import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { register, saveMyReg, formatTaipei } from '@/lib/bbApi';
import type { Board, RegisterResult } from '@/lib/bbApi';

interface Props { board: Board | null; onDone: () => void }

export default function SignupForm({ board, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [noteLen, setNoteLen] = useState(0);
  const [kind, setKind] = useState<'company' | 'guest' | ''>('');

  const state = board?.window.state;
  const cap = board?.settings.capacity || 0;
  const confirmedCount = board?.confirmed.length || 0;
  const waitCount = board?.waitlist.length || 0;
  const isFull = confirmedCount >= cap;
  const waitFull = !board?.settings.waitlist_enabled || waitCount >= (board?.settings.waitlist_limit || 0);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const trap = String(fd.get('contact_alt') || '').trim();
    const name = String(fd.get('name') || '').trim();
    const phone = String(fd.get('phone') || '').replace(/\D/g, '');
    const note = String(fd.get('note') || '').trim();
    const isCompany = String(fd.get('kind') || '') === 'company';
    setFormError('');
    if (trap) {
      setResult({ ok: true, id: '', cancel_token: '', name, phone, status: 'confirmed', position: 0 });
      return;
    }
    if (!name) { setFormError('請填寫姓名'); return; }
    if (!/^09\d{8}$/.test(phone)) { setFormError('請輸入正確的手機號碼（09 開頭共 10 碼）'); return; }
    if (!kind) { setFormError('請選擇身分類別（公司員工或一般球友）'); return; }
    if (note.length > 200) { setFormError('備註最多 200 字'); return; }
    setSubmitting(true);
    try {
      const r = await register(name, phone, note, isCompany);
      setResult(r);
      if (r.cancel_token) saveMyReg({ token: r.cancel_token, name: r.name, week: board?.window.weekKey || '' });
      formEl.reset();
      setNoteLen(0);
      setKind('');
      onDone();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const closedBox = (
    <div className="rounded-lg bg-background-100 border border-background-200 p-6 md:p-8 text-center">
      <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-800">
        <i className={`text-2xl ${state === 'paused' ? 'ri-pause-circle-line' : state === 'upcoming' ? 'ri-hourglass-line' : 'ri-lock-line'}`} />
      </div>
      <h3 className="font-heading text-xl mt-4">
        {state === 'paused' ? '本週暫停一次' : state === 'upcoming' ? '報名尚未開放' : '本週報名已截止'}
      </h3>
      {state === 'paused' ? (
        <>
          <p className="text-sm text-foreground-600 mt-2">本週球局暫停一次，下週恢復正常報名。</p>
          {board && <p className="text-xs text-foreground-500 mt-1">下次開放：{formatTaipei(board.window.nextOpenAt)}</p>}
        </>
      ) : (
        <>
          <p className="text-sm text-foreground-600 mt-2">
            {board ? `下次開放時間：${formatTaipei(board.window.nextOpenAt)}` : '載入中…'}
          </p>
          <p className="text-xs text-foreground-500 mt-1">名單仍可在下方即時查看，已報名者可隨時取消</p>
        </>
      )}
    </div>
  );

  return (
    <section id="signup" className="bg-background-100 py-14 md:py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        <div className="lg:col-span-2">
          <span className="text-xs font-label text-primary-600 tracking-widest">SIGN UP</span>
          <h2 className="font-heading text-2xl md:text-4xl mt-2">報名本週球局</h2>
          <p className="text-sm text-foreground-600 mt-4 leading-relaxed">
            填寫姓名與手機即可完成報名。{board && board.settings.company_priority > 0 ? `宜鼎員工優先 ${board.settings.company_priority} 位，其餘依報名順序補位。` : '依報名順序排定順位。'}
          </p>
          <div className="mt-4 flex gap-2.5 rounded-md bg-accent-100 border border-accent-200 px-4 py-3">
            <span className="w-5 h-5 shrink-0 flex items-center justify-center text-accent-800 mt-0.5">
              <i className="ri-information-line text-base" />
            </span>
            <p className="text-xs md:text-sm text-accent-900 leading-relaxed">
              此報名系統為 Line 群球友專屬，若有球友想加入請務必通知社長，請勿擅自分享此連結，謝謝配合！
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-lg bg-background-50 border border-background-200 p-4">
              <div className="text-xs text-foreground-500">正取名額</div>
              <div className="font-heading text-3xl mt-1">{confirmedCount}<span className="text-base text-foreground-400"> / {cap}</span></div>
              <div className="h-1.5 rounded-full bg-background-200 mt-3 overflow-hidden">
                <div className="h-full bg-primary-500 transition-all" style={{ width: `${cap ? Math.min(100, (confirmedCount / cap) * 100) : 0}%` }} />
              </div>
            </div>
            <div className="rounded-lg bg-accent-100 border border-accent-200 p-4">
              <div className="text-xs text-accent-800">候補人數</div>
              <div className="font-heading text-3xl mt-1 text-accent-900">{waitCount}<span className="text-base text-accent-700"> / {board?.settings.waitlist_enabled ? board.settings.waitlist_limit : 0}</span></div>
              <div className="text-xs text-accent-800 mt-3">{board?.settings.waitlist_enabled ? '開放候補中' : '本週不開放候補'}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 min-w-0">
          {result ? (
            <div className="rounded-lg bg-background-50 border border-background-200 p-6 md:p-8 anim-fade-up">
              <div className={`w-14 h-14 flex items-center justify-center rounded-full ${result.status === 'confirmed' ? 'bg-secondary-100 text-secondary-700' : 'bg-accent-100 text-accent-800'}`}>
                <i className="ri-check-double-line text-2xl" />
              </div>
              <h3 className="font-heading text-2xl mt-4">{result.status === 'confirmed' ? '報名成功！你是正取' : '已加入候補名單'}</h3>
              <p className="text-sm text-foreground-600 mt-2">
                {result.name}，你目前是{result.status === 'confirmed' ? '正取' : '候補'}第 <strong className="text-primary-600">{result.position}</strong> 位。
              </p>
              {result.cancel_token && (
                <div className="mt-5 rounded-md bg-background-100 p-4 text-sm text-foreground-700">
                  臨時無法參加？可以到「我的報名」或透過下方連結取消，名額會自動釋出給候補。
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/cancel?token=${result.cancel_token}`} className="px-4 py-2 rounded-md border border-background-300 hover:bg-background-200 text-sm whitespace-nowrap cursor-pointer">
                      管理 / 取消報名
                    </Link>
                    <button type="button" onClick={() => setResult(null)} className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-background-50 text-sm whitespace-nowrap cursor-pointer">
                      幫朋友報名
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : state !== 'open' ? closedBox : (
            <form id="bb-signup-form" onSubmit={handleSubmit} className="relative rounded-lg bg-background-50 border border-background-200 p-5 md:p-8 space-y-5">
              <input type="text" name="contact_alt" className="reg-extra-field" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly onFocus={(ev) => ev.currentTarget.removeAttribute('readonly')} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block min-w-0">
                  <span className="text-sm font-label text-foreground-800">姓名 *</span>
                  <input name="name" maxLength={40} placeholder="例如：陳冠宇" className="mt-1.5 w-full box-border px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </label>
                <label className="block min-w-0">
                  <span className="text-sm font-label text-foreground-800">手機號碼 *</span>
                  <input name="phone" type="tel" inputMode="numeric" maxLength={14} placeholder="0912345678" className="mt-1.5 w-full box-border px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </label>
              </div>
              <div className="min-w-0">
                <span className="text-sm font-label text-foreground-800">身分類別 *</span>
                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { v: 'company' as const, label: '公司員工', desc: '宜鼎員工，享優先順位', icon: 'ri-building-2-line' },
                    { v: 'guest' as const, label: '一般球友', desc: '依報名順序排位', icon: 'ri-user-line' },
                  ]).map((o) => (
                    <label
                      key={o.v}
                      className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer transition-colors ${kind === o.v ? 'border-primary-400 bg-primary-50' : 'border-background-300 bg-background-50 hover:bg-background-100'}`}
                    >
                      <input
                        type="radio"
                        name="kind"
                        value={o.v}
                        checked={kind === o.v}
                        onChange={() => setKind(o.v)}
                        className="mt-1 accent-primary-500 cursor-pointer"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-foreground-900">
                          <i className={`${o.icon} text-foreground-500`} />{o.label}
                        </span>
                        <span className="block text-xs text-foreground-500 mt-0.5">{o.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-sm font-label text-foreground-800">備註（選填）</span>
                <textarea name="note" maxLength={200} rows={3} onChange={(ev) => setNoteLen(ev.target.value.length)} placeholder="例如：會晚 15 分鐘到、可以帶一顆球" className="mt-1.5 w-full box-border px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400" />
                <span className="block text-right text-xs text-foreground-400">{noteLen}/200</span>
              </label>
              {isFull && (
                <div className="rounded-md bg-accent-100 text-accent-900 text-sm px-4 py-3">
                  <i className="ri-information-line mr-1" />
                  {waitFull ? '名額與候補皆已額滿，暫時無法報名。' : '正取已額滿，送出後將自動排入候補。'}
                </div>
              )}
              {formError && (
                <div className="rounded-md bg-primary-100 text-primary-800 text-sm px-4 py-3"><i className="ri-error-warning-line mr-1" />{formError}</div>
              )}
              <button type="submit" disabled={submitting || (isFull && waitFull)} className="w-full py-3 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-background-50 text-sm font-label whitespace-nowrap cursor-pointer">
                {submitting ? '送出中…' : isFull ? '加入候補' : '確認報名'}
              </button>
              <p className="text-xs text-foreground-500 text-center">送出後可用「我的報名」隨時查看狀態或取消</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}