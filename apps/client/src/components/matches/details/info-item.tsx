interface InfoItemProps {
  icon: string;
  label: string;
  value: string;
  color:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "default"
    | "info"
    | "violet"
    | "orange"
    | "cyan";
  highlight?: boolean;
  showPulse?: boolean;
}

export const InfoItem = ({
  icon,
  label,
  value,
  color,
  highlight,
  showPulse,
}: InfoItemProps) => {
  const colorClasses = {
    primary: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-blue-500/10 text-blue-400 border-blue-500/20",
    secondary: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-purple-500/10 text-purple-400 border-purple-500/20",
    success: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    info: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-sky-500/10 text-sky-400 border-sky-500/20",
    violet: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-violet-500/10 text-violet-400 border-violet-500/20",
    orange: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-orange-500/10 text-orange-400 border-orange-500/20",
    cyan: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    default: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  // Regex to remove emojis from the value if we already have a dedicated icon
  const cleanedValue = value
    .replace(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/^\s+|\s+$/g, "");

  return (
    <div
      className={`p-4 rounded-3xl border ${colorClasses[color]} flex flex-col justify-between gap-3 transition-all hover:scale-[1.02] cursor-default h-full bg-linear-to-b from-transparent to-black/5`}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center text-xl shadow-inner">
          {icon}
        </div>
        <span className="text-[9px] font-black tracking-[0.2em] opacity-40">
          {label}
        </span>
      </div>
      <p className="text-white font-black text-xs sm:text-sm leading-tight wrap-break-word">
        {cleanedValue}
      </p>
    </div>
  );
};
