import { auth } from '../../../lib/auth.ts'
import { Context } from 'fresh'

export const handler = {
  async GET(req: Request, ctx: Context<unknown>) {
    return auth.handler(req)
  },
  async POST(req: Request, ctx: Context<unknown>) {
    return auth.handler(req)
  },
}
