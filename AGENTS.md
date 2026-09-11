# Cali Date Picker agent guide

## Product contract

Every widget file directly under `lib/` is a complete, standalone ES module. A consumer must be able to copy exactly one widget file into another project and use it without installing this package or copying another source file.

Readable `*.js` files are the source of truth. Their generated `*.min.js` and `*.min.js.map` siblings are distribution artifacts; never edit them manually. Run `npm run minify` after changing any source module. `lib/main.min.js` intentionally bundles all widgets, while each individual minified widget remains standalone.

Do not add imports to a widget file. Do not move runtime helpers into a shared module. Duplication of small infrastructure helpers is intentional because standalone distribution is a product feature.

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
// Standalone DOM, registration, reactivity, and form-control infrastructure.

/* --- dates --- */
// Date/time parsing, formatting, localization, and calculations.

/* --- configuration --- */
// FORM_ATTRIBUTES, ATTRIBUTE_PROPERTIES, CLASS_NAMES, and widget constants.

/* --- styles --- */
// Minimal layout and state hooks in STYLES; application theme values stay external.

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

- `joinClassNames()` joins conditional CSS class names.
- `createNode()` creates and configures a DOM node.
- `replaceView()` installs or replaces the root view.
- `initializeShadowRoot()` creates the open shadow root and installs CSS.
- `defineElement()` safely registers the default class or an alias subclass.
- `defineReactiveProperty()` defines a render-triggering public property.
- `defineRangeProperty()` defines a reactive start/end range property.
- `defineFormProperties()` installs the standard form-control properties.
- `syncHiddenInput()` synchronizes one compatibility hidden input.
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
- Preserve the hidden-input form bridge until a compatibility-tested migration to `ElementInternals.setFormValue()` is explicitly requested.
- Keep `STYLES` structural. Do not add a palette, `color-scheme`, typography, native-control resets, or removed focus outlines. Visual defaults belong in the consumer's `@layer cali` rules.
- State selectors may reference `--cali-*` properties without color or shape fallbacks. When a property is unset, its declaration intentionally becomes invalid and the native/inherited presentation wins.
- A fallback is allowed for geometry required for operation, currently the clock list heights used to create scroll containers.
- Prefer small named functions over inline event-handler algorithms.
- Avoid a universal calendar/clock base class. These files share conventions, not a runtime dependency.

## Verification

Run after every change:

```sh
npm test
npx prettier --check "lib/**/*.js" "test/**/*.js" "*.md" "*.html" "package.json"
git diff --check
```

`npm test` verifies that each widget remains importable by itself and retains the common custom-element contract. For interaction changes, also serve `index.html` with any static HTTP server and exercise the affected widget in a browser.
