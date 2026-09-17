# AGENTS.md — cali-date-picker

`<cali-calendar>`: a dependency-free, form-associated date picker custom
element. One month at a time; attributes configure the grid, CSS parts +
`data-view` style the rest.

## Files

| File | Role |
| --- | --- |
| `calendar.js` | Source of truth. Edit this, never the bundle. |
| `calendar.min.js` + `.map` | Committed build artifact (served via jsDelivr). Regenerate after every `calendar.js` change. |
| `calendar.test.js` | Vitest suite (happy-dom). Mirrors the demo sections. |
| `index.html` | Demo page AND the component's reference styling (all `::part` rules live here). |
| `minify.js` | esbuild bundle script (`esm`, `es2022`, comments stripped). |
| `vitest.config.js` | `environment: "happy-dom"`. |

## Commands

```bash
npm install   # needed first: devDependencies may be missing (vitest, happy-dom)
npm test      # vitest run — must stay green
npm run minify  # rebuild calendar.min.js + map after touching calendar.js
```

## Architecture (`calendar.js`)

- `CaliCalendar extends HTMLElement`, `formAssociated = true`,
  shadow DOM. Public surface: attributes + `.yearView` / `.monthsView`
  properties + `value` + `beforechange` (cancelable) / `change` events.
- **Observed attributes** (`observedAttributes`): only `value`,
  `week-starts-on`, `with-offset`, `with-weekdays`, `with-switcher`,
  `required`.
  `minval` / `maxval` / `year-view` / `months-view` are **not** observed:
  read once as initial state; after connect drive the period via
  `.yearView` / `.monthsView`. Don't expect re-renders from setting them.
  (`#applyLimit` re-renders manually for `minval` / `maxval`.)
- **Validation** (`#valid`, refreshed on connect, on every observed
  change, and in `#applyLimit`): empty + `required` →
  `valueMissing`; value outside `minval` / `maxval` →
  `rangeUnderflow` / `rangeOverflow`; else clear. No custom message —
  the browser supplies defaults. Test shim records `setValidity` flags
  per element (`validity(el)` helper).
- **Upgrade-path gotcha:** elements parsed before
  `customElements.define` upgrade while already connected, so
  `attributeChangedCallback` runs before `connectedCallback` ever called
  `#ready()`. It must call `#ready()` before `#show()` or
  `monthLabel(new Date(undefined, NaN, 1))` throws `RangeError`.
- **Shadow-DOM protocol:** `data-a` action + payload attrs —
  `s`+`data-d` (select date), `m`+`data-m`, `y`+`data-y`, `v`+`data-v`
  (view), `p`+`data-p` (period). `#push` dispatches on these; `#keys`
  navigates on them. Offsets/weekdays are `<span>`s, never buttons.
- **Views:** `#view` is `days` | `months` | `year`, mirrored to host
  `dataset.view` for styling. `#goto` switches views (and moves focus
  into the new grid); `#step` moves the period (Prev/Next); `#fromMon` /
  `#fromYr` pick a month/year and return to days.

## Naming conventions (follow them)

Private `#names` ship **verbatim** in the bundle — esbuild cannot mangle
them — so they are deliberately terse. Keep new code in this style:

- State: `#view`, `#Mo` (month 1–12), `#yr`, `#y0` (year-list window
  start), `#grid` (calendar container), `#navi` (switcher container),
  `#fdate` (last focused ISO date).
- Render: `#show`, `#showNav`, `#showGrid`, `#showDays`, `#showMon`,
  `#showYr`, `#renderList` (shared months/year list renderer).
- Events: `#push` (click), `#seen` (focusin), `#keys` (keydown).
- Logic: `#tabs` (roving tabindex), `#prime` (active-date priority),
  `#ready` (ensure period), `#choose` (commit date), `#step`, `#goto`,
  `#fromMon`, `#fromYr`, `#applyValue`, `#applyLimit`, `#lim`, `#off`
  (disabled check), `#wk` (week start), `#fire` (emit event).
