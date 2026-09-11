/* --- helpers --- */

function joinClassNames(...names) {
  return names.flat().filter(Boolean).join(" ");
}

function createNode(tag, options = {}, children = []) {
  const { className, part, data, on, text, type, value, attributes } = options;
  const element = document.createElement(tag);
  if (type) element.type = type;
  if (className) element.className = className;
  if (part) element.setAttribute("part", part);
  if (text != null) element.textContent = text;
  if (value != null) element.value = String(value);
  if (data) {
    for (const [name, next] of Object.entries(data)) {
      if (next == null || next === false) delete element.dataset[name];
      else element.dataset[name] = String(next);
    }
  }
  if (attributes) {
    for (const [name, next] of Object.entries(attributes)) {
      if (next == null || next === false) continue;
      element.setAttribute(name, String(next));
    }
  }
  if (on) {
    for (const [eventName, handler] of Object.entries(on)) {
      element.addEventListener(eventName, handler);
    }
  }
  element.append(...[children].flat().filter(Boolean));
  return element;
}

function replaceView(element, next) {
  const root = element.shadowRoot.querySelector(`.${CLASS_NAMES.root}`);
  if (root) root.replaceWith(next);
  else element.shadowRoot.append(next);
}

function initializeShadowRoot(element, stylesheet) {
  const root = element.attachShadow({ mode: "open" });
  root.append(createNode("style", { text: stylesheet }));
}

function defineElement(name, defaultName, ElementClass) {
  if (typeof customElements === "undefined") return ElementClass;
  if (!customElements.get(name)) {
    const RegisteredClass =
      name === defaultName ? ElementClass : class extends ElementClass {};
    customElements.define(name, RegisteredClass);
  }
  return customElements.get(name);
}

function haveSameTimestamp(a, b) {
  return a?.getTime() === b?.getTime();
}

function defineReactiveProperty(target, key, coerce, equal = Object.is) {
  const priv = `_${key}`;
  Object.defineProperty(target, key, {
    get() {
      return this[priv];
    },
    set(value) {
      const next = coerce(value);
      if (equal(this[priv], next)) return;
      this[priv] = next;
      this.render();
    },
  });
}

function isInteractionLocked(element) {
  return element.disabled || element.readOnly;
}

function padNumber(value, size = 2) {
  return String(value).padStart(size, "0");
}

function formatFormTime(date) {
  const resolved = toValidDate(date) ?? new Date();
  return `${padNumber(resolved.getHours())}:${padNumber(
    resolved.getMinutes()
  )}:${padNumber(resolved.getSeconds())}`;
}

function parseFormTime(date, value) {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return toValidDate(value);
  const next = new Date(toValidDate(date) ?? new Date());
  next.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  return next;
}

