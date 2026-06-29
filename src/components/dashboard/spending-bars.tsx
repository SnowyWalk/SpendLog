import { formatCurrency } from "@/lib/format";

export function SpendingBars({
  items,
  total,
}: {
  items: Array<{ name: string; amount: number; color: string }>;
  total: number;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const percent = total > 0 ? (item.amount / total) * 100 : 0;
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
            <div className="h-2 rounded-sm bg-muted">
              <div
                className="h-full rounded-sm"
                style={{ width: `${percent}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
