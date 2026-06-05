import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'

const kv = await Deno.openKv()

interface User {
  id: string
  email: string
  name: string
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

    const userEntry = await kv.get(['user', userId])
    if (!userEntry.value) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const user = userEntry.value as User
    user.status = status

    const atomic = kv.atomic()
      .check(userEntry)
      .set(['user', userId], user)
      .delete(['approvals', 'pending', userId])

    // Issue 005: If approved, create Better Auth credentials
    // We'll use a temporary password (the user's CPF) or similar.
    // In a real app, we'd send a "set password" email.
    if (status === 'approved') {
      // Create the account in Better Auth.
      // Since we are inside a request, we can use auth.api
      // We'll set a temporary password as their CPF (normalized).
      // They should change it on first login.
      try {
        await auth.api.signUpEmail({
          body: {
            email: user.email,
            password: (user.cpf as string) || 'Pass@123',
            name: user.name,
            role: 'resident',
          },
        })
      } catch (err) {
        // If user already exists in Auth, ignore (might be a re-approval)
        console.warn(
          `Auth account creation failed or user already exists:`,
          err,
        )
      }
    }

    const result = await atomic.commit()

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to update user status' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
