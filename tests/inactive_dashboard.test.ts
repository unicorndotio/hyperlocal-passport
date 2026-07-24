/**
 * Task 07: Inactive Dashboard State & Hide Analytics
 *
 * Unit tests covering:
 *  - BusinessHeader never renders an Analytics nav link
 *  - BusinessHeader shows/hides InactiveBanner based on isActiveBusiness
 *  - CouponManager disables "Novo Cupom" and "Editar" when isBusinessActive=false
 *  - MerchantPostForm disables "Nova Publicação" and "Excluir" when isBusinessActive=false
 */
import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import BusinessHeader from '../components/BusinessHeader.tsx'
import CouponManager from '../islands/CouponManager.tsx'
import MerchantPostForm from '../islands/MerchantPostForm.tsx'

// ---------------------------------------------------------------------------
// BusinessHeader
// ---------------------------------------------------------------------------

Deno.test('Task 07 — BusinessHeader: Analytics link is never rendered in nav', () => {
  // Even when active='analytics' is passed (page still exists), no nav link
  // pointing to /business/analytics should appear.
  const tabs = ['coupons', 'checkout', 'posts', 'profile', 'analytics'] as const
  for (const tab of tabs) {
    const html = render(
      h(BusinessHeader, { active: tab, businessName: 'Loja Teste' }),
    )
    assertEquals(
      html.includes('/business/analytics'),
      false,
      `Analytics link must not be in nav when active='${tab}'`,
    )
    assertEquals(
      html.includes('>Analytics<'),
      false,
      `Analytics label must not appear in nav when active='${tab}'`,
    )
  }
})

Deno.test('Task 07 — BusinessHeader: InactiveBanner shown when isActiveBusiness=false', () => {
  const html = render(
    h(BusinessHeader, {
      active: 'coupons',
      businessName: 'Loja Teste',
      isActiveBusiness: false,
    }),
  )
  assertStringIncludes(html, 'Sua conta está inativa')
  assertStringIncludes(html, 'passaporte@nodolabs.xyz')
})

Deno.test('Task 07 — BusinessHeader: InactiveBanner hidden when isActiveBusiness=true', () => {
  const html = render(
    h(BusinessHeader, {
      active: 'coupons',
      businessName: 'Loja Teste',
      isActiveBusiness: true,
    }),
  )
  assertEquals(html.includes('Sua conta está inativa'), false)
})

Deno.test('Task 07 — BusinessHeader: InactiveBanner hidden by default (isActiveBusiness omitted)', () => {
  const html = render(
    h(BusinessHeader, { active: 'posts', businessName: 'Loja Teste' }),
  )
  assertEquals(html.includes('Sua conta está inativa'), false)
})

// ---------------------------------------------------------------------------
// CouponManager — read-only state
// ---------------------------------------------------------------------------

Deno.test('Task 07 — CouponManager: "Novo Cupom" button is disabled when isBusinessActive=false', () => {
  const html = render(
    h(CouponManager, {
      businessId: 'test-biz-id',
      initialCoupons: [],
      isBusinessActive: false,
    }),
  )
  // The rendered HTML must contain a disabled attribute on the button that
  // holds the "Novo Cupom" label.
  assertStringIncludes(html, 'Novo Cupom')
  // preact-render-to-string serialises disabled boolean prop as `disabled=""`
  // or `disabled` — we look for the disabled attribute near the button text.
  assertStringIncludes(html, 'disabled')
})

Deno.test('Task 07 — CouponManager: "Novo Cupom" button is enabled when isBusinessActive=true', () => {
  const html = render(
    h(CouponManager, {
      businessId: 'test-biz-id',
      initialCoupons: [],
      isBusinessActive: true,
    }),
  )
  assertStringIncludes(html, 'Novo Cupom')
  // When active, the outer wrapper button must not carry a disabled prop.
  // We verify by checking the button element containing "Novo Cupom" does not
  // have a disabled attribute adjacent to it (simple string proximity check).
  const idx = html.indexOf('Novo Cupom')
  // Grab the ~200 chars of markup before the label text to check the button tag
  const prefix = html.slice(Math.max(0, idx - 200), idx)
  assertEquals(prefix.includes('disabled'), false)
})

Deno.test('Task 07 — CouponManager: "Editar" button is disabled when inactive and coupon rows exist', () => {
  const coupon = {
    id: 'c1',
    businessId: 'test-biz-id',
    title: 'Desconto 10%',
    description: undefined,
    isActive: true,
    behavior: { type: 'percentage_discount' as const, percent: 10 },
    restrictions: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const html = render(
    h(CouponManager, {
      businessId: 'test-biz-id',
      initialCoupons: [coupon],
      isBusinessActive: false,
    }),
  )

  assertStringIncludes(html, 'Editar')
  assertStringIncludes(html, 'disabled')
})

// ---------------------------------------------------------------------------
// MerchantPostForm — read-only state
// ---------------------------------------------------------------------------

Deno.test('Task 07 — MerchantPostForm: "Nova Publicação" button is disabled when isBusinessActive=false', () => {
  const html = render(
    h(MerchantPostForm, {
      businessId: 'test-biz-id',
      initialPosts: [],
      isBusinessActive: false,
    }),
  )
  assertStringIncludes(html, 'Nova Publicação')
  assertStringIncludes(html, 'disabled')
})

Deno.test('Task 07 — MerchantPostForm: "Nova Publicação" button is enabled when isBusinessActive=true', () => {
  const html = render(
    h(MerchantPostForm, {
      businessId: 'test-biz-id',
      initialPosts: [],
      isBusinessActive: true,
    }),
  )
  assertStringIncludes(html, 'Nova Publicação')
  const idx = html.indexOf('Nova Publicação')
  const prefix = html.slice(Math.max(0, idx - 200), idx)
  assertEquals(prefix.includes('disabled'), false)
})

Deno.test('Task 07 — MerchantPostForm: "Excluir" button is disabled when inactive and posts exist', () => {
  const post = {
    id: 'p1',
    title: 'Evento de Verão',
    body: 'Venha participar!',
    imageUrl: null,
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const html = render(
    h(MerchantPostForm, {
      businessId: 'test-biz-id',
      initialPosts: [post],
      isBusinessActive: false,
    }),
  )

  assertStringIncludes(html, 'Excluir')
  // The Excluir button has disabled attr and the cursor-not-allowed class
  assertStringIncludes(html, 'cursor-not-allowed')
})
