import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { STATUS_META, STATUS_ORDER } from '@/lib/status';
import type { ApplicationStatus } from '@/types/application';

export const ALL_STATUSES = 'ALL' as const;
export type StatusFilter = ApplicationStatus | typeof ALL_STATUSES;

export function StatusFilterTabs({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as StatusFilter)}>
      <TabsList>
        <TabsTrigger value={ALL_STATUSES}>Toutes</TabsTrigger>
        {STATUS_ORDER.map((status) => (
          <TabsTrigger key={status} value={status}>
            {STATUS_META[status].label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
