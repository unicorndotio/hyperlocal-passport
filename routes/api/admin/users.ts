import { define } from '../../../utils.ts'
import { getDenoKvAdapterRaw } from '../../../lib/kv-adapter.ts'

const kv = await Deno.openKv()
const adapter = getDenoKvAdapterRaw(kv)

export const handler = define.handlers({
  async GET() {
    const users = await adapter.findMany({ model: 'user' })
    // deno-lint-ignore no-explicit-any
    const mapped = users.map((u: any) => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'resident',
      status: u.status || 'pending',
    }))
    return Response.json(mapped)
  },
})
