import { getPublicClient } from '../config/database';

// All shops share the global public schema tables (appointments, treatments, etc.)
// distinguished by tenant_id. No per-shop schema provisioning is needed.

export async function deleteTenantSchema(schemaName: string): Promise<void> {
  const client = getPublicClient();
  await client.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
}

export async function schemaExists(schemaName: string): Promise<boolean> {
  const client = getPublicClient();
  const result = await client.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM information_schema.schemata
    WHERE schema_name = ${schemaName}
  `;
  return result[0].count > 0n;
}
