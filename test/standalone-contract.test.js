import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  test(`${tagName} remains a standalone module with the common control contract`, async () => {
    const url = new URL(`../lib/${file}.js`, import.meta.url);
    const source = await readFile(url, "utf8");

    assert.doesNotMatch(
      source,
      /^\s*import\s/m,
      "standalone files cannot import dependencies"
    );
    assert.match(source, /const FORM_ATTRIBUTES = \[/);
    assert.match(source, /const ATTRIBUTE_PROPERTIES = \{/);
    assert.doesNotMatch(source, /color-scheme|light-dark\(|#[\da-f]{3,8}/i);
    assert.doesNotMatch(source, /outline:\s*none|background:\s*transparent/i);

    const sections = [
      "helpers",
      "dates",
      "configuration",
      "styles",
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
