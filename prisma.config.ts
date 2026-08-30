import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Lu depuis .env (chargé ci-dessus par dotenv). Laissé vide si absent
    // pour que `prisma generate` / `prisma validate` fonctionnent hors DB ;
    // `prisma migrate` échouera explicitement si la variable manque.
    url: process.env.DATABASE_URL ?? '',
  },
});
