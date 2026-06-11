import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import { Badge } from '../components/ui/badge.tsx'

Deno.test('Badge component', async (t) => {
  await t.step('renders default variant', () => {
    const html = render(h(Badge, {}, 'Default'))
    assertExists(html.includes('data-slot="badge"'))
    assertExists(html.includes('data-variant="default"'))
    assertExists(html.includes('Default'))
  })

  await t.step('renders secondary variant', () => {
    const html = render(h(Badge, { variant: 'secondary' }, 'Secondary'))
    assertExists(html.includes('data-variant="secondary"'))
  })

  await t.step('renders destructive variant', () => {
    const html = render(h(Badge, { variant: 'destructive' }, 'Destructive'))
    assertExists(html.includes('data-variant="destructive"'))
  })

  await t.step('renders outline variant', () => {
    const html = render(h(Badge, { variant: 'outline' }, 'Outline'))
    assertExists(html.includes('data-variant="outline"'))
  })

  await t.step('renders ghost variant', () => {
    const html = render(h(Badge, { variant: 'ghost' }, 'Ghost'))
    assertExists(html.includes('data-variant="ghost"'))
  })

  await t.step('renders link variant', () => {
    const html = render(h(Badge, { variant: 'link' }, 'Link'))
    assertExists(html.includes('data-variant="link"'))
  })

  await t.step('renders as <span> by default', () => {
    const html = render(h(Badge, {}, 'text'))
    assertEquals(html.trim().startsWith('<span'), true)
  })

  await t.step('merges custom className', () => {
    const html = render(h(Badge, { className: 'extra-class' }, 'test'))
    assertExists(html.includes('extra-class'))
  })

  await t.step('passes extra props', () => {
    const html = render(h(Badge, { id: 'my-badge' }, 'test'))
    assertExists(html.includes('id="my-badge"'))
  })
})
