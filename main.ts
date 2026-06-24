import { App, staticFiles } from 'fresh'
import { define, type State } from './utils.ts'
import { maskConnectionString, testConnection } from './lib/db.ts'

export const app = new App<State>()

app.use(staticFiles())

// Pass a shared value from a middleware
app.use(async (ctx) => {
  ctx.state.shared = 'hello'
  return await ctx.next()
})

// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get('/api2/:name', (ctx) => {
  const name = ctx.params.name
  return new Response(
    `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
  )
})

// this can also be defined via a file. feel free to delete this!
const exampleLoggerMiddleware = define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`)
  return ctx.next()
})
app.use(exampleLoggerMiddleware)

// Include file-system based routes here
app.fsRoutes()

// Initialize and wait for PostgreSQL to be ready
async function waitForPostgreSQL(
  maxAttempts = 10,
  delayMs = 1000,
): Promise<void> {
  const connStr = Deno.env.get('PG_CONNECTION')
  const maskedStr = connStr ? maskConnectionString(connStr) : 'unknown'

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isReady = await testConnection()
    if (isReady) {
      console.info('[DB] Connection established to', maskedStr)
      return
    }
    if (attempt < maxAttempts) {
      console.warn(
        `[DB] Connection attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms...`,
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  console.error(`[DB] Failed to connect to PostgreSQL at ${maskedStr}`)
  throw new Error('PostgreSQL connection failed after maximum retries')
}

// Export initialization function for use in dev/prod servers
export async function initializeApp(): Promise<void> {
  await waitForPostgreSQL()
}
