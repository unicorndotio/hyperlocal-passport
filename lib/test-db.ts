import { sql } from 'drizzle-orm'

type TestFn = (t: Deno.TestContext) => void | Promise<void>
type TestOptions = Omit<Deno.TestDefinition, 'name' | 'fn'>

const originalTest = Deno.test

export function useDatabase(): void {
  const hasConnection = !!Deno.env.get('PG_CONNECTION')

  const wrappedTest = function test(
    a: string | Deno.TestDefinition,
    b?: TestFn | TestOptions,
    c?: TestFn,
  ): void {
    if (!hasConnection) {
      const name = typeof a === 'string' ? a : a.name
      originalTest({
        name: `${name} - Skipped`,
        fn: () =>
          console.info(`[info] ${name} skipped - PG_CONNECTION not set`),
      })
      return
    }

    if (typeof a === 'string') {
      if (typeof b === 'function') {
        originalTest({
          name: a,
          sanitizeOps: false,
          sanitizeResources: false,
          fn: b,
        })
      } else {
        originalTest({
          name: a,
          ...(b ?? {}),
          sanitizeOps: false,
          sanitizeResources: false,
          fn: c!,
        })
      }
    } else {
      originalTest({
        ...a,
        sanitizeOps: false,
        sanitizeResources: false,
      })
    }
  }

  Object.defineProperty(Deno, 'test', {
    value: wrappedTest,
    writable: true,
    configurable: true,
  })
}

export async function cleanupDatabase(): Promise<void> {
  const { db } = await import('./db.ts')

  await db.execute(sql`
    TRUNCATE TABLE
      transactions,
      signals,
      coupon_analytics,
      redemptions,
      merchant_posts,
      file_metadata,
      coupons,
      businesses
  `)
}
