import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_META, STATUS_ORDER } from '@/lib/status';
import type {
  Application,
  UpdateApplicationPayload,
} from '@/types/application';

interface EditApplicationDialogProps {
  application: Application | null;
  onClose: () => void;
  onSave: (id: number, payload: UpdateApplicationPayload) => Promise<void>;
}

/**
 * `key={application.id}` on the inner form remounts it whenever a different
 * row is selected, so its state initializes fresh from `application` without
 * a synchronizing effect.
 */
export function EditApplicationDialog({
  application,
  onClose,
  onSave,
}: EditApplicationDialogProps) {
  if (!application) return null;

  return (
    <EditApplicationForm
      key={application.id}
      application={application}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EditApplicationForm({
  application,
  onClose,
  onSave,
}: {
  application: Application;
  onClose: () => void;
  onSave: (id: number, payload: UpdateApplicationPayload) => Promise<void>;
}) {
  const [company, setCompany] = useState(application.company);
  const [role, setRole] = useState(application.role ?? '');
  const [status, setStatus] = useState(application.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(application.id, { company, role, status });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la candidature</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company">Entreprise</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Poste</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || company.trim().length === 0}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
