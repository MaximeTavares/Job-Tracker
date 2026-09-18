import type { ApplicationStatus } from '@/types/application';
import type { badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export const STATUS_ORDER: ApplicationStatus[] = [
  'CONFIRMED',
  'REJECTED',
  'INTERVIEW',
  'INFO_REQUESTED',
  'OTHER',
];

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; badgeVariant: BadgeVariant }
> = {
  CONFIRMED: { label: 'Confirmée', badgeVariant: 'secondary' },
  REJECTED: { label: 'Refusée', badgeVariant: 'destructive' },
  INTERVIEW: { label: 'Entretien', badgeVariant: 'success' },
  INFO_REQUESTED: { label: 'Info demandée', badgeVariant: 'warning' },
  OTHER: { label: 'Autre', badgeVariant: 'outline' },
};
