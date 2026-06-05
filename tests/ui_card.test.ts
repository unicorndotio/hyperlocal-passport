import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card.tsx'

Deno.test('Card components', async (t) => {
  await t.step('Card renders with default size', () => {
    const html = render(h(Card, {}, h('div', {}, 'content')))
    assertExists(html.includes('data-slot="card"'))
    assertExists(html.includes('data-size="default"'))
    assertExists(html.includes('content'))
  })

  await t.step('Card renders with sm size', () => {
    const html = render(h(Card, { size: 'sm' }, h('div', {}, 'content')))
    assertExists(html.includes('data-size="sm"'))
  })

  await t.step('Card merges custom className', () => {
    const html = render(h(Card, { className: 'my-custom-class' }, h('div', {}, 'content')))
    assertExists(html.includes('my-custom-class'))
    assertExists(html.includes('data-slot="card"'))
  })

  await t.step('CardHeader renders with data-slot', () => {
    const html = render(h(CardHeader, {}, h('div', {}, 'header')))
    assertExists(html.includes('data-slot="card-header"'))
    assertExists(html.includes('header'))
  })

  await t.step('CardTitle renders with data-slot', () => {
    const html = render(h(CardTitle, {}, 'Title Text'))
    assertExists(html.includes('data-slot="card-title"'))
    assertExists(html.includes('Title Text'))
  })

  await t.step('CardDescription renders with data-slot', () => {
    const html = render(h(CardDescription, {}, 'Description text'))
    assertExists(html.includes('data-slot="card-description"'))
    assertExists(html.includes('Description text'))
  })

  await t.step('CardAction renders with data-slot', () => {
    const html = render(h(CardAction, {}, h('button', {}, 'action')))
    assertExists(html.includes('data-slot="card-action"'))
    assertExists(html.includes('button'))
  })

  await t.step('CardContent renders with data-slot', () => {
    const html = render(h(CardContent, {}, 'content body'))
    assertExists(html.includes('data-slot="card-content"'))
    assertExists(html.includes('content body'))
  })

  await t.step('CardFooter renders with data-slot', () => {
    const html = render(h(CardFooter, {}, h('span', {}, 'footer')))
    assertExists(html.includes('data-slot="card-footer"'))
    assertExists(html.includes('footer'))
  })

  await t.step('Card nested structure renders complete', () => {
    const html = render(
      h(Card, {},
        h(CardHeader, {},
          h(CardTitle, {}, 'My Title'),
          h(CardDescription, {}, 'My Description'),
          h(CardAction, {}, h('button', {}, 'X')),
        ),
        h(CardContent, {}, 'Body'),
        h(CardFooter, {}, 'Footer'),
      ),
    )
    assertExists(html.includes('My Title'))
    assertExists(html.includes('My Description'))
    assertExists(html.includes('Body'))
    assertExists(html.includes('Footer'))
    assertExists(html.includes('data-slot="card"'))
  })

  await t.step('all exports are defined', () => {
    assertEquals(typeof Card, 'function')
    assertEquals(typeof CardHeader, 'function')
    assertEquals(typeof CardTitle, 'function')
    assertEquals(typeof CardDescription, 'function')
    assertEquals(typeof CardAction, 'function')
    assertEquals(typeof CardContent, 'function')
    assertEquals(typeof CardFooter, 'function')
  })
})
