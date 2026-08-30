/**
 * Petits accesseurs d'environnement. Les variables sont chargées depuis `.env`
 * par `ConfigModule.forRoot` (runtime Nest) et par `import 'dotenv/config'` en
 * tête des entrypoints one-shot (`src/job.ts`, `src/scripts/gmail-auth.ts`).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}
