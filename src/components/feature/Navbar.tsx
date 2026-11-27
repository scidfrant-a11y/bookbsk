import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const links = [
  { href: '/#signup', label: '立即報名' },
  { href: '/#roster', label: '即時名單' },
  { href: '/#rules', label: '報名規則' },
  { href: '/#my', label: '我的報名' },
];

export default function Navbar({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filled = solid || scrolled || open;

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${filled ? 'bg-background-50 border-b border-background-200' : 'bg-transparent'}`}>
      <nav className="flex items-center justify-between h-16 px-4 md:px-8">
        <Link to="/" className={`flex items-center gap-2 cursor-pointer ${filled ? 'text-foreground-950' : 'text-background-50'}`}>
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-500 text-background-50">
            <i className="ri-basketball-line text-lg" />
          </span>
          <span className="font-heading text-lg tracking-wide">HOOPS 週四團</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={`text-sm whitespace-nowrap cursor-pointer transition-colors hover:text-primary-500 ${filled ? 'text-foreground-700' : 'text-background-100'}`}>
              {l.label}
            </a>
          ))}
          <a href="/#signup" className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-background-50 text-sm whitespace-nowrap cursor-pointer">
            馬上卡位
          </a>
        </div>
        <button
          type="button"
          aria-label="開啟選單"
          onClick={() => setOpen((v) => !v)}
          className={`md:hidden w-10 h-10 flex items-center justify-center cursor-pointer ${filled ? 'text-foreground-950' : 'text-background-50'}`}
        >
          <i className={`text-2xl ${open ? 'ri-close-line' : 'ri-menu-line'}`} />
        </button>
      </nav>
      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-1 bg-background-50">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2 text-sm text-foreground-800 cursor-pointer">
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}