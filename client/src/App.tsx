import { useMemo, useState } from 'react';
import { deleteApplication, updateApplication } from '@/api/applications';
import {
  ApplicationsTable,
  type SortDirection,
} from '@/components/ApplicationsTable';
import { EditApplicationDialog } from '@/components/EditApplicationDialog';
import {
  ALL_PLATFORMS,
  PlatformFilterSelect,
} from '@/components/PlatformFilterSelect';
import {
  ALL_STATUSES,
  StatusFilterTabs,
  type StatusFilter,
} from '@/components/StatusFilterTabs';
import { StatsCards } from '@/components/StatsCards';
import { SyncTriggerButton } from '@/components/SyncTriggerButton';
import { useApplications } from '@/hooks/useApplications';
import { useStats } from '@/hooks/useStats';
import type { Application } from '@/types/application';

function App() {
  const { applications, loading, error, refetch } = useApplications();
  const [refreshKey, setRefreshKey] = useState(0);
  const { stats } = useStats(refreshKey);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES);
  const [platformFilter, setPlatformFilter] = useState<string>(ALL_PLATFORMS);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editing, setEditing] = useState<Application | null>(null);

  const platforms = useMemo(
    () =>
      [
        ...new Set(
          applications.map((a) => a.platform).filter((p): p is string => !!p),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [applications],
  );

  const visibleApplications = useMemo(() => {
    return applications
      .filter((a) => statusFilter === ALL_STATUSES || a.status === statusFilter)
      .filter(
        (a) =>
          platformFilter === ALL_PLATFORMS || a.platform === platformFilter,
      )
      .sort((a, b) => {
        const diff =
          new Date(a.lastEventAt).getTime() - new Date(b.lastEventAt).getTime();
        return sortDirection === 'desc' ? -diff : diff;
      });
  }, [applications, statusFilter, platformFilter, sortDirection]);

  const refreshAll = () => {
    refetch();
    setRefreshKey((k) => k + 1);
  };

  const handleSave = async (
    id: number,
    payload: Parameters<typeof updateApplication>[1],
  ) => {
    await updateApplication(id, payload);
    refreshAll();
  };

  const handleDelete = async (application: Application) => {
    await deleteApplication(application.id);
    refreshAll();
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Job Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Suivi des candidatures
          </p>
        </div>
        <SyncTriggerButton onDone={refreshAll} />
      </header>

      <StatsCards stats={stats} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} />
        <PlatformFilterSelect
          platforms={platforms}
          value={platformFilter}
          onChange={setPlatformFilter}
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && <p className="text-sm text-destructive">Erreur : {error}</p>}

      {!loading && !error && (
        <ApplicationsTable
          applications={visibleApplications}
          sortDirection={sortDirection}
          onToggleSort={() =>
            setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))
          }
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      )}

      <EditApplicationDialog
        application={editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  );
}

export default App;
