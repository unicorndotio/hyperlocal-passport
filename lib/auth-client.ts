import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: typeof globalThis.window !== 'undefined'
    ? globalThis.location.origin
    : 'http://localhost:8000',
})

export const { signIn, signOut, useSession } = authClient
