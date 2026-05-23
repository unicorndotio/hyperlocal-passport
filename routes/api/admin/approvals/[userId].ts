import { define } from '../../../../utils.ts'

const kv = await Deno.openKv()

interface User {
  id: string
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
      return new Response(JSON.stringify({ error: 'Invalid status. Must be approved or rejected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userEntry = await kv.get(['users', userId])
    if (!userEntry.value) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const user = userEntry.value as User
    user.status = status

    const result = await kv.atomic()
      .check(userEntry)
      .set(['users', userId], user)
      .delete(['approvals', 'pending', userId])
      .commit()

    if (!result.ok) {
      return new Response(JSON.stringify({ error: 'Failed to update user status' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
