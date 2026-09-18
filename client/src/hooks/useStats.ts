import { useEffect, useState } from 'react';
import { getStats } from '@/api/applications';
import type { ApplicationStats } from '@/types/application';

export function useStats(refreshKey: number): {
  stats: ApplicationStats | null;
  loading: boolean;
} {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { stats, loading };
}
