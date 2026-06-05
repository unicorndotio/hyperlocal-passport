import { define } from '../../../utils.ts'
import { getDenoKvAdapterRaw } from '../../../lib/kv-adapter.ts'

const kv = await Deno.openKv()
const adapter = getDenoKvAdapterRaw(kv)

export const handler = define.handlers({
  async GET() {
    const users = await adapter.findMany({ model: 'user' })
    const mapped = users.map((u: Record<string, unknown>) => ({
      id: u.id as string,
      name: (u.name as string) || '',
      email: (u.email as string) || '',
      role: (u.role as string) || 'resident',
      status: (u.status as string) || 'pending',
    }))
    return Response.json(mapped)
  },
})
