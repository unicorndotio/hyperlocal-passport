import { drizzle } from 'npm:drizzle-orm@0.38.2/node-postgres'
import pgModule from 'npm:pg@8.13.1'
import * as schema from '../db/schema.ts'

const Pool = pgModule.Pool

const connectionString = Deno.env.get('PG_CONNECTION')
if (!connectionString) {
  throw new Error('PG_CONNECTION environment variable is not set')
}

const pool = new Pool({
  connectionString,
  max: 10,
  min: 1,
})

export const db = drizzle({ client: pool, schema })

// Close pool connections on process exit (avoids test leak detection)
addEventListener('unload', () => {
  pool.end().catch(() => {})
})

// Export pool cleanup for tests and controlled shutdowns
export async function closeConnection(): Promise<void> {
  await pool.end()
}

// Helper to test database connectivity
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    client.release()
    return true
  } catch (_err) {
    return false
  }
}

// Helper to mask connection string for logging (hide password)
export function maskConnectionString(connStr: string): string {
  try {
    const url = new URL(connStr)
    if (url.password) {
      url.password = '***'
    } else if (connStr.includes(':@')) {
      return connStr.replace(':@', ':***@')
    }
    return url.toString()
  } catch {
    return connStr.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2')
  }
}
