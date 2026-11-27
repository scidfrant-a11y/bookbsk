import { useState } from 'react';
import type { FormEvent } from 'react';
import { login, setup, setToken } from '@/lib/adminApi';

interface Props { initialized: boolean; onSuccess: () => void; onRefresh: () => void }

export default function LoginGate({ initialized, onSuccess, onRefresh }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('密碼至少 6 碼'); return; }
    if (!initialized && password !== confirm) { setError('兩次輸入的密碼不一致'); return; }
    setBusy(true);
    try {
      const r = initialized ? await login(password) : await setup(password);
      setToken(r.token);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
      if (!initialized) onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-500 text-background-50"><i className="ri-basketball-line text-xl" /></span>
          <span className="font-heading text-xl">HOOPS 管理後台</span>
        </div>
        <form onSubmit={submit} className="rounded-lg bg-background-50 border border-background-200 p-6 md:p-8 space-y-4">
          <h1 className="font-heading text-2xl">{initialized ? '管理員登入' : '第一次使用，設定管理密碼'}</h1>
          <p className="text-sm text-foreground-600">
            {initialized ? '輸入管理密碼即可管理報名時段、名額與名單。' : '這組密碼只給你自己使用，用來進入管理後台。'}
          </p>
          <label className="block">
            <span className="text-sm text-foreground-800">管理密碼</span>
            <div className="relative mt-1.5">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="current-password"
                placeholder="至少 6 碼"
                className="w-full box-border px-3 py-2.5 pr-10 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button type="button" aria-label="顯示密碼" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-foreground-500 cursor-pointer">
                <i className={show ? 'ri-eye-off-line' : 'ri-eye-line'} />
              </button>
            </div>
          </label>
          {!initialized && (
            <label className="block">
              <span className="text-sm text-foreground-800">再輸入一次</span>
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(ev) => setConfirm(ev.target.value)}
                autoComplete="new-password"
                className="mt-1.5 w-full box-border px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </label>
          )}
          {error && <p className="text-sm text-primary-700 bg-primary-50 rounded-md px-3 py-2">{error}</p>}
          <button type="submit" disabled={busy} className="w-full py-3 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-background-50 text-sm whitespace-nowrap cursor-pointer">
            {busy ? '處理中…' : initialized ? '登入' : '建立並登入'}
          </button>
          <a href="/" className="block text-center text-xs text-foreground-500 hover:text-primary-600 cursor-pointer">回到報名首頁</a>
        </form>
      </div>
    </div>
  );
}