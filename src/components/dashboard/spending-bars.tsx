import { formatCurrency } from "@/lib/format";

export function SpendingBars({
  items,
  total,
}: {
  items: Array<{ name: string; amount: number; color: string }>;
  total: number;
}) {
  return (
    <div className="min-w-0 space-y-3">
      {items.map((item) => {
        const rawPercent = total > 0 ? (item.amount / total) * 100 : 0;
        const percent = Math.min(100, Math.max(0, rawPercent));
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name}</span>
              </div>
              <span className="shrink-0 font-medium">{formatCurrency(item.amount)}</span>
            </div>
            <div className="h-2 max-w-full overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full max-w-full rounded-sm"
                style={{ width: `${percent}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
