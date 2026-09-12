import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { syncFormState } from "../lib/shared.js";

globalThis.HTMLElement = class HTMLElement {};

const registry = new Map();
const registeredConstructors = new Set();
globalThis.customElements = {
  define(name, constructor) {
    if (registry.has(name)) throw new Error(`Duplicate custom element: ${name}`);
    if (registeredConstructors.has(constructor)) {
      throw new Error(`Duplicate custom-element constructor: ${name}`);
    }
    registry.set(name, constructor);
    registeredConstructors.add(constructor);
  },
  get(name) {
    return registry.get(name);
  },
};

const widgets = [
  ["calendar", "CaliCalendar", "defineCalendar", "cali-calendar"],
  ["clocks", "CaliClocks", "defineClocks", "cali-clocks"],
  ["dateform", "CaliDateform", "defineDateform", "cali-dateform"],
  ["timeform", "CaliTimeform", "defineTimeform", "cali-timeform"],
  [
    "ranger-calendar",
    "CaliRangerCalendar",
    "defineRangerCalendar",
    "cali-ranger-calendar",
  ],
  [
    "ranger-clocks",
    "CaliRangerClocks",
    "defineRangerClocks",
    "cali-ranger-clocks",
  ],
];

for (const [file, className, defineName, tagName] of widgets) {
  test(`${tagName} source entry retains the common control contract`, async () => {
    const url = new URL(`../lib/${file}.js`, import.meta.url);
    const source = await readFile(url, "utf8");

    assert.match(source, /from "\.\/shared\.js";/);
    assert.match(source, /const FORM_ATTRIBUTES = \[/);
    assert.match(source, /const ATTRIBUTE_PROPERTIES = \{/);
    assert.doesNotMatch(source, /const STYLES|createNode\("style"/);
    assert.doesNotMatch(source, /color-scheme|light-dark\(|#[\da-f]{3,8}/i);
    assert.doesNotMatch(source, /outline:\s*none|background:\s*transparent/i);

    const sections = [
      "helpers",
      "dates",
      "configuration",
      "view components",
      "behavior",
      "view",
      "custom element",
    ];
    let previousSection = -1;
    for (const section of sections) {
      const position = source.indexOf(`/* --- ${section} --- */`);
      assert.ok(position > previousSection, `${section} section order`);
      previousSection = position;
    }

    const module = await import(url);
    const Constructor = module[className];
    assert.equal(typeof Constructor, "function");
    assert.equal(module[defineName](), Constructor);
    assert.equal(customElements.get(tagName), Constructor);
    assert.equal(Constructor.formAssociated, true);

    const alias = `test-${tagName}`;
    const AliasConstructor = module[defineName](alias);
    assert.equal(customElements.get(alias), AliasConstructor);
    assert.notEqual(AliasConstructor, Constructor);
    assert.ok(AliasConstructor.prototype instanceof Constructor);

    for (const attribute of [
      "name",
      "value",
      "disabled",
      "required",
      "readonly",
      "form",
      "autocomplete",
      "locale",
      "timezone",
    ]) {
      assert.ok(Constructor.observedAttributes.includes(attribute), attribute);
    }
    if (tagName === "cali-ranger-clocks") {
      assert.ok(Constructor.observedAttributes.includes("minutes-step"));
      const descriptor = Object.getOwnPropertyDescriptor(
        Constructor.prototype,
        "minutesStep"
      );
      assert.equal(typeof descriptor?.get, "function");
      assert.equal(typeof descriptor?.set, "function");
    }

    for (const method of [
      "connectedCallback",
      "attributeChangedCallback",
      "formDisabledCallback",
      "formResetCallback",
      "checkValidity",
      "reportValidity",
      "emit",
      "syncForm",
      "render",
    ]) {
      assert.equal(typeof Constructor.prototype[method], "function", method);
    }

    for (const property of [
      "name",
      "disabled",
      "required",
      "readOnly",
      "value",
    ]) {
      let prototype = Constructor.prototype;
      let descriptor;
      while (prototype && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(prototype, property);
        prototype = Object.getPrototypeOf(prototype);
      }
      assert.equal(typeof descriptor?.get, "function", `${property} getter`);
      assert.equal(typeof descriptor?.set, "function", `${property} setter`);
    }
  });
}

test("every distribution module is bundled, standalone, and source-mapped", async () => {
  for (const file of ["main", ...widgets.map(([name]) => name)]) {
    const moduleUrl = new URL(`../lib/${file}.min.js`, import.meta.url);
    const mapUrl = new URL(`../lib/${file}.min.js.map`, import.meta.url);
    const source = await readFile(moduleUrl, "utf8");
    const sourceMap = JSON.parse(await readFile(mapUrl, "utf8"));

    assert.doesNotMatch(source, /^\s*import\s/m, `${file} has no imports`);
    assert.match(
      source,
      new RegExp(`//# sourceMappingURL=${file}\\.min\\.js\\.map\\s*$`),
      `${file} links its source map`
    );
    assert.ok(sourceMap.sources.length > 0, `${file} map contains sources`);
  }
});

test("form state uses ElementInternals without compatibility inputs", () => {
  let submitted;
  let validity;
  const attributes = new Map();
  const element = {
    disabled: false,
    readOnly: false,
    _internals: {
      setFormValue(value) {
        submitted = value;
      },
      setValidity(flags, message) {
        validity = { flags, message };
      },
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    toggleAttribute(name, enabled) {
      if (enabled) attributes.set(name, "");
      else attributes.delete(name);
    },
  };

  syncFormState(
    element,
    [
      ["booking", "2026-09-12"],
      ["booking-end", "2026-09-14"],
    ],
    false
  );

  assert.deepEqual(
    [...submitted],
    [
      ["booking", "2026-09-12"],
      ["booking-end", "2026-09-14"],
    ]
  );
  assert.deepEqual(validity.flags, {});
  assert.equal(attributes.get("aria-disabled"), "false");
  assert.equal("querySelector" in element, false);
});
