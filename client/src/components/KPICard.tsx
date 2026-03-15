import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

export default function KPICard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  icon,
  variant = "default",
}: KPICardProps) {
  const getTrend = () => {
    if (change === undefined) return null;
    if (change > 0) return { icon: TrendingUp, color: "text-green-500", label: `+${change}%` };
    if (change < 0) return { icon: TrendingDown, color: "text-red-500", label: `${change}%` };
    return { icon: Minus, color: "text-muted-foreground", label: "0%" };
  };

  const trend = getTrend();

  const variantStyles = {
    default: "border-l-primary/50",
    success: "border-l-green-500",
    warning: "border-l-yellow-500",
    danger: "border-l-red-500",
  };

  return (
    <Card className={cn("border-l-4", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight" data-testid={`text-kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1.5 text-xs">
                <trend.icon className={cn("w-3.5 h-3.5", trend.color)} />
                <span className={trend.color}>{trend.label}</span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
