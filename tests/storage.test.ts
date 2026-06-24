import {
  assertEquals,
  assertExists,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { join } from 'https://deno.land/std@0.224.0/path/mod.ts'
import { deleteFile, uploadFile } from '../lib/storage.ts'
import { handleGetUpload } from '../routes/api/uploads/[filename].ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { auth } from '../lib/auth.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'npm:drizzle-orm@0.38.2'

Deno.test('Storage and Upload API Tests', async (t) => {
  // Use a temporary uploads directory for testing to prevent polluting the project
  const testUploadsDir = await Deno.makeTempDir({
    prefix: 'local_passport_test_uploads_',
  })
  const originalUploadsDir = Deno.env.get('UPLOADS_DIR')
  Deno.env.set('UPLOADS_DIR', testUploadsDir)

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

  // Get the owner session and verify
  const ownerSession = await auth.api.getSession({
    headers: { cookie: ownerCookie || '' },
  })
  assertExists(ownerSession)
  const ownerUser = ownerSession.user

  // Update user role and status in database
  await db.update(schema.users).set({
    role: 'resident',
    status: 'approved',
  }).where(eq(schema.users.id, ownerUser.id))

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

  // Update user role and status in database
  await db.update(schema.users).set({
    role: 'resident',
    status: 'approved',
  }).where(eq(schema.users.id, otherUser.id))

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

  // Update user role and status in database
  await db.update(schema.users).set({
    role: 'admin',
    status: 'approved',
  }).where(eq(schema.users.id, adminUser.id))

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

      // Verify metadata was stored in PostgreSQL database
      const metaRows = await db.select().from(schema.fileMetadata).where(
        eq(schema.fileMetadata.filename, filename),
      )
      assertExists(metaRows)
      assertEquals(metaRows.length, 1)
      const meta = metaRows[0]
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

    const res = await handleGetUpload(req, filename)
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

      // 1. Unauthenticated request -> 401 Unauthorized
      const reqUnauth = new Request(
        `http://localhost:8000/api/uploads/${filename}`,
      )
      const resUnauth = await handleGetUpload(reqUnauth, filename)
      assertEquals(resUnauth.status, 401)

      // 2. Request by other user (not owner, not admin) -> 403 Forbidden
      const reqOther = new Request(
        `http://localhost:8000/api/uploads/${filename}`,
        {
          headers: { cookie: otherCookie || '' },
        },
      )
      const resOther = await handleGetUpload(reqOther, filename)
      assertEquals(resOther.status, 403)

      // 3. Request by owner -> 200 OK and correct stream
      const reqOwner = new Request(
        `http://localhost:8000/api/uploads/${filename}`,
        {
          headers: { cookie: ownerCookie || '' },
        },
      )
      const resOwner = await handleGetUpload(reqOwner, filename)
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
      const resAdmin = await handleGetUpload(reqAdmin, filename)
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

  // Delete test users from database
  await db.delete(schema.users).where(
    eq(schema.users.email, 'resident_owner@example.com'),
  )
  await db.delete(schema.users).where(
    eq(schema.users.email, 'resident_other@example.com'),
  )
  await db.delete(schema.users).where(
    eq(schema.users.email, 'admin_user@example.com'),
  )
})

Deno.test('deleteFile utility', async (t) => {
  const testDir = await Deno.makeTempDir({
    prefix: 'local_passport_delete_test_',
  })
  const origDir = Deno.env.get('UPLOADS_DIR')
  Deno.env.set('UPLOADS_DIR', testDir)

  await t.step('deletes existing file and metadata', async () => {
    const filePath = join(testDir, 'test_delete.txt')
    await Deno.writeTextFile(filePath, 'content')

    // Store metadata in PostgreSQL database
    await db.insert(schema.fileMetadata).values({
      id: 'test_delete_id',
      filename: 'test_delete.txt',
      userId: 'u1',
      isPublic: false,
    })

    await deleteFile('test_delete.txt')

    // File should be gone from disk
    await assertRejects(
      async () => await Deno.stat(filePath),
      Deno.errors.NotFound,
    )
    // Metadata should be gone from database
    const metaRows = await db.select().from(schema.fileMetadata).where(
      eq(schema.fileMetadata.filename, 'test_delete.txt'),
    )
    assertEquals(metaRows.length, 0)
  })

  await t.step('handles non-existent file idempotently', async () => {
    // Should not throw
    await deleteFile('nonexistent_file.txt')
    // Metadata deletion should also be idempotent
    const metaRows = await db.select().from(schema.fileMetadata).where(
      eq(schema.fileMetadata.filename, 'nonexistent_file.txt'),
    )
    assertEquals(metaRows.length, 0)
  })

  await t.step(
    'logs error when Deno.remove fails with unexpected error',
    async () => {
      const filePath = join(testDir, 'test_perm_deny.txt')
      await Deno.writeTextFile(filePath, 'content')

      // Store metadata in database
      await db.insert(schema.fileMetadata).values({
        id: 'test_perm_deny_id',
        filename: 'test_perm_deny.txt',
        userId: 'u1',
        isPublic: false,
      })

      const removeStub = stub(Deno, 'remove', () => {
        throw new Deno.errors.PermissionDenied('Permission denied')
      })
      try {
        // Should not throw, just console.error
        await deleteFile('test_perm_deny.txt')
        // Metadata should still be deleted
        const metaRows = await db.select().from(schema.fileMetadata).where(
          eq(schema.fileMetadata.filename, 'test_perm_deny.txt'),
        )
        assertEquals(metaRows.length, 0)
      } finally {
        removeStub.restore()
      }
    },
  )

  Deno.env.set('UPLOADS_DIR', origDir || '/app/uploads')
  try {
    await Deno.remove(testDir, { recursive: true })
  } catch { /* ignore */ }
})

Deno.test('uploadFile edge cases', async (t) => {
  const testDir = await Deno.makeTempDir({
    prefix: 'local_passport_upload_edge_',
  })
  const origDir = Deno.env.get('UPLOADS_DIR')
  Deno.env.set('UPLOADS_DIR', testDir)

  await t.step(
    'infers extension from MIME type when filename has no extension',
    async () => {
      const file = new File(['content'], 'avatar', { type: 'image/png' })
      const filename = await uploadFile(file)
      assertEquals(filename.endsWith('.png'), true)
    },
  )

  await t.step(
    'defaults to .bin when no extension and no MIME type',
    async () => {
      const blob = new Blob(['binary-content'])
      const filename = await uploadFile(blob)
      assertEquals(filename.endsWith('.bin'), true)
    },
  )

  Deno.env.set('UPLOADS_DIR', origDir || '/app/uploads')
  try {
    await Deno.remove(testDir, { recursive: true })
  } catch { /* ignore */ }
})

Deno.test('Upload API error branches', async (t) => {
  await t.step('returns 400 for missing filename', async () => {
    const req = new Request('http://localhost:8000/api/uploads/')
    const res = await handleGetUpload(req, '')
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Filename parameter is missing')
  })

  await t.step('returns 404 for non-existent file with session', async () => {
    const stubSession = stub(auth.api, 'getSession', () =>
      Promise.resolve({
        user: {
          id: 'admin_404',
          role: 'admin',
          email: 'admin@test.com',
          name: 'Admin',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'sess_404',
          userId: 'admin_404',
          expiresAt: new Date(Date.now() + 3600000),
          token: 't_404',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }))
    try {
      const req = new Request(
        'http://localhost:8000/api/uploads/nonexistent.png',
      )
      const res = await handleGetUpload(req, 'nonexistent.png')
      assertEquals(res.status, 404)
      const body = await res.json()
      assertEquals(body.error, 'File not found')
    } finally {
      stubSession.restore()
    }
  })
})