function syncHiddenInput(host, key, name, value) {
  let input = host.querySelector(`input[data-cali="${key}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.dataset.cali = key;
    host.append(input);
  }
  if (name) input.name = name;
  else input.removeAttribute("name");
  input.value = value ?? "";
  input.disabled = host.disabled;
  input.readOnly = host.readOnly;
  input.required = host.required;
  const form = host.getAttribute("form");
  if (form) input.setAttribute("form", form);
  else input.removeAttribute("form");
  const autocomplete = host.getAttribute("autocomplete");
  if (autocomplete) input.setAttribute("autocomplete", autocomplete);
  else input.removeAttribute("autocomplete");
}

function defineFormProperties(target) {
  Object.defineProperty(target, "name", {
    get() {
      return this.getAttribute("name") ?? "";
    },
    set(value) {
      if (value == null || value === "") this.removeAttribute("name");
      else this.setAttribute("name", String(value));
    },
  });
  Object.defineProperty(target, "disabled", {
    get() {
      return this.hasAttribute("disabled") || Boolean(this._formDisabled);
    },
    set(value) {
      this.toggleAttribute("disabled", Boolean(value));
    },
  });
  Object.defineProperty(target, "required", {
    get() {
      return this.hasAttribute("required");
    },
    set(value) {
      this.toggleAttribute("required", Boolean(value));
    },
  });
  Object.defineProperty(target, "readOnly", {
    get() {
      return this.hasAttribute("readonly");
    },
    set(value) {
      this.toggleAttribute("readonly", Boolean(value));
    },
  });
  Object.defineProperty(target, "autocomplete", {
    get() {
      return this.getAttribute("autocomplete") ?? "";
    },
    set(value) {
      if (value == null || value === "") this.removeAttribute("autocomplete");
      else this.setAttribute("autocomplete", String(value));
    },
  });
  Object.defineProperty(target, "defaultValue", {
    get() {
      return this.getAttribute("value") ?? "";
    },
    set(value) {
      if (value == null) this.removeAttribute("value");
      else this.setAttribute("value", String(value));
    },
  });
  Object.defineProperty(target, "form", {
    get() {
      return this._internals?.form ?? null;
    },
  });
  Object.defineProperty(target, "willValidate", {
    get() {
      return this._internals.willValidate;
    },
  });
  Object.defineProperty(target, "validity", {
    get() {
      return this._internals.validity;
    },
  });
  Object.defineProperty(target, "validationMessage", {
    get() {
      return this._internals.validationMessage;
    },
  });
  Object.defineProperty(target, "labels", {
    get() {
      return this._internals.labels;
    },
  });
}

/* --- dates --- */

function toValidDate(value) {
  if (value == null || value === "") return undefined;
  const resolved = value instanceof Date ? value : new Date(value);
  return Number.isNaN(resolved.getTime()) ? undefined : resolved;
}

function timeLabel(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleTimeString(locale ?? "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

/* --- configuration --- */

const FORM_ATTRIBUTES = [
  "name",
  "disabled",
  "required",
  "readonly",
  "form",
  "autocomplete",
];

const ATTRIBUTE_PROPERTIES = {
  locale: "locale",
  timezone: "timezone",
};

const CLASS_NAMES = {
  root: "clocks",
  header: "clocks__header",
  name: "clocks__name",
  columns: "clocks__columns",
  hours: "clocks__hours",
  minutes: "clocks__minutes",
  seconds: "clocks__seconds",
  unit: "clocks__unit",
};

const columns = [
  ["hour", 24, "hours"],
  ["minute", 60, "minutes"],
  ["second", 60, "seconds"],
];

/* --- styles --- */

const STYLES = `
  :host([disabled]),
  :host([aria-disabled="true"]) { pointer-events: none; }
  .clocks { display: grid; gap: 0.5rem; }
  .clocks__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .clocks__name {
    margin: 0;
  }
  .clocks__columns { display: flex; gap: 0.5rem; }
  .clocks__hours,
  .clocks__minutes,
  .clocks__seconds {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    height: var(--cali-column-height, 10rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .clocks__unit {
    min-width: 2.5rem;
    border-radius: var(--cali-radius);
  }
  .clocks__unit:hover { background: var(--cali-hover-bg); }
  .clocks__unit--selected {
    background: var(--cali-selected-bg);
    color: var(--cali-selected-color);
  }
`;

/* --- view components --- */

function createRoot(children) {
  return createNode(
    "div",
    { className: CLASS_NAMES.root, part: "clocks" },
    children
  );
}

function createName(clocks) {
  return createNode("p", {
    className: CLASS_NAMES.name,
    part: "name",
    text: timeLabel(clocks.date, clocks),
    attributes: { role: "heading", "aria-level": "2" },
  });
}

function createHeader(clocks) {
  return createNode("div", { className: CLASS_NAMES.header, part: "header" }, [
    createName(clocks),
  ]);
}

function createUnit(clocks, unit, value, selected) {
  const text = String(value).padStart(2, "0");
  return createNode("button", {
    className: joinClassNames(
      CLASS_NAMES.unit,
      selected && `${CLASS_NAMES.unit}--selected`
    ),
    part: joinClassNames("unit", selected && "selected"),
    type: "button",
    text,
    data: { unit, value },
    attributes: {
      "aria-label": `${unit} ${text}`,
      "aria-pressed": String(selected),
    },
    on: { click: () => selectTime(clocks, { [unit]: value }) },
  });
}

function createColumn(clocks, unit, count, current, columnClass) {
  return createNode(
    "div",
    {
      className: columnClass,
      part: unit,
      attributes: { role: "listbox", "aria-label": unit },
    },
    Array.from({ length: count }, (_, value) =>
      createUnit(clocks, unit, value, value === current)
    )
  );
}

function createColumns(clocks) {
  const current = {
    hour: clocks.date.getHours(),
    minute: clocks.date.getMinutes(),
    second: clocks.date.getSeconds(),
  };
  return createNode(
    "div",
    { className: CLASS_NAMES.columns, part: "columns" },
    columns.map(([unit, count, key]) =>
      createColumn(clocks, unit, count, current[unit], CLASS_NAMES[key])
    )
  );
}

/* --- behavior --- */

function selectTime(clocks, { hour, minute, second } = {}) {
  if (isInteractionLocked(clocks)) return;
  const next = new Date(clocks.date);
  next.setHours(
    hour ?? next.getHours(),
    minute ?? next.getMinutes(),
    second ?? next.getSeconds()
  );
  const changed = next.getTime() !== clocks.date.getTime();
  clocks.date = next;
  if (changed) clocks.emit(clocks.date);
}

function scrollSelected(column) {
  requestAnimationFrame(() => {
    const selected = column.querySelector(`.${CLASS_NAMES.unit}--selected`);
    if (!selected) return;
    column.scrollTop =
      selected.offsetTop - column.clientHeight / 2 + selected.offsetHeight / 2;
  });
}

/* --- view --- */

function createView(clocks) {
  return createRoot([createHeader(clocks), createColumns(clocks)]);
}

/* --- custom element --- */

export class CaliClocks extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = [
    "value",
    ...FORM_ATTRIBUTES,
    ...Object.keys(ATTRIBUTE_PROPERTIES),
  ];

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._formDisabled = false;
    this._date = new Date();
    this._locale = undefined;
    this._timezone = undefined;
    initializeShadowRoot(this, STYLES);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "value") {
      this.value = newValue;
      return;
    }
    if (FORM_ATTRIBUTES.includes(name)) {
      this.syncForm();
      return;
    }
    const property = ATTRIBUTE_PROPERTIES[name];
    if (property) this[property] = newValue;
  }

  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    this.syncForm();
  }

  formResetCallback() {
    this.date = parseFormTime(this.date, this.defaultValue) ?? new Date();
  }

  get type() {
    return "time";
  }

  get value() {
    return formatFormTime(this.date);
  }

  set value(next) {
    const parsed = parseFormTime(this.date, next);
    if (!parsed) return;
    this.date = parsed;
  }

  checkValidity() {
    return this._internals.checkValidity();
  }

  reportValidity() {
    return this._internals.reportValidity();
  }

  emit(detail) {
    this.dispatchEvent(
      new CustomEvent("change", { detail, bubbles: true, composed: true })
    );
  }

  syncForm() {
    this.setAttribute("aria-disabled", String(this.disabled));
    this.toggleAttribute("aria-readonly", this.readOnly);
    syncHiddenInput(this, "value", this.name, this.value);
    const current = {
      hour: padNumber(this.date.getHours()),
      minute: padNumber(this.date.getMinutes()),
      second: padNumber(this.date.getSeconds()),
    };
    for (const [unit, value] of Object.entries(current)) {
      syncHiddenInput(this, unit, this.name && `${this.name}-${unit}`, value);
    }
    this._internals.setFormValue(null);
    if (this.required && !this.value) {
      this._internals.setValidity(
        { valueMissing: true },
        "Please fill out this field",
        this
      );
    } else {
      this._internals.setValidity({});
    }
  }

  render() {
    replaceView(this, createView(this));
    for (const column of this.shadowRoot.querySelectorAll("[role='listbox']")) {
      scrollSelected(column);
    }
    this.syncForm();
  }
}

defineFormProperties(CaliClocks.prototype);
defineReactiveProperty(
  CaliClocks.prototype,
  "date",
  (value) => toValidDate(value) ?? new Date(),
  haveSameTimestamp
);
defineReactiveProperty(CaliClocks.prototype, "locale", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(CaliClocks.prototype, "timezone", (value) =>
  value ? String(value) : undefined
);

export const defineClocks = (name = "cali-clocks") => {
  return defineElement(name, "cali-clocks", CaliClocks);
};

defineClocks();
