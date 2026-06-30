---
provider: manual
pr:
round: 1
round_created_at: 2026-06-30T16:58:49Z
status: resolved
file: islands/PassportCover.tsx
line: 68
severity: medium
author: claude-code
provider_ref:
---

# Issue 007: PassportCover outer onClick closes the open passport when tapping inner content

## Review Comment

The toggle click handler is attached to the outermost container `<div>`:

```tsx
// islands/PassportCover.tsx ~line 68
return (
  <div class='relative min-h-[420px]' onClick={handleToggle}>
    {/* closed cover — z-10, absolute */}
    <div class='absolute inset-0 z-10 …' data-open={isOpen.value ? '' : undefined}>
      …
    </div>

    {/* open inner content — no click handler */}
    <div class='transition-all …' data-open={isOpen.value ? '' : undefined}>
      …QR codes, savings history, links…
    </div>
  </div>
)
```

When the passport is open, tapping anywhere inside the open inner panel — including
QR code displays, the savings history text, or the business name — bubbles the click
event up to the outer `<div>` and triggers `handleToggle`, immediately closing the
passport.  At the point of sale a resident trying to scroll through their QR codes
or read a business name will accidentally close the passport.

The closed cover panel (`z-10`, `absolute`) correctly becomes non-interactive when
open (`pointer-events-none` via `data-[open]:pointer-events-none`), so the cover
itself won't re-fire.  The issue is the open inner content has no stop-propagation.

**Fix:** Attach `onClick` only to the closed-state cover, not the outer wrapper.
When the passport is open, clicking the outer background area can still close it
(intentional), but clicks *within* the inner content panel should not.

```tsx
{/* Closed cover — tapping this opens the passport */}
<div
  class='absolute inset-0 z-10 … cursor-pointer'
  data-open={isOpen.value ? '' : undefined}
  onClick={handleToggle}            // ← move click here
>
  …
</div>

{/* Open inner content — tapping here should NOT close it */}
<div
  class='transition-all …'
  data-open={isOpen.value ? '' : undefined}
  onClick={(e) => e.stopPropagation()}   // ← or add this
>
  …
</div>
```

Or alternatively, keep the outer click handler for "tap outside to close" behaviour
and add `onClick={(e) => e.stopPropagation()}` to the inner content panel.

## Triage

- Decision: `valid`
- Notes: The outer div onClick caused event bubbling from inner content (QR codes, savings history, etc.) to close the passport on any tap. Fix moved onClick from the outer wrapper (line 77) to the closed cover div (the one with `absolute inset-0 z-10`), so only tapping the closed cover toggles the passport. Once open, the cover has `data-[open]:pointer-events-none` so it no longer captures clicks. All 10 existing PassportCover tests pass. Format check and type-check pass clean.
