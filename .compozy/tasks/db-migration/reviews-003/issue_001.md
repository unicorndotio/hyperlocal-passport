---
provider: manual
pr:
round: 3
round_created_at: 2026-06-26T15:16:00Z
status: resolved
file: lib/db.ts
line: 37
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Connection string masking loses user and protocol components

## Review Comment

In [lib/db.ts](file:///Users/dev/nodo/passport/deno/lib/db.ts#L37-L39), the `maskConnectionString` function uses the regular expression `connStr.replace(/:([^@]+)@/, ':***@')` to obscure passwords. Because the first colon matched in `postgresql://user:password@` is the one after `postgresql`, the regex matches the entire substring `://user:password@` and replaces it with `:***@`, producing `postgresql:***@host:5432/db`. This discards the `//user` protocol prefix and username, causing test failures.

### Suggested Fix

Refine the regular expression to target only the password component, or parse the connection string as a URL:

```ts
export function maskConnectionString(connStr: string): string {
  try {
    const url = new URL(connStr)
    if (url.password) {
      url.password = '***'
    }
    return url.toString()
  } catch {
    return connStr.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2')
  }
}
```

## Triage

- Decision: `VALID`
- Notes: The original regex `/:([^@]+)@/` matched the first colon in `postgresql://user:password@host:5432/db`, capturing `//user:password@` and replacing it with `:***@`, producing `postgresql:***@host:5432/db`. This lost the `//user` prefix.

## Resolution

Replaced with `new URL()` parsing which correctly identifies the password component. For empty passwords (`user:@host`), a fallback `connStr.includes(':@')` check replaces the empty password marker. A fallback regex `/(:\/\/[^:]+:)[^@]+(@)/` is used when URL parsing fails. All 3 test cases pass:

- `postgresql://user:password@host:5432/db` → `postgresql://user:***@host:5432/db`
- `postgresql://user:@host:5432/db` → `postgresql://user:***@host:5432/db`
- `postgresql://host:5432/db` → `postgresql://host:5432/db`
