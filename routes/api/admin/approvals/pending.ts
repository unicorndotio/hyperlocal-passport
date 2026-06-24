import { define } from '../../../../utils.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { eq } from 'drizzle-orm'

export const handler = define.handlers({
  async GET() {
    const pendingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.status, 'pending'))

    return new Response(JSON.stringify(pendingUsers), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
