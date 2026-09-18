import { Badge } from '@/components/ui/badge';
import { STATUS_META } from '@/lib/status';
import type { ApplicationStatus } from '@/types/application';

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.badgeVariant}>{meta.label}</Badge>;
}
