import { spawn } from 'node:child_process';
import { ConflictException, Injectable, Logger } from '@nestjs/common';

export interface SyncRunResult {
  exitCode: number;
}

/**
 * Déclenche `npm run job:sync` comme un sous-processus, exactement la
 * commande manuelle existante. Garde le dashboard découplé des credentials
 * Gmail/Claude : ils ne sont nécessaires qu'au moment du déclenchement, pas
 * au démarrage du serveur (contrairement à un import direct de SyncModule).
 */
@Injectable()
export class SyncTriggerService {
  private readonly logger = new Logger(SyncTriggerService.name);
  private running = false;

  run(): Promise<SyncRunResult> {
    if (this.running) {
      throw new ConflictException('Une analyse est déjà en cours.');
    }
    this.running = true;

    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', 'job:sync'], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });

      child.on('error', (err) => {
        this.running = false;
        reject(err);
      });

      child.on('exit', (code) => {
        this.running = false;
        this.logger.log(`job:sync terminé, code ${code}`);
        resolve({ exitCode: code ?? 1 });
      });
    });
  }
}
