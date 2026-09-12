# Cali Date Picker

Self-contained date and time widgets as custom elements. Use a minified standalone bundle directly, or import the readable source together with its shared infrastructure module.

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

## CDN

Every public module has a committed standalone bundle and source map. Load one widget directly from jsDelivr without publishing to npm:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/spacepolice10/cali-date-picker@v0.0.6/lib/calendar.min.js"
></script>
<cali-calendar></cali-calendar>
```

| Module         | jsDelivr URL                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------- |
| All widgets    | `https://cdn.jsdelivr.net/gh/spacepolice10/cali-date-picker@v0.0.6/lib/main.min.js`            |
| Calendar       | `https://cdn.jsdelivr.net/gh/spacepolice10/cali-date-picker@v0.0.6/lib/calendar.min.js`        |
| Clocks         | `https://cdn.jsdelivr.net/gh/spacepolice10/cali-date-picker@v0.0.6/lib/clocks.min.js`          |
| Date form      | `https://cdn.jsdelivr.net/gh/spacepolice10/cali-date-picker@v0.0.6/lib/dateform.min.js`        |
| Time form      | `https://cdn.jsdelivr.net/gh/spacepolice10/cali-date-picker@v0.0.6/lib/timeform.min.js`        |
| Calendar range | `https://cdn.jsdelivr.net/gh/spacepolice10/cali-date-picker@v0.0.6/lib/ranger-calendar.min.js` |
| Time range     | `https://cdn.jsdelivr.net/gh/spacepolice10/cali-date-picker@v0.0.6/lib/ranger-clocks.min.js`   |

The URLs use the immutable `v0.0.6` release tag. To try unreleased work, replace `@v0.0.6` with `@main`.

Single-date widgets expose a `date` property and emit `change` with that `Date`. Range widgets expose `startsWithDate` / `endsWithDate` and emit `change` with `{ startsWithDate, endsWithDate }`.

## Usage

Each readable component is an ES module entry point and registers its default tag when imported. Keep `shared.js` beside it when using source files directly:

```html
<script type="module" src="./calendar.js"></script>
<cali-calendar name="date" locale="en-US"></cali-calendar>
```

The exported registration function can assign a different tag name:

```js
import { defineCalendar } from "./calendar.js";

defineCalendar("booking-calendar");
```

All widgets support `name`, `value`, `disabled`, `required`, `readonly`, `form`, `autocomplete`, `locale`, and `timezone`. Calendar variants also support `starts-from-date`; range variants support `starts-with-date`, `ends-with-date`, and `end-name`. `cali-ranger-clocks` supports `minutes-step` (default `5`) to control its selectable time interval.

## Styling

Widgets install no CSS. Their Shadow DOM preserves markup encapsulation while exposed parts let each application control layout and appearance. Style parts from the consuming page:

```css
@layer cali {
  cali-calendar {
    display: block;
  }

  cali-calendar::part(calendar) {
    display: grid;
  }

  cali-calendar::part(date) {
    font: inherit;
  }

  cali-calendar::part(selected) {
    background: Highlight;
    color: HighlightText;
  }
}
```

Structural parts include `calendar`, `clocks`, `dateform`, `timeform`, `ranger-calendar`, `ranger-clocks`, `header`, `navigation`, `fields`, `days`, `times`, `date`, `unit`, and `slot`. State parts such as `active`, `selected`, `in-range`, and `preview` are added alongside the structural part.

## Development

The project has no runtime dependencies. Edit the readable standalone files, regenerate their minified siblings, and verify everything with:

```sh
npm run minify
npm test
```

The minifier discovers public `lib/*.js` entry points automatically and bundles their imports. Every `*.min.js` widget is an independent copy-paste file; `main.min.js` contains all widgets. Shared infrastructure remains readable in `lib/shared.js` without becoming a separate distribution requirement.

See [AGENTS.md](./AGENTS.md) for the file schema, compatibility constraints, and maintenance checklist.
