import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handleProfileUpdate } from '../../../../routes/api/businesses/[id]/profile.ts'
import { kv } from '../../../../lib/kv.ts'
import type { SessionUser } from '../../../../utils.ts'

const ownerUser: SessionUser = {
  id: 'owner-1',
  email: 'owner@test.com',
  name: 'Owner',
  role: 'business',
}

const otherUser: SessionUser = {
  id: 'other-1',
  email: 'other@test.com',
  name: 'Other',
  role: 'business',
}

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'admin',
}

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return {
    id: 'biz-test-1',
    userId: ownerUser.id,
    name: 'Minha Empresa',
    companyName: 'Minha Empresa Ltda',
    cnpj: '11222333000181',
    category: 'Alimentação',
    description: 'Uma ótima empresa',
    logoUrl: 'http://localhost:8000/api/uploads/logo.png',
    socialLinks: { instagram: 'https://instagram.com/minhaempresa' },
    openingHours: { monday: { open: '09:00', close: '18:00' } },
    isActive: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

async function seedBusiness(
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const biz = makeBusiness(data)
  await kv.set(['businesses', biz.id as string], biz)
  return biz
}

async function cleanupBusiness(id: string) {
  await kv.delete(['businesses', id])
}

Deno.test('PUT /api/businesses/[id]/profile', async (t) => {
  // --- Unit: non-existent business ---

  await t.step('returns 404 for non-existent business', async () => {
    const req = new Request(
      'http://localhost:8000/api/businesses/nope/profile',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'new desc' }),
      },
    )
    const res = await handleProfileUpdate(req, 'nope', ownerUser)
    assertEquals(res.status, 404)
    const body = await res.json()
    assertEquals(body.error, 'Business not found')
  })

  // --- Unit: ownership check ---

  await t.step('returns 403 when non-owner tries to update', async () => {
    const biz = await seedBusiness()
    try {
      const req = new Request(
        `http://localhost:8000/api/businesses/${biz.id}/profile`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'hacked' }),
        },
      )
      const res = await handleProfileUpdate(req, biz.id as string, otherUser)
      assertEquals(res.status, 403)
      const body = await res.json()
      assertEquals(body.error, 'Forbidden: you do not own this business')
    } finally {
      await cleanupBusiness(biz.id as string)
    }
  })

  // --- Unit: validation ---

  await t.step('returns 400 for invalid openingHours', async () => {
    const biz = await seedBusiness()
    try {
      const req = new Request(
        `http://localhost:8000/api/businesses/${biz.id}/profile`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            openingHours: { invalidDay: { open: '09:00', close: '18:00' } },
          }),
        },
      )
      const res = await handleProfileUpdate(req, biz.id as string, ownerUser)
      assertEquals(res.status, 400)
    } finally {
      await cleanupBusiness(biz.id as string)
    }
  })

  await t.step('returns 400 for invalid socialLinks URL', async () => {
    const biz = await seedBusiness()
    try {
      const req = new Request(
        `http://localhost:8000/api/businesses/${biz.id}/profile`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialLinks: { instagram: 'not-a-url' },
          }),
        },
      )
      const res = await handleProfileUpdate(req, biz.id as string, ownerUser)
      assertEquals(res.status, 400)
    } finally {
      await cleanupBusiness(biz.id as string)
    }
  })

  await t.step(
    'rejects description over 1000 characters via JSON',
    async () => {
      const biz = await seedBusiness()
      try {
        const req = new Request(
          `http://localhost:8000/api/businesses/${biz.id}/profile`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: 'x'.repeat(1001) }),
          },
        )
        const res = await handleProfileUpdate(req, biz.id as string, ownerUser)
        assertEquals(res.status, 400)
        const body = await res.json()
        assertEquals(body.error, 'Description must be at most 1000 characters')
      } finally {
        await cleanupBusiness(biz.id as string)
      }
    },
  )

  await t.step(
    'rejects description over 1000 characters via multipart',
    async () => {
      const biz = await seedBusiness()
      try {
        const form = new FormData()
        form.append('description', 'x'.repeat(1001))
        const req = new Request(
          `http://localhost:8000/api/businesses/${biz.id}/profile`,
          { method: 'PUT', body: form },
        )
        const res = await handleProfileUpdate(req, biz.id as string, ownerUser)
        assertEquals(res.status, 400)
        const body = await res.json()
        assertEquals(body.error, 'Description must be at most 1000 characters')
      } finally {
        await cleanupBusiness(biz.id as string)
      }
    },
  )

  await t.step('returns 400 for invalid JSON body', async () => {
    const biz = await seedBusiness()
    try {
      const req = new Request(
        `http://localhost:8000/api/businesses/${biz.id}/profile`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: 'not json',
        },
      )
      const res = await handleProfileUpdate(req, biz.id as string, ownerUser)
      assertEquals(res.status, 400)
    } finally {
      await cleanupBusiness(biz.id as string)
    }
  })

  await t.step('returns 400 when no valid fields provided', async () => {
    const biz = await seedBusiness()
    try {
      const req = new Request(
        `http://localhost:8000/api/businesses/${biz.id}/profile`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unknownField: 'value' }),
        },
      )
      const res = await handleProfileUpdate(req, biz.id as string, ownerUser)
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'No valid fields to update')
    } finally {
      await cleanupBusiness(biz.id as string)
    }
  })

  // --- Unit: partial update ---

  await t.step('partial update changes only provided fields', async () => {
    const biz = await seedBusiness()
    try {
      const req = new Request(
        `http://localhost:8000/api/businesses/${biz.id}/profile`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Descrição atualizada' }),
        },
      )
      const res = await handleProfileUpdate(req, biz.id as string, ownerUser)
      assertEquals(res.status, 200)
      const body = await res.json()
      assertEquals(body.description, 'Descrição atualizada')
      assertEquals(body.name, 'Minha Empresa')
      assertEquals(
        body.socialLinks.instagram,
        'https://instagram.com/minhaempresa',
      )
    } finally {
      await cleanupBusiness(biz.id as string)
    }
  })

  // --- Integration: full update via JSON ---

  await t.step(
    'business owner updates description, socialLinks, openingHours via JSON',
    async () => {
      const biz = await seedBusiness()
      try {
        const req = new Request(
          `http://localhost:8000/api/businesses/${biz.id}/profile`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: 'Nova descrição',
              socialLinks: {
                instagram: 'https://instagram.com/novo',
                whatsapp: 'https://wa.me/5511999999999',
              },
              openingHours: {
                monday: { open: '08:00', close: '17:00' },
                friday: { open: '08:00', close: '16:00' },
              },
            }),
          },
        )
        const res = await handleProfileUpdate(
          req,
          biz.id as string,
          ownerUser,
        )
        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(body.description, 'Nova descrição')
        assertEquals(
          body.socialLinks.instagram,
          'https://instagram.com/novo',
        )
        assertEquals(body.socialLinks.whatsapp, 'https://wa.me/5511999999999')
        assertEquals(body.openingHours.monday.open, '08:00')
        assertEquals(body.openingHours.friday.open, '08:00')

        const stored = await kv.get(['businesses', biz.id as string])
        assertEquals(
          (stored.value as Record<string, unknown>).description,
          'Nova descrição',
        )
      } finally {
        await cleanupBusiness(biz.id as string)
      }
    },
  )

  // --- Integration: logo re-upload ---

  await t.step(
    'business owner re-uploads logo via multipart',
    async () => {
      const testUploadsDir = await Deno.makeTempDir({
        prefix: 'profile_logo_test_',
      })
      const originalUploadsDir = Deno.env.get('UPLOADS_DIR')
      const originalBaseUrl = Deno.env.get('APP_BASE_URL')
      Deno.env.set('UPLOADS_DIR', testUploadsDir)
      Deno.env.set('APP_BASE_URL', 'http://localhost:8000')

      const biz = await seedBusiness()
      try {
        const form = new FormData()
        form.append(
          'logo',
          new File(['new-logo-bytes'], 'logo.png', { type: 'image/png' }),
        )
        form.append('description', 'Com novo logo')

        const req = new Request(
          `http://localhost:8000/api/businesses/${biz.id}/profile`,
          { method: 'PUT', body: form },
        )
        const res = await handleProfileUpdate(
          req,
          biz.id as string,
          ownerUser,
        )
        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(body.description, 'Com novo logo')
        assertExists(body.logoUrl)
        assertEquals(
          body.logoUrl.startsWith('http://localhost:8000/api/uploads/'),
          true,
        )
        assertEquals(body.name, 'Minha Empresa')
      } finally {
        await cleanupBusiness(biz.id as string)
        if (originalUploadsDir) {
          Deno.env.set('UPLOADS_DIR', originalUploadsDir)
        } else {
          Deno.env.delete('UPLOADS_DIR')
        }
        if (originalBaseUrl) {
          Deno.env.set('APP_BASE_URL', originalBaseUrl)
        } else {
          Deno.env.delete('APP_BASE_URL')
        }
        try {
          await Deno.remove(testUploadsDir, { recursive: true })
        } catch {
          // ignore
        }
      }
    },
  )

  // --- Unit: upload failure returns structured error ---

  await t.step(
    'returns structured { error } response when upload fails',
    async () => {
      const biz = await seedBusiness()
      try {
        const invalidFile = new File(
          ['some-content'],
          'logo.xyz',
          { type: 'application/octet-stream' },
        )
        const form = new FormData()
        form.append('logo', invalidFile)
        form.append('description', 'With invalid logo')

        const req = new Request(
          `http://localhost:8000/api/businesses/${biz.id}/profile`,
          { method: 'PUT', body: form },
        )
        const res = await handleProfileUpdate(
          req,
          biz.id as string,
          ownerUser,
        )
        assertEquals(res.status, 400)
        const body = await res.json()
        assertEquals(typeof body.error, 'string')
        assertExists(body.error)
      } finally {
        await cleanupBusiness(biz.id as string)
      }
    },
  )

  // --- Integration: admin updates any business ---

  await t.step('admin can update any business profile', async () => {
    const biz = await seedBusiness()
    try {
      const req = new Request(
        `http://localhost:8000/api/businesses/${biz.id}/profile`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Updated by admin' }),
        },
      )
      const res = await handleProfileUpdate(req, biz.id as string, adminUser)
      assertEquals(res.status, 200)
      const body = await res.json()
      assertEquals(body.description, 'Updated by admin')
    } finally {
      await cleanupBusiness(biz.id as string)
    }
  })
})
