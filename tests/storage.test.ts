import {
  assertEquals,
  assertExists,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { join } from 'https://deno.land/std@0.224.0/path/mod.ts'
import { Context } from 'fresh'
import { uploadFile } from '../lib/storage.ts'
import { handler as uploadsHandler } from '../routes/api/uploads/[filename].ts'
import { auth } from '../lib/auth.ts'

Deno.test('Storage and Upload API Tests', async (t) => {
  // Use a temporary uploads directory for testing to prevent polluting the project
  const testUploadsDir = await Deno.makeTempDir({
    prefix: 'local_passport_test_uploads_',
  })
  const originalUploadsDir = Deno.env.get('UPLOADS_DIR')
  Deno.env.set('UPLOADS_DIR', testUploadsDir)

  // Ensure clean database entries for testing users
  const kv = await Deno.openKv()

  // Clean up any test users that might exist
  const users = kv.list({ prefix: ['user'] })
  for await (const user of users) {
    const val = user.value as { email?: string }
    if (
      val.email === 'resident_owner@example.com' ||
      val.email === 'resident_other@example.com' ||
      val.email === 'admin_user@example.com'
    ) {
      await kv.delete(user.key)
    }
  }

  // Create our test users via Better Auth
  // 1. Resident Owner
  const resOwner = await auth.api.signUpEmail({
    body: {
      email: 'resident_owner@example.com',
      password: 'Password123!',
      name: 'Owner Resident',
    },
    asResponse: true,
  })
  const ownerCookie = resOwner.headers.get('set-cookie')

  // Set role to 'resident' and status to 'approved' manually in Deno KV for the signed-up user
  const ownerSession = await auth.api.getSession({
    headers: { cookie: ownerCookie || '' },
  })
  assertExists(ownerSession)
  const ownerUser = ownerSession.user
  await kv.set(['user', ownerUser.id], {
    ...ownerUser,
    role: 'resident',
    status: 'approved',
  })

  // 2. Resident Other
  const resOther = await auth.api.signUpEmail({
    body: {
      email: 'resident_other@example.com',
      password: 'Password123!',
      name: 'Other Resident',
    },
    asResponse: true,
  })
  const otherCookie = resOther.headers.get('set-cookie')

  const otherSession = await auth.api.getSession({
    headers: { cookie: otherCookie || '' },
  })
  assertExists(otherSession)
  const otherUser = otherSession.user
  await kv.set(['user', otherUser.id], {
    ...otherUser,
    role: 'resident',
    status: 'approved',
  })

  // 3. Admin User
  const resAdmin = await auth.api.signUpEmail({
    body: {
      email: 'admin_user@example.com',
      password: 'Password123!',
      name: 'Admin User',
    },
    asResponse: true,
  })
  const adminCookie = resAdmin.headers.get('set-cookie')

  const adminSession = await auth.api.getSession({
    headers: { cookie: adminCookie || '' },
  })
  assertExists(adminSession)
  const adminUser = adminSession.user
  await kv.set(['user', adminUser.id], {
    ...adminUser,
    role: 'admin',
    status: 'approved',
  })

  await t.step('uploadFile name generation and validation', async () => {
    // Valid PNG upload
    const mockFile = new File(['png-content'], 'test.png', {
      type: 'image/png',
    })
    const filename = await uploadFile(mockFile)
    assertExists(filename)
    // UUID regex match
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/
    assertEquals(uuidRegex.test(filename), true)

    // Empty file handling
    const emptyFile = new File([], 'empty.png', { type: 'image/png' })
    await assertRejects(
      () => uploadFile(emptyFile),
      Error,
      'File is empty',
    )

    // Invalid file type handling
    const invalidFile = new File(['invalid-content'], 'malicious.exe', {
      type: 'application/x-msdownload',
    })
    await assertRejects(
      () => uploadFile(invalidFile),
      Error,
      'Invalid file type',
    )
  })

  await t.step(
    'uploadFile writes file to disk and persists metadata',
    async () => {
      const fileContent = 'sample jpeg content'
      const jpegFile = new File([fileContent], 'avatar.jpg', {
        type: 'image/jpeg',
      })
      const filename = await uploadFile(jpegFile, {
        userId: ownerUser.id,
        isPublic: false,
      })

      // Verify it is on disk
      const filePath = join(testUploadsDir, filename)
      const readBytes = await Deno.readFile(filePath)
      const readContent = new TextDecoder().decode(readBytes)
      assertEquals(readContent, fileContent)

      // Verify metadata was stored in Deno KV
      const metaEntry = await kv.get(['file_metadata', filename])
      assertExists(metaEntry.value)
      const meta = metaEntry.value as { userId: string; isPublic: boolean }
      assertEquals(meta.userId, ownerUser.id)
      assertEquals(meta.isPublic, false)
    },
  )

  await t.step('Upload API GET - Public access allowed', async () => {
    // Upload a public file (e.g. logo)
    const logoFile = new File(['logo-graphics'], 'logo.webp', {
      type: 'image/webp',
    })
    const filename = await uploadFile(logoFile, { isPublic: true })

    const req = new Request(`http://localhost:8000/api/uploads/${filename}`)
    const ctx = {
      params: { filename },
      state: {},
    } as unknown as Context<unknown>

    const res = await uploadsHandler.GET(req, ctx)
    assertEquals(res.status, 200)
    assertEquals(res.headers.get('Content-Type'), 'image/webp')

    const bodyText = await res.text()
    assertEquals(bodyText, 'logo-graphics')
  })

  await t.step(
    'Upload API GET - Private access restricts correctly',
    async () => {
      // Upload private identity document
      const docFile = new File(
        ['secret-identity-document-bytes'],
        'identity.pdf',
        { type: 'application/pdf' },
      )
      const filename = await uploadFile(docFile, {
        userId: ownerUser.id,
        isPublic: false,
      })

      const ctx = {
        params: { filename },
        state: {},
      } as unknown as Context<unknown>

      // 1. Unauthenticated request -> 401 Unauthorized
      const reqUnauth = new Request(
        `http://localhost:8000/api/uploads/${filename}`,
      )
      const resUnauth = await uploadsHandler.GET(reqUnauth, ctx)
      assertEquals(resUnauth.status, 401)

      // 2. Request by other user (not owner, not admin) -> 403 Forbidden
      const reqOther = new Request(
        `http://localhost:8000/api/uploads/${filename}`,
        {
          headers: { cookie: otherCookie || '' },
        },
      )
      const resOther = await uploadsHandler.GET(reqOther, ctx)
      assertEquals(resOther.status, 403)

      // 3. Request by owner -> 200 OK and correct stream
      const reqOwner = new Request(
        `http://localhost:8000/api/uploads/${filename}`,
        {
          headers: { cookie: ownerCookie || '' },
        },
      )
      const resOwner = await uploadsHandler.GET(reqOwner, ctx)
      assertEquals(resOwner.status, 200)
      assertEquals(resOwner.headers.get('Content-Type'), 'application/pdf')
      const ownerBodyText = await resOwner.text()
      assertEquals(ownerBodyText, 'secret-identity-document-bytes')

      // 4. Request by admin -> 200 OK and correct stream
      const reqAdmin = new Request(
        `http://localhost:8000/api/uploads/${filename}`,
        {
          headers: { cookie: adminCookie || '' },
        },
      )
      const resAdmin = await uploadsHandler.GET(reqAdmin, ctx)
      assertEquals(resAdmin.status, 200)
      assertEquals(resAdmin.headers.get('Content-Type'), 'application/pdf')
      const adminBodyText = await resAdmin.text()
      assertEquals(adminBodyText, 'secret-identity-document-bytes')
    },
  )

  // Cleanup after tests
  if (originalUploadsDir) {
    Deno.env.set('UPLOADS_DIR', originalUploadsDir)
  } else {
    Deno.env.delete('UPLOADS_DIR')
  }

  try {
    await Deno.remove(testUploadsDir, { recursive: true })
  } catch (_) {
    // Ignore cleanup error
  }

  // Delete test users and sessions from Deno KV
  const testUsers = kv.list({ prefix: ['user'] })
  for await (const user of testUsers) {
    const val = user.value as { email?: string }
    if (
      val.email === 'resident_owner@example.com' ||
      val.email === 'resident_other@example.com' ||
      val.email === 'admin_user@example.com'
    ) {
      await kv.delete(user.key)
    }
  }

  const testSessions = kv.list({ prefix: ['session'] })
  for await (const session of testSessions) {
    const val = session.value as { userId?: string }
    if (
      val.userId === ownerUser.id || val.userId === otherUser.id ||
      val.userId === adminUser.id
    ) {
      await kv.delete(session.key)
    }
  }

  kv.close()
})
