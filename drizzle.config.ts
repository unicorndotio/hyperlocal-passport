import { defineConfig } from 'drizzle-kit'

// Get PG_CONNECTION from environment
// Support both Node.js (process.env) and Deno (Deno.env.get)
const getPgConnection = (): string => {
  if (typeof process !== 'undefined' && process.env.PG_CONNECTION) {
    return process.env.PG_CONNECTION
  }
  if (typeof Deno !== 'undefined' && Deno.env.get) {
    return Deno.env.get('PG_CONNECTION') || ''
  }
  return ''
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getPgConnection(),
  },
})
