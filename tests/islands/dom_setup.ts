import { JSDOM } from 'npm:jsdom@^25.0.0'

export interface DomContext {
  dom: JSDOM
  root: HTMLElement
  cleanup(): void
}

export function setupDom(): DomContext {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    { url: 'http://localhost:8000' },
  )
  const win = dom.window as unknown as Record<string, unknown>
  const orig: Record<string, unknown> = {}

  const globals: [string, unknown][] = [
    ['document', win.document as Document],
    ['window', win.window],
    ['navigator', win.navigator as Navigator],
    ['location', win.location as Location],
    ['HTMLElement', win.HTMLElement as typeof HTMLElement],
    ['Node', win.Node as typeof Node],
    ['Element', win.Element as typeof Element],
    ['HTMLInputElement', win.HTMLInputElement as typeof HTMLInputElement],
    ['HTMLFormElement', win.HTMLFormElement as typeof HTMLFormElement],
    ['Event', win.Event as typeof Event],
    ['CustomEvent', win.CustomEvent as typeof CustomEvent],
  ]

  for (const [key, value] of globals) {
    orig[key] = (globalThis as Record<string, unknown>)[key]
    ;(globalThis as Record<string, unknown>)[key] = value
  }

  const root = dom.window.document.getElementById('root')!

  function cleanup() {
    for (const [key] of globals) {
      ;(globalThis as Record<string, unknown>)[key] = orig[key]
    }
  }

  return { dom, root, cleanup }
}
