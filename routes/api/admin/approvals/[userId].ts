import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { eq } from 'drizzle-orm'

interface User {
  id: string
  email: string
  name: string
  cpf?: string
  status: 'pending' | 'approved' | 'rejected'
  [key: string]: unknown
}

export const handler = define.handlers({
  async POST(ctx) {
    const userId = ctx.params.userId
    let body: { status: 'approved' | 'rejected' }
    try {
      body = await ctx.req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { status } = body
    if (status !== 'approved' && status !== 'rejected') {
      return new Response(
        JSON.stringify({
          error: 'Invalid status. Must be approved or rejected',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    let user: User | null = null

    try {
      await db.transaction(async (tx) => {
        // Fetch user
        const users = await tx
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, userId))
          .limit(1)

        if (users.length === 0) {
          throw new Error('User not found')
        }

        const dbUser = users[0]
        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          cpf: dbUser.cpf || undefined,
          status: status as 'pending' | 'approved' | 'rejected',
        }

        // Update user status
        await tx
          .update(schema.users)
          .set({ status })
          .where(eq(schema.users.id, userId))
      })
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Failed to update user status'
      if (message === 'User not found') {
        return new Response(JSON.stringify({ error: message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // If approved, create Better Auth credentials (after transaction succeeds)
    if (status === 'approved' && user) {
      try {
        await auth.api.signUpEmail({
          body: {
            email: user.email,
            password: user.cpf || 'Pass@123',
            name: user.name,
            role: 'resident',
          },
        })
      } catch (err) {
        console.warn(
          `Auth account creation failed or user already exists:`,
          err,
        )
      }
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