- Locals: `butn` (button element), `rw` (grid row width), `buttons`
  (ordered button list). Helpers: `toDate`, `toDateString`, `monthLabel`
  (shared `Intl` formatter `mf`), `butn(part, attrs, label)`.
- Public API names (`value`, `yearView`, `monthsView`, `minval`,
  `maxval`, lifecycle callbacks) must stay verbose — they are the
  documented contract. JSDoc on public API is kept (stripped from the
  bundle, zero shipped bytes).

## Keyboard system (roving tabindex)

Standard roving-tabindex grid
([WAI-APG](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)): exactly one
grid button has `tabindex="0"`, the rest `-1`, so `Tab` / `Shift+Tab`
leave the grid naturally. `#keys` returns early on `Tab` — never
`preventDefault` it.

- `#prime(dateList)` picks the stop: `#fdate` → `value` → today →
  first enabled (disabled-aware via `#off`).
- `#tabs(active)` writes the `0`/`-1` split (disabled always `-1`).
- `#keys` is pure index math over `[...#grid.querySelectorAll("button")]`:
  `Left/Right ±1`, `Up/Down ±rw` (`rw` = 7 days, 3 months, 5 years),
  `Home/End` = first/last, clamped to the list, skipping `disabled`
  toward the inside. **Arrows never change the visible period** — period
  changes belong to Prev/Next (and the JS API) only.
- Every re-render replaces `innerHTML`, destroying focus. `#show`
  captures `shadowRoot.activeElement` first (rebuilt generically from its
  `dataset` as e.g. `[data-a="s"][data-d="…"]`), restores it after, and
  falls back to `[tabindex="0"]` when the view changed. `#goto` moves
  focus into newly shown grids so arrows work immediately.

## Demo page (`index.html`)

- One `<section>` per feature (`#bare`, `#weekdays`, `#offset`,
  `#monday`, `#switcher`, `#selected`, `#range`, `#open`, `#form`,
  `#events`, `#binding`, `#js`, `#popover`, `#dialog`, `#cdn`); sidebar
  nav + mobile dots rail + `#nav-dialog` slide-in panel mirror them.
  `calendar.test.js` blocks are labeled with the same `#ids` — keep them
  in sync when adding a demo.
- Reference styles to preserve: fixed date cells (`1.75em`), equal-width
  switcher grid, `view-months` floored to `9ch` so the component width
  never jumps between months, natural document scroll on mobile (no
  fixed-height scroll containers), `#nav-dialog` slide animation without
  backdrop dimming.
- Mobile script notes: section observer is viewport-rooted;
  dialog picks use `section.scrollIntoView()`; active-section highlight
  (`is-active`) applies to sidebar links, dialog links, and dots together.

## Testing

- Helpers: `mount(attrs, parent)` (attrs set **before** append, so
  `attributeChangedCallback` fires disconnected — this does **not**
  reproduce the pre-define upgrade path), `days(el)`, `clickBtn`,
  `isoToday()`. `attachInternals` is shimmed.
- Keyboard tests: `el.focus()` a shadow button, then `dispatchEvent(new
  KeyboardEvent("keydown", { key, bubbles: true }))`; assert via
  `el.shadowRoot.activeElement?.dataset`. Happy-dom supports this.
- Tab order is asserted structurally (exactly one non-`-1` tabbable per
  grid), not via real `Tab` presses.
- TDD is the norm here: add the failing test first, watch it fail for
  the right reason, then implement minimally. Keep 33+ tests green.

## Weight budget

`calendar.min.js` is the product (~7 KB / ~2.8 KB gzip). Rules:

- Private `#names` are shipped bytes — keep them short (see conventions).
- Comments/JSDoc are free (stripped by esbuild) — document freely.
- Prefer one generic renderer/handler over per-view duplication
  (`#renderList`, index-based `#keys` are the precedents).
- After any `calendar.js` change: `npm test`, then `npm run minify`,
  and commit source + bundle + map together.
