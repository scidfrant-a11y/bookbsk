import { useState } from 'react';
import { changePassword } from '@/lib/adminApi';

export default function AccountPanel({ onLogout }: { onLogout: () => void }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setMsg('');
    setError('');
    if (pw.length < 6) { setError('新密碼至少 6 碼'); return; }
    if (pw !== confirm) { setError('兩次輸入的密碼不一致'); return; }
    setBusy(true);
    try {
      await changePassword(pw);
      setMsg('密碼已更新，下次請用新密碼登入');
      setPw('');
      setConfirm('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-lg bg-background-50 border border-background-200 p-5 md:p-6 space-y-4">
        <h3 className="font-heading text-lg">變更管理密碼</h3>
        <label className="block">
          <span className="text-sm text-foreground-800">新密碼</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1.5 w-full box-border px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </label>
        <label className="block">
          <span className="text-sm text-foreground-800">再輸入一次</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 w-full box-border px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </label>
        {msg && <p className="text-sm text-secondary-800 bg-secondary-100 rounded-md px-3 py-2">{msg}</p>}
        {error && <p className="text-sm text-primary-700 bg-primary-50 rounded-md px-3 py-2">{error}</p>}
        <button type="button" onClick={submit} disabled={busy} className="px-6 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-background-50 text-sm whitespace-nowrap cursor-pointer">{busy ? '更新中…' : '更新密碼'}</button>
      </div>
      <div className="rounded-lg bg-background-100 border border-background-200 p-5 md:p-6">
        <h3 className="font-heading text-base">登出</h3>
        <p className="text-sm text-foreground-600 mt-1">使用共用電腦時記得登出，避免其他人看到名單資料。</p>
        <button type="button" onClick={onLogout} className="mt-3 px-5 py-2 rounded-md border border-background-300 hover:bg-background-200 text-sm whitespace-nowrap cursor-pointer"><i className="ri-logout-box-r-line mr-1" />登出後台</button>
      </div>
    </div>
  );
}