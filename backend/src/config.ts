export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgres://postgres:Nana@9849@localhost:5432/quality',
  // If empty, the SAP webhook is open (fine for local dev). Set it in any shared environment.
  sapApiKey: process.env.SAP_API_KEY ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
