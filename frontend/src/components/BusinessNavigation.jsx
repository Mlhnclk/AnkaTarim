import BrandLogo from "./BrandLogo";

const modes = [
  { id: "producer", label: "Alış", tab: "overview" },
  { id: "merchant", label: "Satış", tab: "merchant-overview" },
];

function BusinessNavigation({
  activeTab,
  businessMode,
  onModeChange,
  onTabChange,
  tabs,
  merchantTabs,
  variant,
}) {
  const activeTabs = businessMode === "producer" ? tabs : merchantTabs;

  const renderModeButtons = (desktop = false) =>
    modes.map((mode) => (
      <button
        key={mode.id}
        type="button"
        {...(desktop
          ? { role: "switch", "aria-checked": businessMode === mode.id }
          : {})}
        onClick={() => onModeChange(mode.id, mode.tab)}
        className={
          desktop
            ? `rounded-xl px-3 py-2 text-xs font-semibold ${
                businessMode === mode.id
                  ? "bg-white text-[#0a2140]"
                  : "text-blue-100"
              }`
            : `min-w-[96px] flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                businessMode === mode.id
                  ? "bg-white text-[#0a2140]"
                  : "text-blue-100"
              }`
        }
      >
        {mode.label}
      </button>
    ));

  if (variant === "sidebar") {
    return (
      <aside className="hidden w-72 shrink-0 rounded-[28px] border border-blue-900/10 bg-gradient-to-b from-[#071d35] via-[#0a2140] to-[#102f5d] p-5 text-white shadow-[0_18px_45px_rgba(7,29,53,0.28)] lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="rounded-[18px] bg-white/8 p-1 ring-1 ring-white/15">
            <BrandLogo />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-200">
              Anka
            </p>
            <h2 className="mt-1 text-lg font-bold">Tarımsal Takip</h2>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
          <div className="grid grid-cols-2 gap-1">{renderModeButtons(true)}</div>
        </div>

        <nav className="mt-8 space-y-2">
          {activeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-white text-[#0a2140] shadow-lg shadow-blue-950/10"
                  : "text-blue-100 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  activeTab === tab.id ? "bg-blue-700" : "bg-white/35"
                }`}
              />
            </button>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <div className="mt-3 space-y-2 lg:hidden">
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-[#0a2140] p-1">
        {renderModeButtons()}
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Mobil menü">
        {activeTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold ${
              activeTab === tab.id
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default BusinessNavigation;
