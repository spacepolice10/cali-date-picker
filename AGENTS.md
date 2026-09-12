# Cali Date Picker agent guide

## Product contract

Every readable widget file directly under `lib/` is an ES module entry point that imports common infrastructure from `lib/shared.js`. Readable source favors maintainability; it is not the copy-paste distribution format.

Readable `*.js` files are the source of truth. Their generated `*.min.js` and `*.min.js.map` siblings are complete standalone bundles; a consumer can copy exactly one minified widget file without installing this package or copying `shared.js`. Never edit generated files manually. Run `npm run minify` after changing any source module.

Put infrastructure reused across widget families in `shared.js`. Keep domain or view logic local when sharing it would obscure the widget. Every public minified entry must remain import-free after bundling.

## Public widgets

| Element                | Source                   | Value model     |
| ---------------------- | ------------------------ | --------------- |
| `cali-calendar`        | `lib/calendar.js`        | one date        |
| `cali-clocks`          | `lib/clocks.js`          | one time        |
| `cali-dateform`        | `lib/dateform.js`        | one date        |
| `cali-timeform`        | `lib/timeform.js`        | one time        |
| `cali-ranger-calendar` | `lib/ranger-calendar.js` | start/end dates |
| `cali-ranger-clocks`   | `lib/ranger-clocks.js`   | start/end times |

All widgets are form-associated custom elements. They auto-register their default tag and export both their class and a `define*()` function for registering an alternative tag.

## Required file structure

Every widget file uses the same top-level skeleton. Keep these sections and their order unchanged:

```js
/* --- helpers --- */
// Imports from shared.js plus any widget-specific infrastructure.

/* --- dates --- */
// Date/time parsing, formatting, localization, and calculations.

/* --- configuration --- */
// FORM_ATTRIBUTES, ATTRIBUTE_PROPERTIES, CLASS_NAMES, and widget constants.

/* --- view components --- */
// Small create*() functions that each return one meaningful DOM subtree.

/* --- behavior --- */
// User-driven state transitions and focused DOM synchronization.

/* --- view --- */
// createView(), which composes the component's root view.

/* --- custom element --- */
// Public class, property installation, named registration export, and default registration.
```

The custom-element class itself follows this order:

1. Static form association and observed attributes
2. Constructor and initial state
3. Browser lifecycle callbacks
4. Form lifecycle callbacks
5. Public `type` and `value`
6. Widget-specific public getters
7. Validity methods and `emit()`
8. `syncForm()`
9. `render()`
10. Property definitions and registration outside the class

Use the existing vocabulary consistently:

- `shared.js` owns common DOM, registration, reactivity, and form-bridge helpers.
- `joinClassNames()` joins conditional CSS class names.
- `createNode()` creates and configures a DOM node.
- `replaceView()` installs or replaces the root view.
- `initializeShadowRoot()` creates the open shadow root.
- `defineElement()` safely registers the default class or an alias subclass.
- `defineReactiveProperty()` defines a render-triggering public property.
- `defineRangeProperty()` defines a reactive start/end range property.
- `defineFormProperties()` installs the standard form-control properties.
- `syncFormState()` submits named values and validity through `ElementInternals`.
- `toValidDate()`, civil-date helpers, and form date/time formatters are shared primitives.
- `isInteractionLocked()` means disabled or read-only.
- `toValidDate()` returns a valid `Date` or `undefined`.
- `formatFormDate()` and `formatFormTime()` produce submitted values.
- `createView()` composes the full widget view.
- `syncView()` updates an existing editable form view without replacing focused inputs.
- `emit()` dispatches the public `change` event.
- `syncForm()` updates accessibility, submitted values, and validity.
- `render()` is the only public rendering entry point.

## Change rules

- Preserve exported class names, `define*()` names, default element names, attributes, properties, CSS parts, submitted field names, and `change` event payloads unless the task explicitly changes the public API.
- Interactive cells keep their structural part (`date`, `unit`, or `slot`) and add state parts when applicable: `active`, `selected`, `in-range`, and `preview`. State parts are additive styling hooks; do not replace the structural part.
- Keep `FORM_ATTRIBUTES` and `ATTRIBUTE_PROPERTIES` declarative. Add a reactive attribute to `ATTRIBUTE_PROPERTIES`; do not grow an `if` chain in `attributeChangedCallback()`.
- Property setters must coerce at their boundary and render only when their semantic value changes.
- Interaction functions must call `isInteractionLocked()` before changing state.
- Single-value events contain a `Date`. Range events contain `{ startsWithDate, endsWithDate }`.
- Date-only formatting must respect `timezone`. Do not replace civil-date helpers with naive ISO slicing.
- An absent range endpoint serializes as an empty string. Do not silently substitute the current date/time.
- Submit through `ElementInternals.setFormValue()`. Use `FormData` when a widget exposes multiple submitted field names; do not add compatibility inputs without an explicit compatibility requirement.
- Keep all styling external. Widget modules expose CSS parts but must not install styles in their shadow roots.
- Prefer small named functions over inline event-handler algorithms.
- Avoid a universal calendar/clock base class. Share small functions, not widget inheritance.

## Verification

Run after every change:

```sh
npm test
npx prettier --check "lib/**/*.js" "test/**/*.js" "*.md" "*.html" "package.json"
git diff --check
```

`npm test` verifies every source entry, the common custom-element contract, and that every generated distribution file is an import-free bundle. For interaction changes, also serve `index.html` with any static HTTP server and exercise the affected widget in a browser.
