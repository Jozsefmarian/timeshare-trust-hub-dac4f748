import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  trend?: string;
  variant?: "default" | "success" | "warning" | "accent";
}

const variantStyles = {
  default: "bg-primary/5 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  accent: "bg-secondary/10 text-secondary",
};

export default function DashboardCard({ title, value, description, icon, trend, variant = "default" }: DashboardCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${variantStyles[variant]}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && <span className="text-success font-medium">{trend} </span>}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
