#!/usr/bin/env -S deno run -A

/**
 * CI script that inspects db/schema.ts for compliance with schema conventions.
 *
 * Checks:
 *   1. App-owned table PKs use `uuid('id').defaultRandom()` — not `text('id')`
 *   2. All `timestamp(` calls include `{ withTimezone: true }`
 *   3. All `.references()` calls include explicit `{ onDelete:`
 *
 * Exits 0 when all checks pass, non-zero on violation.
 * Better Auth tables (user, session, account, verification) and feedEvents
 * are excluded from PK type checking.
 */

import { resolve } from 'https://deno.land/std@0.224.0/path/mod.ts'

const SCHEMA_PATH = resolve(Deno.cwd(), 'db/schema.ts')

const EXCLUDED_PK_TABLES = new Set([
  'user',
  'session',
  'account',
  'verification',
  'feed_events',
])

interface Violation {
  rule: string
  message: string
}

function extractTableName(block: string): string | null {
  const match = block.match(/pgTable\s*\(\s*(['"`])([^'"`]+)\1/)
  return match ? match[2] : null
}

function parsePgTableBlocks(
  content: string,
): Array<{ name: string; start: number; end: number; block: string }> {
  const results: Array<
    { name: string; start: number; end: number; block: string }
  > = []
  let searchFrom = 0

  while (true) {
    const idx = content.indexOf('pgTable(', searchFrom)
    if (idx === -1) break

    let depth = 0
    let end = idx
    for (let i = idx; i < content.length; i++) {
      if (content[i] === '(') depth++
      else if (content[i] === ')') {
        depth--
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }

    const block = content.slice(idx, end)
    const name = extractTableName(block)
    if (name) results.push({ name, start: idx, end, block })
    searchFrom = end
  }

  return results
}

function findTableAtOffset(
  blocks: Array<{ name: string; start: number; end: number }>,
  offset: number,
): string | null {
  for (const { name, start, end } of blocks) {
    if (offset >= start && offset < end) return name
  }
  return null
}

function checkPkTypes(content: string): Violation[] {
  const violations: Violation[] = []
  const blocks = parsePgTableBlocks(content)

  for (const { name, block } of blocks) {
    if (EXCLUDED_PK_TABLES.has(name)) continue

    const hasTextId = /text\s*\(\s*'id'\s*\)/.test(block)
    const hasUuidId = /uuid\s*\(\s*'id'\s*\)/.test(block)

    if (hasTextId && !hasUuidId) {
      violations.push({
        rule: 'PK type',
        message:
          `Table '${name}' uses text('id') — use uuid('id').defaultRandom()`,
      })
    }
  }

  return violations
}

function checkTimestamps(content: string): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')
  const blocks = parsePgTableBlocks(content)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes("from 'drizzle-orm")) continue

    const tsMatch = line.match(/timestamp\s*\(\s*'([^']+)'/)
    if (!tsMatch) continue

    const col = tsMatch[1]
    const lookahead = lines.slice(i, i + 5).join(' ')
    const hasTimezone = lookahead.includes('withTimezone')

    if (!hasTimezone) {
      let currentOffset = 0
      for (let j = 0; j < i; j++) {
        currentOffset += lines[j].length + 1
      }
      const table = findTableAtOffset(blocks, currentOffset) || 'unknown'
      violations.push({
        rule: 'Timestamp timezone',
        message: `Table '${table}' column '${col}' missing withTimezone: true`,
      })
    }
  }

  return violations
}

function checkReferences(content: string): Violation[] {
  const violations: Violation[] = []
  const refPattern = /\.references\s*\(/g
  const blocks = parsePgTableBlocks(content)
  let match

  while ((match = refPattern.exec(content)) !== null) {
    const after = content.slice(match.index, match.index + 200)
    if (!/onDelete\s*:/.test(after)) {
      const table = findTableAtOffset(blocks, match.index) || 'unknown'
      const before = content.slice(0, match.index)
      const colMatch = before.match(/(\w+)\s*:\s*\w+(?:<[^>]*>)?\([^)]*\)\s*$/m)
      const col = colMatch ? colMatch[1] : 'unknown'
      violations.push({
        rule: 'FK onDelete',
        message: `Table '${table}' FK '${col}' missing onDelete`,
      })
    }
  }

  return violations
}

export function validateSchema(content: string): Violation[] {
  return [
    ...checkPkTypes(content),
    ...checkTimestamps(content),
    ...checkReferences(content),
  ]
}

async function main(): Promise<number> {
  let content: string
  try {
    content = await Deno.readTextFile(SCHEMA_PATH)
  } catch (e) {
    console.error(`Failed to read ${SCHEMA_PATH}: ${e}`)
    return 1
  }

  const violations = validateSchema(content)

  if (violations.length === 0) {
    console.log('✓ All schema conventions satisfied')
    return 0
  }

  console.error(`\n✗ Found ${violations.length} convention violation(s):\n`)
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.message}`)
  }
  console.error('')
  return 1
}

if (import.meta.main) {
  Deno.exit(await main())
}
