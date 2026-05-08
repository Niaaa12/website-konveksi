import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    iconBg = "bg-primary/10",
    trend,
    trendValue,
    className,
}: StatCardProps){
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow",
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ml-3",
              iconBg
            )}
          >
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend && trendValue && (
          <div
            className={cn(
              "mt-3 flex items-center gap-1.5 text-xs font-medium",
              trend === "up" && "text-emerald-600",
              trend === "down" && "text-red-500",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" && <TrendingUp className="h-3.5 w-3.5" />}
            {trend === "down" && <TrendingDown className="h-3.5 w-3.5" />}
            {trend === "neutral" && <Minus className="h-3.5 w-3.5" />}
            <span>{trendValue} vs bulan lalu</span>
          </div>
        )}
      </div>
    );
}