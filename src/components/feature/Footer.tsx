export default function Footer() {
  return (
    <footer className="bg-secondary-100 text-secondary-900">
      <div className="px-4 md:px-8 py-10 md:py-14 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-500 text-background-50">
              <i className="ri-basketball-line" />
            </span>
            <span className="font-heading text-lg">HOOPS 週四團</span>
          </div>
          <p className="text-sm text-secondary-800 leading-relaxed">每週固定開打的城市籃球團，線上自動報名、即時名單、候補自動遞補。</p>
        </div>
        <div>
          <h4 className="font-heading text-base mb-3"><a href="/#rules" className="cursor-pointer">報名時程</a></h4>
          <ul className="text-sm space-y-2 text-secondary-800">
            <li>週一 12:00 開放報名</li>
            <li>週三 18:00 截止報名</li>
            <li>週四 18:00 準時開打</li>
            <li>汐止北峰國小運動場 2F</li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-base mb-3"><a href="/#signup" className="cursor-pointer">快速連結</a></h4>
          <ul className="text-sm space-y-2 text-secondary-800">
            <li><a href="/#signup" className="hover:text-primary-600 cursor-pointer">立即報名</a></li>
            <li><a href="/#roster" className="hover:text-primary-600 cursor-pointer">即時名單</a></li>
            <li><a href="/#my" className="hover:text-primary-600 cursor-pointer">取消報名</a></li>
          </ul>
        </div>
      </div>
      <div className="px-4 md:px-8 py-5 border-t border-secondary-200 flex flex-col sm:flex-row justify-between gap-2 text-xs text-secondary-700">
        <span>© 2026 HOOPS 週四團. All rights reserved.</span>
        <span className="flex items-center gap-3">
          <span>報名時間皆以台灣時間 (GMT+8) 計算</span>
          <a href="/admin" className="hover:text-primary-600 cursor-pointer whitespace-nowrap">管理後台</a>
        </span>
      </div>
    </footer>
  );
}