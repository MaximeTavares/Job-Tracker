import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import type { Application } from '@/types/application';

export type SortDirection = 'asc' | 'desc';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function ApplicationsTable({
  applications,
  sortDirection,
  onToggleSort,
  onEdit,
  onDelete,
}: {
  applications: Application[];
  sortDirection: SortDirection;
  onToggleSort: () => void;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void | Promise<void>;
}) {
  const handleDelete = (application: Application) => {
    if (
      window.confirm(`Supprimer la candidature « ${application.company} » ?`)
    ) {
      void onDelete(application);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Entreprise</TableHead>
          <TableHead>Poste</TableHead>
          <TableHead>Plateforme</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSort}
              className="-ml-2"
            >
              Dernière activité
              {sortDirection === 'desc' ? (
                <ArrowDown className="size-3.5" />
              ) : (
                <ArrowUp className="size-3.5" />
              )}
            </Button>
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground"
            >
              Aucune candidature.
            </TableCell>
          </TableRow>
        )}
        {applications.map((application) => (
          <TableRow key={application.id}>
            <TableCell
              className="max-w-40 truncate font-medium"
              title={application.company}
            >
              {application.company}
            </TableCell>
            <TableCell
              className="max-w-40 truncate"
              title={application.role ?? undefined}
            >
              {application.role ?? '—'}
            </TableCell>
            <TableCell
              className="max-w-35 truncate"
              title={application.platform ?? undefined}
            >
              {application.platform ?? '—'}
            </TableCell>
            <TableCell>
              <StatusBadge status={application.status} />
            </TableCell>
            <TableCell>
              {dateFormatter.format(new Date(application.lastEventAt))}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Éditer"
                  aria-label="Éditer"
                  onClick={() => onEdit(application)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Supprimer"
                  aria-label="Supprimer"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(application)}
                >
                  <Trash2 />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
