import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_META, STATUS_ORDER } from '@/lib/status';
import type { ApplicationStats } from '@/types/application';

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-normal">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: ApplicationStats | null }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      <StatTile label="Total" value={String(stats.total)} />
      {STATUS_ORDER.map((status) => (
        <StatTile
          key={status}
          label={STATUS_META[status].label}
          value={String(stats.byStatus[status])}
        />
      ))}
      <StatTile
        label="Taux de réponse"
        value={`${Math.round(stats.responseRate * 100)}%`}
      />
    </div>
  );
}
