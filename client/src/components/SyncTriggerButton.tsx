import { useState } from 'react';
import { triggerSync } from '@/api/sync';
import { Button } from '@/components/ui/button';

export function SyncTriggerButton({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setRunning(true);
    setError(null);
    try {
      await triggerSync();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={() => void handleClick()} disabled={running}>
        {running ? 'Analyse en cours…' : "Lancer l'analyse"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
