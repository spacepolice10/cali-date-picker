# Cali Date Picker

Self-contained date and time widgets as custom elements. Import a single widget file; nothing shared is required.

The repository root also contains a dependency-free interactive demo used by GitHub Pages. Open `index.html` through any static HTTP server to explore all six widgets.

```html
<script type="module" src="./lib/calendar.js"></script>
<cali-calendar locale="en-US"></cali-calendar>
```

| Tag                      | File                     |
| ------------------------ | ------------------------ |
| `<cali-calendar>`        | `lib/calendar.js`        |
| `<cali-clocks>`          | `lib/clocks.js`          |
| `<cali-dateform>`        | `lib/dateform.js`        |
| `<cali-timeform>`        | `lib/timeform.js`        |
| `<cali-ranger-calendar>` | `lib/ranger-calendar.js` |
| `<cali-ranger-clocks>`   | `lib/ranger-clocks.js`   |

Single-date widgets expose a `date` property and emit `change` with that `Date`. Range widgets expose `startsWithDate` / `endsWithDate` and emit `change` with `{ startsWithDate, endsWithDate }`.

## Usage

Each component file is a dependency-free ES module and registers its default tag when imported:

```html
<script type="module" src="./calendar.js"></script>
<cali-calendar name="date" locale="en-US"></cali-calendar>
```

The exported registration function can assign a different tag name:

```js
import { defineCalendar } from "./calendar.js";

defineCalendar("booking-calendar");
```

All widgets support `name`, `value`, `disabled`, `required`, `readonly`, `form`, `autocomplete`, `locale`, and `timezone`. Calendar variants also support `starts-from-date`; range variants support `starts-with-date`, `ends-with-date`, and `end-name`.

## Styling

The shadow styles only provide layout, scrolling, and state hooks. Typography, control appearance, colors, focus indicators, and color scheme remain native or inherited until the consuming page themes them.

Place application defaults in a cascade layer and style exposed parts or inherited custom properties:

```css
@layer cali {
  cali-calendar {
    --cali-selected-bg: Highlight;
    --cali-hover-bg: color-mix(in srgb, currentColor 10%, transparent);
    --cali-radius: 0.5rem;
  }

  cali-calendar::part(date) {
    font: inherit;
  }
}
```

Available theme properties are `--cali-selected-bg`, `--cali-active-bg`, `--cali-range-bg`, `--cali-preview-bg`, `--cali-hover-bg`, `--cali-subtle`, `--cali-radius`, `--cali-column-height`, and `--cali-list-height`. A declaration that is not supplied by the page has no component color or shape fallback; the browser’s native presentation remains in control. The two scrolling heights retain structural fallbacks of `10rem` and `16rem`.

## Development

The project intentionally has no bundler or runtime dependencies. Edit the standalone files directly and run:

```sh
npm test
```

See [AGENTS.md](./AGENTS.md) for the file schema, compatibility constraints, and maintenance checklist.
