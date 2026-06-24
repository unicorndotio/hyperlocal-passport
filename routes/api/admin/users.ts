import { define } from '../../../utils.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'

export const handler = define.handlers({
  async GET() {
    const users = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        status: schema.users.status,
      })
      .from(schema.users)

    const mapped = users.map((u) => ({
      id: u.id,
      name: u.name ?? '',
      email: u.email,
      role: u.role ?? 'resident',
      status: u.status ?? 'pending',
    }))
    return Response.json(mapped)
  },
})
