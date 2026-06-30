import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { sql } from 'drizzle-orm'

type PostIdxCtx = { req: Request; state: Record<string, unknown> }
type PostIdCtx = PostIdxCtx & { params: Record<string, string> }

if (Deno.env.get('PG_CONNECTION')) {
  const { handler: postsHandler } = await import('../routes/api/posts/index.ts')
  const { handler: postHandler } = await import('../routes/api/posts/[id].ts')
  const { refreshFeedView } = await import('../lib/feed.ts')
  const { db } = await import('../lib/db.ts')
  const schema = await import('../db/schema.ts')
  const { eq } = await import('drizzle-orm')

  const typedPostsHandler = postsHandler as unknown as {
    POST: (ctx: PostIdxCtx) => Promise<Response>
    GET: (ctx: PostIdxCtx) => Promise<Response>
  }

  const typedPostHandler = postHandler as unknown as {
    PUT: (ctx: PostIdCtx) => Promise<Response>
    DELETE: (ctx: PostIdCtx) => Promise<Response>
  }

  Deno.test({
    name: 'POST /api/posts - auth enforcement',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'post-auth-user-' + crypto.randomUUID()
      const businessId = 'post-auth-biz-' + crypto.randomUUID()

      try {
        await db.insert(schema.users).values({
          id: userId,
          email: `post-auth-${userId}@test.com`,
          name: 'Post Auth User',
          role: 'business',
          emailVerified: true,
        })

        await db.insert(schema.businesses).values({
          id: businessId,
          userId,
          name: 'Post Auth Biz',
          companyName: 'Post Auth Biz Co',
          cnpj: 'AUTH' + crypto.randomUUID().slice(0, 10),
          category: 'test',
          logoUrl: '/logo.png',
          isActive: true,
        })

        await t.step('POST without authentication returns 401', async () => {
          const req = new Request('http://localhost/api/posts', {
            method: 'POST',
          })
          const res = await typedPostsHandler.POST({
            req,
            state: { user: null, session: null },
          })
          assertEquals(res.status, 401)
        })

        await t.step('POST with resident role returns 403', async () => {
          const req = new Request('http://localhost/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Test' }),
          })
          const res = await typedPostsHandler.POST({
            req,
            state: {
              user: { id: 'resident-id', role: 'resident' },
              session: null,
            },
          })
          assertEquals(res.status, 403)
        })
      } finally {
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
        await db.delete(schema.users).where(eq(schema.users.id, userId))
      }
    },
  })

  Deno.test({
    name: 'POST /api/posts - with valid business session creates post',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'post-create-user-' + crypto.randomUUID()
      const businessId = 'post-create-biz-' + crypto.randomUUID()

      try {
        await db.insert(schema.users).values({
          id: userId,
          email: `post-create-${userId}@test.com`,
          name: 'Post Create User',
          role: 'business',
          emailVerified: true,
        })

        await db.insert(schema.businesses).values({
          id: businessId,
          userId,
          name: 'Post Create Biz',
          companyName: 'Post Create Biz Co',
          cnpj: 'CREATE' + crypto.randomUUID().slice(0, 10),
          category: 'test',
          logoUrl: '/logo.png',
          isActive: true,
        })

        await t.step('creates post with required fields only', async () => {
          const req = new Request('http://localhost/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Test Post Title' }),
          })
          const res = await typedPostsHandler.POST({
            req,
            state: { user: { id: userId, role: 'business' }, session: null },
          })
          assertEquals(res.status, 201)

          const post = await res.json()
          assertEquals(post.title, 'Test Post Title')
          assertEquals(post.body, null)
          assertEquals(post.imageUrl, null)
          assertEquals(post.isVisible, false)
          assertExists(post.id)
          assertExists(post.createdAt)

          await db.delete(schema.merchantPosts).where(
            eq(schema.merchantPosts.id, post.id),
          )
        })

        await t.step(
          'rejects imageUrl in JSON body (must use multipart)',
          async () => {
            const req = new Request('http://localhost/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: 'Full Post',
                body: 'This is the post body',
                imageUrl: 'https://example.com/image.jpg',
              }),
            })
            const res = await typedPostsHandler.POST({
              req,
              state: { user: { id: userId, role: 'business' }, session: null },
            })
            assertEquals(res.status, 400)

            const data = await res.json()
            assertEquals(
              data.error,
              'Image must be uploaded via multipart/form-data',
            )
          },
        )

        await t.step(
          'creates post with isVisible=false by default',
          async () => {
            const req = new Request('http://localhost/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: 'Hidden Post' }),
            })
            const res = await typedPostsHandler.POST({
              req,
              state: { user: { id: userId, role: 'business' }, session: null },
            })
            assertEquals(res.status, 201)

            const post = await res.json()
            assertEquals(post.isVisible, false)

            await db.delete(schema.merchantPosts).where(
              eq(schema.merchantPosts.id, post.id),
            )
          },
        )

        await t.step('rejects empty title', async () => {
          const req = new Request('http://localhost/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: '' }),
          })
          const res = await typedPostsHandler.POST({
            req,
            state: { user: { id: userId, role: 'business' }, session: null },
          })
          assertEquals(res.status, 400)
        })

        await t.step('rejects title exceeding 255 chars', async () => {
          const req = new Request('http://localhost/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'x'.repeat(256) }),
          })
          const res = await typedPostsHandler.POST({
            req,
            state: { user: { id: userId, role: 'business' }, session: null },
          })
          assertEquals(res.status, 400)
        })
      } finally {
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
        await db.delete(schema.users).where(eq(schema.users.id, userId))
      }
    },
  })

  Deno.test({
    name: 'GET /api/posts - returns business posts',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'post-list-user-' + crypto.randomUUID()
      const businessId = 'post-list-biz-' + crypto.randomUUID()
      const otherUserId = 'post-list-other-' + crypto.randomUUID()
      const otherBusinessId = 'post-list-other-biz-' + crypto.randomUUID()

      try {
        await db.insert(schema.users).values([
          {
            id: userId,
            email: `post-list-${userId}@test.com`,
            name: 'Post List User',
            role: 'business',
            emailVerified: true,
          },
          {
            id: otherUserId,
            email: `post-list-${otherUserId}@test.com`,
            name: 'Other Business',
            role: 'business',
            emailVerified: true,
          },
        ])

        await db.insert(schema.businesses).values([
          {
            id: businessId,
            userId,
            name: 'Post List Biz',
            companyName: 'Post List Biz Co',
            cnpj: 'LIST1' + crypto.randomUUID().slice(0, 10),
            category: 'test',
            logoUrl: '/logo.png',
            isActive: true,
          },
          {
            id: otherBusinessId,
            userId: otherUserId,
            name: 'Other Biz',
            companyName: 'Other Biz Co',
            cnpj: 'LIST2' + crypto.randomUUID().slice(0, 10),
            category: 'test',
            logoUrl: '/logo.png',
            isActive: true,
          },
        ])

        const post1Id = crypto.randomUUID()
        const post2Id = crypto.randomUUID()
        const otherPostId = crypto.randomUUID()

        await db.insert(schema.merchantPosts).values([
          {
            id: post1Id,
            businessId,
            title: 'Post 1',
            body: 'Body 1',
            isVisible: false,
          },
          {
            id: post2Id,
            businessId,
            title: 'Post 2',
            body: 'Body 2',
            isVisible: false,
          },
          {
            id: otherPostId,
            businessId: otherBusinessId,
            title: 'Other Post',
            body: 'Other Body',
            isVisible: true,
          },
        ])

        await t.step(
          'returns only own posts for authenticated business',
          async () => {
            const req = new Request('http://localhost/api/posts')
            const res = await typedPostsHandler.GET({
              req,
              state: { user: { id: userId, role: 'business' }, session: null },
            })
            assertEquals(res.status, 200)

            const posts = await res.json()
            assertEquals(Array.isArray(posts), true)
            assertEquals(posts.length, 2)

            const titles = posts.map((p: { title: string }) => p.title).sort()
            assertEquals(titles, ['Post 1', 'Post 2'])
          },
        )

        await t.step(
          'returns empty list when business has no posts',
          async () => {
            const tempUserId = 'post-empty-user-' + crypto.randomUUID()
            const tempBizId = 'post-empty-biz-' + crypto.randomUUID()

            try {
              await db.insert(schema.users).values({
                id: tempUserId,
                email: `post-empty-${tempUserId}@test.com`,
                name: 'Empty User',
                role: 'business',
                emailVerified: true,
              })
              await db.insert(schema.businesses).values({
                id: tempBizId,
                userId: tempUserId,
                name: 'Empty Biz',
                companyName: 'Empty Biz Co',
                cnpj: 'EMPTY' + crypto.randomUUID().slice(0, 10),
                category: 'test',
                logoUrl: '/logo.png',
                isActive: true,
              })

              const req = new Request('http://localhost/api/posts')
              const res = await typedPostsHandler.GET({
                req,
                state: {
                  user: { id: tempUserId, role: 'business' },
                  session: null,
                },
              })
              assertEquals(res.status, 200)
              const posts = await res.json()
              assertEquals(posts.length, 0)
            } finally {
              await db.delete(schema.merchantPosts)
              await db.delete(schema.businesses).where(
                eq(schema.businesses.id, tempBizId),
              )
              await db.delete(schema.users).where(
                eq(schema.users.id, tempUserId),
              )
            }
          },
        )
      } finally {
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses)
        await db.delete(schema.users)
      }
    },
  })

  Deno.test({
    name: 'PUT /api/posts/[id] - update own post',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'post-upd-user-' + crypto.randomUUID()
      const businessId = 'post-upd-biz-' + crypto.randomUUID()
      const otherUserId = 'post-upd-other-' + crypto.randomUUID()
      const otherBusinessId = 'post-upd-other-biz-' + crypto.randomUUID()

      try {
        await db.insert(schema.users).values([
          {
            id: userId,
            email: `post-upd-${userId}@test.com`,
            name: 'Update User',
            role: 'business',
            emailVerified: true,
          },
          {
            id: otherUserId,
            email: `post-upd-${otherUserId}@test.com`,
            name: 'Other User',
            role: 'business',
            emailVerified: true,
          },
        ])

        await db.insert(schema.businesses).values([
          {
            id: businessId,
            userId,
            name: 'Update Biz',
            companyName: 'Update Biz Co',
            cnpj: 'UPDATE1' + crypto.randomUUID().slice(0, 10),
            category: 'test',
            logoUrl: '/logo.png',
            isActive: true,
          },
          {
            id: otherBusinessId,
            userId: otherUserId,
            name: 'Other Biz',
            companyName: 'Other Biz Co',
            cnpj: 'UPDATE2' + crypto.randomUUID().slice(0, 10),
            category: 'test',
            logoUrl: '/logo.png',
            isActive: true,
          },
        ])

        const postId = crypto.randomUUID()
        const otherPostId = crypto.randomUUID()

        await db.insert(schema.merchantPosts).values([
          {
            id: postId,
            businessId,
            title: 'Original Title',
            body: 'Original body',
            isVisible: false,
          },
          {
            id: otherPostId,
            businessId: otherBusinessId,
            title: 'Other Post',
            body: 'Other body',
            isVisible: false,
          },
        ])

        await t.step('updates own post title and body', async () => {
          const req = new Request(`http://localhost/api/posts/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Updated Title',
              body: 'Updated body',
            }),
          })
          const res = await typedPostHandler.PUT({
            req,
            state: { user: { id: userId, role: 'business' }, session: null },
            params: { id: postId },
          })
          assertEquals(res.status, 200)

          const post = await res.json()
          assertEquals(post.title, 'Updated Title')
          assertEquals(post.body, 'Updated body')

          const [stored] = await db.select().from(schema.merchantPosts)
            .where(eq(schema.merchantPosts.id, postId)).limit(1)
          assertEquals(stored.title, 'Updated Title')
          assertEquals(stored.body, 'Updated body')
        })

        await t.step(
          'rejects imageUrl in PUT JSON body',
          async () => {
            const req = new Request(`http://localhost/api/posts/${postId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: 'Still Visible',
                imageUrl: 'https://evil.example.com/tracker.gif',
              }),
            })
            const res = await typedPostHandler.PUT({
              req,
              state: { user: { id: userId, role: 'business' }, session: null },
              params: { id: postId },
            })
            assertEquals(res.status, 400)

            const data = await res.json()
            assertEquals(
              data.error,
              'Image must be updated via multipart/form-data',
            )
          },
        )

        await t.step(
          'returns 403 when updating another business post',
          async () => {
            const req = new Request(
              `http://localhost/api/posts/${otherPostId}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Hacked Title' }),
              },
            )
            const res = await typedPostHandler.PUT({
              req,
              state: { user: { id: userId, role: 'business' }, session: null },
              params: { id: otherPostId },
            })
            assertEquals(res.status, 403)
          },
        )

        await t.step('returns 404 for non-existent post', async () => {
          const ghostId = crypto.randomUUID()
          const req = new Request(`http://localhost/api/posts/${ghostId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Ghost' }),
          })
          const res = await typedPostHandler.PUT({
            req,
            state: { user: { id: userId, role: 'business' }, session: null },
            params: { id: ghostId },
          })
          assertEquals(res.status, 404)
        })
      } finally {
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses)
        await db.delete(schema.users)
      }
    },
  })

  Deno.test({
    name: 'DELETE /api/posts/[id] - delete own post',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'post-del-user-' + crypto.randomUUID()
      const businessId = 'post-del-biz-' + crypto.randomUUID()
      const otherUserId = 'post-del-other-' + crypto.randomUUID()
      const otherBusinessId = 'post-del-other-biz-' + crypto.randomUUID()

      try {
        await db.insert(schema.users).values([
          {
            id: userId,
            email: `post-del-${userId}@test.com`,
            name: 'Delete User',
            role: 'business',
            emailVerified: true,
          },
          {
            id: otherUserId,
            email: `post-del-${otherUserId}@test.com`,
            name: 'Other User',
            role: 'business',
            emailVerified: true,
          },
        ])

        await db.insert(schema.businesses).values([
          {
            id: businessId,
            userId,
            name: 'Delete Biz',
            companyName: 'Delete Biz Co',
            cnpj: 'DELETE1' + crypto.randomUUID().slice(0, 10),
            category: 'test',
            logoUrl: '/logo.png',
            isActive: true,
          },
          {
            id: otherBusinessId,
            userId: otherUserId,
            name: 'Other Biz',
            companyName: 'Other Biz Co',
            cnpj: 'DELETE2' + crypto.randomUUID().slice(0, 10),
            category: 'test',
            logoUrl: '/logo.png',
            isActive: true,
          },
        ])

        const postId = crypto.randomUUID()
        const otherPostId = crypto.randomUUID()

        await db.insert(schema.merchantPosts).values([
          {
            id: postId,
            businessId,
            title: 'To Delete',
            body: 'Will be deleted',
            isVisible: false,
          },
          {
            id: otherPostId,
            businessId: otherBusinessId,
            title: 'Not Mine',
            body: 'Belongs to other',
            isVisible: false,
          },
        ])

        await t.step('deletes own post', async () => {
          const req = new Request(`http://localhost/api/posts/${postId}`, {
            method: 'DELETE',
          })
          const res = await typedPostHandler.DELETE({
            req,
            state: { user: { id: userId, role: 'business' }, session: null },
            params: { id: postId },
          })
          assertEquals(res.status, 204)

          const [stored] = await db.select().from(schema.merchantPosts)
            .where(eq(schema.merchantPosts.id, postId)).limit(1)
          assertEquals(stored, undefined)
        })

        await t.step(
          'returns 403 when deleting another business post',
          async () => {
            const req = new Request(
              `http://localhost/api/posts/${otherPostId}`,
              { method: 'DELETE' },
            )
            const res = await typedPostHandler.DELETE({
              req,
              state: { user: { id: userId, role: 'business' }, session: null },
              params: { id: otherPostId },
            })
            assertEquals(res.status, 403)
          },
        )

        await t.step('returns 404 for non-existent post', async () => {
          const ghostId = crypto.randomUUID()
          const req = new Request(`http://localhost/api/posts/${ghostId}`, {
            method: 'DELETE',
          })
          const res = await typedPostHandler.DELETE({
            req,
            state: { user: { id: userId, role: 'business' }, session: null },
            params: { id: ghostId },
          })
          assertEquals(res.status, 404)
        })
      } finally {
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses)
        await db.delete(schema.users)
      }
    },
  })

  Deno.test({
    name:
      'DELETE /api/posts/[id] - post is removed from feed_events after deletion',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'post-del-mv-user-' + crypto.randomUUID()
      const businessId = 'post-del-mv-biz-' + crypto.randomUUID()

      try {
        await db.insert(schema.users).values({
          id: userId,
          email: `post-del-mv-${userId}@test.com`,
          name: 'Delete MV User',
          role: 'business',
          emailVerified: true,
        })

        await db.insert(schema.businesses).values({
          id: businessId,
          userId,
          name: 'Delete MV Biz',
          companyName: 'Delete MV Biz Co',
          cnpj: 'DELMV' + crypto.randomUUID().slice(0, 10),
          category: 'test',
          logoUrl: '/logo.png',
          isActive: true,
        })

        const postId = crypto.randomUUID()

        await db.insert(schema.merchantPosts).values({
          id: postId,
          businessId,
          title: 'To Delete from Feed',
          body: 'Will be removed from feed_events',
          isVisible: false,
        })

        await refreshFeedView(db)

        await t.step(
          'post is present in feed_events before deletion',
          async () => {
            const result = await db.execute(sql`
              SELECT * FROM feed_events WHERE id = ${postId + '-merchant'}
            `)
            assertEquals(result.rows.length, 1)
            assertEquals(result.rows[0].type, 'merchant_post')
            assertEquals(result.rows[0].title, 'To Delete from Feed')
          },
        )

        await t.step(
          'post is removed from feed_events after deletion',
          async () => {
            const req = new Request(`http://localhost/api/posts/${postId}`, {
              method: 'DELETE',
            })
            const res = await typedPostHandler.DELETE({
              req,
              state: {
                user: { id: userId, role: 'business' },
                session: null,
              },
              params: { id: postId },
            })
            assertEquals(res.status, 204)

            const result = await db.execute(sql`
              SELECT * FROM feed_events WHERE id = ${postId + '-merchant'}
            `)
            assertEquals(result.rows.length, 0)
          },
        )
      } finally {
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
        await db.delete(schema.users).where(eq(schema.users.id, userId))
      }
    },
  })

  Deno.test({
    name: 'DELETE /api/posts/[id] - MV refresh failure does not block deletion',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const userId = 'del-mv-fail-user-' + crypto.randomUUID()
      const businessId = 'del-mv-fail-biz-' + crypto.randomUUID()
      const postId = crypto.randomUUID()

      const originalExecute = db.execute.bind(db)

      try {
        await db.insert(schema.users).values({
          id: userId,
          email: `del-mv-fail-${userId}@test.com`,
          name: 'Del MV Fail User',
          role: 'business',
          emailVerified: true,
        })

        await db.insert(schema.businesses).values({
          id: businessId,
          userId,
          name: 'Del MV Fail Biz',
          companyName: 'Del MV Fail Biz Co',
          cnpj: 'DMVFL' + crypto.randomUUID().slice(0, 10),
          category: 'test',
          logoUrl: '/logo.png',
          isActive: true,
        })

        await db.insert(schema.merchantPosts).values({
          id: postId,
          businessId,
          title: 'Delete Despite Fail',
          body: 'Should delete even if MV refresh fails',
          isVisible: false,
        })

        db.execute = ((query: unknown) => {
          const sqlStr = String(query)
          if (sqlStr.includes('REFRESH MATERIALIZED VIEW')) {
            throw new Error('Simulated MV refresh failure')
          }
          return originalExecute(query as Parameters<typeof db.execute>[0])
        }) as typeof db.execute

        const req = new Request(`http://localhost/api/posts/${postId}`, {
          method: 'DELETE',
        })
        const res = await typedPostHandler.DELETE({
          req,
          state: { user: { id: userId, role: 'business' }, session: null },
          params: { id: postId },
        })
        assertEquals(res.status, 204)

        const [stored] = await db.select().from(schema.merchantPosts)
          .where(eq(schema.merchantPosts.id, postId)).limit(1)
        assertEquals(stored, undefined)
      } finally {
        db.execute = originalExecute
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
        await db.delete(schema.users).where(eq(schema.users.id, userId))
      }
    },
  })

  Deno.test({
    name: 'POST /api/posts - triggers MV refresh and post appears in feed',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'post-mv-user-' + crypto.randomUUID()
      const businessId = 'post-mv-biz-' + crypto.randomUUID()

      try {
        await db.insert(schema.users).values({
          id: userId,
          email: `post-mv-${userId}@test.com`,
          name: 'MV Refresh User',
          role: 'business',
          emailVerified: true,
        })

        await db.insert(schema.businesses).values({
          id: businessId,
          userId,
          name: 'MV Refresh Biz',
          companyName: 'MV Refresh Biz Co',
          cnpj: 'MVREF' + crypto.randomUUID().slice(0, 10),
          category: 'test',
          logoUrl: '/logo.png',
          isActive: true,
        })

        await t.step('post appears in feed_events after creation', async () => {
          const req = new Request('http://localhost/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'MV Feed Post' }),
          })
          const res = await typedPostsHandler.POST({
            req,
            state: { user: { id: userId, role: 'business' }, session: null },
          })
          assertEquals(res.status, 201)
          const post = await res.json()

          const result = await db.execute(sql`
            SELECT * FROM feed_events WHERE id = ${post.id + '-merchant'}
          `)
          assertEquals(result.rows.length, 1)
          assertEquals(result.rows[0].type, 'merchant_post')
          assertEquals(result.rows[0].title, 'MV Feed Post')
          assertEquals(result.rows[0].business_name, 'MV Refresh Biz')

          await db.delete(schema.merchantPosts).where(
            eq(schema.merchantPosts.id, post.id),
          )
          await refreshFeedView(db)
        })
      } finally {
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
        await db.delete(schema.users).where(eq(schema.users.id, userId))
      }
    },
  })

  Deno.test({
    name: 'POST /api/posts with multipart form data',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'post-mp-user-' + crypto.randomUUID()
      const businessId = 'post-mp-biz-' + crypto.randomUUID()

      try {
        await db.insert(schema.users).values({
          id: userId,
          email: `post-mp-${userId}@test.com`,
          name: 'Multipart User',
          role: 'business',
          emailVerified: true,
        })

        await db.insert(schema.businesses).values({
          id: businessId,
          userId,
          name: 'Multipart Biz',
          companyName: 'Multipart Biz Co',
          cnpj: 'MPART' + crypto.randomUUID().slice(0, 10),
          category: 'test',
          logoUrl: '/logo.png',
          isActive: true,
        })

        await t.step(
          'accepts multipart form with text fields only',
          async () => {
            const formData = new FormData()
            formData.append('title', 'Multipart Post')
            formData.append('body', 'Created via multipart')

            const req = new Request('http://localhost/api/posts', {
              method: 'POST',
              body: formData,
            })
            const res = await typedPostsHandler.POST({
              req,
              state: { user: { id: userId, role: 'business' }, session: null },
            })
            assertEquals(res.status, 201)

            const post = await res.json()
            assertEquals(post.title, 'Multipart Post')
            assertEquals(post.body, 'Created via multipart')

            await db.delete(schema.merchantPosts).where(
              eq(schema.merchantPosts.id, post.id),
            )
          },
        )
      } finally {
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
        await db.delete(schema.users).where(eq(schema.users.id, userId))
      }
    },
  })
  Deno.test({
    name: 'POST /api/posts - MV refresh failure does not block creation',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const userId = 'post-mv-fail-user-' + crypto.randomUUID()
      const businessId = 'post-mv-fail-biz-' + crypto.randomUUID()

      const originalExecute = db.execute.bind(db)

      try {
        await db.insert(schema.users).values({
          id: userId,
          email: `post-mv-fail-${userId}@test.com`,
          name: 'MV Fail User',
          role: 'business',
          emailVerified: true,
        })

        await db.insert(schema.businesses).values({
          id: businessId,
          userId,
          name: 'MV Fail Biz',
          companyName: 'MV Fail Biz Co',
          cnpj: 'MVFAIL' + crypto.randomUUID().slice(0, 10),
          category: 'test',
          logoUrl: '/logo.png',
          isActive: true,
        })

        db.execute = ((query: unknown) => {
          const sqlStr = String(query)
          if (sqlStr.includes('REFRESH MATERIALIZED VIEW')) {
            throw new Error('Simulated MV refresh failure')
          }
          return originalExecute(query as Parameters<typeof db.execute>[0])
        }) as typeof db.execute

        const req = new Request('http://localhost/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Fail Test Post' }),
        })
        const res = await typedPostsHandler.POST({
          req,
          state: { user: { id: userId, role: 'business' }, session: null },
        })
        assertEquals(res.status, 201)
        const data = await res.json()
        assertEquals(data.title, 'Fail Test Post')
      } finally {
        db.execute = originalExecute
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
        await db.delete(schema.users).where(eq(schema.users.id, userId))
      }
    },
  })

  Deno.test({
    name: 'PUT /api/posts/[id] - MV refresh failure does not block update',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const userId = 'put-mv-fail-user-' + crypto.randomUUID()
      const businessId = 'put-mv-fail-biz-' + crypto.randomUUID()
      const postId = crypto.randomUUID()

      const originalExecute = db.execute.bind(db)

      try {
        await db.insert(schema.users).values({
          id: userId,
          email: `put-mv-fail-${userId}@test.com`,
          name: 'PUT MV Fail User',
          role: 'business',
          emailVerified: true,
        })

        await db.insert(schema.businesses).values({
          id: businessId,
          userId,
          name: 'PUT MV Fail Biz',
          companyName: 'PUT MV Fail Biz Co',
          cnpj: 'PMVFL' + crypto.randomUUID().slice(0, 10),
          category: 'test',
          logoUrl: '/logo.png',
          isActive: true,
        })

        await db.insert(schema.merchantPosts).values({
          id: postId,
          businessId,
          title: 'Original',
          body: 'Original body',
          isVisible: false,
        })

        db.execute = ((query: unknown) => {
          const sqlStr = String(query)
          if (sqlStr.includes('REFRESH MATERIALIZED VIEW')) {
            throw new Error('Simulated MV refresh failure')
          }
          return originalExecute(query as Parameters<typeof db.execute>[0])
        }) as typeof db.execute

        const req = new Request(`http://localhost/api/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated Despite Fail' }),
        })
        const res = await typedPostHandler.PUT({
          req,
          state: { user: { id: userId, role: 'business' }, session: null },
          params: { id: postId },
        })
        assertEquals(res.status, 200)
        const data = await res.json()
        assertEquals(data.title, 'Updated Despite Fail')
      } finally {
        db.execute = originalExecute
        await db.delete(schema.merchantPosts)
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
        await db.delete(schema.users).where(eq(schema.users.id, userId))
      }
    },
  })
} else {
  Deno.test('Posts API tests - Skipped (PG_CONNECTION not set)', () => {
    console.info(
      '[Test info] posts_api.test.ts skipped - PG_CONNECTION not set',
    )
  })
}
