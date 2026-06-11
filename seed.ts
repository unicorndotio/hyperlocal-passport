/**
 * Seed script — runs INSIDE the Docker container.
 *
 * Usage:
 *   docker compose exec web deno run -A --unstable-kv seed.ts
 *
 * Environment variables are already set in docker-compose.yml so the script
 * will use the same KV database as the running app.
 */
import { betterAuth } from 'better-auth'
import { denoKvAdapter } from './lib/kv-adapter.ts'

const ADMIN_EMAIL = Deno.env.get('SEED_EMAIL') || 'admin@example.com'
const ADMIN_PASSWORD = Deno.env.get('SEED_PASSWORD') || 'admin123'
const ADMIN_NAME = Deno.env.get('SEED_NAME') || 'Admin'

const kv = await Deno.openKv(Deno.env.get('DENO_KV_PATH'))

const auth = betterAuth({
  database: denoKvAdapter(kv),
  baseURL: Deno.env.get('BETTER_AUTH_URL') || 'http://localhost:8000',
  emailAndPassword: { enabled: true },
})

// Try to sign up
const signUpRes = await auth.handler(
  new Request('http://localhost:8000/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    }),
  }),
)

const signUpBody = await signUpRes.json()

let userId: string | undefined = signUpBody.user?.id

if (!userId) {
  console.log(`ℹ️  Sign-up returned: ${JSON.stringify(signUpBody)}`)
  console.log('   User may already exist — looking up by email…')

  // Find the existing user by scanning the KV store
  const iter = kv.list<Record<string, unknown>>({ prefix: ['user'] })
  for await (const entry of iter) {
    if (entry.value?.email === ADMIN_EMAIL) {
      userId = entry.value.id as string
      break
    }
  }

  // If the user exists but has no credential account, sign-in will fail
  // with "Credential account not found".  Delete the stale user and its
  // indexes so the sign-up retry writes everything fresh.
  if (userId) {
    const accountIdx = await kv.get<string>(['account_by_userId', userId])
    if (!accountIdx.value) {
      console.log('   ⚠️  No credential account — re-creating from scratch…')
      const batch = kv.atomic()
        .delete(['user', userId])
        .delete(['user_by_email', ADMIN_EMAIL.toLowerCase()])
      for await (const entry of kv.list({ prefix: ['account'] })) {
        if ((entry.value as Record<string, unknown>)?.userId === userId) {
          batch.delete(entry.key)
        }
      }
      for await (const entry of kv.list({ prefix: ['session'] })) {
        if ((entry.value as Record<string, unknown>)?.userId === userId) {
          batch.delete(entry.key)
        }
      }
      await batch.commit()

      const retryRes = await auth.handler(
        new Request('http://localhost:8000/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            name: ADMIN_NAME,
          }),
        }),
      )
      const retryBody = await retryRes.json()
      userId = retryBody.user?.id
      if (!userId) {
        console.error(`❌ Re-create failed: ${JSON.stringify(retryBody)}`)
        kv.close()
        Deno.exit(1)
      }
      console.log('   ✅ User re-created with credential account.')
    }
  }
}

if (!userId) {
  console.error('❌ Could not find or create admin user. Aborting.')
  kv.close()
  Deno.exit(1)
}

// Promote to admin role
const existing = await kv.get<Record<string, unknown>>(['user', userId])
if (!existing.value) {
  console.error(`❌ User record not found in KV for id=${userId}`)
  kv.close()
  Deno.exit(1)
}

await kv.set(['user', userId], {
  ...existing.value,
  role: 'admin',
  status: 'approved',
})
console.log(
  `✅ Admin ready — id: ${userId}  email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`,
)

kv.close()
