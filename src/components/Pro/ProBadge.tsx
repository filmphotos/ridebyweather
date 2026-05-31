// Small "PRO" badge to mark gated features in lists and headings.
// Designed to be visually quiet so it stops scanning eyes without being
// obnoxious. Pairs with <ProPaywall /> for the click target.
export default function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded bg-gradient-to-r from-amber-500/20 to-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30 ${className}`}
    >
      Pro
    </span>
  );
}
