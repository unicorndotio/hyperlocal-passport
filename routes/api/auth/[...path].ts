import { define } from '../../../utils.ts'
import { auth } from '../../../lib/auth.ts'

export const handler = define.handlers({
  GET(ctx) {
    return auth.handler(ctx.req)
  },
  POST(ctx) {
    return auth.handler(ctx.req)
  },
})
