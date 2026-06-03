import { betterAuth } from 'better-auth'
import { denoKvAdapter } from './kv-adapter.ts'
import { kv } from './kv.ts'

export const auth = betterAuth({
  database: denoKvAdapter(kv),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false, // It can default to 'resident' in app logic
      },
      status: {
        type: 'string',
        required: false,
      },
    },
  },
})
