import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
      </CardContent>
    </Card>
  );
}
