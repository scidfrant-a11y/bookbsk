import { useEffect, useState } from 'react';
import type { Board } from '@/lib/bbApi';
import { formatTaipei } from '@/lib/bbApi';

interface Props { board: Board | null; offset: number }

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

export default function Hero({ board, offset }: Props) {
  const [now, setNow] = useState(Date.now() + offset);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(t);
  }, [offset]);

  const w = board?.window;
  const state = w?.state;
  const target = state === 'open' ? w?.closeAt : w?.nextOpenAt;
  const diff = target ? Math.max(0, target - now) : 0;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const filled = board ? board.confirmed.length : 0;
  const cap = board?.settings.capacity || 0;

  const badge = state === 'open'
    ? { text: '報名進行中', cls: 'bg-primary-500 text-background-50' }
    : state === 'upcoming'
      ? { text: '即將開放', cls: 'bg-accent-500 text-foreground-950' }
      : state === 'paused'
        ? { text: '本週暫停一次', cls: 'bg-accent-500 text-foreground-950' }
        : { text: '本週已截止', cls: 'bg-background-50/20 text-background-50' };

  return (
    <section className="relative h-[620px] md:h-[680px] w-full overflow-hidden">
      <img
        src="https://readdy.ai/api/search-image?query=Stylized%20dramatic%20illustration%20of%20an%20indoor%20basketball%20court%20at%20night%20with%20warm%20orange%20spotlights%2C%20a%20basketball%20in%20mid-air%20above%20the%20hoop%2C%20deep%20dark%20brown%20and%20charcoal%20background%20with%20glowing%20amber%20highlights%2C%20cinematic%20graphic%20poster%20style%2C%20strong%20contrast%20for%20white%20text&width=1920&height=1080&seq=bb-hero-01&orientation=landscape"
        alt="夜間籃球場報名系統主視覺"
        title="HOOPS 週四團 籃球報名"
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-4 md:px-6 pt-16">
        <span className={`anim-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-label whitespace-nowrap ${badge.cls}`}>
          <span className="w-2 h-2 rounded-full bg-current anim-pulse-dot" />
          {badge.text}
        </span>
        <h1 className="anim-fade-up font-heading text-4xl md:text-6xl text-background-50 mt-5 tracking-wide">
          {board?.settings.event_title || '週四北峰籃球團'}
        </h1>
        <p className="anim-fade-up text-background-100 text-sm md:text-base mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1">
          <span className="whitespace-nowrap"><i className="ri-time-line mr-1" />{board?.settings.event_time_text || '每週四 18:00 - 20:00'}</span>
          <span className="whitespace-nowrap"><i className="ri-map-pin-line mr-1" />{board?.settings.event_location || '汐止北峰國小運動場 2F'}</span>
        </p>

        <div className="anim-fade-up mt-8 md:mt-10">
          <p className="text-background-200 text-xs md:text-sm mb-3">
            {state === 'open' ? '距離報名截止還有' : state === 'paused' ? '本週暫停，下週開放倒數' : '距離下次開放報名還有'}
          </p>
          <div className="flex gap-2 md:gap-4 justify-center">
            {[[d, '天'], [h, '時'], [m, '分'], [s, '秒']].map(([v, l]) => (
              <div key={l as string} className="w-16 md:w-20 py-3 rounded-lg bg-background-50/10 border border-background-50/20">
                <div className="font-heading text-3xl md:text-4xl text-background-50">{pad(v as number)}</div>
                <div className="text-[11px] text-background-200 mt-1">{l}</div>
              </div>
            ))}
          </div>
          {w && (
            <p className="text-background-200 text-xs mt-3">
              {state === 'open' ? `截止時間：${formatTaipei(w.closeAt)}` : `開放時間：${formatTaipei(w.nextOpenAt)}`}
            </p>
          )}
        </div>

        <div className="anim-fade-up mt-8 flex flex-col sm:flex-row gap-3 items-center">
          <a href={state === 'paused' ? '#rules' : '#signup'} className="px-7 py-3 rounded-md bg-primary-500 hover:bg-primary-600 text-background-50 text-sm font-label whitespace-nowrap cursor-pointer">
            {state === 'open' ? `立即報名（正取 ${filled}/${cap}）` : state === 'paused' ? '查看報名時程' : '查看報名方式'}
          </a>
          <a href="#roster" className="px-7 py-3 rounded-md border border-background-50/40 text-background-50 hover:bg-background-50/10 text-sm whitespace-nowrap cursor-pointer">
            查看即時名單
          </a>
        </div>
      </div>
    </section>
  );
}