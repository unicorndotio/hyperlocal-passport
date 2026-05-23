import { define } from '../../../../utils.ts'

const kv = await Deno.openKv()

export const handler = define.handlers({
  async GET() {
    const list = kv.list({ prefix: ['approvals', 'pending'] })
    const pendingUsers = []

    for await (const entry of list) {
      const { userId } = entry.value as { userId: string }
      const userEntry = await kv.get(['users', userId])
      if (userEntry.value) {
        pendingUsers.push(userEntry.value)
      }
    }

    return new Response(JSON.stringify(pendingUsers), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
